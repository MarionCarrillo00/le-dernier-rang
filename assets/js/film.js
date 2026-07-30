
const filmPageContent = document.getElementById("filmPageContent");

let currentFilmMovie = null;
let currentTmdbMovieId = null;
let listPanelOpen = false;

function getMovieIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function getTmdbIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const tmdbId = Number(params.get("tmdb"));

  return Number.isInteger(tmdbId) && tmdbId > 0
    ? tmdbId
    : null;
}

function formatAverageRating(reviews) {
  if (!reviews.length) {
    return "—";
  }

  const total = reviews.reduce(
    (sum, review) => sum + Number(review.rating || 0),
    0
  );

  return (total / reviews.length).toFixed(1).replace(".", ",");
}

function renderFilmError(message) {
  filmPageContent.innerHTML = `
    <div class="film-error">
      <h1>Cette séance est introuvable.</h1>

      <p>${escapeHTML(message)}</p>

      <a class="button-primary" href="index.html#critiques">
        Retour aux microcritiques
      </a>
    </div>
  `;
}

function renderCast(cast) {
  if (!cast || cast.length === 0) {
    return `
      <p class="film-muted">
        Casting non disponible pour le moment.
      </p>
    `;
  }

  return `
    <div class="cast-grid">
      ${cast
        .map(
          (person) => `
            <article class="cast-member">
              ${
                person.profile_url
                  ? `
                    <img
                      src="${escapeHTML(person.profile_url)}"
                      alt="${escapeHTML(person.name)}"
                      loading="lazy"
                    />
                  `
                  : `
                    <div class="cast-placeholder">
                      ${escapeHTML(person.name.charAt(0) || "?")}
                    </div>
                  `
              }

              <div>
                <strong>${escapeHTML(person.name)}</strong>

                ${
                  person.character
                    ? `<span>${escapeHTML(person.character)}</span>`
                    : ""
                }
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

/* =====================================================
   LISTES PERSONNALISÉES
   ===================================================== */

/*
  Récupère les listes personnalisées de l'utilisatrice.
  La wishlist système (« À voir ») est volontairement exclue
  car elle dispose de son propre bouton sur la fiche film.
*/
async function getMyListsForMovie(movieId) {
  if (!currentUser || !movieId) {
    return [];
  }

  const { data: lists, error: listsError } = await supabaseClient
    .from("movie_lists")
    .select(`
      id,
      title,
      description,
      is_public,
      list_type,
      created_at
    `)
    .eq("user_id", currentUser.id)
    .eq("list_type", "custom")
    .order("created_at", { ascending: false });

  if (listsError) {
    throw listsError;
  }

  if (!lists || lists.length === 0) {
    return [];
  }

  const listIds = lists.map((list) => list.id);

  const { data: items, error: itemsError } = await supabaseClient
    .from("movie_list_items")
    .select("list_id, movie_id")
    .in("list_id", listIds)
    .eq("movie_id", movieId);

  if (itemsError) {
    throw itemsError;
  }

  const movieListIds = new Set(
    (items || []).map((item) => item.list_id)
  );

  return lists.map((list) => ({
    ...list,
    contains_movie: movieListIds.has(list.id)
  }));
}

/* =====================================================
   WISHLIST : À VOIR
   ===================================================== */

async function getWishlistStatusForMovie(movieId) {
  if (!currentUser || !movieId) {
    return false;
  }

  const { data: wishlist, error: wishlistError } =
    await supabaseClient
      .from("movie_lists")
      .select("id")
      .eq("user_id", currentUser.id)
      .eq("list_type", "wishlist")
      .maybeSingle();

  if (wishlistError) {
    throw wishlistError;
  }

  if (!wishlist) {
    return false;
  }

  const { data: wishlistItem, error: itemError } =
    await supabaseClient
      .from("movie_list_items")
      .select("id")
      .eq("list_id", wishlist.id)
      .eq("movie_id", movieId)
      .maybeSingle();

  if (itemError) {
    throw itemError;
  }

  return Boolean(wishlistItem);
}

async function getOrCreateWishlist() {
  if (!currentUser) {
    throw new Error("AUTH_REQUIRED");
  }

  const { data: existingWishlist, error: searchError } =
    await supabaseClient
      .from("movie_lists")
      .select("id, title, list_type")
      .eq("user_id", currentUser.id)
      .eq("list_type", "wishlist")
      .maybeSingle();

  if (searchError) {
    throw searchError;
  }

  if (existingWishlist) {
    return existingWishlist;
  }

  const { data: createdWishlist, error: createError } =
    await supabaseClient
      .from("movie_lists")
      .insert({
        user_id: currentUser.id,
        title: "À voir",
        description:
          "Les films que je garde pour une prochaine séance.",
        is_public: true,
        list_type: "wishlist"
      })
      .select("id, title, list_type")
      .single();

  /*
    Protection en cas de création simultanée dans plusieurs onglets.
  */
  if (createError?.code === "23505") {
    const { data: concurrentWishlist, error: retryError } =
      await supabaseClient
        .from("movie_lists")
        .select("id, title, list_type")
        .eq("user_id", currentUser.id)
        .eq("list_type", "wishlist")
        .maybeSingle();

    if (retryError) {
      throw retryError;
    }

    if (concurrentWishlist) {
      return concurrentWishlist;
    }
  }

  if (createError) {
    throw createError;
  }

  return createdWishlist;
}

async function toggleWishlistMovie(movieId) {
  const wishlist = await getOrCreateWishlist();

  const { data: existingItem, error: searchError } =
    await supabaseClient
      .from("movie_list_items")
      .select("id")
      .eq("list_id", wishlist.id)
      .eq("movie_id", movieId)
      .maybeSingle();

  if (searchError) {
    throw searchError;
  }

  if (existingItem) {
    const { error: deleteError } = await supabaseClient
      .from("movie_list_items")
      .delete()
      .eq("id", existingItem.id);

    if (deleteError) {
      throw deleteError;
    }

    return false;
  }

  const { error: insertError } = await supabaseClient
    .from("movie_list_items")
    .insert({
      list_id: wishlist.id,
      movie_id: movieId
    });

  if (insertError?.code === "23505") {
    return true;
  }

  if (insertError) {
    throw insertError;
  }

  return true;
}

/*
  Garantit qu'un film ouvert directement depuis TMDB existe
  bien dans le catalogue Supabase avant d'être ajouté à « À voir ».

  Ainsi, il n'est plus nécessaire de publier une microcritique
  avant de sauvegarder un film dans la wishlist.
*/
async function ensureCurrentFilmInCatalog() {
  if (!currentUser) {
    throw new Error("AUTH_REQUIRED");
  }

  if (!currentFilmMovie) {
    throw new Error("Le film en cours est introuvable.");
  }

  /*
    Film déjà présent dans le catalogue.
  */
  if (currentFilmMovie.id) {
    return currentFilmMovie;
  }

  const tmdbId =
    currentFilmMovie.tmdb_id ||
    currentTmdbMovieId;

  if (!tmdbId) {
    throw new Error(
      "Ce film ne possède pas d’identifiant TMDB exploitable."
    );
  }

  /*
    Vérification : le film peut avoir été créé entre-temps
    par une autre personne ou dans un autre onglet.
  */
  const { data: existingMovie, error: searchError } =
    await supabaseClient
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
      .eq("tmdb_id", tmdbId)
      .maybeSingle();

  if (searchError) {
    throw searchError;
  }

  if (existingMovie) {
    currentFilmMovie = existingMovie;
    return existingMovie;
  }

  /*
    Première création du film dans le catalogue, sans critique.
  */
  const movieData = {
    tmdb_id: tmdbId,
    title: currentFilmMovie.title || "Film sans titre",
    original_title: currentFilmMovie.original_title || "",
    release_year: currentFilmMovie.release_year || null,
    director: currentFilmMovie.director || "",
    poster_url: currentFilmMovie.poster_url || null,
    overview: currentFilmMovie.overview || "",
    genres: currentFilmMovie.genres || [],
    created_by: currentUser.id
  };

  const { data: createdMovie, error: createError } =
    await supabaseClient
      .from("movies")
      .insert(movieData)
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
      .single();

  /*
    Gestion d'un éventuel doublon TMDB créé simultanément.
  */
  if (createError?.code === "23505") {
    const { data: concurrentMovie, error: retryError } =
      await supabaseClient
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
        .eq("tmdb_id", tmdbId)
        .maybeSingle();

    if (retryError) {
      throw retryError;
    }

    if (concurrentMovie) {
      currentFilmMovie = concurrentMovie;
      return concurrentMovie;
    }
  }

  if (createError) {
    throw createError;
  }

  currentFilmMovie = createdMovie;

  return createdMovie;
}

/* =====================================================
   PANNEAU DES LISTES
   ===================================================== */

function renderListPanel(lists) {
  if (!listPanelOpen) {
    return "";
  }

  if (!currentUser) {
    return `
      <div class="film-list-panel">
        <p>
          Connecte-toi pour ajouter ce film à l’une de tes listes.
        </p>

        <button
          class="button-secondary"
          type="button"
          id="openLoginForListsButton"
        >
          Se connecter
        </button>
      </div>
    `;
  }

  if (!currentFilmMovie?.id) {
    return `
      <div class="film-list-panel">
        <p>
          Ajoute d’abord ce film à ta liste À voir ou publie une
          microcritique pour pouvoir le ranger dans tes collections
          personnelles.
        </p>
      </div>
    `;
  }

  if (lists.length === 0) {
    return `
      <div class="film-list-panel">
        <p>
          Tu n’as pas encore créé de liste.
        </p>

        <a class="button-secondary" href="profil.html">
          Créer ma première liste
        </a>
      </div>
    `;
  }

  return `
    <div class="film-list-panel">
      <p class="film-list-panel-intro">
        Choisis une collection pour y ranger ce film.
      </p>

      <div class="film-list-items">
        ${lists
          .map(
            (list) => `
              <div class="film-list-item">
                <div>
                  <strong>${escapeHTML(list.title)}</strong>

                  <span>
                    ${
                      list.is_public
                        ? "Liste publique"
                        : "Liste privée"
                    }
                  </span>
                </div>

                <button
                  class="${
                    list.contains_movie
                      ? "button-list-added"
                      : "button-list-add"
                  }"
                  type="button"
                  data-list-id="${list.id}"
                  data-action="${
                    list.contains_movie ? "remove" : "add"
                  }"
                >
                  ${
                    list.contains_movie
                      ? "Retirer"
                      : "Ajouter"
                  }
                </button>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function buildWriteReviewLink(tmdbId) {
  if (!tmdbId) {
    return "index.html";
  }

  return `index.html?writeTmdb=${encodeURIComponent(tmdbId)}`;
}

/* =====================================================
   RENDU DE LA FICHE FILM
   ===================================================== */

function renderFilmPage(
  movie,
  tmdbDetails,
  reviews,
  lists = [],
  isInWishlist = false
) {
  const title = tmdbDetails?.title || movie.title || "Film sans titre";

  const releaseYear =
    tmdbDetails?.release_year || movie.release_year || "—";

  const director =
    tmdbDetails?.director ||
    movie.director ||
    "Réalisateur·rice non précisé·e";

  const overview =
    tmdbDetails?.overview ||
    movie.overview ||
    "Synopsis non disponible.";

  const posterUrl = tmdbDetails?.poster_url || movie.poster_url || "";

  const originalTitle =
    tmdbDetails?.original_title || movie.original_title || "";

  const genres = tmdbDetails?.genres?.length
    ? tmdbDetails.genres
    : movie.genres || [];

  const tmdbId = tmdbDetails?.tmdb_id || movie.tmdb_id || null;
  const averageRating = formatAverageRating(reviews);
  const filmExistsInCatalog = Boolean(movie.id);

  document.title = `${title} — Le dernier rang`;

  filmPageContent.innerHTML = `
    <section class="film-hero-card">
      <div class="film-poster-large">
        ${
          posterUrl
            ? `
              <img
                src="${escapeHTML(posterUrl)}"
                alt="Affiche de ${escapeHTML(title)}"
              />
            `
            : `
              <div class="film-poster-placeholder">
                ${escapeHTML(title)}
              </div>
            `
        }
      </div>

      <div class="film-main-info">
        <div class="eyebrow red-eyebrow">Fiche film</div>

        <h1>${escapeHTML(title)}</h1>

        ${
          originalTitle && originalTitle !== title
            ? `
              <p class="original-title">
                ${escapeHTML(originalTitle)}
              </p>
            `
            : ""
        }

        <p class="film-subtitle">
          ${escapeHTML(String(releaseYear))} ·
          ${escapeHTML(director)}
        </p>

        <div class="tags film-tags">
          ${
            genres.length
              ? genres
                  .map(
                    (genre) =>
                      `<span class="tag">${escapeHTML(genre)}</span>`
                  )
                  .join("")
              : `<span class="tag">Cinéma</span>`
          }
        </div>

        <p class="film-overview">
          ${escapeHTML(overview)}
        </p>

        <div class="film-statistics">
          <div class="film-stat">
            <strong>${averageRating}</strong>
            <span>/ 5</span>
            <small>note moyenne</small>
          </div>

          <div class="film-stat">
            <strong>${reviews.length}</strong>
            <small>
              critique${reviews.length > 1 ? "s" : ""}
            </small>
          </div>
        </div>

        <div class="film-primary-actions">
          ${
            tmdbId
              ? `
                <a
                  class="button-primary"
                  href="${buildWriteReviewLink(tmdbId)}"
                >
                  Écrire une microcritique
                </a>
              `
              : ""
          }

          ${
            filmExistsInCatalog || tmdbId
              ? `
                <button
                  class="button-secondary wishlist-button ${
                    isInWishlist ? "is-in-wishlist" : ""
                  }"
                  type="button"
                  id="wishlistButton"
                >
                  ${
                    isInWishlist
                      ? "♥ Dans ma liste À voir"
                      : "+ Ajouter à ma liste À voir"
                  }
                </button>
              `
              : ""
          }

          <button
            class="button-secondary"
            type="button"
            id="toggleListPanelButton"
          >
            ${
              listPanelOpen
                ? "Fermer mes listes"
                : "+ Ajouter à une liste"
            }
          </button>
        </div>

        <div class="film-list-area">
          ${renderListPanel(lists)}
        </div>
      </div>
    </section>

    <section class="film-section">
      <div class="film-section-heading">
        <div>
          <div class="eyebrow red-eyebrow">Distribution</div>
          <h2>À l’écran</h2>
        </div>
      </div>

      ${renderCast(tmdbDetails?.cast || [])}
    </section>

    <section class="film-section">
      <div class="film-section-heading">
        <div>
          <div class="eyebrow red-eyebrow">Microcritiques</div>
          <h2>Ce que le film laisse derrière lui</h2>
        </div>
      </div>

      <div class="movies-grid film-reviews-grid" id="filmReviewsGrid">
        ${
          reviews.length
            ? reviews
                .map((review, index) =>
                  createMovieCard(review, index)
                )
                .join("")
            : `
              <div class="empty-state">
                <strong>Pas encore de microcritique pour ce film.</strong>
                <br /><br />
                ${
                  tmdbId
                    ? `
                      <a
                        class="button-primary"
                        href="${buildWriteReviewLink(tmdbId)}"
                      >
                        Écrire la première microcritique
                      </a>
                    `
                    : "Sois la première personne à laisser quelques mots."
                }
              </div>
            `
        }
      </div>
    </section>
  `;

  setupFilmLikeButtons();
  setupListButtons();
}

/* =====================================================
   INTERACTIONS
   ===================================================== */

function setupFilmLikeButtons() {
  document.querySelectorAll(".favorite").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!currentUser) {
        setAuthMode("login");
        openAuthModal();

        showAuthMessage(
          "Connecte-toi ou crée un compte pour aimer une microcritique.",
          "error"
        );

        return;
      }

      button.disabled = true;

      try {
        await toggleReviewLike(button.dataset.reviewId);
        await initialiseFilmPage();
      } catch (error) {
        console.error("Erreur de like :", error);

        alert(`Impossible de modifier ton like : ${error.message}`);
      } finally {
        button.disabled = false;
      }
    });
  });
}

function setupListButtons() {
  const wishlistButton = document.getElementById("wishlistButton");

  if (wishlistButton) {
    wishlistButton.addEventListener("click", async () => {
      if (!currentUser) {
        setAuthMode("login");
        openAuthModal();

        showAuthMessage(
          "Connecte-toi ou crée un compte pour ajouter un film à ta liste À voir.",
          "error"
        );

        return;
      }

      wishlistButton.disabled = true;
      wishlistButton.textContent = "Mise à jour…";

      try {
        /*
          Un film TMDB sans microcritique est enregistré
          dans le catalogue avant son ajout dans la wishlist.
        */
        const catalogMovie = await ensureCurrentFilmInCatalog();

        await toggleWishlistMovie(catalogMovie.id);

        await initialiseFilmPage();
      } catch (error) {
        console.error("Erreur de gestion de la wishlist :", error);

        alert(
          `Impossible de modifier ta liste À voir : ${error.message}`
        );

        wishlistButton.disabled = false;
      }
    });
  }

  const toggleListPanelButton = document.getElementById(
    "toggleListPanelButton"
  );

  if (toggleListPanelButton) {
    toggleListPanelButton.addEventListener("click", async () => {
      if (!currentUser) {
        setAuthMode("login");
        openAuthModal();

        showAuthMessage(
          "Connecte-toi ou crée un compte pour gérer tes listes.",
          "error"
        );

        return;
      }

      listPanelOpen = !listPanelOpen;
      await initialiseFilmPage();
    });
  }

  const openLoginForListsButton = document.getElementById(
    "openLoginForListsButton"
  );

  if (openLoginForListsButton) {
    openLoginForListsButton.addEventListener("click", () => {
      setAuthMode("login");
      openAuthModal();
    });
  }

  document
    .querySelectorAll(".film-list-item button")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        if (!currentUser || !currentFilmMovie?.id) {
          return;
        }

        const listId = button.dataset.listId;
        const action = button.dataset.action;

        button.disabled = true;
        button.textContent =
          action === "add" ? "Ajout…" : "Retrait…";

        try {
          if (action === "add") {
            const { error } = await supabaseClient
              .from("movie_list_items")
              .insert({
                list_id: listId,
                movie_id: currentFilmMovie.id
              });

            if (error && error.code !== "23505") {
              throw error;
            }
          } else {
            const { error } = await supabaseClient
              .from("movie_list_items")
              .delete()
              .eq("list_id", listId)
              .eq("movie_id", currentFilmMovie.id);

            if (error) {
              throw error;
            }
          }

          await initialiseFilmPage();
        } catch (error) {
          console.error("Erreur de gestion de liste :", error);

          alert(
            `Impossible de modifier cette liste : ${error.message}`
          );

          button.disabled = false;
          button.textContent =
            action === "add" ? "Ajouter" : "Retirer";
        }
      });
    });
}

/* =====================================================
   CATALOGUE ET TMDB
   ===================================================== */

async function getMovieFromCatalog(movieId) {
  const { data, error } = await supabaseClient
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
    .eq("id", movieId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getMovieFromCatalogByTmdbId(tmdbId) {
  const { data, error } = await supabaseClient
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
    .eq("tmdb_id", tmdbId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getTmdbDetails(tmdbId) {
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
    throw new Error("Les détails TMDB du film sont introuvables.");
  }

  return data.result;
}

/* =====================================================
   INITIALISATION
   ===================================================== */

async function initialiseFilmPage() {
  const movieId = getMovieIdFromUrl();
  const tmdbIdFromUrl = getTmdbIdFromUrl();

  if (!movieId && !tmdbIdFromUrl) {
    renderFilmError("Aucun identifiant de film n’a été transmis.");
    return;
  }

  try {
    let movie = null;
    let tmdbDetails = null;

    /*
      Cas 1 : film déjà présent dans le catalogue Supabase.
    */
    if (movieId) {
      movie = await getMovieFromCatalog(movieId);

      if (!movie) {
        renderFilmError(
          "Ce film n’existe pas ou n’est plus disponible."
        );

        return;
      }

      currentTmdbMovieId = movie.tmdb_id || null;

      if (movie.tmdb_id) {
        tmdbDetails = await getTmdbDetails(movie.tmdb_id);
      }
    }

    /*
      Cas 2 : fiche ouverte directement depuis un résultat TMDB.
      Le film peut ne pas encore exister dans Supabase.
    */
    if (!movie && tmdbIdFromUrl) {
      currentTmdbMovieId = tmdbIdFromUrl;

      movie = await getMovieFromCatalogByTmdbId(tmdbIdFromUrl);

      tmdbDetails = await getTmdbDetails(tmdbIdFromUrl);

      /*
        Film virtuel : utilisé pour afficher la fiche.
        Il est créé dans Supabase lors du premier ajout
        à « À voir » ou de la première microcritique.
      */
      if (!movie) {
        movie = {
          id: null,
          tmdb_id: tmdbDetails.tmdb_id,
          title: tmdbDetails.title,
          original_title: tmdbDetails.original_title,
          release_year: tmdbDetails.release_year,
          director: tmdbDetails.director,
          poster_url: tmdbDetails.poster_url,
          overview: tmdbDetails.overview,
          genres: tmdbDetails.genres || []
        };
      }
    }

    currentFilmMovie = movie;

    const [reviews, lists, isInWishlist] = await Promise.all([
      movie.id
        ? getReviewsByMovieId(movie.id)
        : Promise.resolve([]),

      currentUser && movie.id
        ? getMyListsForMovie(movie.id)
        : Promise.resolve([]),

      currentUser && movie.id
        ? getWishlistStatusForMovie(movie.id)
        : Promise.resolve(false)
    ]);

    renderFilmPage(
      movie,
      tmdbDetails,
      reviews,
      lists,
      isInWishlist
    );
  } catch (error) {
    console.error("Erreur de chargement de la fiche film :", error);

    renderFilmError(
      "Une erreur est survenue pendant le chargement de cette fiche."
    );
  }
}

document.addEventListener("authChanged", () => {
  initialiseFilmPage();
});

initialiseFilmPage();
