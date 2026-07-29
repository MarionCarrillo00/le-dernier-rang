
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
  const posterUrl = movie.poster_url || "";

  const likeCount = Number(review.like_count || 0);
  const hasLiked = Boolean(review.liked_by_current_user);

  const deleteButton = options.canDelete
    ? `
      <button
        class="delete-review"
        data-review-id="${review.id}"
        title="Supprimer cette critique"
      >
        Supprimer
      </button>
    `
    : `
      <button
        class="favorite ${hasLiked ? "liked" : ""}"
        data-review-id="${review.id}"
        title="${hasLiked ? "Retirer mon like" : "J’aime cette critique"}"
        aria-label="${hasLiked ? "Retirer mon like" : "J’aime cette critique"}"
      >
        ${hasLiked ? "♥" : "♡"}
        <span class="like-count">${likeCount}</span>
      </button>
    `;

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

  return `
    <article class="movie-card">
      ${posterMarkup}

      <div class="movie-content">
        <div class="movie-meta">
          <span>
            ${escapeHTML(movie.director || "Réalisateur·rice non précisé·e")}
          </span>

          <span class="rating" title="${review.rating}/5">
            ${stars(review.rating)}
          </span>
        </div>

        <p class="review">“${escapeHTML(review.content)}”</p>

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
          <span class="author">Par ${escapeHTML(author)}</span>
          ${deleteButton}
        </div>
      </div>
    </article>
  `;
}


async function getProfilesByUserIds(userIds) {
  const uniqueUserIds = [...new Set(userIds)];

  if (uniqueUserIds.length === 0) {
    return {};
  }

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, username")
    .in("id", uniqueUserIds);

  if (error) {
    console.error("Erreur de chargement des profils :", error.message);
    return {};
  }

  return Object.fromEntries(
    data.map((profile) => [profile.id, profile])
  );
}

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
    throw new Error("Connecte-toi pour aimer une microcritique.");
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


  const reviewsWithAuthors = reviews.map((review) => ({
    ...review,
    author: profilesById[review.user_id]?.username || "Membre"
  }));

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

return enrichReviewsWithLikes(reviews);
}

async function publishReview(payload) {
  if (!currentUser) {
    throw new Error("Tu dois être connectée pour publier une critique.");
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

  /*
    Ordre des genres :
    1. genre principal adapté aux filtres du site ;
    2. genres récupérés depuis TMDB ;
    3. tags personnels écrits par l'utilisatrice.
  */
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

  /*
    Enrichissement de la fiche avec les informations TMDB.
    Ces colonnes ont été ajoutées dans Supabase auparavant.
  */
  if (tmdbMovie) {
    movieData.tmdb_id = tmdbMovie.tmdb_id;
    movieData.poster_path = tmdbMovie.poster_path || null;
    movieData.poster_url = tmdbMovie.poster_url || null;
    movieData.overview = tmdbMovie.overview || "";
    movieData.original_title = tmdbMovie.original_title || "";
  }

  let existingMovie = null;

  /*
    Recherche prioritaire avec tmdb_id :
    c'est l'identifiant unique et fiable d'un film.
  */
  if (tmdbId) {
    const { data, error } = await supabaseClient
      .from("movies")
      .select("id")
      .eq("tmdb_id", tmdbId)
      .maybeSingle();

    if (error) throw error;

    existingMovie = data;
  } else {
    /*
      Solution de secours pour les films ajoutés manuellement
      avant l'intégration TMDB.
    */
    const { data, error } = await supabaseClient
      .from("movies")
      .select("id")
      .ilike("title", title)
      .limit(1)
      .maybeSingle();

    if (error) throw error;

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

    if (movieError) throw movieError;

    movieId = createdMovie.id;
  } else if (tmdbMovie) {
    /*
      Si ce film existait déjà dans la base, il reçoit maintenant
      ses métadonnées TMDB : affiche, synopsis, réalisateur, etc.
    */
    const { error: updateMovieError } = await supabaseClient
      .from("movies")
      .update(movieData)
      .eq("id", movieId);

    if (updateMovieError) throw updateMovieError;
  }

  const { error: reviewError } = await supabaseClient
    .from("reviews")
    .insert({
      user_id: currentUser.id,
      movie_id: movieId,
      rating: Number(rating),
      content,
      is_published: true
    });

  if (reviewError?.code === "23505") {
    throw new Error(
      "Tu as déjà publié une microcritique pour ce film."
    );
  }

  if (reviewError) throw reviewError;
}

async function deleteReview(reviewId) {
  const { error } = await supabaseClient
    .from("reviews")
    .delete()
    .eq("id", reviewId);

  if (error) throw error;
}
