
function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value || "";
  return div.innerHTML;
}

function stars(rating) {
  const full = Math.floor(Number(rating));
  const half = Number(rating) % 1 !== 0;

  return (
    "★".repeat(full) +
    (half ? "½" : "") +
    "☆".repeat(5 - full - (half ? 1 : 0))
  );
}

function posterClassFor(index) {
  const posters = [
    "poster-1",
    "poster-2",
    "poster-3",
    "poster-4",
    "poster-5",
    "poster-6"
  ];

  return posters[index % posters.length];
}


function createMovieCard(review, index, options = {}) {
  const movie = review.movies || {};
  const genres = movie.genres || [];
  const primaryGenre = genres[0] || "Cinéma";

  const author = options.author || review.author || "Membre";

  const authorAvatarUrl =
    options.authorAvatarUrl ||
    review.author_avatar_url ||
    "";

  const authorInitial = author.charAt(0).toUpperCase() || "?";

  const authorProfileLink = review.user_id
    ? `membre.html?id=${encodeURIComponent(review.user_id)}`
    : "";

  const posterUrl = movie.poster_url || "";
  const likeCount = Number(review.like_count || 0);
  const hasLiked = Boolean(review.liked_by_current_user);

  const isCompactFilmReview = Boolean(options.compactFilmReview);

  const reviewContent = String(review.content || "").trim();

  const reviewMarkup = reviewContent
    ? `
      <p class="review">
        “${escapeHTML(reviewContent)}”
      </p>
    `
    : `
      <p class="review review-note-only">
        Note seule
      </p>
    `;

  const actionButton = options.canDelete
    ? `
      <button
        class="delete-review"
        type="button"
        data-review-id="${review.id}"
        title="Supprimer cette entrée"
      >
        Supprimer
      </button>
    `
    : `
      <button
        class="favorite ${hasLiked ? "liked" : ""}"
        type="button"
        data-review-id="${review.id}"
        title="${hasLiked ? "Retirer mon like" : "J’aime cette entrée"}"
        aria-label="${hasLiked ? "Retirer mon like" : "J’aime cette entrée"}"
      >
        ${hasLiked ? "♥" : "♡"}
        <span class="like-count">${likeCount}</span>
      </button>
    `;

  const editButton = options.canEdit
    ? `
      <button
        class="edit-review"
        type="button"
        data-review-id="${review.id}"
        data-review-content="${escapeHTML(reviewContent)}"
        data-review-title="${escapeHTML(
          movie.title || "Film sans titre"
        )}"
        data-review-rating="${escapeHTML(
          String(review.rating || "")
        )}"
        title="${
          reviewContent
            ? "Modifier mes mots"
            : "Ajouter quelques mots"
        }"
      >
        ${
          reviewContent
            ? "Modifier mes mots"
            : "Ajouter quelques mots"
        }
      </button>
    `
    : "";

  const posterMarkup = posterUrl
    ? `
      <div class="poster poster-image">
        <img
          src="${escapeHTML(posterUrl)}"
          alt="Affiche de ${escapeHTML(movie.title || "ce film")}"
          loading="lazy"
        />
      </div>
    `
    : `
      <div class="poster ${posterClassFor(index)}">
        <div class="poster-content">
          <span class="year">
            ${escapeHTML(String(movie.release_year || "—"))}
          </span>

          <h3 class="movie-title">
            ${escapeHTML(movie.title || "Film sans titre")}
          </h3>
        </div>
      </div>
    `;

  const filmLink = movie.id
    ? `
      <a
        class="film-link"
        href="film.html?id=${encodeURIComponent(movie.id)}"
        title="Voir la fiche du film"
      >
        Fiche
      </a>
    `
    : "";

  const authorAvatarMarkup = authorAvatarUrl
    ? `
      <img
        class="review-author-avatar"
        src="${escapeHTML(authorAvatarUrl)}"
        alt="Photo de profil de ${escapeHTML(author)}"
        loading="lazy"
      />
    `
    : `
      <span
        class="review-author-avatar review-author-placeholder"
        aria-hidden="true"
      >
        ${escapeHTML(authorInitial)}
      </span>
    `;

  const authorMarkup = authorProfileLink
    ? `
      <a
        class="review-author review-author-link"
        href="${authorProfileLink}"
        title="Voir le profil de ${escapeHTML(author)}"
      >
        ${authorAvatarMarkup}

        <span class="author">
          Par ${escapeHTML(author)}
        </span>
      </a>
    `
    : `
      <div class="review-author">
        ${authorAvatarMarkup}

        <span class="author">
          Par ${escapeHTML(author)}
        </span>
      </div>
    `;

  /*
    Variante réservée à la fiche d'un film :
    l'affiche est déjà présente dans le hero de la page.
  */
  if (isCompactFilmReview) {
    return `
      <article class="movie-card movie-card-film-review">
        <div class="movie-content">
          <div class="film-review-header">
            ${authorMarkup}

            <span class="rating" title="${review.rating}/5">
              ${stars(review.rating)}
            </span>
          </div>

          ${reviewMarkup}

          <div class="tags">
            <span class="tag">${escapeHTML(primaryGenre)}</span>

            ${genres
              .filter((genre) => genre !== primaryGenre)
              .map(
                (genre) =>
                  `<span class="tag">${escapeHTML(genre)}</span>`
              )
              .join("")}
          </div>

          <div class="card-bottom">
            <span class="film-review-meta">
              ${
                reviewContent
                  ? "Microcritique"
                  : "Note ajoutée au carnet"
              }
            </span>

            <div class="card-actions">
              ${actionButton}
            </div>
          </div>
        </div>
      </article>
    `;
  }

  /*
    Variante classique :
    utilisée sur l'accueil, les profils et les pages membres.
  */
  return `
    <article class="movie-card">
      ${posterMarkup}

      <div class="movie-content">
        <div class="movie-card-heading">
          <div class="movie-card-identification">
            <h3 class="movie-card-title">
              ${escapeHTML(movie.title || "Film sans titre")}
            </h3>

            <p class="movie-card-director">
              ${escapeHTML(
                movie.director || "Réalisateur·rice non précisé·e"
              )}
            </p>
          </div>

          <span class="rating" title="${review.rating}/5">
            ${stars(review.rating)}
          </span>
        </div>

        ${reviewMarkup}

        <div class="tags">
          <span class="tag">${escapeHTML(primaryGenre)}</span>

          ${genres
            .filter((genre) => genre !== primaryGenre)
            .map(
              (genre) =>
                `<span class="tag">${escapeHTML(genre)}</span>`
            )
            .join("")}
        </div>

        <div class="card-bottom">
          ${authorMarkup}

          <div class="card-actions">
            ${filmLink}
            ${editButton}
            ${actionButton}
          </div>
        </div>
      </div>
    </article>
  `;
}


/* =====================================================
   PROFILS DES AUTEURS
   ===================================================== */

async function getProfilesByUserIds(userIds) {
  const uniqueUserIds = [
    ...new Set(userIds.filter(Boolean))
  ];

  if (uniqueUserIds.length === 0) {
    return {};
  }

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", uniqueUserIds);

  if (error) {
    console.error("Erreur de chargement des profils :", error.message);
    return {};
  }

  return Object.fromEntries(
    data.map((profile) => [profile.id, profile])
  );
}

function addAuthorsToReviews(reviews, profilesById) {
  return reviews.map((review) => ({
    ...review,
    author: profilesById[review.user_id]?.username || "Membre",
    author_avatar_url:
      profilesById[review.user_id]?.avatar_url || ""
  }));
}

/* =====================================================
   LIKES
   ===================================================== */

async function enrichReviewsWithLikes(reviews) {
  if (!reviews || reviews.length === 0) {
    return [];
  }

  const reviewIds = reviews.map((review) => review.id);

  const { data: likes, error } = await supabaseClient
    .from("review_likes")
    .select("review_id, user_id")
    .in("review_id", reviewIds);

  if (error) {
    console.error("Erreur de chargement des likes :", error.message);

    return reviews.map((review) => ({
      ...review,
      like_count: 0,
      liked_by_current_user: false
    }));
  }

  return reviews.map((review) => {
    const reviewLikes = likes.filter(
      (like) => like.review_id === review.id
    );

    return {
      ...review,
      like_count: reviewLikes.length,
      liked_by_current_user: currentUser
        ? reviewLikes.some((like) => like.user_id === currentUser.id)
        : false
    };
  });
}

async function toggleReviewLike(reviewId) {
  if (!currentUser) {
    throw new Error("Connecte-toi pour aimer une entrée du carnet.");
  }

  const { data: existingLike, error: searchError } =
    await supabaseClient
      .from("review_likes")
      .select("id")
      .eq("review_id", reviewId)
      .eq("user_id", currentUser.id)
      .maybeSingle();

  if (searchError) {
    throw searchError;
  }

  if (existingLike) {
    const { error: deleteError } = await supabaseClient
      .from("review_likes")
      .delete()
      .eq("id", existingLike.id);

    if (deleteError) {
      throw deleteError;
    }

    return false;
  }

  const { error: insertError } = await supabaseClient
    .from("review_likes")
    .insert({
      review_id: reviewId,
      user_id: currentUser.id
    });

  if (insertError) {
    throw insertError;
  }

  return true;
}

/* =====================================================
   LECTURE DES NOTES ET MICROCRITIQUES
   ===================================================== */

async function getPublicReviews() {
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
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur de chargement des critiques :", error.message);
    return [];
  }

  const profilesById = await getProfilesByUserIds(
    reviews.map((review) => review.user_id)
  );

  const reviewsWithAuthors = addAuthorsToReviews(
    reviews,
    profilesById
  );

  return enrichReviewsWithLikes(reviewsWithAuthors);
}

async function getMyReviews(userId) {
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
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur de chargement de tes critiques :", error.message);
    return [];
  }

  const profilesById = await getProfilesByUserIds(
    reviews.map((review) => review.user_id)
  );

  const reviewsWithAuthors = addAuthorsToReviews(
    reviews,
    profilesById
  );

  return enrichReviewsWithLikes(reviewsWithAuthors);
}

/*
  Récupère toutes les entrées publiques d’un film.
  Utilisée sur film.html par film.js.
*/
async function getReviewsByMovieId(movieId) {
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
    .eq("movie_id", movieId)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "Erreur de chargement des critiques du film :",
      error.message
    );

    return [];
  }

  const profilesById = await getProfilesByUserIds(
    reviews.map((review) => review.user_id)
  );

  const reviewsWithAuthors = addAuthorsToReviews(
    reviews,
    profilesById
  );

  return enrichReviewsWithLikes(reviewsWithAuthors);
}

/* =====================================================
   PUBLICATION
   ===================================================== */

async function publishReview(payload) {
  if (!currentUser) {
    throw new Error(
      "Tu dois être connectée pour ajouter une note ou une microcritique."
    );
  }

  const {
    title,
    tmdbMovie,
    year,
    director,
    genre,
    rating,
    content,
    tags
  } = payload;

  const genres = [
    ...new Set(
      [
        genre,
        ...(tmdbMovie?.genres || []),
        ...tags
      ].filter(Boolean)
    )
  ];

  const tmdbId = tmdbMovie?.tmdb_id || null;

  const movieData = {
    title,
    release_year: year ? Number(year) : null,
    director,
    genres,
    created_by: currentUser.id
  };

  if (tmdbMovie) {
    movieData.tmdb_id = tmdbMovie.tmdb_id;
    movieData.poster_path = tmdbMovie.poster_path || null;
    movieData.poster_url = tmdbMovie.poster_url || null;
    movieData.overview = tmdbMovie.overview || "";
    movieData.original_title = tmdbMovie.original_title || "";
  }

  let existingMovie = null;

  if (tmdbId) {
    const { data, error } = await supabaseClient
      .from("movies")
      .select("id")
      .eq("tmdb_id", tmdbId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    existingMovie = data;
  } else {
    const { data, error } = await supabaseClient
      .from("movies")
      .select("id")
      .ilike("title", title)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    existingMovie = data;
  }

  let movieId = existingMovie?.id;

  if (!movieId) {
    const { data: createdMovie, error: movieError } =
      await supabaseClient
        .from("movies")
        .insert(movieData)
        .select("id")
        .single();

    if (movieError) {
      throw movieError;
    }

    movieId = createdMovie.id;
  } else if (tmdbMovie) {
    const { error: updateMovieError } = await supabaseClient
      .from("movies")
      .update(movieData)
      .eq("id", movieId);

    if (updateMovieError) {
      throw updateMovieError;
    }
  }

  /*
    Une chaîne vide devient null :
    elle représente une note seule dans la base.
  */
  const reviewContent = String(content || "").trim() || null;

  const { error: reviewError } = await supabaseClient
    .from("reviews")
    .insert({
      user_id: currentUser.id,
      movie_id: movieId,
      rating: Number(rating),
      content: reviewContent,
      is_published: true
    });

  if (reviewError?.code === "23505") {
    throw new Error(
      "Tu as déjà ajouté une note ou une microcritique pour ce film."
    );
  }

  if (reviewError) {
    throw reviewError;
  }
}

/* =====================================================
   ÉDITION DU TEXTE UNIQUEMENT
   ===================================================== */

/*
  Modifie exclusivement reviews.content.

  La note, le film associé et l'auteur ne font pas partie
  de la requête update : ils restent donc inchangés.
*/
async function updateReviewContent(reviewId, content) {
  if (!currentUser) {
    throw new Error(
      "Tu dois être connectée pour modifier tes mots."
    );
  }

  const cleanContent = String(content || "").trim();

  if (!cleanContent) {
    throw new Error(
      "Ajoute quelques mots avant d’enregistrer."
    );
  }

  if (cleanContent.length > 140) {
    throw new Error(
      "Ta microcritique ne peut pas dépasser 140 caractères."
    );
  }

  const { data, error } = await supabaseClient
    .from("reviews")
    .update({
      content: cleanContent
    })
    .eq("id", reviewId)
    .eq("user_id", currentUser.id)
    .select("id, content, rating")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/* =====================================================
   SUPPRESSION
   ===================================================== */

async function deleteReview(reviewId) {
  const { error } = await supabaseClient
    .from("reviews")
    .delete()
    .eq("id", reviewId);

  if (error) {
    throw error;
  }
}
