
const talentPageContent = document.getElementById(
  "talentPageContent"
);

/* =====================================================
   ÉTAT DE LA FILMOGRAPHIE
   ===================================================== */

const TALENT_FILMOGRAPHY_PAGE_SIZE = 18;

let talentFilmographyCredits = [];
let talentCatalogMoviesByTmdbId = {};
let selectedTalentCreditFilter = "all";
let visibleTalentFilmCount = TALENT_FILMOGRAPHY_PAGE_SIZE;

/* =====================================================
   URL ET FORMATAGE
   ===================================================== */

function getTalentIdFromUrl() {
  const params = new URLSearchParams(window.location.search);

  const tmdbId = Number(params.get("tmdb"));

  return Number.isInteger(tmdbId) && tmdbId > 0
    ? tmdbId
    : null;
}

function formatTalentDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(`${dateValue}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function formatTalentDepartment(department) {
  const labels = {
    Acting: "Acteur·rice",
    Directing: "Réalisateur·rice",
    Writing: "Scénariste",
    Production: "Producteur·rice",
    Camera: "Image",
    Editing: "Montage",
    Sound: "Son",
    Art: "Direction artistique",
    CostumeAndMakeUp: "Costumes et maquillage"
  };

  return labels[department] || department || "Cinéma";
}

function formatTalentCredit(credit) {
  const labels = [];

  if (credit.role) {
    labels.push(credit.role);
  }

  if (credit.job) {
    labels.push(credit.job);
  }

  if (!labels.length && credit.department) {
    labels.push(credit.department);
  }

  return labels.join(" · ");
}

/* =====================================================
   FILTRES DE FILMOGRAPHIE
   ===================================================== */

function getTalentCreditFilterKey(label) {
  return String(label || "")
    .trim()
    .toLocaleLowerCase("fr-FR")
    .replace(/\s+/g, "-");
}

function formatTalentJobLabel(job) {
  const labels = {
    Director: "Réalisation",
    Writer: "Scénario",
    Screenplay: "Scénario",
    Story: "Histoire",
    Producer: "Production",
    "Executive Producer": "Production exécutive",
    "Original Film Writer": "Scénario original",
    Dialogue: "Dialogues",
    "Key Grip": "Machinerie",
    Grip: "Machinerie",
    Editor: "Montage",
    "Director of Photography": "Direction de la photographie",
    "Animation Director": "Réalisation animation",
    "Art Direction": "Direction artistique",
    "Production Design": "Décors",
    "Costume Design": "Costumes",
    "Makeup Artist": "Maquillage",
    "Sound Designer": "Conception sonore",
    "Original Music Composer": "Musique originale"
  };

  return labels[job] || job;
}

function getTalentFilmographyFilters(credits) {
  const filters = [
    {
      key: "all",
      label: "Toute la filmographie"
    }
  ];

  const hasActingCredits = credits.some(
    (credit) => Boolean(credit.role)
  );

  if (hasActingCredits) {
    filters.push({
      key: "acting",
      label: "Interprétation"
    });
  }

  const jobs = [
    ...new Set(
      credits
        .flatMap((credit) =>
          String(credit.job || "")
            .split(",")
            .map((job) => job.trim())
            .filter(Boolean)
        )
    )
  ].sort((first, second) =>
    formatTalentJobLabel(first).localeCompare(
      formatTalentJobLabel(second),
      "fr"
    )
  );

  jobs.forEach((job) => {
    filters.push({
      key: `job-${getTalentCreditFilterKey(job)}`,
      label: formatTalentJobLabel(job)
    });
  });

  return filters;
}

function creditMatchesTalentFilter(credit, filterKey) {
  if (filterKey === "all") {
    return true;
  }

  if (filterKey === "acting") {
    return Boolean(credit.role);
  }

  if (!filterKey.startsWith("job-")) {
    return true;
  }

  const requestedJob = filterKey.replace("job-", "");

  const creditJobs = String(credit.job || "")
    .split(",")
    .map((job) => getTalentCreditFilterKey(job))
    .filter(Boolean);

  return creditJobs.includes(requestedJob);
}

/* =====================================================
   ERREURS
   ===================================================== */

function renderTalentError(message) {
  if (!talentPageContent) {
    return;
  }

  talentPageContent.innerHTML = `
    <section class="talent-error">
      <h1>Cette fiche cinéma est introuvable.</h1>

      <p>${escapeHTML(message)}</p>

      <a class="button-primary" href="index.html#critiques">
        Retour aux microcritiques
      </a>
    </section>
  `;
}

/* =====================================================
   DONNÉES TMDB
   ===================================================== */

async function getTmdbTalentDetails(personId) {
  const { data, error } = await supabaseClient.functions.invoke(
    "tmdb-person-details",
    {
      body: {
        personId
      }
    }
  );

  if (error) {
    throw error;
  }

  if (!data?.result?.person) {
    throw new Error(
      "Les informations de ce talent sont introuvables."
    );
  }

  return data.result;
}

/* =====================================================
   DONNÉES CINÉ MOJITO
   ===================================================== */

async function getCatalogMoviesForTalentCredits(credits) {
  const tmdbIds = [
    ...new Set(
      (credits || [])
        .map((credit) => credit.tmdb_id)
        .filter(Boolean)
    )
  ];

  if (!tmdbIds.length) {
    return [];
  }

  const { data: movies, error } = await supabaseClient
    .from("movies")
    .select(`
      id,
      tmdb_id,
      title,
      original_title,
      release_year,
      director,
      poster_url,
      overview,
      genres
    `)
    .in("tmdb_id", tmdbIds);

  if (error) {
    throw error;
  }

  return movies || [];
}

async function getReviewsForTalentMovies(movies) {
  const movieIds = movies
    .map((movie) => movie.id)
    .filter(Boolean);

  if (!movieIds.length) {
    return [];
  }

  const { data: reviews, error } = await supabaseClient
    .from("reviews")
    .select(`
      id,
      user_id,
      rating,
      content,
      created_at,
      movies (
        id,
        title,
        original_title,
        release_year,
        director,
        poster_url,
        genres
      )
    `)
    .in("movie_id", movieIds)
    .eq("is_published", true)
    .order("created_at", {
      ascending: false
    });

  if (error) {
    throw error;
  }

  const profilesById = await getProfilesByUserIds(
    (reviews || []).map((review) => review.user_id)
  );

  const reviewsWithAuthors = addAuthorsToReviews(
    reviews || [],
    profilesById
  );

  return enrichReviews(reviewsWithAuthors);
}

/* =====================================================
   RENDU — HERO
   ===================================================== */

function renderTalentHero(person) {
  const name = person.name || "Talent non précisé·e";

  const department = formatTalentDepartment(
    person.known_for_department
  );

  const biography = person.biography?.trim();

  const birthDate = formatTalentDate(person.birthday);
  const deathDate = formatTalentDate(person.deathday);

  const lifeDates = [
    birthDate ? `Né·e le ${birthDate}` : "",
    person.place_of_birth
      ? `à ${person.place_of_birth}`
      : "",
    deathDate ? `Décédé·e le ${deathDate}` : ""
  ]
    .filter(Boolean)
    .join(" · ");

  const portraitMarkup = person.profile_url
    ? `
      <img
        src="${escapeHTML(person.profile_url)}"
        alt="Portrait de ${escapeHTML(name)}"
      />
    `
    : `
      <div class="talent-portrait-placeholder" aria-hidden="true">
        ${escapeHTML(name.charAt(0).toUpperCase() || "?")}
      </div>
    `;

  return `
    <section class="talent-hero-card">
      <div class="talent-portrait">
        ${portraitMarkup}
      </div>

      <div class="talent-main-info">
        <div class="eyebrow red-eyebrow">
          Cinéma
        </div>

        <h1>${escapeHTML(name)}</h1>

        <p class="talent-department">
          ${escapeHTML(department)}
        </p>

        ${
          lifeDates
            ? `
              <p class="talent-life-dates">
                ${escapeHTML(lifeDates)}
              </p>
            `
            : ""
        }

        ${
          biography
            ? `
              <div class="talent-biography">
                <p>${escapeHTML(biography)}</p>
              </div>
            `
            : `
              <p class="film-muted">
                Biographie non disponible pour le moment.
              </p>
            `
        }
      </div>
    </section>
  `;
}

/* =====================================================
   RENDU — FILMOGRAPHIE
   ===================================================== */

function renderTalentFilmography(
  credits,
  catalogMoviesByTmdbId
) {
  if (!credits.length) {
    return `
      <div class="empty-state">
        Filmographie non disponible pour le moment.
      </div>
    `;
  }

  const filters = getTalentFilmographyFilters(credits);

  let filteredCredits = credits.filter((credit) =>
    creditMatchesTalentFilter(
      credit,
      selectedTalentCreditFilter
    )
  );

  if (
    selectedTalentCreditFilter !== "all" &&
    filteredCredits.length === 0
  ) {
    selectedTalentCreditFilter = "all";
    visibleTalentFilmCount = TALENT_FILMOGRAPHY_PAGE_SIZE;
    filteredCredits = credits;
  }

  const visibleCredits = filteredCredits.slice(
    0,
    visibleTalentFilmCount
  );

  const hasMoreCredits =
    filteredCredits.length > visibleCredits.length;

  return `
    ${
      filters.length > 1
        ? `
          <div class="talent-filmography-filter-wrap">
            <label
              class="talent-filmography-filter-label"
              for="talentFilmographyFilter"
            >
              Afficher
            </label>

            <select
              id="talentFilmographyFilter"
              class="talent-filmography-select"
              aria-label="Filtrer la filmographie par poste"
            >
              ${filters
                .map(
                  (filter) => `
                    <option
                      value="${escapeHTML(filter.key)}"
                      ${
                        filter.key === selectedTalentCreditFilter
                          ? "selected"
                          : ""
                      }
                    >
                      ${escapeHTML(filter.label)}
                    </option>
                  `
                )
                .join("")}
            </select>
          </div>
        `
        : ""
    }

    <div class="talent-filmography-grid">
      ${visibleCredits
        .map((credit) => {
          const localMovie =
            catalogMoviesByTmdbId[credit.tmdb_id] || null;

          const title = credit.title || "Film sans titre";

          const releaseYear = credit.release_year || "—";

          const creditLabel = formatTalentCredit(credit);

          const movieUrl = localMovie?.id
            ? `film.html?id=${encodeURIComponent(localMovie.id)}`
            : `film.html?tmdb=${encodeURIComponent(
                credit.tmdb_id
              )}`;

          const posterMarkup = credit.poster_url
            ? `
              <img
                src="${escapeHTML(credit.poster_url)}"
                alt="Affiche de ${escapeHTML(title)}"
                loading="lazy"
              />
            `
            : `
              <div class="talent-film-poster-placeholder">
                <span>${escapeHTML(String(releaseYear))}</span>
                <strong>${escapeHTML(title)}</strong>
              </div>
            `;

          return `
            <article class="talent-film-card">
              <a
                class="talent-film-poster"
                href="${movieUrl}"
                title="Voir la fiche de ${escapeHTML(title)}"
              >
                ${posterMarkup}
              </a>

              <div class="talent-film-content">
                <h3>
                  <a href="${movieUrl}">
                    ${escapeHTML(title)}
                  </a>
                </h3>

                <p class="talent-film-year">
                  ${escapeHTML(String(releaseYear))}
                </p>

                ${
                  creditLabel
                    ? `
                      <p class="talent-film-credit">
                        ${escapeHTML(creditLabel)}
                      </p>
                    `
                    : ""
                }

                ${
                  localMovie
                    ? `
                      <span class="talent-film-in-carnet">
                        Dans Ciné Mojito
                      </span>
                    `
                    : ""
                }
              </div>
            </article>
          `;
        })
        .join("")}
    </div>

    ${
      hasMoreCredits
        ? `
          <div class="talent-filmography-more">
            <button
              class="button-secondary"
              type="button"
              id="showMoreTalentFilmsButton"
            >
              Voir plus de films
              <span>
                (${filteredCredits.length - visibleCredits.length})
              </span>
            </button>
          </div>
        `
        : ""
    }
  `;
}

function renderTalentFilmographyArea() {
  const area = document.getElementById(
    "talentFilmographyArea"
  );

  if (!area) {
    return;
  }

  area.innerHTML = renderTalentFilmography(
    talentFilmographyCredits,
    talentCatalogMoviesByTmdbId
  );

  setupTalentFilmographyInteractions();
}

function setupTalentFilmographyInteractions() {
  const filterSelect = document.getElementById(
    "talentFilmographyFilter"
  );

  if (filterSelect) {
    filterSelect.addEventListener("change", () => {
      selectedTalentCreditFilter =
        filterSelect.value || "all";

      visibleTalentFilmCount =
        TALENT_FILMOGRAPHY_PAGE_SIZE;

      renderTalentFilmographyArea();
    });
  }

  const showMoreButton = document.getElementById(
    "showMoreTalentFilmsButton"
  );

  if (showMoreButton) {
    showMoreButton.addEventListener("click", () => {
      visibleTalentFilmCount +=
        TALENT_FILMOGRAPHY_PAGE_SIZE;

      renderTalentFilmographyArea();
    });
  }
}

/* =====================================================
   RENDU — CRITIQUES CINÉ MOJITO
   ===================================================== */

function renderTalentReviews(reviews) {
  if (!reviews.length) {
    return `
      <div class="empty-state talent-reviews-empty-state">
        <strong>Le carnet n’a pas encore parlé de ces films.</strong>
        <br /><br />
        Les microcritiques liées à cette filmographie apparaîtront ici,
        au fil des séances.
      </div>
    `;
  }

  return `
    <div class="movies-grid talent-reviews-grid">
      ${reviews
        .map((review, index) =>
          createMovieCard(review, index)
        )
        .join("")}
    </div>
  `;
}

/* =====================================================
   RENDU — PAGE COMPLÈTE
   ===================================================== */

function renderTalentPage(result, catalogMovies, reviews) {
  if (!talentPageContent) {
    return;
  }

  const person = result.person || {};
  const credits = result.credits || [];

  const catalogMoviesByTmdbId = Object.fromEntries(
    (catalogMovies || []).map((movie) => [
      movie.tmdb_id,
      movie
    ])
  );

  talentFilmographyCredits = credits;
  talentCatalogMoviesByTmdbId =
    catalogMoviesByTmdbId;

  selectedTalentCreditFilter = "all";

  visibleTalentFilmCount =
    TALENT_FILMOGRAPHY_PAGE_SIZE;

  document.title =
    `${person.name || "Talent"} — Ciné Mojito`;

  talentPageContent.innerHTML = `
    ${renderTalentHero(person)}

    <section class="talent-section">
      <div class="talent-section-heading">
        <div>
          <div class="eyebrow red-eyebrow">
            Filmographie
          </div>

          <h2>Les films de son parcours</h2>
        </div>

        <span class="talent-filmography-count">
          ${credits.length} film${credits.length > 1 ? "s" : ""}
        </span>
      </div>

      <div id="talentFilmographyArea">
        ${renderTalentFilmography(
          credits,
          catalogMoviesByTmdbId
        )}
      </div>
    </section>

    <section class="talent-section talent-carnet-section">
      <div class="talent-section-heading">
        <div>
          <div class="eyebrow red-eyebrow">
            Ciné Mojito
          </div>

          <h2>Ce que le carnet en dit</h2>
        </div>

        <span class="talent-filmography-count">
          ${reviews.length} entrée${reviews.length > 1 ? "s" : ""}
        </span>
      </div>

      ${renderTalentReviews(reviews)}
    </section>
  `;

  setupTalentFilmographyInteractions();
  setupTalentLikeButtons();
}

/* =====================================================
   INTERACTIONS — LIKES
   ===================================================== */

function setupTalentLikeButtons() {
  document.querySelectorAll(".favorite").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!currentUser) {
        setAuthMode("login");
        openAuthModal();

        showAuthMessage(
          "Connecte-toi ou crée un compte pour aimer une microcritique.",
          "error"
        );

        return;
      }

      const reviewId = button.dataset.reviewId;

      if (!reviewId) {
        return;
      }

      button.disabled = true;

      try {
        await toggleReviewLike(reviewId);

        await initialiseTalentPage();
      } catch (error) {
        console.error(
          "Erreur de modification du like sur la fiche talent :",
          error
        );

        alert(
          `Impossible de modifier ton like : ${error.message}`
        );
      } finally {
        button.disabled = false;
      }
    });
  });
}

/* =====================================================
   INITIALISATION
   ===================================================== */

async function initialiseTalentPage() {
  const personId = getTalentIdFromUrl();

  if (!personId) {
    renderTalentError(
      "Aucun identifiant TMDB de talent n’a été transmis."
    );

    return;
  }

  if (talentPageContent) {
    talentPageContent.innerHTML = `
      <div class="talent-loading">
        Chargement de cette fiche cinéma…
      </div>
    `;
  }

  try {
    const result = await getTmdbTalentDetails(personId);

    const credits = result.credits || [];

    const catalogMovies =
      await getCatalogMoviesForTalentCredits(credits);

    const reviews =
      await getReviewsForTalentMovies(catalogMovies);

    renderTalentPage(result, catalogMovies, reviews);
  } catch (error) {
    console.error(
      "Erreur de chargement de la fiche talent :",
      error
    );

    renderTalentError(
      "Une erreur est survenue pendant le chargement de cette fiche."
    );
  }
}

document.addEventListener("authChanged", () => {
  initialiseTalentPage();
});

initialiseTalentPage();
