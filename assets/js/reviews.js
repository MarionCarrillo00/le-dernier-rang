
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
      <button class="favorite" title="Ajouter aux favoris">♡</button>
    `;

  return `
    <article class="movie-card">
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
            .map((genre) => `<span class="tag">${escapeHTML(genre)}</span>`)
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

  return reviews.map((review) => ({
    ...review,
    author: profilesById[review.user_id]?.username || "Membre"
  }));
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

  return reviews;
}

async function publishReview(payload) {
  if (!currentUser) {
    throw new Error("Tu dois être connectée pour publier une critique.");
  }

  const {
    title,
    year,
    director,
    genre,
    rating,
    content,
    tags
  } = payload;

  const genres = [...new Set([genre, ...tags])];

  const { data: existingMovie, error: searchError } =
    await supabaseClient
      .from("movies")
      .select("id")
      .ilike("title", title)
      .limit(1)
      .maybeSingle();

  if (searchError) throw searchError;

  let movieId = existingMovie?.id;

  if (!movieId) {
    const { data: createdMovie, error: movieError } =
      await supabaseClient
        .from("movies")
        .insert({
          title,
          release_year: year ? Number(year) : null,
          director,
          genres,
          created_by: currentUser.id
        })
        .select("id")
        .single();

    if (movieError) throw movieError;

    movieId = createdMovie.id;
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
