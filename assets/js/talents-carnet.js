
/* =====================================================
   CINÉ MOJITO — TALENTS QUI REVIENNENT DANS MON CARNET

   Classement personnel basé sur les films notés :
   - 1 réalisateur·rice par film ;
   - les 8 premiers rôles TMDB par film ;
   - top 30 par catégorie.

   Dépendances :
   - supabaseClient
   - currentUser
   - setAuthMode(), openAuthModal(), showAuthMessage()
   - syncMovieTalentsSafely() depuis movie-talents.js
   ===================================================== */

const talentsCarnetContent = document.getElementById(
  "talentsCarnetContent"
);

const TALENTS_CARNET_LIMIT = 30;
const TALENTS_SYNC_BATCH_SIZE = 3;

let isLoadingTalentsCarnet = false;

/* =====================================================
   OUTILS
   ===================================================== */

function escapeTalentsCarnetHTML(value) {
  if (typeof escapeHTML === "function") {
    return escapeHTML(value);
  }

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderTalentsCarnetLoading(message) {
  if (!talentsCarnetContent) {
    return;
  }

  talentsCarnetContent.innerHTML = `
    <div class="talents-carnet-loading">
      ${escapeTalentsCarnetHTML(message)}
    </div>
  `;
}

function getTalentInitial(name) {
  return String(name || "Talent")
    .charAt(0)
    .toUpperCase() || "?";
}

function getRoleLabel(roleType, count) {
  if (roleType === "directing") {
    return count > 1
      ? `${count} films réalisés`
      : "1 film réalisé";
  }

  return count > 1
    ? `${count} films dans ton carnet`
    : "1 film dans ton carnet";
}

/* =====================================================
   FILMS NOTÉS ET CACHE DES CRÉDITS
   ===================================================== */

async function getMyReviewedMovies() {
  const { data, error } = await supabaseClient
    .from("reviews")
    .select(`
      movie_id,
      movies (
        id,
        tmdb_id,
        title
      )
    `)
    .eq("user_id", currentUser.id);

  if (error) {
    throw error;
  }

  const moviesById = new Map();

  (data || []).forEach((review) => {
    const movie = review.movies;

    if (!movie?.id || moviesById.has(movie.id)) {
      return;
    }

    moviesById.set(movie.id, {
      id: movie.id,
      tmdb_id: movie.tmdb_id,
      title: movie.title || "Film sans titre"
    });
  });

  return [...moviesById.values()];
}

async function getMovieTalentsByMovieIds(movieIds) {
  if (!movieIds.length) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from("movie_talents")
    .select(`
      movie_id,
      tmdb_person_id,
      person_name,
      role_type,
      cast_order,
      profile_url
    `)
    .in("movie_id", movieIds);

  if (error) {
    throw error;
  }

  return data || [];
}

async function getTmdbDetailsForTalents(tmdbId) {
  const { data, error } = await supabaseClient.functions.invoke(
    "tmdb-details",
    {
      body: {
        movieId: tmdbId
      }
    }
  );

  if (error) {
    throw error;
  }

  if (!data?.result) {
    throw new Error("Détails TMDB indisponibles.");
  }

  return data.result;
}

/*
  Les films anciens du carnet peuvent ne pas encore avoir été
  ouverts depuis la création de movie_talents. On les enrichit
  doucement, par petits groupes, avant de calculer le classement.
*/
async function syncMissingMovieTalents(movies, talents) {
  const movieIdsWithTalents = new Set(
    talents.map((talent) => talent.movie_id)
  );

  const moviesToSync = movies.filter(
    (movie) =>
      !movieIdsWithTalents.has(movie.id) &&
      Number.isInteger(Number(movie.tmdb_id)) &&
      Number(movie.tmdb_id) > 0
  );

  for (
    let index = 0;
    index < moviesToSync.length;
    index += TALENTS_SYNC_BATCH_SIZE
  ) {
    const batch = moviesToSync.slice(
      index,
      index + TALENTS_SYNC_BATCH_SIZE
    );

    await Promise.all(
      batch.map(async (movie) => {
        try {
          const tmdbDetails = await getTmdbDetailsForTalents(
            movie.tmdb_id
          );

          await syncMovieTalentsSafely(
            movie.id,
            tmdbDetails
          );
        } catch (error) {
          /*
            Un film indisponible TMDB ne doit jamais bloquer
            la lecture du reste du carnet.
          */
          console.warn(
            `Impossible d’enrichir les talents de ${movie.title} :`,
            error
          );
        }
      })
    );
  }
}

/* =====================================================
   CALCUL DU TOP
   ===================================================== */

function buildTalentRanking(movies, talents, roleType) {
  const moviesById = Object.fromEntries(
    movies.map((movie) => [movie.id, movie])
  );

  const talentsByPerson = new Map();

  talents
    .filter((talent) => talent.role_type === roleType)
    .forEach((talent) => {
      if (!moviesById[talent.movie_id]) {
        return;
      }

      const key = String(talent.tmdb_person_id);

      if (!talentsByPerson.has(key)) {
        talentsByPerson.set(key, {
          tmdb_person_id: talent.tmdb_person_id,
          person_name: talent.person_name || "Talent",
          profile_url: talent.profile_url || "",
          movieIds: new Set(),
          movies: []
        });
      }

      const person = talentsByPerson.get(key);

      if (person.movieIds.has(talent.movie_id)) {
        return;
      }

      person.movieIds.add(talent.movie_id);

      person.movies.push(
        moviesById[talent.movie_id].title || "Film sans titre"
      );

      /*
        Un portrait TMDB peut être absent lors d'un ancien cache
        puis présent plus tard : on conserve le premier disponible.
      */
      if (!person.profile_url && talent.profile_url) {
        person.profile_url = talent.profile_url;
      }
    });

  return [...talentsByPerson.values()]
    .map((person) => ({
      ...person,
      count: person.movieIds.size,
      movies: person.movies.slice(0, 3)
    }))
    .sort((first, second) => {
      if (second.count !== first.count) {
        return second.count - first.count;
      }

      return first.person_name.localeCompare(
        second.person_name,
        "fr"
      );
    })
    .slice(0, TALENTS_CARNET_LIMIT);
}

/* =====================================================
   RENDU
   ===================================================== */

function renderTalentRankingCard(talent, rank, roleType) {
  const name = talent.person_name || "Talent";

  const portraitMarkup = talent.profile_url
    ? `
      <img
        src="${escapeTalentsCarnetHTML(talent.profile_url)}"
        alt="Portrait de ${escapeTalentsCarnetHTML(name)}"
        loading="lazy"
      />
    `
    : `
      <span aria-hidden="true">
        ${escapeTalentsCarnetHTML(getTalentInitial(name))}
      </span>
    `;

  const moviePreview = talent.movies.length
    ? `
      <p class="talents-carnet-card-movies">
        ${escapeTalentsCarnetHTML(
          talent.movies.join(" · ")
        )}
      </p>
    `
    : "";

  return `
    <a
      class="talents-carnet-card"
      href="talent.html?tmdb=${encodeURIComponent(
        talent.tmdb_person_id
      )}"
      title="Voir la fiche de ${escapeTalentsCarnetHTML(name)}"
    >
      <span class="talents-carnet-rank">
        ${rank}
      </span>

      <span class="talents-carnet-portrait">
        ${portraitMarkup}
      </span>

      <span class="talents-carnet-card-copy">
        <strong>${escapeTalentsCarnetHTML(name)}</strong>

        <small>
          ${escapeTalentsCarnetHTML(
            getRoleLabel(roleType, talent.count)
          )}
        </small>

        ${moviePreview}
      </span>

      <span
        class="talents-carnet-arrow"
        aria-hidden="true"
      >
        →
      </span>
    </a>
  `;
}

function renderTalentRankingSection(
  roleType,
  talents,
  reviewedMoviesCount
) {
  const isDirecting = roleType === "directing";

  const eyebrow = isDirecting
    ? "Derrière la caméra"
    : "À l’écran";

  const title = isDirecting
    ? "Les cinémas auxquels tu reviens"
    : "Les visages qui reviennent dans ton carnet";

  const emptyText = isDirecting
    ? "Ton carnet n’a pas encore assez de données de réalisation pour dessiner cette partie de ton cinéma."
    : "Ton carnet n’a pas encore assez de visages pour dessiner cette partie de tes habitudes de spectatrice.";

  return `
    <section class="talents-carnet-section">
      <div class="talents-carnet-section-heading">
        <div>
          <div class="eyebrow red-eyebrow">
            ${eyebrow}
          </div>

          <h2>${title}</h2>
        </div>

        ${
          talents.length
            ? `
              <span class="talents-carnet-section-count">
                Top ${talents.length}
              </span>
            `
            : ""
        }
      </div>

      ${
        talents.length
          ? `
            <div class="talents-carnet-grid">
              ${talents
                .map((talent, index) =>
                  renderTalentRankingCard(
                    talent,
                    index + 1,
                    roleType
                  )
                )
                .join("")}
            </div>
          `
          : `
            <div class="empty-state talents-carnet-empty-state">
              <strong>Le portrait se dessine encore.</strong>
              <br /><br />
              ${escapeTalentsCarnetHTML(emptyText)}
            </div>
          `
      }
    </section>
  `;
}

function renderTalentsCarnetPage(
  movies,
  directingTalents,
  actingTalents
) {
  if (!talentsCarnetContent) {
    return;
  }

  const reviewedMoviesCount = movies.length;

  document.title = "Les talents de mon carnet — Ciné Mojito";

  talentsCarnetContent.innerHTML = `
    <section class="talents-carnet-hero">
      <div class="eyebrow red-eyebrow">
        Les traces de ton carnet
      </div>

      <h1>
        Les talents qui reviennent dans ton carnet
      </h1>

      <p>
        Les films que tu notes dessinent peu à peu les visages
        et les cinémas auxquels tu reviens.
      </p>

      <div class="talents-carnet-summary">
        <strong>${reviewedMoviesCount}</strong>
        <span>
          film${reviewedMoviesCount > 1 ? "s" : ""}
          dans ton carnet
        </span>
      </div>
    </section>

    ${
      reviewedMoviesCount
        ? `
          ${renderTalentRankingSection(
            "directing",
            directingTalents,
            reviewedMoviesCount
          )}

          ${renderTalentRankingSection(
            "acting",
            actingTalents,
            reviewedMoviesCount
          )}
        `
        : `
          <div class="empty-state talents-carnet-empty-state">
            <strong>Ton carnet attend encore sa première séance.</strong>
            <br /><br />
            Chaque note ajoutée fera peu à peu apparaître
            les talents qui accompagnent ton cinéma.
            <br /><br />
            <a class="button-primary" href="index.html#critiques">
              Découvrir des films
            </a>
          </div>
        `
    }
  `;
}

function renderTalentsCarnetLoginState() {
  if (!talentsCarnetContent) {
    return;
  }

  talentsCarnetContent.innerHTML = `
    <section class="talents-carnet-hero">
      <div class="eyebrow red-eyebrow">
        Les traces de ton carnet
      </div>

      <h1>
        Les talents qui reviennent dans ton carnet
      </h1>

      <p>
        Connecte-toi pour découvrir les visages et les cinémas
        qui se dessinent à travers tes séances.
      </p>

      <button
        id="openTalentsCarnetLogin"
        class="button-primary"
        type="button"
      >
        Se connecter
      </button>
    </section>
  `;

  document
    .getElementById("openTalentsCarnetLogin")
    ?.addEventListener("click", () => {
      setAuthMode("login");
      openAuthModal();
    });
}

/* =====================================================
   CHARGEMENT
   ===================================================== */

async function loadTalentsCarnetPage() {
  if (!talentsCarnetContent || isLoadingTalentsCarnet) {
    return;
  }

  if (!currentUser) {
    renderTalentsCarnetLoginState();
    return;
  }

  isLoadingTalentsCarnet = true;

  renderTalentsCarnetLoading(
    "Lecture de ton carnet et de ses visages…"
  );

  try {
    const movies = await getMyReviewedMovies();

    if (!movies.length) {
      renderTalentsCarnetPage([], [], []);
      return;
    }

    const movieIds = movies.map((movie) => movie.id);

    let talents = await getMovieTalentsByMovieIds(movieIds);

    renderTalentsCarnetLoading(
      "Le carnet retrouve doucement les talents de tes films…"
    );

    await syncMissingMovieTalents(movies, talents);

    /*
      Relecture indispensable après l’enrichissement
      des anciens films du carnet.
    */
    talents = await getMovieTalentsByMovieIds(movieIds);

    const directingTalents = buildTalentRanking(
      movies,
      talents,
      "directing"
    );

    const actingTalents = buildTalentRanking(
      movies,
      talents,
      "acting"
    );

    renderTalentsCarnetPage(
      movies,
      directingTalents,
      actingTalents
    );
  } catch (error) {
    console.error(
      "Erreur de chargement des talents du carnet :",
      error
    );

    talentsCarnetContent.innerHTML = `
      <div class="empty-state talents-carnet-empty-state">
        <strong>Impossible de lire les talents de ton carnet.</strong>
        <br /><br />
        Réessaie dans quelques instants.
      </div>
    `;
  } finally {
    isLoadingTalentsCarnet = false;
  }
}

/* =====================================================
   INITIALISATION
   ===================================================== */

document.addEventListener("authChanged", () => {
  loadTalentsCarnetPage();
});

loadTalentsCarnetPage();
