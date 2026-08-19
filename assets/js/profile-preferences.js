
const profilePreferencesModal = document.getElementById(
  "profilePreferencesModal"
);

const openProfilePreferencesButton = document.getElementById(
  "openProfilePreferencesButton"
);

const closeProfilePreferencesModalButton = document.getElementById(
  "closeProfilePreferencesModal"
);

const cancelProfilePreferencesButton = document.getElementById(
  "cancelProfilePreferencesButton"
);

const profilePreferencesForm = document.getElementById(
  "profilePreferencesForm"
);

const profilePreferencesMessage = document.getElementById(
  "profilePreferencesMessage"
);

const saveProfilePreferencesButton = document.getElementById(
  "saveProfilePreferencesButton"
);

const profilePreferencesUsername = document.getElementById(
  "profilePreferencesUsername"
);

const profilePreferencesBio = document.getElementById(
  "profilePreferencesBio"
);

const profilePreferencesQuote = document.getElementById(
  "profilePreferencesQuote"
);

const profilePreferencesBioCounter = document.getElementById(
  "profilePreferencesBioCounter"
);

const profilePreferencesQuoteCounter = document.getElementById(
  "profilePreferencesQuoteCounter"
);

const profileCompatibilityVisible = document.getElementById(
  "profileCompatibilityVisible"
);

const profileFavoriteMovieSearch = document.getElementById(
  "profileFavoriteMovieSearch"
);

const profileFavoriteMovieResults = document.getElementById(
  "profileFavoriteMovieResults"
);

const profileFavoriteMovieSelection = document.getElementById(
  "profileFavoriteMovieSelection"
);

const profileFavoriteActorSearch = document.getElementById(
  "profileFavoriteActorSearch"
);

const profileFavoriteActorResults = document.getElementById(
  "profileFavoriteActorResults"
);

const profileFavoriteActorSelection = document.getElementById(
  "profileFavoriteActorSelection"
);

const profileFavoriteDirectorSearch = document.getElementById(
  "profileFavoriteDirectorSearch"
);

const profileFavoriteDirectorResults = document.getElementById(
  "profileFavoriteDirectorResults"
);

const profileFavoriteDirectorSelection = document.getElementById(
  "profileFavoriteDirectorSelection"
);

let profileFavoriteMovie = null;
let profileFavoriteActor = null;
let profileFavoriteDirector = null;

let profileFavoriteMovieTimeout = null;
let profileFavoriteActorTimeout = null;
let profileFavoriteDirectorTimeout = null;

let profileFavoriteMovieQuery = "";
let profileFavoriteActorQuery = "";
let profileFavoriteDirectorQuery = "";

const selectedProfileGenres = new Set();
const selectedProfileDecades = new Set();

/* =====================================================
   OUTILS
   ===================================================== */

function getProfilePreferenceInitial(value) {
  return String(value || "?")
    .trim()
    .charAt(0)
    .toUpperCase() || "?";
}

function showProfilePreferencesMessage(message, type = "") {
  if (!profilePreferencesMessage) {
    return;
  }

  profilePreferencesMessage.textContent = message;
  profilePreferencesMessage.className = "profile-preferences-message";

  if (type) {
    profilePreferencesMessage.classList.add(type);
  }
}

function clearProfilePreferencesMessage() {
  showProfilePreferencesMessage("");
}

function updateProfilePreferenceCounter(input, counter) {
  if (!input || !counter) {
    return;
  }

  const maximum = Number(input.maxLength) || 0;
  const length = input.value.length;

  counter.textContent = `${length} / ${maximum}`;

  counter.classList.toggle(
    "limit-reached",
    Boolean(maximum && length >= maximum)
  );
}

function closeOtherProfileModals() {
  document.querySelectorAll(".modal-overlay.visible").forEach(
    (modal) => {
      if (modal.id !== "profilePreferencesModal") {
        modal.classList.remove("visible");
      }
    }
  );

  document.querySelectorAll(".modal.visible").forEach((modal) => {
    modal.classList.remove("visible");
  });
}

function openProfilePreferencesModal() {
  if (!currentUser || !profilePreferencesModal) {
    return;
  }

  closeOtherProfileModals();
  fillProfilePreferencesForm();

  profilePreferencesModal.classList.add("visible");
  document.body.classList.add("modal-open");

  window.setTimeout(() => {
    profilePreferencesUsername?.focus();
  }, 50);
}

function closeProfilePreferencesModal() {
  if (!profilePreferencesModal) {
    return;
  }

  profilePreferencesModal.classList.remove("visible");

  const anotherModalIsOpen = Boolean(
    document.querySelector(".modal-overlay.visible, .modal.visible")
  );

  document.body.classList.toggle("modal-open", anotherModalIsOpen);
}

/* =====================================================
   CHARGEMENT DES PRÉFÉRENCES
   ===================================================== */

async function getProfileFavoriteMovie(profileId) {
  const { data, error } = await supabaseClient
    .from("profile_favorite_movies")
    .select(`
      movie_id,
      movies (
        id,
        tmdb_id,
        title,
        original_title,
        release_year,
        director,
        poster_url,
        poster_path,
        overview,
        genres
      )
    `)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.movies || null;
}

async function getProfileFavoriteTalents(profileId) {
  const { data, error } = await supabaseClient
    .from("profile_favorite_talents")
    .select(`
      tmdb_id,
      talent_type,
      talent_name,
      profile_url
    `)
    .eq("profile_id", profileId);

  if (error) {
    throw error;
  }

  return data || [];
}

async function loadProfilePreferences() {
  if (!currentUser) {
    return;
  }

  try {
    const [profileResult, movieResult, talentsResult] =
      await Promise.all([
        supabaseClient
          .from("profiles")
          .select(`
            id,
            username,
            bio,
            avatar_url,
            favorite_quote,
            favorite_genres,
            favorite_decades,
            compatibility_visible
          `)
          .eq("id", currentUser.id)
          .single(),

        getProfileFavoriteMovie(currentUser.id),
        getProfileFavoriteTalents(currentUser.id)
      ]);

    if (profileResult.error) {
      throw profileResult.error;
    }

    currentProfile = {
      ...currentProfile,
      ...profileResult.data
    };

    profileFavoriteMovie = movieResult;

    const actor = talentsResult.find(
      (talent) => talent.talent_type === "acting"
    );

    const director = talentsResult.find(
      (talent) => talent.talent_type === "directing"
    );

    profileFavoriteActor = actor
      ? {
          tmdb_id: actor.tmdb_id,
          name: actor.talent_name,
          profile_url: actor.profile_url
        }
      : null;

    profileFavoriteDirector = director
      ? {
          tmdb_id: director.tmdb_id,
          name: director.talent_name,
          profile_url: director.profile_url
        }
      : null;


updateProfilePreferencesButton();
renderMyCinemaSection();
    
  } catch (error) {
    console.error(
      "Erreur de chargement des préférences de profil :",
      error
    );
  }
}

function updateProfilePreferencesButton() {
  if (!openProfilePreferencesButton) {
    return;
  }

  openProfilePreferencesButton.hidden = !currentUser;
}

/* =====================================================
   FORMULAIRE
   ===================================================== */

function updatePreferencePills() {
  document
    .querySelectorAll("[data-profile-genre]")
    .forEach((button) => {
      button.classList.toggle(
        "is-selected",
        selectedProfileGenres.has(button.dataset.profileGenre)
      );
    });

  document
    .querySelectorAll("[data-profile-decade]")
    .forEach((button) => {
      button.classList.toggle(
        "is-selected",
        selectedProfileDecades.has(button.dataset.profileDecade)
      );
    });
}

function fillProfilePreferencesForm() {
  if (!currentUser) {
    return;
  }

  clearProfilePreferencesMessage();

  if (profilePreferencesUsername) {
    profilePreferencesUsername.value =
      currentProfile?.username || "";
  }

  if (profilePreferencesBio) {
    profilePreferencesBio.value = currentProfile?.bio || "";
    updateProfilePreferenceCounter(
      profilePreferencesBio,
      profilePreferencesBioCounter
    );
  }

  if (profilePreferencesQuote) {
    profilePreferencesQuote.value =
      currentProfile?.favorite_quote || "";

    updateProfilePreferenceCounter(
      profilePreferencesQuote,
      profilePreferencesQuoteCounter
    );
  }

  if (profileCompatibilityVisible) {
    profileCompatibilityVisible.checked =
      currentProfile?.compatibility_visible !== false;
  }

  selectedProfileGenres.clear();

  (currentProfile?.favorite_genres || []).forEach((genre) => {
    selectedProfileGenres.add(genre);
  });

  selectedProfileDecades.clear();

  (currentProfile?.favorite_decades || []).forEach((decade) => {
    selectedProfileDecades.add(decade);
  });

  updatePreferencePills();

  renderProfileFavoriteMovieSelection();
  renderProfileFavoriteTalentSelection(
    profileFavoriteActor,
    profileFavoriteActorSelection,
    "acting"
  );

  renderProfileFavoriteTalentSelection(
    profileFavoriteDirector,
    profileFavoriteDirectorSelection,
    "directing"
  );

  clearProfileFavoriteResults(profileFavoriteMovieResults);
  clearProfileFavoriteResults(profileFavoriteActorResults);
  clearProfileFavoriteResults(profileFavoriteDirectorResults);

  if (profileFavoriteMovieSearch) {
    profileFavoriteMovieSearch.value = "";
  }

  if (profileFavoriteActorSearch) {
    profileFavoriteActorSearch.value = "";
  }

  if (profileFavoriteDirectorSearch) {
    profileFavoriteDirectorSearch.value = "";
  }
}

/* =====================================================
   AFFICHAGE DES FAVORIS SÉLECTIONNÉS
   ===================================================== */

function renderProfileFavoriteMovieSelection() {
  if (!profileFavoriteMovieSelection) {
    return;
  }

  if (!profileFavoriteMovie) {
    profileFavoriteMovieSelection.innerHTML = "";
    return;
  }

  const title = profileFavoriteMovie.title || "Film sans titre";
  const year = profileFavoriteMovie.release_year || "";
  const director = profileFavoriteMovie.director || "";
  const posterUrl = profileFavoriteMovie.poster_url || "";

  profileFavoriteMovieSelection.innerHTML = `
    <article class="profile-favorite-card">
      ${
        posterUrl
          ? `
            <img
              class="profile-favorite-movie-poster"
              src="${escapeHTML(posterUrl)}"
              alt="Affiche de ${escapeHTML(title)}"
            />
          `
          : `
            <div class="profile-favorite-movie-placeholder">
              ${escapeHTML(getProfilePreferenceInitial(title))}
            </div>
          `
      }

      <div class="profile-favorite-card-copy">
        <small>Film gardé tout près</small>
        <strong>${escapeHTML(title)}</strong>
        <span>
          ${escapeHTML(
            [year, director].filter(Boolean).join(" · ")
          )}
        </span>
      </div>

      <button
        class="profile-favorite-remove"
        type="button"
        data-remove-profile-favorite="movie"
        aria-label="Retirer ${escapeHTML(title)}"
      >
        Retirer
      </button>
    </article>
  `;

  setupProfileFavoriteRemoveButtons();
}

function renderProfileFavoriteTalentSelection(
  talent,
  container,
  talentType
) {
  if (!container) {
    return;
  }

  if (!talent) {
    container.innerHTML = "";
    return;
  }

  const name = talent.name || talent.talent_name || "Talent";
  const profileUrl = talent.profile_url || "";

  const label =
    talentType === "acting"
      ? "Voix à laquelle je reviens"
      : "Cinéma de prédilection";

  container.innerHTML = `
    <article class="profile-favorite-card profile-favorite-talent-card">
      ${
        profileUrl
          ? `
            <img
              class="profile-favorite-talent-portrait"
              src="${escapeHTML(profileUrl)}"
              alt="Portrait de ${escapeHTML(name)}"
            />
          `
          : `
            <div class="profile-favorite-talent-placeholder">
              ${escapeHTML(getProfilePreferenceInitial(name))}
            </div>
          `
      }

      <div class="profile-favorite-card-copy">
        <small>${escapeHTML(label)}</small>
        <strong>${escapeHTML(name)}</strong>
      </div>

      <button
        class="profile-favorite-remove"
        type="button"
        data-remove-profile-favorite="${talentType}"
        aria-label="Retirer ${escapeHTML(name)}"
      >
        Retirer
      </button>
    </article>
  `;

  setupProfileFavoriteRemoveButtons();
}

function setupProfileFavoriteRemoveButtons() {
  document
    .querySelectorAll("[data-remove-profile-favorite]")
    .forEach((button) => {
      button.onclick = () => {
        const target = button.dataset.removeProfileFavorite;

        if (target === "movie") {
          profileFavoriteMovie = null;
          renderProfileFavoriteMovieSelection();
        }

        if (target === "acting") {
          profileFavoriteActor = null;

          renderProfileFavoriteTalentSelection(
            null,
            profileFavoriteActorSelection,
            "acting"
          );
        }

        if (target === "directing") {
          profileFavoriteDirector = null;

          renderProfileFavoriteTalentSelection(
            null,
            profileFavoriteDirectorSelection,
            "directing"
          );
        }
      };
    });
}

function clearProfileFavoriteResults(container) {
  if (container) {
    container.innerHTML = "";
  }
}

/* =====================================================
   MON CINÉMA — AFFICHAGE DANS L'ESPACE PERSONNEL
   ===================================================== */

function getProfileCinemaDisplayData() {
  return {
    quote: String(currentProfile?.favorite_quote || "").trim(),

    genres: Array.isArray(currentProfile?.favorite_genres)
      ? currentProfile.favorite_genres
      : [],

    decades: Array.isArray(currentProfile?.favorite_decades)
      ? currentProfile.favorite_decades
      : [],

    movie: profileFavoriteMovie,
    actor: profileFavoriteActor,
    director: profileFavoriteDirector
  };
}

function renderProfileCinemaMovie(movie) {
  if (!movie) {
    return "";
  }

  const title = movie.title || "Film sans titre";
  const year = movie.release_year || "";
  const director = movie.director || "";

  const movieUrl = movie.id
    ? `film.html?id=${encodeURIComponent(movie.id)}`
    : movie.tmdb_id
      ? `film.html?tmdb=${encodeURIComponent(movie.tmdb_id)}`
      : "";

  const posterMarkup = movie.poster_url
    ? `
      <img
        src="${escapeHTML(movie.poster_url)}"
        alt="Affiche de ${escapeHTML(title)}"
        loading="lazy"
      />
    `
    : `
      <div class="profile-cinema-movie-placeholder">
        ${escapeHTML(getProfilePreferenceInitial(title))}
      </div>
    `;

  const metadata = [year, director]
    .filter(Boolean)
    .join(" · ");

  const content = `
    <div class="profile-cinema-movie-poster">
      ${posterMarkup}
    </div>

    <div class="profile-cinema-movie-copy">
      <span>Film gardé tout près</span>
      <strong>${escapeHTML(title)}</strong>

      ${
        metadata
          ? `<small>${escapeHTML(metadata)}</small>`
          : ""
      }
    </div>
  `;

  return movieUrl
    ? `
      <a
        class="profile-cinema-movie"
        href="${movieUrl}"
      >
        ${content}
      </a>
    `
    : `
      <div class="profile-cinema-movie">
        ${content}
      </div>
    `;
}

function renderProfileCinemaTalent(talent, type) {
  if (!talent) {
    return "";
  }

  const name = talent.name || talent.talent_name || "Talent";

  const label = type === "acting"
    ? "Voix à laquelle je reviens"
    : "Cinéma de prédilection";

  const portraitMarkup = talent.profile_url
    ? `
      <img
        src="${escapeHTML(talent.profile_url)}"
        alt="Portrait de ${escapeHTML(name)}"
        loading="lazy"
      />
    `
    : `
      <div class="profile-cinema-talent-placeholder">
        ${escapeHTML(getProfilePreferenceInitial(name))}
      </div>
    `;

  const content = `
    <div class="profile-cinema-talent-portrait">
      ${portraitMarkup}
    </div>

    <div class="profile-cinema-talent-copy">
      <span>${escapeHTML(label)}</span>
      <strong>${escapeHTML(name)}</strong>
    </div>
  `;

  return talent.tmdb_id
    ? `
      <a
        class="profile-cinema-talent"
        href="talent.html?tmdb=${encodeURIComponent(talent.tmdb_id)}"
      >
        ${content}
      </a>
    `
    : `
      <div class="profile-cinema-talent">
        ${content}
      </div>
    `;
}


function renderMyCinemaSection() {
  const profileHero = document.querySelector(".profile-hero-card");

  if (!profileHero) {
    return;
  }

  document.querySelector("#myCinemaSection")?.remove();

  if (!currentUser) {
    return;
  }

  const {
    quote,
    genres,
    decades,
    movie,
    actor,
    director
  } = getProfileCinemaDisplayData();

  const hasCinemaDetails = Boolean(
    quote ||
    movie ||
    actor ||
    director ||
    genres.length ||
    decades.length
  );

  const section = document.createElement("section");

  section.id = "myCinemaSection";
  section.className =
    "profile-cinema-section profile-cinema-compact-section";

  section.innerHTML = `
    <div class="profile-cinema-compact-top">
      ${
        quote
          ? `
            <p class="profile-cinema-discreet-quote">
              <span aria-hidden="true">«</span>
              ${escapeHTML(quote)}
              <span aria-hidden="true">»</span>
            </p>
          `
          : `<span class="profile-cinema-compact-spacer"></span>`
      }

      <button
        class="profile-cinema-edit-button"
        type="button"
        data-open-profile-preferences
      >
        Modifier mes préférences
      </button>
    </div>

    ${
      hasCinemaDetails
        ? `
          ${
            movie || actor || director
              ? `
                <div class="profile-cinema-favorites">
                  ${renderProfileCinemaMovie(movie)}

                  <div class="profile-cinema-talents">
                    ${renderProfileCinemaTalent(actor, "acting")}
                    ${renderProfileCinemaTalent(director, "directing")}
                  </div>
                </div>
              `
              : ""
          }

          ${
            genres.length || decades.length
              ? `
                <div class="profile-cinema-tags">
                  ${
                    genres.length
                      ? `
                        <div class="profile-cinema-tag-group">
                          <span>Genres</span>

                          <div>
                            ${genres
                              .map(
                                (genre) =>
                                  `<em>${escapeHTML(genre)}</em>`
                              )
                              .join("")}
                          </div>
                        </div>
                      `
                      : ""
                  }

                  ${
                    decades.length
                      ? `
                        <div class="profile-cinema-tag-group">
                          <span>Décennies</span>

                          <div>
                            ${decades
                              .map(
                                (decade) =>
                                  `<em>${escapeHTML(decade)}</em>`
                              )
                              .join("")}
                          </div>
                        </div>
                      `
                      : ""
                  }
                </div>
              `
              : ""
          }
        `
        : `
          <div class="profile-cinema-empty-state">
            <strong>Quelques repères pour dessiner ton cinéma.</strong>

            <p>
              Garde un film, une voix, un regard ou quelques époques
              près de ton carnet.
            </p>
          </div>
        `
    }
  `;

  profileHero.insertAdjacentElement("afterend", section);

  section
    .querySelector("[data-open-profile-preferences]")
    ?.addEventListener("click", openProfilePreferencesModal);
}



/* =====================================================
   RECHERCHE TMDB DÉDIÉE AU PROFIL
   ===================================================== */

async function searchProfileTmdb(query) {
  const { data, error } = await supabaseClient.functions.invoke(
    "tmdb-discover",
    {
      body: { query }
    }
  );

  if (!error) {
    return data?.results || [];
  }

  const fallback = await supabaseClient.functions.invoke(
    "tmdb-search",
    {
      body: { query }
    }
  );

  if (fallback.error) {
    throw fallback.error;
  }

  return fallback.data?.results || [];
}

function renderProfileMovieResults(results) {
  if (!profileFavoriteMovieResults) {
    return;
  }

  const movies = (results || [])
    .filter((result) => result?.type === "movie")
    .slice(0, 5);

  if (!movies.length) {
    profileFavoriteMovieResults.innerHTML = `
      <p class="profile-favorite-search-message">
        Aucun film trouvé.
      </p>
    `;

    return;
  }

  profileFavoriteMovieResults.innerHTML = movies
    .map((movie) => {
      const title = movie.title || "Film sans titre";
      const meta = [
        movie.release_year || "",
        movie.director || ""
      ]
        .filter(Boolean)
        .join(" · ");

      return `
        <button
          class="profile-favorite-result"
          type="button"
          data-profile-favorite-movie="${escapeHTML(
            String(movie.tmdb_id || "")
          )}"
        >
          ${
            movie.poster_url
              ? `
                <img
                  src="${escapeHTML(movie.poster_url)}"
                  alt=""
                />
              `
              : `
                <span class="profile-favorite-result-placeholder">
                  ${escapeHTML(getProfilePreferenceInitial(title))}
                </span>
              `
          }

          <span>
            <strong>${escapeHTML(title)}</strong>
            <small>${escapeHTML(meta)}</small>
          </span>
        </button>
      `;
    })
    .join("");

  movies.forEach((movie) => {
    const button = profileFavoriteMovieResults.querySelector(
      `[data-profile-favorite-movie="${CSS.escape(
        String(movie.tmdb_id || "")
      )}"]`
    );

    button?.addEventListener("click", () => {
      profileFavoriteMovie = movie;

      profileFavoriteMovieSearch.value = "";
      clearProfileFavoriteResults(profileFavoriteMovieResults);
      renderProfileFavoriteMovieSelection();
    });
  });
}

function renderProfileTalentResults(results, type) {
  const container =
    type === "acting"
      ? profileFavoriteActorResults
      : profileFavoriteDirectorResults;

  if (!container) {
    return;
  }

  const talents = (results || [])
    .filter((result) => result?.type === "person")
    .slice(0, 5);

  if (!talents.length) {
    container.innerHTML = `
      <p class="profile-favorite-search-message">
        Aucun talent trouvé.
      </p>
    `;

    return;
  }

  container.innerHTML = talents
    .map((talent) => {
      const name = talent.name || "Talent";
      const role =
        talent.known_for_department || "Cinéma";

      return `
        <button
          class="profile-favorite-result profile-favorite-talent-result"
          type="button"
          data-profile-favorite-talent="${escapeHTML(
            String(talent.tmdb_id || "")
          )}"
        >
          ${
            talent.profile_url
              ? `
                <img
                  src="${escapeHTML(talent.profile_url)}"
                  alt=""
                />
              `
              : `
                <span class="profile-favorite-result-placeholder">
                  ${escapeHTML(getProfilePreferenceInitial(name))}
                </span>
              `
          }

          <span>
            <strong>${escapeHTML(name)}</strong>
            <small>${escapeHTML(role)}</small>
          </span>
        </button>
      `;
    })
    .join("");

  talents.forEach((talent) => {
    const button = container.querySelector(
      `[data-profile-favorite-talent="${CSS.escape(
        String(talent.tmdb_id || "")
      )}"]`
    );

    button?.addEventListener("click", () => {
      const normalizedTalent = {
        tmdb_id: talent.tmdb_id,
        name: talent.name,
        profile_url: talent.profile_url || null
      };

      if (type === "acting") {
        profileFavoriteActor = normalizedTalent;
        profileFavoriteActorSearch.value = "";

        renderProfileFavoriteTalentSelection(
          profileFavoriteActor,
          profileFavoriteActorSelection,
          "acting"
        );
      } else {
        profileFavoriteDirector = normalizedTalent;
        profileFavoriteDirectorSearch.value = "";

        renderProfileFavoriteTalentSelection(
          profileFavoriteDirector,
          profileFavoriteDirectorSelection,
          "directing"
        );
      }

      clearProfileFavoriteResults(container);
    });
  });
}

function setupProfileFavoriteSearch(
  input,
  type,
  timeoutKey,
  queryKey
) {
  input?.addEventListener("input", () => {
    const query = input.value.trim();

    if (timeoutKey === "movie") {
      clearTimeout(profileFavoriteMovieTimeout);
    }

    if (timeoutKey === "acting") {
      clearTimeout(profileFavoriteActorTimeout);
    }

    if (timeoutKey === "directing") {
      clearTimeout(profileFavoriteDirectorTimeout);
    }

    if (query.length < 2) {
      if (type === "movie") {
        profileFavoriteMovieQuery = "";
        clearProfileFavoriteResults(profileFavoriteMovieResults);
      }

      if (type === "acting") {
        profileFavoriteActorQuery = "";
        clearProfileFavoriteResults(profileFavoriteActorResults);
      }

      if (type === "directing") {
        profileFavoriteDirectorQuery = "";
        clearProfileFavoriteResults(profileFavoriteDirectorResults);
      }

      return;
    }

    const runSearch = async () => {
      if (type === "movie") {
        profileFavoriteMovieQuery = query;
      }

      if (type === "acting") {
        profileFavoriteActorQuery = query;
      }

      if (type === "directing") {
        profileFavoriteDirectorQuery = query;
      }

      try {
        const results = await searchProfileTmdb(query);

        const stillCurrent =
          (type === "movie" &&
            profileFavoriteMovieQuery === query) ||
          (type === "acting" &&
            profileFavoriteActorQuery === query) ||
          (type === "directing" &&
            profileFavoriteDirectorQuery === query);

        if (!stillCurrent) {
          return;
        }

        if (type === "movie") {
          renderProfileMovieResults(results);
        } else {
          renderProfileTalentResults(results, type);
        }
      } catch (error) {
        console.error(
          "Erreur de recherche des préférences cinéma :",
          error
        );
      }
    };

    const timeout = window.setTimeout(runSearch, 350);

    if (timeoutKey === "movie") {
      profileFavoriteMovieTimeout = timeout;
    }

    if (timeoutKey === "acting") {
      profileFavoriteActorTimeout = timeout;
    }

    if (timeoutKey === "directing") {
      profileFavoriteDirectorTimeout = timeout;
    }
  });
}

/* =====================================================
   SAUVEGARDE
   ===================================================== */

async function getOrCreateProfileCatalogMovie(movie) {
  if (!movie?.tmdb_id) {
    throw new Error("Le film sélectionné ne possède pas d’identifiant TMDB.");
  }

  const { data: existingMovie, error: searchError } =
    await supabaseClient
      .from("movies")
      .select("id")
      .eq("tmdb_id", movie.tmdb_id)
      .maybeSingle();

  if (searchError) {
    throw searchError;
  }

  if (existingMovie) {
    return existingMovie;
  }

  const { data: createdMovie, error: createError } =
    await supabaseClient
      .from("movies")
      .insert({
        tmdb_id: movie.tmdb_id,
        title: movie.title || "Film sans titre",
        original_title: movie.original_title || "",
        release_year: movie.release_year || null,
        director: movie.director || "",
        poster_path: movie.poster_path || null,
        poster_url: movie.poster_url || null,
        overview: movie.overview || "",
        genres: movie.genres || [],
        created_by: currentUser.id
      })
      .select("id")
      .single();

  if (createError?.code === "23505") {
    const { data: concurrentMovie, error: retryError } =
      await supabaseClient
        .from("movies")
        .select("id")
        .eq("tmdb_id", movie.tmdb_id)
        .maybeSingle();

    if (retryError) {
      throw retryError;
    }

    if (concurrentMovie) {
      return concurrentMovie;
    }
  }

  if (createError) {
    throw createError;
  }

  return createdMovie;
}

async function saveProfileFavoriteMovie() {
  if (!profileFavoriteMovie) {
    const { error } = await supabaseClient
      .from("profile_favorite_movies")
      .delete()
      .eq("profile_id", currentUser.id);

    if (error) {
      throw error;
    }

    return;
  }

  const movie = await getOrCreateProfileCatalogMovie(
    profileFavoriteMovie
  );

  const { error } = await supabaseClient
    .from("profile_favorite_movies")
    .upsert(
      {
        profile_id: currentUser.id,
        movie_id: movie.id
      },
      {
        onConflict: "profile_id"
      }
    );

  if (error) {
    throw error;
  }
}

async function saveProfileFavoriteTalent(talent, talentType) {
  if (!talent) {
    const { error } = await supabaseClient
      .from("profile_favorite_talents")
      .delete()
      .eq("profile_id", currentUser.id)
      .eq("talent_type", talentType);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabaseClient
    .from("profile_favorite_talents")
    .upsert(
      {
        profile_id: currentUser.id,
        tmdb_id: talent.tmdb_id,
        talent_type: talentType,
        talent_name: talent.name,
        profile_url: talent.profile_url || null
      },
      {
        onConflict: "profile_id,talent_type"
      }
    );

  if (error) {
    throw error;
  }
}

async function saveProfilePreferences(event) {
  event.preventDefault();

  if (!currentUser) {
    return;
  }

  const username = profilePreferencesUsername.value.trim();
  const bio = profilePreferencesBio.value.trim();
  const favoriteQuote = profilePreferencesQuote.value.trim();

  if (username.length < 3 || username.length > 18) {
    showProfilePreferencesMessage(
      "Ton pseudo doit contenir entre 3 et 18 caractères.",
      "error"
    );

    profilePreferencesUsername.focus();
    return;
  }

  saveProfilePreferencesButton.disabled = true;
  saveProfilePreferencesButton.textContent = "Enregistrement…";

  try {
    const profilePayload = {
      username,
      bio: bio || null,
      favorite_quote: favoriteQuote || null,
      favorite_genres: [...selectedProfileGenres],
      favorite_decades: [...selectedProfileDecades],
      compatibility_visible:
        profileCompatibilityVisible.checked
    };

    const { data: updatedProfile, error: profileError } =
      await supabaseClient
        .from("profiles")
        .update(profilePayload)
        .eq("id", currentUser.id)
        .select(`
          id,
          username,
          bio,
          avatar_url,
          favorite_quote,
          favorite_genres,
          favorite_decades,
          compatibility_visible,
          is_admin
        `)
        .single();

    if (profileError) {
      throw profileError;
    }

    await Promise.all([
      saveProfileFavoriteMovie(),
      saveProfileFavoriteTalent(
        profileFavoriteActor,
        "acting"
      ),
      saveProfileFavoriteTalent(
        profileFavoriteDirector,
        "directing"
      )
    ]);

    currentProfile = {
      ...currentProfile,
      ...updatedProfile
    };

    document.dispatchEvent(
      new CustomEvent("authChanged", {
        detail: {
          user: currentUser,
          profile: currentProfile
        }
      })
    );

    showProfilePreferencesMessage(
      "Ton profil est enregistré. Ton cinéma prend doucement sa place. ✨",
      "success"
    );

    window.setTimeout(() => {
      closeProfilePreferencesModal();
    }, 900);
  } catch (error) {
    console.error(
      "Erreur d’enregistrement du profil :",
      error
    );

    const duplicateUsername =
      error?.code === "23505" ||
      String(error?.message || "")
        .toLowerCase()
        .includes("username");

    showProfilePreferencesMessage(
      duplicateUsername
        ? "Ce pseudo est déjà utilisé. Essaie une autre variation."
        : `Impossible d’enregistrer ton profil : ${error.message}`,
      "error"
    );
  } finally {
    saveProfilePreferencesButton.disabled = false;
    saveProfilePreferencesButton.textContent =
      "Enregistrer mon profil";
  }
}

/* =====================================================
   INITIALISATION
   ===================================================== */

function setupProfilePreferences() {
  openProfilePreferencesButton?.addEventListener(
    "click",
    openProfilePreferencesModal
  );

  closeProfilePreferencesModalButton?.addEventListener(
    "click",
    closeProfilePreferencesModal
  );

  cancelProfilePreferencesButton?.addEventListener(
    "click",
    closeProfilePreferencesModal
  );

  profilePreferencesModal?.addEventListener("click", (event) => {
    if (event.target === profilePreferencesModal) {
      closeProfilePreferencesModal();
    }
  });

  profilePreferencesBio?.addEventListener("input", () => {
    updateProfilePreferenceCounter(
      profilePreferencesBio,
      profilePreferencesBioCounter
    );
  });

  profilePreferencesQuote?.addEventListener("input", () => {
    updateProfilePreferenceCounter(
      profilePreferencesQuote,
      profilePreferencesQuoteCounter
    );
  });

  document
    .querySelectorAll("[data-profile-genre]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const genre = button.dataset.profileGenre;

        if (selectedProfileGenres.has(genre)) {
          selectedProfileGenres.delete(genre);
        } else {
          selectedProfileGenres.add(genre);
        }

        updatePreferencePills();
      });
    });

  document
    .querySelectorAll("[data-profile-decade]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const decade = button.dataset.profileDecade;

        if (selectedProfileDecades.has(decade)) {
          selectedProfileDecades.delete(decade);
        } else {
          selectedProfileDecades.add(decade);
        }

        updatePreferencePills();
      });
    });

  setupProfileFavoriteSearch(
    profileFavoriteMovieSearch,
    "movie",
    "movie",
    "profileFavoriteMovieQuery"
  );

  setupProfileFavoriteSearch(
    profileFavoriteActorSearch,
    "acting",
    "acting",
    "profileFavoriteActorQuery"
  );

  setupProfileFavoriteSearch(
    profileFavoriteDirectorSearch,
    "directing",
    "directing",
    "profileFavoriteDirectorQuery"
  );

  profilePreferencesForm?.addEventListener(
    "submit",
    saveProfilePreferences
  );

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      profilePreferencesModal?.classList.contains("visible")
    ) {
      closeProfilePreferencesModal();
    }
  });

  document.addEventListener("authChanged", async () => {
    await loadProfilePreferences();
    updateProfilePreferencesButton();
  });
}

setupProfilePreferences();
loadProfilePreferences();
