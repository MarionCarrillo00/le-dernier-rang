
const defaultMovies = [
  {
    id: "demo-1",
    author: "Le dernier rang",
    rating: 4.5,
    content:
      "Une solitude à deux, douce et immense, dans une ville qui ne dort jamais.",
    movies: {
      title: "Lost in Translation",
      release_year: 2003,
      director: "Sofia Coppola",
      genres: ["Romance", "Tokyo", "mélancolie", "nuit"]
    }
  },
  {
    id: "demo-2",
    author: "Le dernier rang",
    rating: 4,
    content:
      "Quand l’infiniment grand devient une très belle histoire d’amour.",
    movies: {
      title: "Interstellar",
      release_year: 2014,
      director: "Christopher Nolan",
      genres: ["Science-fiction", "espace", "temps", "vertige"]
    }
  },
  {
    id: "demo-3",
    author: "Le dernier rang",
    rating: 4,
    content:
      "Un Paris rêvé, tendre et légèrement trop joli — mais c’est précisément ce qui le rend précieux.",
    movies: {
      title: "Le Fabuleux Destin d’Amélie Poulain",
      release_year: 2001,
      director: "Jean-Pierre Jeunet",
      genres: ["Romance", "Paris", "fantaisie", "tendresse"]
    }
  },
  {
    id: "demo-4",
    author: "Le dernier rang",
    rating: 5,
    content:
      "Un rêve immense où chaque porte ouverte nous rend un peu plus courageux.",
    movies: {
      title: "Le Voyage de Chihiro",
      release_year: 2001,
      director: "Hayao Miyazaki",
      genres: ["Animation", "Japon", "enfance", "merveille"]
    }
  },
  {
    id: "demo-5",
    author: "Le dernier rang",
    rating: 4,
    content:
      "La beauté trouble de ce que l’on ne comprend jamais tout à fait.",
    movies: {
      title: "The Virgin Suicides",
      release_year: 1999,
      director: "Sofia Coppola",
      genres: ["Drame", "adolescence", "banlieue", "mystère"]
    }
  },
  {
    id: "demo-6",
    author: "Le dernier rang",
    rating: 3.5,
    content: "La lumière du jour n’a jamais été aussi inquiétante.",
    movies: {
      title: "Midsommar",
      release_year: 2019,
      director: "Ari Aster",
      genres: ["Horreur", "Suède", "rupture", "soleil"]
    }
  }
];

let publicReviews = [];
let selectedGenre = "Tous";
let selectedTmdbMovie = null;

const grid = document.getElementById("moviesGrid");
const searchInput = document.getElementById("searchInput");
const filters = document.getElementById("filters");
const movieCount = document.getElementById("movieCount");

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

/* ---------------------------------
   Recherche et sélection TMDB
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

async function selectTmdbMovie(movie) {
  clearTmdbResults();
  showTmdbSearchMessage("Chargement des détails du film…");

  try {
    const { data, error } = await supabaseClient.functions.invoke(
      "tmdb-details",
      {
        body: {
          movieId: movie.tmdb_id
        }
      }
    );

    if (error) {
      throw error;
    }

    if (!data?.result) {
      throw new Error("Détails du film introuvables.");
    }

    selectedTmdbMovie = data.result;

    displaySelectedTmdbMovie(selectedTmdbMovie);

    showTmdbSearchMessage(
      "Film sélectionné. Tu peux maintenant attribuer ta note et écrire ta microcritique."
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
   Accueil et affichage des critiques
--------------------------------- */

function allHomeReviews() {
  return [...publicReviews, ...defaultMovies];
}

function getPrimaryGenre(review) {
  return review.movies?.genres?.[0] || "Cinéma";
}

function renderHomeReviews() {
  const search = searchInput.value.toLowerCase().trim();

  const filteredReviews = allHomeReviews().filter((review) => {
    const movie = review.movies || {};
    const genres = movie.genres || [];
    const primaryGenre = getPrimaryGenre(review);

    const matchesGenre =
      selectedGenre === "Tous" || primaryGenre === selectedGenre;

    const searchableText = [
      movie.title,
      movie.director,
      review.content,
      review.author,
      ...genres
    ]
      .join(" ")
      .toLowerCase();

    return matchesGenre && searchableText.includes(search);
  });

  movieCount.textContent =
    `· ${filteredReviews.length} critique${
      filteredReviews.length > 1 ? "s" : ""
    }`;

  if (filteredReviews.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <strong>Aucune séance ne correspond à ta recherche.</strong>
        <br /><br />
        Essaie un autre titre, un genre différent ou écris une nouvelle critique.
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredReviews
    .map((review, index) => createMovieCard(review, index))
    .join("");

  document.querySelectorAll(".favorite").forEach((button) => {
    button.addEventListener("click", () => {
      button.classList.toggle("liked");

      button.textContent = button.classList.contains("liked")
        ? "♥"
        : "♡";
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
      "Connecte-toi ou crée un compte avant de publier une critique.",
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

  openModal.addEventListener("click", openReviewModal);

  closeModal.addEventListener("click", closeReviewModal);

  reviewModal.addEventListener("click", (event) => {
    if (event.target === reviewModal) {
      closeReviewModal();
    }
  });

  filters.addEventListener("click", (event) => {
    if (!event.target.classList.contains("filter")) return;

    document.querySelectorAll(".filter").forEach((button) => {
      button.classList.remove("active");
    });

    event.target.classList.add("active");
    selectedGenre = event.target.dataset.genre;

    renderHomeReviews();
  });

  searchInput.addEventListener("input", renderHomeReviews);

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
    submitButton.textContent = "Publication…";

    try {
      if (!selectedTmdbMovie) {
        throw new Error(
          "Choisis un film dans les résultats TMDB avant de publier."
        );
      }

      const payload = {
        title: document.getElementById("title").value.trim(),
        tmdbMovie: selectedTmdbMovie,
        year: document.getElementById("year").value,
        director: document.getElementById("director").value,
        genre: document.getElementById("genre").value,
        rating: document.getElementById("rating").value,
        content: document.getElementById("review").value.trim(),

        tags: document
          .getElementById("tags")
          .value
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      };

      await publishReview(payload);

      reviewForm.reset();

      resetSelectedTmdbMovie();
      tmdbSearchInput.value = "";
      clearTmdbResults();
      clearTmdbSearchMessage();

      closeReviewModal();

      selectedGenre = "Tous";
      searchInput.value = "";

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

      alert("Ta microcritique est publiée sur Le dernier rang. ✨");
    } catch (error) {
      console.error(error);
      alert(`Impossible de publier : ${error.message}`);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Publier la critique";
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeReviewModal();
    }
  });

  document.addEventListener("authChanged", () => {
    renderHomeReviews();
  });
}

async function initialiseHome() {
  setupHome();
  await refreshHomeReviews();
}

initialiseHome();
