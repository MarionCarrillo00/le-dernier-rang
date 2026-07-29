
const filmPageContent = document.getElementById("filmPageContent");

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

function renderFilmPage(movie, tmdbDetails, reviews) {
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

  const genres =
    tmdbDetails?.genres?.length
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
      renderFilmError("Ce film n’existe pas ou n’est plus disponible.");
      return;
    }

    const reviews = await getReviewsByMovieId(movie.id);

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

    renderFilmPage(movie, tmdbDetails, reviews);
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
