
let publicReviews = [];
let selectedGenre = "Tous";
let selectedTmdbMovie = null;
let isLoadingWriteTmdb = false;

let homeTmdbSearchTimeout = null;
let lastHomeTmdbQuery = "";

const grid = document.getElementById("moviesGrid");
const searchInput = document.getElementById("searchInput");
const filters = document.getElementById("filters");
const movieCount = document.getElementById("movieCount");
const homeTmdbResults = document.getElementById("homeTmdbResults");

/* ---------------------------------
   Activité du cercle
--------------------------------- */

const circleActivitySidebar = document.getElementById(
  "circleActivitySidebar"
);

const circleActivityFeed = document.getElementById(
  "circleActivityFeed"
);

const reviewModal = document.getElementById("reviewModal");
const openModal = document.getElementById("openModal");
const closeModal = document.getElementById("closeModal");
const reviewForm = document.getElementById("reviewForm");

const tmdbSearchInput = document.getElementById("tmdbSearchInput");
const tmdbSearchButton = document.getElementById("tmdbSearchButton");
const tmdbSearchMessage = document.getElementById("tmdbSearchMessage");
const tmdbResults = document.getElementById("tmdbResults");

const selectedMovieCard = document.getElementById("selectedMovieCard");
const selectedMoviePoster = document.getElementById("selectedMoviePoster");
const selectedMovieTitle = document.getElementById("selectedMovieTitle");
const selectedMovieMeta = document.getElementById("selectedMovieMeta");

const selectedMovieOverview = document.getElementById(
  "selectedMovieOverview"
);

const reviewInput = document.getElementById("review");

const reviewCharacterCounter = document.getElementById(
  "reviewCharacterCounter"
);

/* ---------------------------------
   Compteur de caractères
--------------------------------- */

function updateReviewCharacterCounter() {
  if (!reviewInput || !reviewCharacterCounter) {
    return;
  }

  const maximum = Number(reviewInput.maxLength) || 140;
  const length = reviewInput.value.length;

  reviewCharacterCounter.textContent = `${length} / ${maximum}`;

  reviewCharacterCounter.classList.toggle(
    "limit-reached",
    length >= maximum
  );
}

/* ---------------------------------
   Recherche et sélection TMDB
   dans la modale de publication
--------------------------------- */

function clearTmdbSearchMessage() {
  tmdbSearchMessage.textContent = "";
}

function showTmdbSearchMessage(message) {
  tmdbSearchMessage.textContent = message;
}

function clearTmdbResults() {
  tmdbResults.replaceChildren();
}

function getPrimarySiteGenre(tmdbGenres) {
  const genres = tmdbGenres || [];

  if (genres.includes("Drame")) return "Drame";
  if (genres.includes("Romance")) return "Romance";
  if (genres.includes("Horreur")) return "Horreur";
  if (genres.includes("Animation")) return "Animation";

  if (
    genres.includes("Science-Fiction") ||
    genres.includes("Science fiction") ||
    genres.includes("Science-Fiction & Fantastique")
  ) {
    return "Science-fiction";
  }

  if (genres.includes("Comédie")) return "Comédie";
  if (genres.includes("Documentaire")) return "Documentaire";
  if (genres.includes("Thriller")) return "Thriller";

  return genres[0] || "Cinéma";
}

function resetSelectedTmdbMovie() {
  selectedTmdbMovie = null;

  selectedMovieCard.hidden = true;

  selectedMoviePoster.hidden = true;
  selectedMoviePoster.removeAttribute("src");
  selectedMoviePoster.alt = "";

  selectedMovieTitle.textContent = "";
  selectedMovieMeta.textContent = "";
  selectedMovieOverview.textContent = "";

  document.getElementById("title").value = "";
  document.getElementById("year").value = "";
  document.getElementById("director").value = "";
  document.getElementById("genre").value = "";
}

function displaySelectedTmdbMovie(movie) {
  const genres = movie.genres || [];
  const primaryGenre = getPrimarySiteGenre(genres);

  document.getElementById("title").value = movie.title || "";
  document.getElementById("year").value = movie.release_year || "";

  document.getElementById("director").value =
    movie.director || "Réalisateur·rice non précisé·e";

  document.getElementById("genre").value = primaryGenre;

  selectedMovieTitle.textContent =
    `${movie.title || "Film sans titre"}${
      movie.release_year ? ` (${movie.release_year})` : ""
    }`;

  selectedMovieMeta.textContent = [
    movie.director || "Réalisateur·rice non précisé·e",
    genres.join(" · ")
  ]
    .filter(Boolean)
    .join(" — ");

  selectedMovieOverview.textContent =
    movie.overview || "Synopsis non disponible.";

  if (movie.poster_url) {
    selectedMoviePoster.src = movie.poster_url;
    selectedMoviePoster.alt = `Affiche de ${movie.title || "ce film"}`;
    selectedMoviePoster.hidden = false;
  } else {
    selectedMoviePoster.hidden = true;
    selectedMoviePoster.removeAttribute("src");
  }

  selectedMovieCard.hidden = false;
}

async function loadTmdbMovieDetails(tmdbId) {
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
    throw new Error("Détails du film introuvables.");
  }

  return data.result;
}

async function selectTmdbMovie(movie) {
  clearTmdbResults();
  showTmdbSearchMessage("Chargement des détails du film…");

  try {
    const tmdbMovie = await loadTmdbMovieDetails(movie.tmdb_id);

    selectedTmdbMovie = tmdbMovie;

    displaySelectedTmdbMovie(selectedTmdbMovie);

    showTmdbSearchMessage(
      "Film sélectionné. Tu peux maintenant lui attribuer une note, avec ou sans microcritique."
    );
  } catch (error) {
    console.error("Erreur de récupération des détails TMDB :", error);

    resetSelectedTmdbMovie();

    showTmdbSearchMessage(
      "Impossible de charger les détails de ce film. Réessaie."
    );
  }
}

function displayTmdbResults(results) {
  clearTmdbResults();

  if (!results || results.length === 0) {
    showTmdbSearchMessage(
      "Aucun film trouvé. Essaie avec un autre titre."
    );

    return;
  }

  clearTmdbSearchMessage();

  results.slice(0, 8).forEach((movie) => {
    const resultButton = document.createElement("button");

    resultButton.type = "button";
    resultButton.className = "tmdb-result";

    const title = movie.title || "Film sans titre";
    const year = movie.release_year || "—";
    const overview = movie.overview || "Synopsis non disponible.";

    resultButton.innerHTML = `
      <strong></strong>
      <span></span>
    `;

    resultButton.querySelector("strong").textContent =
      `${title} (${year})`;

    resultButton.querySelector("span").textContent = overview;

    resultButton.addEventListener("click", () => {
      selectTmdbMovie(movie);
    });

    tmdbResults.appendChild(resultButton);
  });
}

async function searchTmdbMovies() {
  const query = tmdbSearchInput.value.trim();

  resetSelectedTmdbMovie();
  clearTmdbResults();
  clearTmdbSearchMessage();

  if (query.length < 2) {
    showTmdbSearchMessage(
      "Saisis au moins 2 caractères pour rechercher un film."
    );

    return;
  }

  tmdbSearchButton.disabled = true;
  tmdbSearchButton.textContent = "Recherche…";

  try {
    const { data, error } = await supabaseClient.functions.invoke(
      "tmdb-search",
      {
        body: { query }
      }
    );

    if (error) {
      throw error;
    }

    displayTmdbResults(data?.results || []);
  } catch (error) {
    console.error("Erreur de recherche TMDB :", error);

    showTmdbSearchMessage(
      "Impossible de rechercher le film pour le moment. Réessaie dans quelques instants."
    );
  } finally {
    tmdbSearchButton.disabled = false;
    tmdbSearchButton.textContent = "Rechercher";
  }
}

/* ---------------------------------
   Écriture depuis une fiche film
--------------------------------- */

function getWriteTmdbIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const tmdbId = Number(params.get("writeTmdb"));

  return Number.isInteger(tmdbId) && tmdbId > 0
    ? tmdbId
    : null;
}

function removeWriteTmdbFromUrl() {
  const url = new URL(window.location.href);

  url.searchParams.delete("writeTmdb");

  const cleanUrl =
    url.pathname +
    (url.search || "") +
    (url.hash || "");

  window.history.replaceState({}, "", cleanUrl);
}

async function openReviewModalWithTmdbMovie(tmdbId) {
  if (!currentUser || isLoadingWriteTmdb) {
    return;
  }

  isLoadingWriteTmdb = true;

  reviewModal.classList.add("visible");

  resetSelectedTmdbMovie();
  clearTmdbResults();
  clearTmdbSearchMessage();

  tmdbSearchButton.disabled = true;
  tmdbSearchButton.textContent = "Chargement…";

  showTmdbSearchMessage("Préparation du film…");

  try {
    const tmdbMovie = await loadTmdbMovieDetails(tmdbId);

    selectedTmdbMovie = tmdbMovie;

    displaySelectedTmdbMovie(selectedTmdbMovie);

    tmdbSearchInput.value = tmdbMovie.title || "";

    showTmdbSearchMessage(
      "Film sélectionné. Tu peux maintenant ajouter une note, avec ou sans texte."
    );

    removeWriteTmdbFromUrl();

    document.getElementById("rating").focus();
  } catch (error) {
    console.error(
      "Erreur de préchargement du film depuis la fiche :",
      error
    );

    showTmdbSearchMessage(
      "Impossible de précharger ce film. Tu peux le rechercher manuellement."
    );
  } finally {
    tmdbSearchButton.disabled = false;
    tmdbSearchButton.textContent = "Rechercher";
    isLoadingWriteTmdb = false;
  }
}

async function handleWriteTmdbFromUrl() {
  const tmdbId = getWriteTmdbIdFromUrl();

  if (!tmdbId || !currentUser) {
    return;
  }

  await openReviewModalWithTmdbMovie(tmdbId);
}

/* ---------------------------------
   Recherche TMDB depuis l'accueil
--------------------------------- */

function clearHomeTmdbResults() {
  if (!homeTmdbResults) {
    return;
  }

  homeTmdbResults.replaceChildren();
  homeTmdbResults.classList.remove("visible");
}

function displayHomeTmdbMessage(message) {
  if (!homeTmdbResults) {
    return;
  }

  homeTmdbResults.innerHTML = `
    <div class="home-tmdb-message">
      ${escapeHTML(message)}
    </div>
  `;

  homeTmdbResults.classList.add("visible");
}

function openFilmFromHomeTmdb(movie) {
  window.location.href =
    `film.html?tmdb=${encodeURIComponent(movie.tmdb_id)}`;
}

function writeReviewFromHomeTmdb(movie) {
  window.location.href =
    `index.html?writeTmdb=${encodeURIComponent(movie.tmdb_id)}`;
}

function displayHomeTmdbResults(results) {
  clearHomeTmdbResults();

  if (!results || results.length === 0) {
    displayHomeTmdbMessage(
      "Aucun autre film trouvé dans le catalogue TMDB."
    );

    return;
  }

  const heading = document.createElement("div");

  heading.className = "home-tmdb-heading";
  heading.textContent = "Découvrir dans le cinéma";

  homeTmdbResults.appendChild(heading);

  results.slice(0, 5).forEach((movie) => {
    const item = document.createElement("article");

    item.className = "home-tmdb-item";

    const details = document.createElement("div");

    details.className = "home-tmdb-details";

    const title = document.createElement("strong");

    title.textContent =
      `${movie.title || "Film sans titre"} (${
        movie.release_year || "—"
      })`;

    const overview = document.createElement("p");

    overview.textContent =
      movie.overview || "Synopsis non disponible.";

    details.appendChild(title);
    details.appendChild(overview);

    const actions = document.createElement("div");

    actions.className = "home-tmdb-actions";

    const filmButton = document.createElement("button");

    filmButton.type = "button";
    filmButton.className = "home-tmdb-film-button";
    filmButton.textContent = "Fiche";

    filmButton.addEventListener("click", () => {
      openFilmFromHomeTmdb(movie);
    });

    const writeButton = document.createElement("button");

    writeButton.type = "button";
    writeButton.className = "home-tmdb-write-button";
    writeButton.textContent = "Ajouter";

    writeButton.addEventListener("click", () => {
      writeReviewFromHomeTmdb(movie);
    });

    actions.appendChild(filmButton);
    actions.appendChild(writeButton);

    item.appendChild(details);
    item.appendChild(actions);

    homeTmdbResults.appendChild(item);
  });

  homeTmdbResults.classList.add("visible");
}

async function searchTmdbFromHome(query) {
  const cleanQuery = query.trim();

  if (cleanQuery.length < 2) {
    clearHomeTmdbResults();
    return;
  }

  lastHomeTmdbQuery = cleanQuery;

  displayHomeTmdbMessage("Recherche dans le catalogue cinéma…");

  try {
    const { data, error } = await supabaseClient.functions.invoke(
      "tmdb-search",
      {
        body: {
          query: cleanQuery
        }
      }
    );

    if (error) {
      throw error;
    }

    if (lastHomeTmdbQuery !== cleanQuery) {
      return;
    }

    displayHomeTmdbResults(data?.results || []);
  } catch (error) {
    console.error(
      "Erreur de recherche TMDB depuis l'accueil :",
      error
    );

    if (lastHomeTmdbQuery === cleanQuery) {
      displayHomeTmdbMessage(
        "Impossible de rechercher des films pour le moment."
      );
    }
  }
}


function handleHomeSearchInput() {
  const query = searchInput.value.trim();

  clearTimeout(homeTmdbSearchTimeout);

  if (query.length < 2) {
    lastHomeTmdbQuery = "";
    clearHomeTmdbResults();
    return;
  }

  /*
    La barre de recherche est désormais réservée à TMDB :
    elle ne filtre plus les microcritiques affichées.
  */
  homeTmdbSearchTimeout = setTimeout(() => {
    searchTmdbFromHome(query);
  }, 450);
}

/* ---------------------------------
   Activité du cercle
--------------------------------- */

function formatCircleActivityDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);
  const now = new Date();

  const differenceInSeconds = Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / 1000)
  );

  if (differenceInSeconds < 60) {
    return "À l’instant";
  }

  const differenceInMinutes = Math.floor(
    differenceInSeconds / 60
  );

  if (differenceInMinutes < 60) {
    return `Il y a ${differenceInMinutes} min`;
  }

  const differenceInHours = Math.floor(
    differenceInMinutes / 60
  );

  if (differenceInHours < 24) {
    return `Il y a ${differenceInHours} h`;
  }

  const differenceInDays = Math.floor(
    differenceInHours / 24
  );

  if (differenceInDays === 1) {
    return "Hier";
  }

  if (differenceInDays < 7) {
    return `Il y a ${differenceInDays} jours`;
  }

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short"
  });
}

function getCircleMemberInitial(profile) {
  const username = profile?.username || "Membre";

  return username.charAt(0).toUpperCase() || "?";
}

function renderCircleMemberAvatar(profile) {
  const username = profile?.username || "Membre";

  if (profile?.avatar_url) {
    return `
      <img
        class="circle-activity-avatar"
        src="${escapeHTML(profile.avatar_url)}"
        alt="Photo de profil de ${escapeHTML(username)}"
        loading="lazy"
      />
    `;
  }

  return `
    <div
      class="circle-activity-avatar circle-activity-avatar-placeholder"
      aria-hidden="true"
    >
      ${escapeHTML(getCircleMemberInitial(profile))}
    </div>
  `;
}

async function getCircleRecentReviews() {
  if (!currentUser) {
    return [];
  }

  /*
    getAcceptedFriends() vient de friends.js.
    On récupère seulement les amis validés de l'utilisatrice.
  */
  const friends = await getAcceptedFriends(currentUser.id);

  if (!friends.length) {
    return [];
  }

  const friendIds = friends
    .map((friend) => friend.id)
    .filter(Boolean);

  if (!friendIds.length) {
    return [];
  }

  const friendsById = Object.fromEntries(
    friends.map((friend) => [friend.id, friend])
  );

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
        release_year,
        director,
        poster_url,
        genres
      )
    `)
    .in("user_id", friendIds)
    .eq("is_published", true)
    .order("created_at", {
      ascending: false
    })
    .limit(6);

  if (error) {
    throw error;
  }

  return (reviews || [])
    .filter((review) => review.movies)
    .map((review) => ({
      ...review,
      author: friendsById[review.user_id] || null
    }));
}

function renderCircleActivityItem(review) {
  const author = review.author || {};
  const username = author.username || "Un membre";

  const movie = review.movies || {};
  const movieTitle = movie.title || "un film";

  const profileUrl =
    `membre.html?id=${encodeURIComponent(review.user_id)}`;

  const movieUrl =
    `film.html?id=${encodeURIComponent(
      movie.id
    )}#review-${encodeURIComponent(review.id)}`;

  const reviewText = review.content?.trim()
    ? `« ${review.content.trim()} »`
    : `a ajouté une note de ${review.rating}/5.`;

  return `
    <article class="circle-activity-item">
      <a
        class="circle-activity-avatar-link"
        href="${profileUrl}"
        title="Voir le profil de ${escapeHTML(username)}"
      >
        ${renderCircleMemberAvatar(author)}
      </a>

      <div class="circle-activity-content">
        <p class="circle-activity-main">
          <a href="${profileUrl}">
            ${escapeHTML(username)}
          </a>
          <span>a écrit sur</span>
          <a href="${movieUrl}">
            ${escapeHTML(movieTitle)}
          </a>
        </p>

        <a
          class="circle-activity-review"
          href="${movieUrl}"
        >
          ${escapeHTML(reviewText)}
        </a>

        <time
          class="circle-activity-date"
          datetime="${escapeHTML(review.created_at)}"
        >
          ${escapeHTML(
            formatCircleActivityDate(review.created_at)
          )}
        </time>
      </div>
    </article>
  `;
}

function renderCircleActivity(reviews) {
  if (!circleActivityFeed || !circleActivitySidebar) {
    return;
  }

  if (!currentUser) {
    circleActivitySidebar.hidden = true;
    circleActivityFeed.innerHTML = "";
    return;
  }

  circleActivitySidebar.hidden = false;

  if (!reviews.length) {
    circleActivityFeed.innerHTML = `
      <div class="circle-activity-empty-state">
        <strong>Ton cercle est encore silencieux.</strong>
        <br /><br />
        Les nouvelles critiques de tes amis apparaîtront ici.
      </div>
    `;

    return;
  }

  circleActivityFeed.innerHTML = reviews
    .map(renderCircleActivityItem)
    .join("");
}

async function refreshCircleActivity() {
  if (!circleActivityFeed || !circleActivitySidebar) {
    return;
  }

  if (!currentUser) {
    renderCircleActivity([]);
    return;
  }

  circleActivityFeed.innerHTML = `
    <div class="circle-activity-loading">
      Chargement de l’activité…
    </div>
  `;

  try {
    const reviews = await getCircleRecentReviews();

    renderCircleActivity(reviews);
  } catch (error) {
    console.error(
      "Erreur de chargement de l’activité du cercle :",
      error
    );

    circleActivitySidebar.hidden = false;

    circleActivityFeed.innerHTML = `
      <div class="circle-activity-empty-state">
        Impossible de charger l’activité du cercle pour le moment.
      </div>
    `;
  }
}


/* ---------------------------------
   Accueil et affichage des critiques
--------------------------------- */

function allHomeReviews() {
  return publicReviews;
}

function getPrimaryGenre(review) {
  return review.movies?.genres?.[0] || "Cinéma";
}

function renderHomeReviews() {

  const filteredReviews = allHomeReviews().filter((review) => {
    const primaryGenre = getPrimaryGenre(review);
    const matchesGenre =
      selectedGenre === "Tous" || primaryGenre === selectedGenre;

    
return matchesGenre;

  });

  movieCount.textContent =
    `· ${filteredReviews.length} entrée${
      filteredReviews.length > 1 ? "s" : ""
    }`;

  if (filteredReviews.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <strong>Aucune séance ne correspond à ta recherche.</strong>
        <br /><br />
        Essaie un autre titre, un genre différent ou découvre un film dans les résultats ci-dessus.
      </div>
    `;

    return;
  }

  grid.innerHTML = filteredReviews
    .map((review, index) => createMovieCard(review, index))
    .join("");

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

      button.disabled = true;

      try {
        await toggleReviewLike(reviewId);
        await refreshHomeReviews();
      } catch (error) {
        console.error("Erreur de like :", error);

        alert(`Impossible de modifier ton like : ${error.message}`);
      } finally {
        button.disabled = false;
      }
    });
  });
}

async function refreshHomeReviews() {
  publicReviews = await getPublicReviews();
  renderHomeReviews();
}

/* ---------------------------------
   Modale de publication
--------------------------------- */

function openReviewModal() {
  if (!currentUser) {
    setAuthMode("login");
    openAuthModal();

    showAuthMessage(
      "Connecte-toi ou crée un compte avant d’ajouter un film à ton carnet.",
      "error"
    );

    return;
  }

  reviewModal.classList.add("visible");
}

function closeReviewModal() {
  reviewModal.classList.remove("visible");
}

/* ---------------------------------
   Événements et publication
--------------------------------- */

function setupHome() {
  tmdbSearchButton.addEventListener("click", searchTmdbMovies);

  tmdbSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchTmdbMovies();
    }
  });

  reviewInput.addEventListener("input", updateReviewCharacterCounter);

  updateReviewCharacterCounter();

  openModal.addEventListener("click", openReviewModal);

  closeModal.addEventListener("click", closeReviewModal);

  reviewModal.addEventListener("click", (event) => {
    if (event.target === reviewModal) {
      closeReviewModal();
    }
  });

  filters.addEventListener("click", (event) => {
    if (!event.target.classList.contains("filter")) {
      return;
    }

    document.querySelectorAll(".filter").forEach((button) => {
      button.classList.remove("active");
    });

    event.target.classList.add("active");
    selectedGenre = event.target.dataset.genre;

    renderHomeReviews();
  });

  searchInput.addEventListener("input", handleHomeSearchInput);

  reviewForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
      closeReviewModal();
      openAuthModal();
      return;
    }

    const submitButton = reviewForm.querySelector(
      'button[type="submit"]'
    );

    submitButton.disabled = true;
    submitButton.textContent = "Ajout…";

    try {
      if (!selectedTmdbMovie) {
        throw new Error(
          "Choisis un film dans les résultats TMDB avant d’ajouter une note."
        );
      }

      const content = reviewInput.value.trim();

      const payload = {
        title: document.getElementById("title").value.trim(),
        tmdbMovie: selectedTmdbMovie,
        year: document.getElementById("year").value,
        director: document.getElementById("director").value,
        genre: document.getElementById("genre").value,
        rating: document.getElementById("rating").value,

        /*
          Le texte est volontairement null quand aucun mot
          n'est ajouté : la note seule est une entrée valide.
        */
        content: content || null,

        tags: document
          .getElementById("tags")
          .value
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      };

      await publishReview(payload);

      reviewForm.reset();
      updateReviewCharacterCounter();

      resetSelectedTmdbMovie();

      tmdbSearchInput.value = "";
      clearTmdbResults();
      clearTmdbSearchMessage();

      closeReviewModal();

      selectedGenre = "Tous";

      clearHomeTmdbResults();
      lastHomeTmdbQuery = "";

      document.querySelectorAll(".filter").forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.genre === "Tous"
        );
      });

      await refreshHomeReviews();

      document
        .querySelector("#critiques")
        .scrollIntoView({ behavior: "smooth" });

      alert(
        content
          ? "Ta microcritique est publiée sur Le dernier rang. ✨"
          : "Ta note est ajoutée à ton carnet. ✨"
      );
    } catch (error) {
      console.error(error);

      alert(`Impossible d’ajouter ce film à ton carnet : ${error.message}`);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Ajouter à mon carnet";
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeReviewModal();
    }
  });


document.addEventListener("authChanged", async () => {
  await Promise.all([
    refreshHomeReviews(),
    refreshCircleActivity()
  ]);

  await handleWriteTmdbFromUrl();
});

}


async function initialiseHome() {
  setupHome();

  await Promise.all([
    refreshHomeReviews(),
    refreshCircleActivity()
  ]);

  await handleWriteTmdbFromUrl();
}

initialiseHome();
