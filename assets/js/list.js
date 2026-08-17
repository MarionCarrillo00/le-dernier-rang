
const listPageContent = document.getElementById("listPageContent");

const watchlistReviewModal = document.getElementById(
  "watchlistReviewModal"
);

const watchlistReviewForm = document.getElementById(
  "watchlistReviewForm"
);

const watchlistReviewFilm = document.getElementById(
  "watchlistReviewFilm"
);

const watchlistReviewRating = document.getElementById(
  "watchlistReviewRating"
);

const watchlistReviewContent = document.getElementById(
  "watchlistReviewContent"
);

const watchlistReviewCharacterCounter = document.getElementById(
  "watchlistReviewCharacterCounter"
);

const saveWatchlistReviewButton = document.getElementById(
  "saveWatchlistReviewButton"
);

const closeWatchlistReviewModalButton = document.getElementById(
  "closeWatchlistReviewModal"
);

const cancelWatchlistReviewButton = document.getElementById(
  "cancelWatchlistReviewButton"
);

let currentList = null;
let selectedWishlistMovie = null;

let currentListMovies = [];
let currentListOwnerName = "";
let currentListIsOwner = false;
let currentListIsWishlist = false;

let selectedListSort = "added_desc";
let selectedListGenre = "Tous";

function getListIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function renderListError(message) {
  listPageContent.innerHTML = `
    <div class="film-error">
      <h1>Cette liste est introuvable.</h1>

      <p>${escapeHTML(message)}</p>

      <a class="button-primary" href="profil.html">
        Retour à mon espace
      </a>
    </div>
  `;
}

function getListMovieLabel(count) {
  return count > 1 ? "films" : "film";
}

/* =====================================================
   TRI DES FILMS D’UNE LISTE
   ===================================================== */

function getListSortLabel(sortValue) {
  const labels = {
    added_desc: "Ajouts récents",
    added_asc: "Ajouts les plus anciens",
    title_asc: "Titre, A → Z",
    year_desc: "Année, récente → ancienne",
    year_asc: "Année, ancienne → récente"
  };

  return labels[sortValue] || labels.added_desc;
}

function sortListMovies(movies, sortValue) {
  const safeMovies = [...(movies || [])];

  return safeMovies.sort((firstMovie, secondMovie) => {
    const firstTitle = String(
      firstMovie.title || ""
    ).localeCompare(
      String(secondMovie.title || ""),
      "fr",
      {
        sensitivity: "base"
      }
    );

    const firstYear = Number(firstMovie.release_year || 0);
    const secondYear = Number(secondMovie.release_year || 0);

    const firstAddedAt = new Date(
      firstMovie.added_at || 0
    ).getTime();

    const secondAddedAt = new Date(
      secondMovie.added_at || 0
    ).getTime();

    if (sortValue === "added_asc") {
      return firstAddedAt - secondAddedAt;
    }

    if (sortValue === "title_asc") {
      return firstTitle;
    }

    if (sortValue === "year_desc") {
      if (secondYear !== firstYear) {
        return secondYear - firstYear;
      }

      return firstTitle;
    }

    if (sortValue === "year_asc") {
      if (firstYear !== secondYear) {
        return firstYear - secondYear;
      }

      return firstTitle;
    }

    /* Tri par défaut : derniers ajouts en premier */
    return secondAddedAt - firstAddedAt;
  });
}

function renderListSortControl() {
  return `
    <label class="list-sort-control">
      <span>Trier par</span>

      <select
        id="listSortSelect"
        aria-label="Trier les films de cette liste"
      >
        <option
          value="added_desc"
          ${selectedListSort === "added_desc" ? "selected" : ""}
        >
          Ajouts récents
        </option>

        <option
          value="added_asc"
          ${selectedListSort === "added_asc" ? "selected" : ""}
        >
          Ajouts les plus anciens
        </option>

        <option
          value="title_asc"
          ${selectedListSort === "title_asc" ? "selected" : ""}
        >
          Titre, A → Z
        </option>

        <option
          value="year_desc"
          ${selectedListSort === "year_desc" ? "selected" : ""}
        >
          Année, récente → ancienne
        </option>

        <option
          value="year_asc"
          ${selectedListSort === "year_asc" ? "selected" : ""}
        >
          Année, ancienne → récente
        </option>
      </select>
    </label>
  `;
}

/* =====================================================
   FILTRES DE GENRES
   ===================================================== */

const LIST_GENRE_EDITORIAL_ORDER = [
  "Drame",
  "Comédie",
  "Romance",
  "Horreur",
  "Animation",
  "Science-fiction",
  "Thriller",
  "Documentaire",
  "Western"
];

function normalizeListGenre(genre) {
  return String(genre || "")
    .trim()
    .replace(/\s+/g, " ");
}

function getMovieGenres(movie) {
  if (!movie?.genres) {
    return [];
  }

  if (Array.isArray(movie.genres)) {
    return movie.genres
      .map(normalizeListGenre)
      .filter(Boolean);
  }

  /*
    Sécurité si, un jour, les genres sont récupérés
    sous forme de texte plutôt que sous forme de tableau.
  */
  return String(movie.genres)
    .split(",")
    .map(normalizeListGenre)
    .filter(Boolean);
}

function getListAvailableGenres(movies) {
  const genresByNormalizedName = new Map();

  (movies || []).forEach((movie) => {
    getMovieGenres(movie).forEach((genre) => {
      const normalizedKey = genre.toLocaleLowerCase("fr-FR");

      if (!genresByNormalizedName.has(normalizedKey)) {
        genresByNormalizedName.set(normalizedKey, genre);
      }
    });
  });

  const availableGenres = [...genresByNormalizedName.values()];

  return availableGenres.sort((firstGenre, secondGenre) => {
    const firstIndex = LIST_GENRE_EDITORIAL_ORDER.indexOf(firstGenre);
    const secondIndex = LIST_GENRE_EDITORIAL_ORDER.indexOf(secondGenre);

    const firstIsEditorialGenre = firstIndex !== -1;
    const secondIsEditorialGenre = secondIndex !== -1;

    if (firstIsEditorialGenre && secondIsEditorialGenre) {
      return firstIndex - secondIndex;
    }

    if (firstIsEditorialGenre) {
      return -1;
    }

    if (secondIsEditorialGenre) {
      return 1;
    }

    return firstGenre.localeCompare(secondGenre, "fr", {
      sensitivity: "base"
    });
  });
}

function filterListMoviesByGenre(movies, genre) {
  if (!genre || genre === "Tous") {
    return [...(movies || [])];
  }

  const normalizedSelectedGenre = normalizeListGenre(
    genre
  ).toLocaleLowerCase("fr-FR");

  return (movies || []).filter((movie) =>
    getMovieGenres(movie).some(
      (movieGenre) =>
        movieGenre.toLocaleLowerCase("fr-FR") ===
        normalizedSelectedGenre
    )
  );
}

function renderListGenreFilters(movies) {
  const availableGenres = getListAvailableGenres(movies);

  /*
    Si le genre précédemment sélectionné n’existe plus
    après un rechargement de la liste, retour à "Tous".
  */
  const selectedGenreStillExists =
    selectedListGenre === "Tous" ||
    availableGenres.some(
      (genre) =>
        genre.toLocaleLowerCase("fr-FR") ===
        selectedListGenre.toLocaleLowerCase("fr-FR")
    );

  if (!selectedGenreStillExists) {
    selectedListGenre = "Tous";
  }

  if (!availableGenres.length) {
    return "";
  }

  const genres = ["Tous", ...availableGenres];

  return `
    <div
      class="list-genre-filters"
      role="group"
      aria-label="Filtrer les films par genre"
    >
      ${genres
        .map((genre) => {
          const isActive =
            genre.toLocaleLowerCase("fr-FR") ===
            selectedListGenre.toLocaleLowerCase("fr-FR");

          return `
            <button
              class="list-genre-filter ${isActive ? "is-active" : ""}"
              type="button"
              data-list-genre="${escapeHTML(genre)}"
              aria-pressed="${isActive ? "true" : "false"}"
            >
              ${escapeHTML(genre)}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderListBrowsingControls(movies) {
  return `
    <div class="list-browsing-controls">
      ${renderListGenreFilters(movies)}

      <div class="list-sort-wrapper">
        ${renderListSortControl()}
      </div>
    </div>
  `;
}

function getListGenreEmptyState() {
  return `
    <div class="empty-state list-genre-empty-state">
      <strong>
        Aucun film ${escapeHTML(
          selectedListGenre
        )} dans cette sélection.
      </strong>
      <br /><br />
      Essaie un autre genre ou retrouve tous les films de la liste.
    </div>
  `;
}


function formatListItemAddedDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function renderListMovieCard(movie, options = {}) {
  const {
    isWishlist = false,
    isOwner = false
  } = options;

  const posterUrl = movie.poster_url || "";
  const genres = movie.genres || [];
  const primaryGenre = genres[0] || "Cinéma";

  const title = movie.title || "Film sans titre";
  const releaseYear = movie.release_year || "—";
  const director =
    movie.director || "Réalisateur·rice non précisé·e";
  
  const addedDate = formatListItemAddedDate(movie.added_at);
  const movieUrl = `film.html?id=${encodeURIComponent(movie.id)}`;

  return `
    <article class="list-movie-card">
      <a
        class="list-movie-card-main"
        href="${movieUrl}"
        title="Voir la fiche de ${escapeHTML(title)}"
      >
        <div class="list-movie-poster">
          ${
            posterUrl
              ? `
                <img
                  src="${escapeHTML(posterUrl)}"
                  alt="Affiche de ${escapeHTML(title)}"
                  loading="lazy"
                />
              `
              : `
                <div class="list-movie-placeholder">
                  ${escapeHTML(title)}
                </div>
              `
          }
        </div>

        <div class="list-movie-content">
          <span class="list-movie-year">
            ${escapeHTML(String(releaseYear))}
          </span>

          <h2>${escapeHTML(title)}</h2>


<p>
  ${escapeHTML(director)}
</p>

${
  addedDate
    ? `
      <time
        class="list-movie-added-date"
        datetime="${escapeHTML(movie.added_at)}"
      >
        Ajouté le ${escapeHTML(addedDate)}
      </time>
    `
    : ""
}

<span class="tag">

            ${escapeHTML(primaryGenre)}
          </span>
        </div>
      </a>

      ${
        isWishlist && isOwner
          ? `
            <div class="wishlist-card-actions">
              <button
                class="wishlist-watched-button"
                type="button"
                data-wishlist-item-id="${escapeHTML(
                  movie.wishlist_item_id || ""
                )}"
                data-movie-id="${escapeHTML(movie.id || "")}"
                aria-label="Marquer ${escapeHTML(
                  title
                )} comme vu et l’ajouter à mon carnet"
              >
                Vu — ajouter à mon carnet
              </button>
            </div>
          `
          : ""
      }
    </article>
  `;
}

async function getListOwnerName(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data?.username) {
    return "Membre";
  }

  return data.username;
}


function renderStandardListPage(list, ownerName, movies, isOwner) {
  const movieCount = movies.length;
  const movieLabel = getListMovieLabel(movieCount);

  const filteredMovies = filterListMoviesByGenre(
    movies,
    selectedListGenre
  );

  const sortedMovies = sortListMovies(
    filteredMovies,
    selectedListSort
  );

  return `
    <section class="list-hero-card">
      <div>
        <div class="eyebrow red-eyebrow">
          ${list.is_public ? "Liste publique" : "Liste privée"}
        </div>

        <h1>${escapeHTML(list.title)}</h1>

        <p class="list-description">
          ${
            list.description
              ? escapeHTML(list.description)
              : "Une collection de films à garder tout près de soi."
          }
        </p>

        <div class="list-hero-meta">
          <span>Par ${escapeHTML(ownerName)}</span>
          <span>${movieCount} ${movieLabel}</span>
          <span>
            ${
              list.is_public
                ? "Visible par tous"
                : "Visible uniquement par moi"
            }
          </span>
        </div>
      </div>

      ${
        isOwner
          ? `
            <a class="button-secondary" href="profil.html">
              Gérer mes listes
            </a>
          `
          : ""
      }
    </section>

    <section class="list-movies-section">
      <div class="section-title list-section-title">
        <div>
          <div class="eyebrow red-eyebrow">La sélection</div>
          <h2>Les films de cette liste</h2>
        </div>
      </div>

      ${renderListBrowsingControls(movies)}

      <div class="list-movies-grid">
        ${
          !movies.length
            ? `
              <div class="empty-state">
                <strong>Cette liste est encore vide.</strong>
                <br /><br />
                ${
                  isOwner
                    ? "Ouvre une fiche film et ajoute-y un premier titre."
                    : "Sa créatrice n’y a pas encore ajouté de film."
                }
              </div>
            `
            : sortedMovies.length
              ? sortedMovies
                  .map((movie) => renderListMovieCard(movie))
                  .join("")
              : getListGenreEmptyState()
        }
      </div>
    </section>
  `;
}



function getPossessiveListTitle(ownerName) {
  const cleanName = String(ownerName || "Membre").trim();

  const startsWithVowel = /^[aàâäéèêëîïôöùûüÿæœh]/i.test(
    cleanName
  );

  return startsWithVowel
    ? `La liste d’${cleanName}`
    : `La liste de ${cleanName}`;
}


function renderWishlistPage(list, ownerName, movies, isOwner) {
  const movieCount = movies.length;
  const movieLabel = getListMovieLabel(movieCount);

  const filteredMovies = filterListMoviesByGenre(
    movies,
    selectedListGenre
  );

  const sortedMovies = sortListMovies(
    filteredMovies,
    selectedListSort
  );

  const hasCustomDescription = Boolean(
    list.description?.trim()
  );

  const wishlistTitle = getPossessiveListTitle(ownerName);

  return `
    <section class="list-hero-card wishlist-hero-card">
      <div>
        <div class="eyebrow red-eyebrow">
          À voir
        </div>

        <h1>${escapeHTML(wishlistTitle)}</h1>

        ${
          hasCustomDescription
            ? `
              <p class="list-description">
                ${escapeHTML(list.description.trim())}
              </p>
            `
            : ""
        }

        <div class="list-hero-meta">
          <span>${movieCount} ${movieLabel}</span>
          <span>Liste publique</span>
        </div>
      </div>

      ${
        isOwner
          ? `
            <a class="button-secondary" href="profil.html">
              Gérer ma liste
            </a>
          `
          : ""
      }
    </section>

    <section class="list-movies-section">
      <div class="section-title list-section-title">
        <div>
          <div class="eyebrow red-eyebrow">La sélection</div>
          <h2>Films à voir</h2>
        </div>
      </div>

      ${renderListBrowsingControls(movies)}

      <div class="list-movies-grid">
        ${
          !movies.length
            ? `
              <div class="empty-state">
                <strong>Cette liste est vide.</strong>
                <br /><br />
                ${
                  isOwner
                    ? "Ouvre une fiche film et ajoute-le à ta liste À voir."
                    : `${escapeHTML(
                        ownerName
                      )} n’a pas encore ajouté de film à cette liste.`
                }
              </div>
            `
            : sortedMovies.length
              ? sortedMovies
                  .map((movie) =>
                    renderListMovieCard(movie, {
                      isWishlist: true,
                      isOwner
                    })
                  )
                  .join("")
              : getListGenreEmptyState()
        }
      </div>
    </section>
  `;
}



function updateWatchlistReviewCharacterCounter() {
  if (
    !watchlistReviewContent ||
    !watchlistReviewCharacterCounter
  ) {
    return;
  }

  const maximum = Number(watchlistReviewContent.maxLength) || 1000;
  const length = watchlistReviewContent.value.length;

  watchlistReviewCharacterCounter.textContent =
    `${length} / ${maximum}`;

  watchlistReviewCharacterCounter.classList.toggle(
    "limit-reached",
    length >= maximum
  );
}

function openWatchlistReviewModal(movie) {
  if (
    !watchlistReviewModal ||
    !watchlistReviewFilm ||
    !watchlistReviewRating ||
    !watchlistReviewContent
  ) {
    return;
  }

  selectedWishlistMovie = movie;

  const title = movie.title || "Film sans titre";
  const releaseYear = movie.release_year || "—";
  const director =
    movie.director || "Réalisation non renseignée";

  const posterMarkup = movie.poster_url
    ? `
      <img
        src="${escapeHTML(movie.poster_url)}"
        alt="Affiche de ${escapeHTML(title)}"
      />
    `
    : `
      <div class="watchlist-review-film-placeholder">
        ${escapeHTML(title)}
      </div>
    `;

  watchlistReviewFilm.innerHTML = `
    <div class="watchlist-review-poster">
      ${posterMarkup}
    </div>

    <div>
      <span>${escapeHTML(String(releaseYear))}</span>
      <strong>${escapeHTML(title)}</strong>
      <p>${escapeHTML(director)}</p>
    </div>
  `;

  watchlistReviewForm?.reset();
  updateWatchlistReviewCharacterCounter();

  watchlistReviewModal.hidden = false;
  watchlistReviewModal.classList.add("visible");
  document.body.classList.add("modal-open");

  window.setTimeout(() => {
    watchlistReviewRating.focus();
  }, 50);
}

function closeWatchlistReviewModal() {
  if (!watchlistReviewModal) {
    return;
  }

  watchlistReviewModal.classList.remove("visible");
  watchlistReviewModal.hidden = true;
  document.body.classList.remove("modal-open");

  selectedWishlistMovie = null;

  watchlistReviewForm?.reset();
  updateWatchlistReviewCharacterCounter();
}

async function removeMovieFromWishlist(wishlistItemId) {
  if (!wishlistItemId || !currentList?.id) {
    throw new Error(
      "Impossible d’identifier ce film dans ta liste À voir."
    );
  }

  const { error } = await supabaseClient
    .from("movie_list_items")
    .delete()
    .eq("id", wishlistItemId)
    .eq("list_id", currentList.id);

  if (error) {
    throw error;
  }
}

function setupWishlistWatchedButtons() {
  document
    .querySelectorAll(".wishlist-watched-button")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const movieId = button.dataset.movieId;
        const wishlistItemId = button.dataset.wishlistItemId;

        if (!movieId || !wishlistItemId) {
          return;
        }

        const movie = {
          ...currentList?.moviesById?.[movieId],
          id: movieId,
          wishlist_item_id: wishlistItemId
        };

        if (!movie?.id) {
          alert(
            "Impossible de préparer cette séance pour le moment."
          );
          return;
        }

        openWatchlistReviewModal(movie);
      });
    });
}

function renderCurrentListPage() {
  if (!currentList) {
    return;
  }

  listPageContent.innerHTML = currentListIsWishlist
    ? renderWishlistPage(
        currentList,
        currentListOwnerName,
        currentListMovies,
        currentListIsOwner
      )
    : renderStandardListPage(
        currentList,
        currentListOwnerName,
        currentListMovies,
        currentListIsOwner
      );

  if (currentListIsWishlist && currentListIsOwner) {
    setupWishlistWatchedButtons();
  }

  const sortSelect = document.getElementById("listSortSelect");

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      selectedListSort = sortSelect.value;

      renderCurrentListPage();
    });
  }
    document
    .querySelectorAll(".list-genre-filter")
    .forEach((button) => {
      button.addEventListener("click", () => {
        selectedListGenre = button.dataset.listGenre || "Tous";

        renderCurrentListPage();
      });
    });
}

async function loadListPage() {
  const listId = getListIdFromUrl();

  if (!listId) {
    renderListError("Aucun identifiant de liste n’a été transmis.");
    return;
  }

  try {
    const { data: list, error: listError } = await supabaseClient
      .from("movie_lists")
      .select(`
        id,
        user_id,
        title,
        description,
        is_public,
        list_type,
        created_at
      `)
      .eq("id", listId)
      .maybeSingle();

    if (listError) {
      throw listError;
    }

    if (!list) {
      renderListError(
        "Cette liste est privée, n’existe plus ou n’est pas accessible."
      );
      return;
    }

    const { data: items, error: itemsError } = await supabaseClient
      .from("movie_list_items")
      .select(`
        id,
        created_at,
        movies (
          id,
          tmdb_id,
          title,
          original_title,
          release_year,
          director,
          poster_url,
          genres
        )
      `)
      .eq("list_id", list.id)
      .order("created_at", { ascending: false });

    if (itemsError) {
      throw itemsError;
    }

    const ownerName = await getListOwnerName(list.user_id);

    const movies = (items || [])
      .filter((item) => item.movies)
      .map((item) => ({
        ...item.movies,
        wishlist_item_id: item.id,
        added_at: item.created_at
      }));

    const moviesById = Object.fromEntries(
      movies.map((movie) => [movie.id, movie])
    );

    const isOwner = currentUser?.id === list.user_id;
    const isWishlist = list.list_type === "wishlist";


currentList = {
  ...list,
  moviesById
};

currentListMovies = movies;
currentListOwnerName = ownerName;
currentListIsOwner = isOwner;
currentListIsWishlist = isWishlist;

/*
  À chaque ouverture d’une liste, on repart sur
  les derniers films ajoutés, le tri naturel du carnet.
*/
selectedListSort = "added_desc";
selectedListGenre = "Tous";

document.title = isWishlist
  ? `Les prochaines séances de ${ownerName} — Ciné Mojito`
  : `${list.title} — Ciné Mojito`;

renderCurrentListPage();

  } catch (error) {
    console.error("Erreur de chargement de la liste :", error);

    renderListError(
      "Une erreur est survenue pendant le chargement de cette liste."
    );
  }
}

function setupWatchlistReviewModal() {
  closeWatchlistReviewModalButton?.addEventListener(
    "click",
    closeWatchlistReviewModal
  );

  cancelWatchlistReviewButton?.addEventListener(
    "click",
    closeWatchlistReviewModal
  );

  watchlistReviewModal?.addEventListener("click", (event) => {
    if (event.target === watchlistReviewModal) {
      closeWatchlistReviewModal();
    }
  });

  watchlistReviewContent?.addEventListener(
    "input",
    updateWatchlistReviewCharacterCounter
  );

  watchlistReviewForm?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (!selectedWishlistMovie) {
        return;
      }

      if (!currentUser) {
        closeWatchlistReviewModal();

        setAuthMode("login");
        openAuthModal();

        showAuthMessage(
          "Connecte-toi pour garder ce film dans ton carnet.",
          "error"
        );

        return;
      }

      const rating = Number(watchlistReviewRating.value);
      const content = watchlistReviewContent.value.trim();

      if (!rating) {
        alert("Choisis une note avant d’enregistrer ta séance.");
        watchlistReviewRating.focus();
        return;
      }

      const originalText = saveWatchlistReviewButton.textContent;

      saveWatchlistReviewButton.disabled = true;
      saveWatchlistReviewButton.textContent = "Enregistrement…";

      try {
        /*
          D’abord, on sauvegarde l’entrée dans le carnet.
          Ainsi, en cas de souci pendant le retrait de la wishlist,
          le film n’est jamais perdu.
        */
        await createReviewForExistingMovie(
          selectedWishlistMovie.id,
          rating,
          content
        );

        await removeMovieFromWishlist(
          selectedWishlistMovie.wishlist_item_id
        );

        const destination =
          `film.html?id=${encodeURIComponent(
            selectedWishlistMovie.id
          )}`;

        window.location.href = destination;
      } catch (error) {
        console.error(
          "Erreur lors de l’ajout du film au carnet :",
          error
        );

        alert(
          `Impossible d’enregistrer cette séance : ${error.message}`
        );

        saveWatchlistReviewButton.disabled = false;
        saveWatchlistReviewButton.textContent = originalText;
      }
    }
  );

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      watchlistReviewModal?.classList.contains("visible")
    ) {
      closeWatchlistReviewModal();
    }
  });
}

document.addEventListener("authChanged", () => {
  closeWatchlistReviewModal();
  loadListPage();
});

setupWatchlistReviewModal();
loadListPage();
