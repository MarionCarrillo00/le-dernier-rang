
const filmPageContent = document.getElementById("filmPageContent");

let currentFilmMovie = null;
let listPanelOpen = false;

function getMovieIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
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

async function getMyListsForMovie(movieId) {
  if (!currentUser) {
    return [];
  }

  const { data: lists, error: listsError } = await supabaseClient
    .from("movie_lists")
    .select(`
      id,
      title,
      description,
      is_public,
      created_at
    `)
    .eq("user_id", currentUser.id)
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

function renderFilmPage(movie, tmdbDetails, reviews, lists = []) {
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

  const averageRating = formatAverageRating(reviews);

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

        <div class="film-list-area">
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
                Sois la première personne à laisser quelques mots.
              </div>
            `
        }
      </div>
    </section>
  `;

  setupFilmLikeButtons();
  setupListButtons();
}

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
        if (!currentUser || !currentFilmMovie) {
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

            /*
              La contrainte unique évite les doublons.
              Si la ligne existe déjà, on rafraîchit simplement l'écran.
            */
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

async function initialiseFilmPage() {
  const movieId = getMovieIdFromUrl();

  if (!movieId) {
    renderFilmError("Aucun identifiant de film n’a été transmis.");
    return;
  }

  try {
    const { data: movie, error: movieError } = await supabaseClient
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

    if (movieError) {
      throw movieError;
    }

    if (!movie) {
      renderFilmError(
        "Ce film n’existe pas ou n’est plus disponible."
      );

      return;
    }

    currentFilmMovie = movie;

    const [reviews, lists] = await Promise.all([
      getReviewsByMovieId(movie.id),
      currentUser
        ? getMyListsForMovie(movie.id)
        : Promise.resolve([])
    ]);

    let tmdbDetails = null;

    if (movie.tmdb_id) {
      const { data, error } = await supabaseClient.functions.invoke(
        "tmdb-details",
        {
          body: {
            movieId: movie.tmdb_id
          }
        }
      );

      if (!error && data?.result) {
        tmdbDetails = data.result;
      }
    }

    renderFilmPage(movie, tmdbDetails, reviews, lists);
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
