
let publicReviews = [];
let selectedHomeFeed = "latest";
let selectedTmdbMovie = null;
let isLoadingWriteTmdb = false;

const HOME_REVIEWS_PAGE_SIZE = 8;
const CIRCLE_ACTIVITY_PAGE_SIZE = 3;
const RECENT_RELEASES_MONTHS = 12;

let visibleHomeReviewsCount = HOME_REVIEWS_PAGE_SIZE;
let visibleCircleActivityCount = CIRCLE_ACTIVITY_PAGE_SIZE;
let circleActivityEvents = [];

/* ---------------------------------
   Accueil : éléments DOM
--------------------------------- */

const grid = document.getElementById("moviesGrid");
const movieCount = document.getElementById("movieCount");

const homeFeedTabs = document.getElementById("homeFeedTabs");

const homeReviewsPagination = document.getElementById(
  "homeReviewsPagination"
);

const circleActivityPagination = document.getElementById(
  "circleActivityPagination"
);

const circleActivitySidebar = document.getElementById(
  "circleActivitySidebar"
);

const circleActivityFeed = document.getElementById(
  "circleActivityFeed"
);

const circleActivityTitle = document.getElementById(
  "circleActivityTitle"
);

const circleActivitySubtitle = document.getElementById(
  "circleActivitySubtitle"
);

const circleActivitySeeAll = document.getElementById(
  "circleActivitySeeAll"
);

/* ---------------------------------
   Modale de publication
--------------------------------- */

const reviewModal = document.getElementById("reviewModal");
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
   Modales : état global
--------------------------------- */

function updateModalBodyState() {
  const authModal = document.getElementById("authModal");

  const authIsOpen = authModal?.classList.contains("visible");
  const reviewIsOpen = reviewModal?.classList.contains("visible");

  document.body.classList.toggle(
    "modal-open",
    Boolean(authIsOpen || reviewIsOpen)
  );
}

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
   TMDB : modale publication
--------------------------------- */

function clearTmdbSearchMessage() {
  if (tmdbSearchMessage) {
    tmdbSearchMessage.textContent = "";
  }
}

function showTmdbSearchMessage(message) {
  if (tmdbSearchMessage) {
    tmdbSearchMessage.textContent = message;
  }
}

function clearTmdbResults() {
  if (tmdbResults) {
    tmdbResults.replaceChildren();
  }
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

  if (selectedMovieCard) {
    selectedMovieCard.hidden = true;
  }

  if (selectedMoviePoster) {
    selectedMoviePoster.hidden = true;
    selectedMoviePoster.removeAttribute("src");
    selectedMoviePoster.alt = "";
  }

  if (selectedMovieTitle) {
    selectedMovieTitle.textContent = "";
  }

  if (selectedMovieMeta) {
    selectedMovieMeta.textContent = "";
  }

  if (selectedMovieOverview) {
    selectedMovieOverview.textContent = "";
  }

  const title = document.getElementById("title");
  const year = document.getElementById("year");
  const director = document.getElementById("director");
  const genre = document.getElementById("genre");

  if (title) title.value = "";
  if (year) year.value = "";
  if (director) director.value = "";
  if (genre) genre.value = "";
}

function displaySelectedTmdbMovie(movie) {
  if (!movie) {
    return;
  }

  const genres = movie.genres || [];
  const primaryGenre = getPrimarySiteGenre(genres);

  const titleInput = document.getElementById("title");
  const yearInput = document.getElementById("year");
  const directorInput = document.getElementById("director");
  const genreInput = document.getElementById("genre");

  if (titleInput) {
    titleInput.value = movie.title || "";
  }

  if (yearInput) {
    yearInput.value = movie.release_year || "";
  }

  if (directorInput) {
    directorInput.value =
      movie.director || "Réalisateur·rice non précisé·e";
  }

  if (genreInput) {
    genreInput.value = primaryGenre;
  }

  if (selectedMovieTitle) {
    selectedMovieTitle.textContent =
      `${movie.title || "Film sans titre"}${
        movie.release_year ? ` (${movie.release_year})` : ""
      }`;
  }

  if (selectedMovieMeta) {
    selectedMovieMeta.textContent = [
      movie.director || "Réalisateur·rice non précisé·e",
      genres.join(" · ")
    ]
      .filter(Boolean)
      .join(" — ");
  }

  if (selectedMovieOverview) {
    selectedMovieOverview.textContent =
      movie.overview || "Synopsis non disponible.";
  }

  if (selectedMoviePoster) {
    if (movie.poster_url) {
      selectedMoviePoster.src = movie.poster_url;
      selectedMoviePoster.alt =
        `Affiche de ${movie.title || "ce film"}`;
      selectedMoviePoster.hidden = false;
    } else {
      selectedMoviePoster.hidden = true;
      selectedMoviePoster.removeAttribute("src");
    }
  }

  if (selectedMovieCard) {
    selectedMovieCard.hidden = false;
  }
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
  if (!movie?.tmdb_id) {
    return;
  }

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

    resultButton.innerHTML = `
      <strong></strong>
      <span></span>
    `;

    resultButton.querySelector("strong").textContent =
      `${movie.title || "Film sans titre"} (${
        movie.release_year || "—"
      })`;

    resultButton.querySelector("span").textContent =
      movie.overview || "Synopsis non disponible.";

    resultButton.addEventListener("click", () => {
      selectTmdbMovie(movie);
    });

    tmdbResults?.appendChild(resultButton);
  });
}

async function searchTmdbMovies() {
  if (!tmdbSearchInput || !tmdbSearchButton) {
    return;
  }

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
  if (
    !currentUser ||
    isLoadingWriteTmdb ||
    !reviewModal ||
    !tmdbSearchButton
  ) {
    return;
  }

  const authModal = document.getElementById("authModal");

  if (authModal) {
    authModal.classList.remove("visible");
  }

  reviewModal.classList.add("visible");
  updateModalBodyState();

  isLoadingWriteTmdb = true;

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

    if (tmdbSearchInput) {
      tmdbSearchInput.value = tmdbMovie.title || "";
    }

    showTmdbSearchMessage(
      "Film sélectionné. Tu peux maintenant ajouter une note, avec ou sans texte."
    );

    removeWriteTmdbFromUrl();

    document.getElementById("rating")?.focus();
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
   Activité du cercle
--------------------------------- */

function formatCircleActivityDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

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
      <span class="circle-activity-avatar">
        <img
          src="${escapeHTML(profile.avatar_url)}"
          alt="Photo de profil de ${escapeHTML(username)}"
          loading="lazy"
        />
      </span>
    `;
  }

  return `
    <span
      class="circle-activity-avatar circle-activity-avatar-placeholder"
      aria-hidden="true"
    >
      ${escapeHTML(getCircleMemberInitial(profile))}
    </span>
  `;
}

async function getCircleActivityEvents() {
  if (!currentUser || typeof getAcceptedFriends !== "function") {
    return [];
  }

  const friends = await getAcceptedFriends(currentUser.id);

  if (!friends?.length) {
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

  const { data: events, error } = await supabaseClient
    .from("activity_events")
    .select(`
      id,
      actor_id,
      type,
      review_id,
      movie_id,
      list_id,
      created_at
    `)
    .in("actor_id", friendIds)
    .order("created_at", {
      ascending: false
    })
    .limit(12);

  if (error) {
    throw error;
  }

  if (!events?.length) {
    return [];
  }

  const reviewIds = [
    ...new Set(
      events
        .map((event) => event.review_id)
        .filter(Boolean)
    )
  ];

  const movieIds = [
    ...new Set(
      events
        .map((event) => event.movie_id)
        .filter(Boolean)
    )
  ];

  const listIds = [
    ...new Set(
      events
        .map((event) => event.list_id)
        .filter(Boolean)
    )
  ];

  const [reviewsResult, moviesResult, listsResult] =
    await Promise.all([
      reviewIds.length
        ? supabaseClient
            .from("reviews")
            .select(`
              id,
              rating,
              content,
              movies (
                id,
                title
              )
            `)
            .in("id", reviewIds)
        : Promise.resolve({ data: [], error: null }),

      movieIds.length
        ? supabaseClient
            .from("movies")
            .select(`
              id,
              title,
              release_year,
              poster_url
            `)
            .in("id", movieIds)
        : Promise.resolve({ data: [], error: null }),

      listIds.length
        ? supabaseClient
            .from("movie_lists")
            .select(`
              id,
              title,
              description,
              is_public,
              list_type
            `)
            .in("id", listIds)
        : Promise.resolve({ data: [], error: null })
    ]);

  if (reviewsResult.error) throw reviewsResult.error;
  if (moviesResult.error) throw moviesResult.error;
  if (listsResult.error) throw listsResult.error;

  const reviewsById = Object.fromEntries(
    (reviewsResult.data || []).map((review) => [
      review.id,
      review
    ])
  );

  const moviesById = Object.fromEntries(
    (moviesResult.data || []).map((movie) => [
      movie.id,
      movie
    ])
  );

  const listsById = Object.fromEntries(
    (listsResult.data || []).map((list) => [
      list.id,
      list
    ])
  );

  return events.map((event) => ({
    ...event,
    actor: friendsById[event.actor_id] || null,
    review: reviewsById[event.review_id] || null,
    movie: moviesById[event.movie_id] || null,
    list: listsById[event.list_id] || null
  }));
}

function renderCircleActivityItem(event) {
  const author = event.actor || {};
  const username = author.username || "Un membre";

  const profileUrl =
    `membre.html?id=${encodeURIComponent(event.actor_id)}`;

  const reviewMovie = event.review?.movies || null;
  const movie = reviewMovie || event.movie || null;

  const movieTitle = movie?.title || "un film";

  const movieUrl = movie?.id
    ? `film.html?id=${encodeURIComponent(movie.id)}${
        event.review_id
          ? `#review-${encodeURIComponent(event.review_id)}`
          : ""
      }`
    : "";

  const listTitle = event.list?.title || "une liste";

  const listUrl = event.list_id
    ? `liste.html?id=${encodeURIComponent(event.list_id)}`
    : "";

  let mainMarkup = "";
  let detailMarkup = "";
  let destination = "";

  if (event.type === "review_published") {
    const content = event.review?.content?.trim();

    mainMarkup = `
      <a href="${profileUrl}">${escapeHTML(username)}</a>
      <span>a publié une critique sur</span>
      ${
        movieUrl
          ? `<a href="${movieUrl}">${escapeHTML(movieTitle)}</a>`
          : `<span>${escapeHTML(movieTitle)}</span>`
      }
    `;

    detailMarkup = content
      ? `« ${content} »`
      : `A ajouté une note de ${event.review?.rating || "—"} / 5.`;

    destination = movieUrl;
  }

  if (event.type === "wishlist_added") {
    mainMarkup = `
      <a href="${profileUrl}">${escapeHTML(username)}</a>
      <span>a ajouté</span>
      ${
        movieUrl
          ? `<a href="${movieUrl}">${escapeHTML(movieTitle)}</a>`
          : `<span>${escapeHTML(movieTitle)}</span>`
      }
      <span>à sa liste À voir</span>
    `;

    detailMarkup = "Prochaine séance à garder près de soi.";
    destination = listUrl || movieUrl;
  }

  if (event.type === "list_created") {
    mainMarkup = `
      <a href="${profileUrl}">${escapeHTML(username)}</a>
      <span>a créé la collection</span>
      ${
        listUrl
          ? `<a href="${listUrl}">${escapeHTML(listTitle)}</a>`
          : `<span>${escapeHTML(listTitle)}</span>`
      }
    `;

    detailMarkup =
      event.list?.description?.trim() ||
      "Une nouvelle collection à découvrir.";

    destination = listUrl;
  }

  if (!mainMarkup) {
    return "";
  }

  const contentMarkup = destination
    ? `
      <a class="circle-activity-review" href="${destination}">
        ${escapeHTML(detailMarkup)}
      </a>
    `
    : `
      <span class="circle-activity-review">
        ${escapeHTML(detailMarkup)}
      </span>
    `;

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
          ${mainMarkup}
        </p>

        ${contentMarkup}

        <time
          class="circle-activity-date"
          datetime="${escapeHTML(event.created_at)}"
        >
          ${escapeHTML(formatCircleActivityDate(event.created_at))}
        </time>
      </div>
    </article>
  `;
}

function renderDisconnectedCircleActivity() {
  if (!circleActivitySidebar || !circleActivityFeed) {
    return;
  }

  circleActivitySidebar.hidden = false;

  if (circleActivityTitle) {
    circleActivityTitle.textContent = "Un cercle à retrouver";
  }

  if (circleActivitySubtitle) {
    circleActivitySubtitle.textContent =
      "Les dernières séances de vos amis vous attendent ici.";
  }

  if (circleActivitySeeAll) {
    circleActivitySeeAll.hidden = true;
  }

  if (circleActivityPagination) {
    circleActivityPagination.hidden = true;
    circleActivityPagination.innerHTML = "";
  }

  circleActivityFeed.innerHTML = `
    <div class="circle-activity-empty-state">
      <strong>Connecte-toi pour retrouver les séances de ton cercle.</strong>
      <br /><br />
      Les critiques, listes et films gardés par tes amis apparaîtront ici.
    </div>
  `;
}

function renderCircleActivity(events) {
  if (!circleActivityFeed || !circleActivitySidebar) {
    return;
  }

  if (!currentUser) {
    renderDisconnectedCircleActivity();
    return;
  }

  circleActivitySidebar.hidden = false;

  if (circleActivityTitle) {
    circleActivityTitle.textContent = "Les dernières séances de tes amis";
  }

  if (circleActivitySubtitle) {
    circleActivitySubtitle.textContent =
      "Les films, les mots et les petits élans de ton cercle.";
  }

  if (circleActivitySeeAll) {
    circleActivitySeeAll.hidden = events.length <= CIRCLE_ACTIVITY_PAGE_SIZE;
  }

  if (!events.length) {
    circleActivityFeed.innerHTML = `
      <div class="circle-activity-empty-state">
        <strong>Ton cercle est encore silencieux.</strong>
        <br /><br />
        Les critiques, listes et prochaines séances de tes amis
        apparaîtront ici.
      </div>
    `;

    if (circleActivityPagination) {
      circleActivityPagination.hidden = true;
      circleActivityPagination.innerHTML = "";
    }

    return;
  }

  const visibleEvents = events.slice(
    0,
    visibleCircleActivityCount
  );

  circleActivityFeed.innerHTML = visibleEvents
    .map(renderCircleActivityItem)
    .filter(Boolean)
    .join("");

  if (!circleActivityPagination) {
    return;
  }

  const hasMoreEvents = visibleEvents.length < events.length;

  circleActivityPagination.hidden = !hasMoreEvents;

  circleActivityPagination.innerHTML = hasMoreEvents
    ? `
      <button
        id="showMoreCircleActivityButton"
        class="circle-activity-show-more"
        type="button"
      >
        Voir davantage de séances
        <span aria-hidden="true">↓</span>
      </button>
    `
    : "";
}

async function refreshCircleActivity() {
  if (!circleActivityFeed || !circleActivitySidebar) {
    return;
  }

  if (!currentUser) {
    renderDisconnectedCircleActivity();
    return;
  }

  circleActivityFeed.innerHTML = `
    <div class="circle-activity-loading">
      Chargement de l’activité de ton cercle…
    </div>
  `;

  try {
    circleActivityEvents = await getCircleActivityEvents();

    visibleCircleActivityCount = CIRCLE_ACTIVITY_PAGE_SIZE;

    renderCircleActivity(circleActivityEvents);
  } catch (error) {
    console.error(
      "Erreur de chargement de l’activité du cercle :",
      error
    );

    circleActivitySidebar.hidden = false;

    if (circleActivityTitle) {
      circleActivityTitle.textContent = "Dans mon cercle";
    }

    if (circleActivitySubtitle) {
      circleActivitySubtitle.textContent =
        "Les dernières séances de tes amis.";
    }

    if (circleActivitySeeAll) {
      circleActivitySeeAll.hidden = true;
    }

    circleActivityFeed.innerHTML = `
      <div class="circle-activity-empty-state">
        Impossible de charger l’activité du cercle pour le moment.
      </div>
    `;
  }
}

/* ---------------------------------
   Accueil : fils éditoriaux
--------------------------------- */

function isWrittenReview(review) {
  return String(review?.content || "").trim().length > 0;
}

function getReviewLikesCount(review) {
  const directCount = Number(
    review?.like_count ??
      review?.likes_count ??
      review?.likesCount ??
      review?.review_likes_count
  );

  if (Number.isFinite(directCount)) {
    return directCount;
  }

  if (Array.isArray(review?.likes)) {
    return review.likes.length;
  }

  return 0;
}

function getReviewCreationTimestamp(review) {
  const timestamp = new Date(review?.created_at || 0).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getMovieReleaseDate(movie) {
  if (!movie) {
    return null;
  }

  const fullReleaseDate =
    movie.release_date ||
    movie.released_at ||
    movie.releaseDate ||
    null;

  if (fullReleaseDate) {
    const date = new Date(fullReleaseDate);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  const year = Number(movie.release_year);

  if (
    Number.isInteger(year) &&
    year >= 1888 &&
    year <= new Date().getFullYear() + 1
  ) {
    return new Date(year, 0, 1);
  }

  return null;
}

function getMovieReleaseTimestamp(movie) {
  const releaseDate = getMovieReleaseDate(movie);

  return releaseDate ? releaseDate.getTime() : 0;
}

function isRecentReleaseReview(review) {
  const releaseDate = getMovieReleaseDate(review?.movies);

  if (!releaseDate) {
    return false;
  }

  const minimumDate = new Date();
  minimumDate.setMonth(
    minimumDate.getMonth() - RECENT_RELEASES_MONTHS
  );

  minimumDate.setHours(0, 0, 0, 0);

  return releaseDate >= minimumDate;
}

function resetHomeReviewsPagination() {
  visibleHomeReviewsCount = HOME_REVIEWS_PAGE_SIZE;
}

function getHomeFeedReviews() {
  const writtenReviews = publicReviews.filter(isWrittenReview);

  if (selectedHomeFeed === "releases") {
    return writtenReviews
      .filter(isRecentReleaseReview)
      .sort((firstReview, secondReview) => {
        const releaseDifference =
          getMovieReleaseTimestamp(secondReview.movies) -
          getMovieReleaseTimestamp(firstReview.movies);

        if (releaseDifference !== 0) {
          return releaseDifference;
        }

        return (
          getReviewCreationTimestamp(secondReview) -
          getReviewCreationTimestamp(firstReview)
        );
      });
  }

  if (selectedHomeFeed === "popular") {
    return writtenReviews.sort((firstReview, secondReview) => {
      const likesDifference =
        getReviewLikesCount(secondReview) -
        getReviewLikesCount(firstReview);

      if (likesDifference !== 0) {
        return likesDifference;
      }

      return (
        getReviewCreationTimestamp(secondReview) -
        getReviewCreationTimestamp(firstReview)
      );
    });
  }

  return writtenReviews.sort((firstReview, secondReview) => {
    return (
      getReviewCreationTimestamp(secondReview) -
      getReviewCreationTimestamp(firstReview)
    );
  });
}

function getHomeFeedEmptyState() {
  if (selectedHomeFeed === "releases") {
    return `
      <strong>Pas encore de critique sur une sortie récente.</strong>
      <br /><br />
      Les films sortis ces douze derniers mois et racontés par le carnet
      apparaîtront ici.
    `;
  }

  if (selectedHomeFeed === "popular") {
    return `
      <strong>Les critiques les plus aimées arrivent ici.</strong>
      <br /><br />
      Dès que le cercle glissera quelques cœurs, elles remonteront dans ce fil.
    `;
  }

  return `
    <strong>Pas encore de microcritique à lire.</strong>
    <br /><br />
    Les notes seules vivent dans les carnets personnels ; ici, on garde
    les films accompagnés de quelques mots.
  `;
}

function getHomeFeedCountLabel(totalCount) {
  if (!totalCount) {
    return "";
  }

  const reviewLabel =
    totalCount > 1 ? "critiques à lire" : "critique à lire";

  if (selectedHomeFeed === "releases") {
    return `${totalCount} ${reviewLabel} · sorties récentes`;
  }

  if (selectedHomeFeed === "popular") {
    return `${totalCount} ${reviewLabel} · les plus aimées`;
  }

  return `${totalCount} ${reviewLabel}`;
}

function updateHomeFeedTabs() {
  document.querySelectorAll("[data-home-feed]").forEach((button) => {
    const isActive =
      button.dataset.homeFeed === selectedHomeFeed;

    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));

    if (isActive && grid) {
      grid.setAttribute("aria-labelledby", button.id);
    }
  });
}


function renderHomeLikeButtons() {
  document.querySelectorAll(".favorite").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!currentUser) {
        closeReviewModal();

        openAuthModal("login");

        showAuthMessage(
          "Connecte-toi ou crée un compte pour aimer une microcritique.",
          "error"
        );

        return;
      }

      const reviewId = button.dataset.reviewId;

      if (!reviewId || button.disabled) {
        return;
      }

      const likeActions = button.closest(".review-like-actions");

      const countButton = likeActions?.querySelector(
        ".review-like-count"
      );

      const wasLiked = button.classList.contains("liked");

      const currentCount = Number(
        countButton?.textContent?.trim() || 0
      );

      /*
        Retour visuel immédiat :
        le cœur et le compteur changent sans recharger le fil.
      */
      button.disabled = true;

      button.classList.toggle("liked", !wasLiked);
      button.textContent = wasLiked ? "♡" : "♥";

      button.title = wasLiked
        ? "J’aime cette microcritique"
        : "Retirer mon like";

      button.setAttribute(
        "aria-label",
        wasLiked
          ? "J’aime cette microcritique"
          : "Retirer mon like"
      );

      button.setAttribute(
        "aria-pressed",
        String(!wasLiked)
      );

      const nextCount = Math.max(
        0,
        currentCount + (wasLiked ? -1 : 1)
      );

      if (countButton) {
        countButton.textContent = String(nextCount);
      }

      try {
        /*
          toggleReviewLike retourne true si le like est désormais posé,
          false s’il vient d’être retiré.
        */
        const isNowLiked = await toggleReviewLike(reviewId);

        /*
          On met aussi à jour les données déjà chargées en mémoire.
          Ainsi, si tu changes ensuite d’onglet, le tri « Les plus aimées »
          reste juste sans devoir recharger toute la page.
        */
        publicReviews = publicReviews.map((review) => {
          if (String(review.id) !== String(reviewId)) {
            return review;
          }

          return {
            ...review,
            liked_by_current_user: isNowLiked,
            like_count: Math.max(
              0,
              Number(review.like_count || 0) +
                (isNowLiked === wasLiked ? 0 : isNowLiked ? 1 : -1)
            )
          };
        });

        /*
          Sécurisation finale selon la réponse réelle de Supabase.
        */
        button.classList.toggle("liked", isNowLiked);
        button.textContent = isNowLiked ? "♥" : "♡";

        button.title = isNowLiked
          ? "Retirer mon like"
          : "J’aime cette microcritique";

        button.setAttribute(
          "aria-label",
          isNowLiked
            ? "Retirer mon like"
            : "J’aime cette microcritique"
        );

        button.setAttribute(
          "aria-pressed",
          String(isNowLiked)
        );
      } catch (error) {
        console.error("Erreur de like :", error);

        /*
          Si Supabase répond avec une erreur, on restaure le rendu précédent.
        */
        button.classList.toggle("liked", wasLiked);
        button.textContent = wasLiked ? "♥" : "♡";

        button.title = wasLiked
          ? "Retirer mon like"
          : "J’aime cette microcritique";

        button.setAttribute(
          "aria-label",
          wasLiked
            ? "Retirer mon like"
            : "J’aime cette microcritique"
        );

        button.setAttribute(
          "aria-pressed",
          String(wasLiked)
        );

        if (countButton) {
          countButton.textContent = String(currentCount);
        }

        alert(`Impossible de modifier ton like : ${error.message}`);
      } finally {
        button.disabled = false;
      }
    });
  });
}


function renderHomeReviews() {
  if (!grid || !movieCount) {
    return;
  }

  const filteredReviews = getHomeFeedReviews();

  const visibleReviews = filteredReviews.slice(
    0,
    visibleHomeReviewsCount
  );

  movieCount.textContent = getHomeFeedCountLabel(
    filteredReviews.length
  );

  updateHomeFeedTabs();

  if (!filteredReviews.length) {
    grid.innerHTML = `
      <div class="empty-state">
        ${getHomeFeedEmptyState()}
      </div>
    `;

    if (homeReviewsPagination) {
      homeReviewsPagination.hidden = true;
      homeReviewsPagination.innerHTML = "";
    }

    return;
  }

  grid.innerHTML = visibleReviews
    .map((review, index) => createMovieCard(review, index))
    .join("");

  if (homeReviewsPagination) {
    const hasMoreReviews =
      visibleReviews.length < filteredReviews.length;

    homeReviewsPagination.hidden = !hasMoreReviews;

    homeReviewsPagination.innerHTML = hasMoreReviews
      ? `
        <button
          id="showMoreHomeReviewsButton"
          class="home-show-more-button"
          type="button"
        >
          Continuer la séance · ${
            Math.min(
              HOME_REVIEWS_PAGE_SIZE,
              filteredReviews.length - visibleReviews.length
            )
          } de plus
          <span aria-hidden="true">↓</span>
        </button>
      `
      : "";
  }

  renderHomeLikeButtons();
}

async function refreshHomeReviews() {
  if (!grid || !movieCount) {
    return;
  }

  try {
    publicReviews = await getPublicReviews();

    resetHomeReviewsPagination();
    renderHomeReviews();
  } catch (error) {
    console.error(
      "Erreur de chargement des dernières critiques :",
      error
    );

    movieCount.textContent = "";

    grid.innerHTML = `
      <div class="empty-state">
        <strong>Les dernières critiques ne peuvent pas être chargées.</strong>
        <br /><br />
        Actualise la page ou réessaie dans quelques instants.
      </div>
    `;
  }
}

/* ---------------------------------
   Modale
--------------------------------- */

function openReviewModal() {
  const authModal = document.getElementById("authModal");

  if (!currentUser) {
    closeReviewModal();

    openAuthModal("login");

    showAuthMessage(
      "Connecte-toi ou crée un compte avant d’ajouter un film à ton carnet.",
      "error"
    );

    return;
  }

  if (authModal) {
    authModal.classList.remove("visible");
    authModal.setAttribute("aria-hidden", "true");
  }

  reviewModal?.classList.add("visible");

  updateModalBodyState();
}

function closeReviewModal() {
  reviewModal?.classList.remove("visible");

  updateModalBodyState();
}

/* ---------------------------------
   Événements
--------------------------------- */

function setupHomeFeedTabs() {
  if (!homeFeedTabs) {
    return;
  }

  homeFeedTabs.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-home-feed]");

    if (!tab) {
      return;
    }

    const nextFeed = tab.dataset.homeFeed;

    if (
      !nextFeed ||
      nextFeed === selectedHomeFeed
    ) {
      return;
    }

    selectedHomeFeed = nextFeed;

    resetHomeReviewsPagination();
    renderHomeReviews();
  });

  homeFeedTabs.addEventListener("keydown", (event) => {
    const tabs = [
      ...homeFeedTabs.querySelectorAll("[data-home-feed]")
    ];

    const currentIndex = tabs.findIndex(
      (tab) => tab === document.activeElement
    );

    if (currentIndex < 0) {
      return;
    }

    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    }

    if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    }

    if (
      event.key !== "ArrowRight" &&
      event.key !== "ArrowLeft"
    ) {
      return;
    }

    event.preventDefault();

    tabs[nextIndex].focus();
    tabs[nextIndex].click();
  });
}

function setupHome() {
  if (tmdbSearchButton) {
    tmdbSearchButton.addEventListener(
      "click",
      searchTmdbMovies
    );
  }

  if (tmdbSearchInput) {
    tmdbSearchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        searchTmdbMovies();
      }
    });
  }

  if (reviewInput) {
    reviewInput.addEventListener(
      "input",
      updateReviewCharacterCounter
    );
  }

  updateReviewCharacterCounter();

  setupHomeFeedTabs();

  document.addEventListener("click", (event) => {
    const openReviewButton = event.target.closest("#openModal");

    if (!openReviewButton) {
      return;
    }

    event.preventDefault();
    openReviewModal();
  });

  if (closeModal) {
    closeModal.addEventListener("click", closeReviewModal);
  }

  if (reviewModal) {
    reviewModal.addEventListener("click", (event) => {
      if (event.target === reviewModal) {
        closeReviewModal();
      }
    });
  }

  if (homeReviewsPagination) {
    homeReviewsPagination.addEventListener("click", (event) => {
      const button = event.target.closest(
        "#showMoreHomeReviewsButton"
      );

      if (!button) {
        return;
      }

      visibleHomeReviewsCount += HOME_REVIEWS_PAGE_SIZE;

      renderHomeReviews();
    });
  }

  if (circleActivityPagination) {
    circleActivityPagination.addEventListener("click", (event) => {
      const button = event.target.closest(
        "#showMoreCircleActivityButton"
      );

      if (!button) {
        return;
      }

      visibleCircleActivityCount += CIRCLE_ACTIVITY_PAGE_SIZE;

      renderCircleActivity(circleActivityEvents);
    });
  }

  if (circleActivitySeeAll) {
    circleActivitySeeAll.addEventListener("click", (event) => {
      if (!currentUser || !circleActivityEvents.length) {
        return;
      }

      event.preventDefault();

      visibleCircleActivityCount = circleActivityEvents.length;

      renderCircleActivity(circleActivityEvents);

      circleActivitySidebar?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }

  if (reviewForm) {
    reviewForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!currentUser) {
        closeReviewModal();

        openAuthModal("login");

        showAuthMessage(
          "Connecte-toi ou crée un compte avant d’ajouter un film à ton carnet.",
          "error"
        );

        return;
      }

      const submitButton = reviewForm.querySelector(
        'button[type="submit"]'
      );

      if (!submitButton) {
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "Ajout…";

      try {
        if (!selectedTmdbMovie) {
          throw new Error(
            "Choisis un film dans les résultats TMDB avant d’ajouter une note."
          );
        }

        const content = reviewInput?.value.trim() || "";

        const payload = {
          title:
            document.getElementById("title")?.value.trim() || "",

          tmdbMovie: selectedTmdbMovie,

          year: document.getElementById("year")?.value || "",

          director:
            document.getElementById("director")?.value || "",

          genre:
            document.getElementById("genre")?.value || "",

          rating:
            document.getElementById("rating")?.value || "",

          content: content || null,

          tags: (document.getElementById("tags")?.value || "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        };

        await publishReview(payload);

        reviewForm.reset();
        updateReviewCharacterCounter();

        resetSelectedTmdbMovie();

        if (tmdbSearchInput) {
          tmdbSearchInput.value = "";
        }

        clearTmdbResults();
        clearTmdbSearchMessage();

        closeReviewModal();

        selectedHomeFeed = "latest";

        await refreshHomeReviews();
        await refreshCircleActivity();

        document
          .querySelector("#critiques")
          ?.scrollIntoView({
            behavior: "smooth"
          });

        alert(
          content
            ? "Ta microcritique est publiée sur Ciné Mojito. ✨"
            : "Ta note est ajoutée à ton carnet. ✨"
        );
      } catch (error) {
        console.error(
          "Erreur de publication de la critique :",
          error
        );

        alert(
          `Impossible d’ajouter ce film à ton carnet : ${error.message}`
        );
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Ajouter à mon carnet";
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      reviewModal?.classList.contains("visible")
    ) {
      closeReviewModal();
    }
  });

  document.addEventListener("authChanged", async () => {
    if (currentUser) {
      const authModal = document.getElementById("authModal");

      authModal?.classList.remove("visible");
      authModal?.setAttribute("aria-hidden", "true");

      updateModalBodyState();
    }

    await Promise.allSettled([
      refreshHomeReviews(),
      refreshCircleActivity()
    ]);

    await handleWriteTmdbFromUrl();
  });
}

async function initialiseHome() {
  setupHome();

  await Promise.allSettled([
    refreshHomeReviews(),
    refreshCircleActivity()
  ]);

  await handleWriteTmdbFromUrl();
}

initialiseHome();
