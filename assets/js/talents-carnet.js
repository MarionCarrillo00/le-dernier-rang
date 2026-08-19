
/* =====================================================
   CINÉ MOJITO — TALENTS DU CARNET

   Modes :
   - Privé : talents-carnet.html
   - Public : talents-carnet.html?id=<profile.id>

   Classement basé sur les films du carnet :
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

function getMemberIdFromTalentsCarnetUrl() {
  const url = new URL(window.location.href);
  const memberId = String(url.searchParams.get("id") || "").trim();

  return memberId || null;
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
    ? `${count} films dans le carnet`
    : "1 film dans le carnet";
}

/* =====================================================
   PROFIL PUBLIC
   ===================================================== */

async function getPublicTalentsCarnetProfile(memberId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, username")
    .eq("id", memberId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Ce membre est introuvable.");
  }

  return data;
}

/* =====================================================
   FILMS DU CARNET
   ===================================================== */

async function getReviewedMovies(userId, isPublicMode = false) {
  let query = supabaseClient
    .from("reviews")
    .select(`
      movie_id,
      movies (
        id,
        tmdb_id,
        title
      )
    `)
    .eq("user_id", userId);

  /*
    En mode public, seules les entrées publiées peuvent
    contribuer au classement du membre.
  */
  if (isPublicMode) {
    query = query.eq("is_published", true);
  }

  const { data, error } = await query;

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
  L’enrichissement TMDB ne se fait que dans le carnet privé :
  une consultation publique ne doit jamais déclencher
  d’écriture dans la base de données.
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
   CALCUL DU CLASSEMENT
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

function renderTalentRankingSection(roleType, talents) {
  const isDirecting = roleType === "directing";

  const eyebrow = isDirecting
    ? "Derrière la caméra"
    : "À l’écran";

  const title = isDirecting
    ? "Les cinémas auxquels ce carnet revient"
    : "Les visages qui reviennent dans ce carnet";

  const emptyText = isDirecting
    ? "Ce carnet n’a pas encore assez de données de réalisation pour dessiner cette partie de son cinéma."
    : "Ce carnet n’a pas encore assez de visages pour dessiner cette partie de ses habitudes de spectateur·rice.";

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
  actingTalents,
  options = {}
) {
  if (!talentsCarnetContent) {
    return;
  }

  const {
    isPublicMode = false,
    profile = null
  } = options;

  const reviewedMoviesCount = movies.length;

  const profileName = profile?.username || "ce membre";

  const pageTitle = isPublicMode
    ? `Les talents du carnet de ${profileName} — Ciné Mojito`
    : "Les talents de mon carnet — Ciné Mojito";

  const title = isPublicMode
    ? `Les talents du carnet de ${profileName}`
    : "Les talents de ton carnet";

  const description = isPublicMode
    ? "Les films publics de ce carnet dessinent peu à peu les visages et les cinémas auxquels cette personne revient."
    : "Les films que tu notes dessinent peu à peu les visages et les cinémas auxquels tu reviens.";

  document.title = pageTitle;

  talentsCarnetContent.innerHTML = `
    <section class="talents-carnet-hero">
      <div class="eyebrow red-eyebrow">
        ${
          isPublicMode
            ? "Les traces de son carnet"
            : "Les traces de ton carnet"
        }
      </div>

      <h1>
        ${escapeTalentsCarnetHTML(title)}
      </h1>

      <p>
        ${escapeTalentsCarnetHTML(description)}
      </p>

      <div class="talents-carnet-summary">
        <strong>${reviewedMoviesCount}</strong>

        <span>
          film${reviewedMoviesCount > 1 ? "s" : ""}
          dans ${
            isPublicMode
              ? "ce carnet"
              : "ton carnet"
          }
        </span>
      </div>
    </section>

    ${
      reviewedMoviesCount
        ? `
          ${renderTalentRankingSection(
            "directing",
            directingTalents
          )}

          ${renderTalentRankingSection(
            "acting",
            actingTalents
          )}
        `
        : `
          <div class="empty-state talents-carnet-empty-state">
            <strong>
              ${
                isPublicMode
                  ? "Ce carnet ne contient pas encore assez de séances publiques."
                  : "Ton carnet attend encore sa première séance."
              }
            </strong>

            <br /><br />

            ${
              isPublicMode
                ? "Les talents apparaîtront ici au fil des films publiés dans ce carnet."
                : `
                  Chaque note ajoutée fera peu à peu apparaître
                  les talents qui accompagnent ton cinéma.
                  <br /><br />
                  <a class="button-primary" href="index.html#critiques">
                    Découvrir des films
                  </a>
                `
            }
          </div>
        `
    }
  `;
}

function renderTalentsCarnetLoginState() {
  if (!talentsCarnetContent) {
    return;
  }

  document.title = "Les talents de mon carnet — Ciné Mojito";

  talentsCarnetContent.innerHTML = `
    <section class="talents-carnet-hero">
      <div class="eyebrow red-eyebrow">
        Les traces de ton carnet
      </div>

      <h1>
        Les talents de ton carnet
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

function renderTalentsCarnetError(message) {
  if (!talentsCarnetContent) {
    return;
  }

  talentsCarnetContent.innerHTML = `
    <div class="empty-state talents-carnet-empty-state">
      <strong>Impossible de lire les talents de ce carnet.</strong>
      <br /><br />
      ${escapeTalentsCarnetHTML(message)}
    </div>
  `;
}

/* =====================================================
   CHARGEMENT — MODE PRIVÉ
   ===================================================== */

async function loadPrivateTalentsCarnetPage() {
  if (!currentUser) {
    renderTalentsCarnetLoginState();
    return;
  }

  renderTalentsCarnetLoading(
    "Lecture de ton carnet et de ses visages…"
  );

  const movies = await getReviewedMovies(currentUser.id);

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
}

/* =====================================================
   CHARGEMENT — MODE PUBLIC
   ===================================================== */

async function loadPublicTalentsCarnetPage(memberId) {
  renderTalentsCarnetLoading(
    "Lecture de ce carnet et de ses talents…"
  );

  const [profile, movies] = await Promise.all([
    getPublicTalentsCarnetProfile(memberId),
    getReviewedMovies(memberId, true)
  ]);

  if (!movies.length) {
    renderTalentsCarnetPage([], [], [], {
      isPublicMode: true,
      profile
    });

    return;
  }

  const movieIds = movies.map((movie) => movie.id);

  /*
    Lecture uniquement : aucun enrichissement TMDB,
    aucune écriture lors d’une consultation publique.
  */
  const talents = await getMovieTalentsByMovieIds(movieIds);

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
    actingTalents,
    {
      isPublicMode: true,
      profile
    }
  );
}

/* =====================================================
   INITIALISATION
   ===================================================== */

async function loadTalentsCarnetPage() {
  if (!talentsCarnetContent || isLoadingTalentsCarnet) {
    return;
  }

  isLoadingTalentsCarnet = true;

  try {
    const memberId = getMemberIdFromTalentsCarnetUrl();

    if (memberId) {
      await loadPublicTalentsCarnetPage(memberId);
    } else {
      await loadPrivateTalentsCarnetPage();
    }
  } catch (error) {
    console.error(
      "Erreur de chargement des talents du carnet :",
      error
    );

    renderTalentsCarnetError(
      "Réessaie dans quelques instants."
    );
  } finally {
    isLoadingTalentsCarnet = false;
  }
}

/*
  Le mode privé doit se rafraîchir après connexion/déconnexion.
  Le mode public reste indépendant de la session active.
*/
document.addEventListener("authChanged", () => {
  if (!getMemberIdFromTalentsCarnetUrl()) {
    loadTalentsCarnetPage();
  }
});

loadTalentsCarnetPage();
