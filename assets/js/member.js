
const memberPageContent = document.getElementById(
  "memberPageContent"
);

/* =====================================================
   UTILITAIRES
   ===================================================== */

function getMemberIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function renderMemberError(message) {
  if (!memberPageContent) {
    return;
  }

  memberPageContent.innerHTML = `
    <div class="film-error">
      <h1>Ce profil est introuvable.</h1>

      <p>${escapeHTML(message)}</p>

      <a class="button-primary" href="index.html#critiques">
        Retour aux microcritiques
      </a>
    </div>
  `;
}

function getMemberInitial(profile) {
  const username = profile?.username || "Membre";

  return username.charAt(0).toUpperCase() || "?";
}

function renderMemberAvatar(profile) {
  const username = profile?.username || "Membre";

  if (profile?.avatar_url) {
    return `
      <img
        class="member-avatar-large"
        src="${escapeHTML(profile.avatar_url)}"
        alt="Photo de profil de ${escapeHTML(username)}"
      />
    `;
  }

  return `
    <div
      class="member-avatar-large member-avatar-placeholder"
      aria-hidden="true"
    >
      ${escapeHTML(getMemberInitial(profile))}
    </div>
  `;
}

/* =====================================================
   AMITIÉS — RELATION ENTRE MOI ET LE MEMBRE
   ===================================================== */

async function getFriendshipWithMember(memberId) {
  if (!currentUser || !memberId || currentUser.id === memberId) {
    return null;
  }

  const { data: friendships, error } = await supabaseClient
    .from("friendships")
    .select(`
      id,
      requester_id,
      recipient_id,
      status,
      created_at,
      accepted_at
    `)
    .or(
      `requester_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`
    );

  if (error) {
    throw error;
  }

  return (
    (friendships || []).find(
      (friendship) =>
        (
          friendship.requester_id === currentUser.id &&
          friendship.recipient_id === memberId
        ) ||
        (
          friendship.requester_id === memberId &&
          friendship.recipient_id === currentUser.id
        )
    ) || null
  );
}

function getFriendshipState(memberId, friendship) {
  if (!currentUser || currentUser.id === memberId) {
    return "self";
  }

  if (!friendship) {
    return "none";
  }

  if (friendship.status === "accepted") {
    return "accepted";
  }

  if (friendship.requester_id === currentUser.id) {
    return "outgoing";
  }

  return "incoming";
}

function renderFriendshipAction(memberId, friendship) {
  const state = getFriendshipState(memberId, friendship);

  if (state === "self") {
    return "";
  }

  if (!currentUser) {
    return `
      <button
        class="button-secondary friendship-button"
        type="button"
        data-friendship-action="login"
      >
        Ajouter comme ami·e
      </button>
    `;
  }

  if (state === "none") {
    return `
      <button
        class="button-secondary friendship-button"
        type="button"
        data-friendship-action="send"
        data-member-id="${memberId}"
      >
        Ajouter comme ami·e
      </button>
    `;
  }

  if (state === "outgoing") {
    return `
      <div class="friendship-status friendship-status-pending">
        <span>Demande envoyée</span>

        <button
          type="button"
          data-friendship-action="cancel"
          data-friendship-id="${friendship.id}"
        >
          Annuler
        </button>
      </div>
    `;
  }

  if (state === "incoming") {
    return `
      <div class="friendship-status friendship-status-incoming">
        <span>Souhaite devenir ami·e</span>

        <div>
          <button
            class="friendship-accept-button"
            type="button"
            data-friendship-action="accept"
            data-friendship-id="${friendship.id}"
          >
            Accepter
          </button>

          <button
            class="friendship-refuse-button"
            type="button"
            data-friendship-action="refuse"
            data-friendship-id="${friendship.id}"
          >
            Refuser
          </button>
        </div>
      </div>
    `;
  }

  return `
    <div class="friendship-status friendship-status-accepted">
      <span>Vous êtes ami·es</span>

      <button
        type="button"
        data-friendship-action="remove"
        data-friendship-id="${friendship.id}"
      >
        Retirer
      </button>
    </div>
  `;
}

function renderMessageAction(memberId, friendship) {
  const isAcceptedFriend =
    currentUser &&
    friendship?.status === "accepted" &&
    String(currentUser.id) !== String(memberId);

  if (!isAcceptedFriend) {
    return "";
  }

  return `
    <a
      class="friendship-message-button"
      href="messages.html?with=${encodeURIComponent(memberId)}"
    >
      Échanger autour du cinéma
    </a>
  `;
}

async function sendFriendshipRequest(memberId) {
  if (!currentUser) {
    throw new Error("AUTH_REQUIRED");
  }

  const { error } = await supabaseClient
    .from("friendships")
    .insert({
      requester_id: currentUser.id,
      recipient_id: memberId,
      status: "pending"
    });

  if (error) {
    throw error;
  }
}

async function acceptFriendshipRequest(friendshipId) {
  if (!currentUser) {
    throw new Error(
      "Tu dois être connectée pour accepter une demande d’amis."
    );
  }

  const { error } = await supabaseClient
    .from("friendships")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString()
    })
    .eq("id", friendshipId)
    .eq("recipient_id", currentUser.id)
    .eq("status", "pending");

  if (error) {
    throw error;
  }
}

async function deleteFriendship(friendshipId) {
  if (!currentUser) {
    throw new Error(
      "Tu dois être connectée pour modifier une relation d’amitié."
    );
  }

  const { error } = await supabaseClient
    .from("friendships")
    .delete()
    .eq("id", friendshipId)
    .or(
      `requester_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`
    );

  if (error) {
    throw error;
  }
}

function setupFriendshipButtons() {
  document
    .querySelectorAll("[data-friendship-action]")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        const action = button.dataset.friendshipAction;

        if (action === "login") {
          setAuthMode("login");
          openAuthModal();

          showAuthMessage(
            "Connecte-toi ou crée un compte pour ajouter des ami·es.",
            "error"
          );

          return;
        }

        button.disabled = true;

        try {
          if (action === "send") {
            await sendFriendshipRequest(button.dataset.memberId);
          }

          if (action === "accept") {
            await acceptFriendshipRequest(
              button.dataset.friendshipId
            );
          }

          if (
            action === "cancel" ||
            action === "refuse" ||
            action === "remove"
          ) {
            await deleteFriendship(button.dataset.friendshipId);
          }

          await loadMemberPage();
        } catch (error) {
          console.error("Erreur de gestion de l’amitié :", error);

          alert(
            `Impossible de mettre à jour cette relation : ${error.message}`
          );

          button.disabled = false;
        }
      });
    });
}

/* =====================================================
   LISTES PUBLIQUES
   ===================================================== */

function renderPublicListCard(list) {
  const movieCount = Number(list.movie_count || 0);

  const label = movieCount > 1
    ? "films"
    : "film";

  return `
    <a
      class="movie-list-card member-list-card"
      href="liste.html?id=${encodeURIComponent(list.id)}"
    >
      <div class="movie-list-card-top">
        <span class="list-visibility public">
          Publique
        </span>
      </div>

      <h3>${escapeHTML(list.title)}</h3>

      <p>
        ${
          list.description
            ? escapeHTML(list.description)
            : "Une collection de films à faire grandir."
        }
      </p>

      <div class="movie-list-card-bottom">
        <span>${movieCount} ${label}</span>
        <span>Voir la liste →</span>
      </div>
    </a>
  `;
}

/* =====================================================
   WISHLIST PUBLIQUE
   ===================================================== */

function renderMemberWishlistCard(movie) {
  const title = movie.title || "Film sans titre";
  const releaseYear = movie.release_year || "—";

  const director =
    movie.director || "Réalisation non renseignée";

  const posterMarkup = movie.poster_url
    ? `
      <img
        src="${escapeHTML(movie.poster_url)}"
        alt="Affiche de ${escapeHTML(title)}"
        loading="lazy"
      />
    `
    : `
      <div class="member-wishlist-placeholder">
        <span>${escapeHTML(String(releaseYear))}</span>
        <strong>${escapeHTML(title)}</strong>
      </div>
    `;

  return `
    <article class="member-wishlist-movie-card">
      <a
        class="member-wishlist-poster-link"
        href="film.html?id=${encodeURIComponent(movie.id)}"
        title="Voir la fiche de ${escapeHTML(title)}"
      >
        ${posterMarkup}
      </a>

      <div class="member-wishlist-movie-content">
        <h3>
          <a href="film.html?id=${encodeURIComponent(movie.id)}">
            ${escapeHTML(title)}
          </a>
        </h3>

        <p>
          ${escapeHTML(String(releaseYear))} ·
          ${escapeHTML(director)}
        </p>
      </div>
    </article>
  `;
}

async function getPublicCollectionsForMember(userId) {
  const { data: lists, error } = await supabaseClient
    .from("movie_lists")
    .select(`
      id,
      title,
      description,
      is_public,
      list_type,
      created_at
    `)
    .eq("user_id", userId)
    .eq("is_public", true)
    .order("created_at", {
      ascending: false
    });

  if (error) {
    throw error;
  }

  if (!lists || lists.length === 0) {
    return {
      wishlist: null,
      wishlistMovies: [],
      customLists: [],
      publicListCount: 0
    };
  }

  const listIds = lists.map((list) => list.id);

  const { data: items, error: itemsError } = await supabaseClient
    .from("movie_list_items")
    .select(`
      id,
      list_id,
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
    .in("list_id", listIds)
    .order("created_at", {
      ascending: false
    });

  if (itemsError) {
    throw itemsError;
  }

  const itemsByListId = {};

  (items || []).forEach((item) => {
    if (!itemsByListId[item.list_id]) {
      itemsByListId[item.list_id] = [];
    }

    itemsByListId[item.list_id].push(item);
  });

  const listsWithCount = lists.map((list) => ({
    ...list,
    movie_count: (itemsByListId[list.id] || []).length
  }));

  const wishlist =
    listsWithCount.find(
      (list) => list.list_type === "wishlist"
    ) || null;

  const wishlistMovies = wishlist
    ? (itemsByListId[wishlist.id] || [])
        .filter((item) => item.movies)
        .map((item) => item.movies)
    : [];

  const customLists = listsWithCount.filter(
    (list) => list.list_type !== "wishlist"
  );

  return {
    wishlist,
    wishlistMovies,
    customLists,
    publicListCount: customLists.length
  };
}

function renderMemberWishlistSection(
  username,
  wishlist,
  wishlistMovies
) {
  if (!wishlist || wishlistMovies.length === 0) {
    return "";
  }

  const visibleMovies = wishlistMovies.slice(0, 6);
  const totalMovies = wishlistMovies.length;

  const movieLabel = totalMovies > 1
    ? "films"
    : "film";

  return `
    <section class="member-section member-wishlist-section">
      <div class="section-title member-wishlist-heading">
        <div>
          <div class="eyebrow red-eyebrow">
            Prochaines séances
          </div>

          <h2>À voir chez ${escapeHTML(username)}</h2>
        </div>

        <a
          class="button-secondary"
          href="liste.html?id=${encodeURIComponent(wishlist.id)}"
        >
          Voir la liste
        </a>
      </div>

      <div class="member-wishlist-grid">
        ${visibleMovies.map(renderMemberWishlistCard).join("")}
      </div>

      ${
        totalMovies > visibleMovies.length
          ? `
            <p class="member-wishlist-more">
              ${totalMovies} ${movieLabel} attendent leur séance.
            </p>
          `
          : ""
      }
    </section>
  `;
}

/* =====================================================
   SON CINÉMA — PRÉFÉRENCES PUBLIQUES
   ===================================================== */

async function getMemberCinema(memberId) {
  const [
    favoriteMovieResult,
    favoriteTalentsResult
  ] = await Promise.all([
    supabaseClient
      .from("profile_favorite_movies")
      .select(`
        movie_id,
        movies (
          id,
          tmdb_id,
          title,
          release_year,
          director,
          poster_url
        )
      `)
      .eq("profile_id", memberId)
      .maybeSingle(),

    supabaseClient
      .from("profile_favorite_talents")
      .select(`
        tmdb_id,
        talent_type,
        talent_name,
        profile_url
      `)
      .eq("profile_id", memberId)
  ]);

  if (favoriteMovieResult.error) {
    throw favoriteMovieResult.error;
  }

  if (favoriteTalentsResult.error) {
    throw favoriteTalentsResult.error;
  }

  const talents = favoriteTalentsResult.data || [];

  return {
    movie: favoriteMovieResult.data?.movies || null,

    actor:
      talents.find(
        (talent) => talent.talent_type === "acting"
      ) || null,

    director:
      talents.find(
        (talent) => talent.talent_type === "directing"
      ) || null
  };
}

function renderMemberCinemaMovie(movie) {
  if (!movie) {
    return "";
  }

  const title = movie.title || "Film sans titre";

  const posterMarkup = movie.poster_url
    ? `
      <img
        src="${escapeHTML(movie.poster_url)}"
        alt="Affiche de ${escapeHTML(title)}"
        loading="lazy"
      />
    `
    : `
      <div class="member-cinema-movie-placeholder">
        ${escapeHTML(getMemberInitial({ username: title }))}
      </div>
    `;

  const metadata = [
    movie.release_year,
    movie.director
  ]
    .filter(Boolean)
    .join(" · ");

  return `
    <a
      class="member-cinema-movie"
      href="film.html?id=${encodeURIComponent(movie.id)}"
    >
      <div class="member-cinema-movie-poster">
        ${posterMarkup}
      </div>

      <div class="member-cinema-movie-copy">
        <span>Film gardé tout près</span>
        <strong>${escapeHTML(title)}</strong>

        ${
          metadata
            ? `<small>${escapeHTML(metadata)}</small>`
            : ""
        }
      </div>
    </a>
  `;
}

function renderMemberCinemaTalent(talent, type) {
  if (!talent) {
    return "";
  }

  const name = talent.talent_name || "Talent";

  const label = type === "acting"
    ? "Interprète de prédilection"
    : "Cinéma de prédilection";

  const portraitMarkup = talent.profile_url
    ? `
      <img
        src="${escapeHTML(talent.profile_url)}"
        alt="Portrait de ${escapeHTML(name)}"
        loading="lazy"
      />
    `
    : `
      <div class="member-cinema-talent-placeholder">
        ${escapeHTML(getMemberInitial({ username: name }))}
      </div>
    `;

  const content = `
    <div class="member-cinema-talent-portrait">
      ${portraitMarkup}
    </div>

    <div class="member-cinema-talent-copy">
      <span>${escapeHTML(label)}</span>
      <strong>${escapeHTML(name)}</strong>
    </div>
  `;

  return talent.tmdb_id
    ? `
      <a
        class="member-cinema-talent"
        href="talent.html?tmdb=${encodeURIComponent(talent.tmdb_id)}"
      >
        ${content}
      </a>
    `
    : `
      <div class="member-cinema-talent">
        ${content}
      </div>
    `;
}



function renderMemberCinemaSection(profile, cinema) {
  const quote = String(profile.favorite_quote || "").trim();

  const genres = Array.isArray(profile.favorite_genres)
    ? profile.favorite_genres
    : [];

  const decades = Array.isArray(profile.favorite_decades)
    ? profile.favorite_decades
    : [];

  const hasCinema = Boolean(
    quote ||
    cinema.movie ||
    cinema.actor ||
    cinema.director ||
    genres.length ||
    decades.length
  );

  const memberId = encodeURIComponent(profile.id);

  return `
    <section class="member-section member-cinema-section member-cinema-compact-section">
      <div class="member-cinema-compact-top">
        <div class="eyebrow red-eyebrow">
          Son cinéma
        </div>

        ${
          quote
            ? `
              <p class="member-cinema-discreet-quote">
                <span aria-hidden="true">«</span>
                ${escapeHTML(quote)}
                <span aria-hidden="true">»</span>
              </p>
            `
            : ""
        }
      </div>

      ${
        hasCinema
          ? `
            ${
              cinema.movie || cinema.actor || cinema.director
                ? `
                  <div class="member-cinema-favorites">
                    ${renderMemberCinemaMovie(cinema.movie)}

                    <div class="member-cinema-talents">
                      ${renderMemberCinemaTalent(cinema.actor, "acting")}
                      ${renderMemberCinemaTalent(cinema.director, "directing")}
                    </div>
                  </div>
                `
                : ""
            }

            ${
              genres.length || decades.length
                ? `
                  <div class="member-cinema-tags">
                    ${
                      genres.length
                        ? `
                          <div class="member-cinema-tag-group">
                            <span>Genres</span>

                            <div>
                              ${genres
                                .map(
                                  (genre) =>
                                    `<em>${escapeHTML(genre)}</em>`
                                )
                                .join("")}
                            </div>
                          </div>
                        `
                        : ""
                    }

                    ${
                      decades.length
                        ? `
                          <div class="member-cinema-tag-group">
                            <span>Décennies</span>

                            <div>
                              ${decades
                                .map(
                                  (decade) =>
                                    `<em>${escapeHTML(decade)}</em>`
                                )
                                .join("")}
                            </div>
                          </div>
                        `
                        : ""
                    }
                  </div>
                `
                : ""
            }
          `
          : `
            <p class="member-cinema-empty-note">
              Quelques films et visages se dessinent dans son carnet.
            </p>
          `
      }

      <a
        class="cinema-talents-link member-cinema-talents-link"
        href="talents-carnet.html?id=${memberId}"
      >
        Voir les talents de son carnet
        <span aria-hidden="true">→</span>
      </a>
    </section>
  `;
}


/* =====================================================
   AFFINITÉ CINÉPHILE
   Calcul local, sans nouvelle table Supabase.
   ===================================================== */

function getAffinityOverlap(firstValues, secondValues) {
  const first = new Set(
    (Array.isArray(firstValues) ? firstValues : [])
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean)
  );

  const second = new Set(
    (Array.isArray(secondValues) ? secondValues : [])
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean)
  );

  if (!first.size || !second.size) {
    return {
      score: 0,
      shared: []
    };
  }

  const shared = [...first].filter((value) => second.has(value));

  const unionSize = new Set([...first, ...second]).size;

  return {
    score: unionSize ? shared.length / unionSize : 0,
    shared
  };
}

function getAffinityFavoriteScore(myCinema, memberCinema) {
  let possibleMatches = 0;
  let matches = 0;

  const myMovieTmdbId = String(
    myCinema?.movie?.tmdb_id || ""
  );

  const memberMovieTmdbId = String(
    memberCinema?.movie?.tmdb_id || ""
  );

  if (myMovieTmdbId && memberMovieTmdbId) {
    possibleMatches += 1;

    if (myMovieTmdbId === memberMovieTmdbId) {
      matches += 1;
    }
  }

  const myActorTmdbId = String(
    myCinema?.actor?.tmdb_id || ""
  );

  const memberActorTmdbId = String(
    memberCinema?.actor?.tmdb_id || ""
  );

  if (myActorTmdbId && memberActorTmdbId) {
    possibleMatches += 1;

    if (myActorTmdbId === memberActorTmdbId) {
      matches += 1;
    }
  }

  const myDirectorTmdbId = String(
    myCinema?.director?.tmdb_id || ""
  );

  const memberDirectorTmdbId = String(
    memberCinema?.director?.tmdb_id || ""
  );

  if (myDirectorTmdbId && memberDirectorTmdbId) {
    possibleMatches += 1;

    if (myDirectorTmdbId === memberDirectorTmdbId) {
      matches += 1;
    }
  }

  return possibleMatches ? matches / possibleMatches : 0;
}

function getAffinityLabel(score, commonMoviesCount) {
  if (commonMoviesCount < 3) {
    return "Vos carnets commencent à se croiser";
  }

  if (commonMoviesCount < 6) {
    return "Une sensibilité proche";
  }

  if (score >= 80) {
    return "Très belle affinité";
  }

  if (score >= 65) {
    return "Une affinité évidente";
  }

  if (score >= 50) {
    return "Une sensibilité proche";
  }

  return "Des regards à rapprocher";
}

function getAffinityDescription(
  commonMoviesCount,
  sharedGenres,
  sharedDecades,
  score
) {
  const movieLabel =
    commonMoviesCount > 1
      ? "films en commun"
      : "film en commun";

  const details = [];

  if (sharedGenres.length) {
    details.push(
      `un goût commun pour ${sharedGenres
        .slice(0, 2)
        .join(" et ")}`
    );
  }

  if (sharedDecades.length) {
    details.push(
      `un attachement aux années ${sharedDecades
        .slice(0, 2)
        .join(" et ")}`
    );
  }

  if (commonMoviesCount < 3) {
    return `Vous avez ${commonMoviesCount} ${movieLabel}. Gardez quelques séances en commun pour laisser apparaître vos affinités.`;
  }

  if (commonMoviesCount < 6) {
    return details.length
      ? `Vous partagez ${commonMoviesCount} ${movieLabel}, avec ${details.join(" et ")}.`
      : `Vous partagez déjà ${commonMoviesCount} ${movieLabel}. Vos carnets commencent à dialoguer.`;
  }

  if (details.length) {
    return `Vous partagez ${commonMoviesCount} ${movieLabel}, avec ${details.join(" et ")}.`;
  }

  if (score >= 65) {
    return `Vos notes se répondent sur ${commonMoviesCount} ${movieLabel}.`;
  }

  return `Vous partagez ${commonMoviesCount} ${movieLabel}, avec des regards parfois différents.`;
}

async function getProfileCinemaForAffinity(profileId) {
  const [
    favoriteMovieResult,
    favoriteTalentsResult
  ] = await Promise.all([
    supabaseClient
      .from("profile_favorite_movies")
      .select(`
        movie_id,
        movies (
          id,
          tmdb_id,
          title
        )
      `)
      .eq("profile_id", profileId)
      .maybeSingle(),

    supabaseClient
      .from("profile_favorite_talents")
      .select(`
        tmdb_id,
        talent_type,
        talent_name
      `)
      .eq("profile_id", profileId)
  ]);

  if (favoriteMovieResult.error) {
    throw favoriteMovieResult.error;
  }

  if (favoriteTalentsResult.error) {
    throw favoriteTalentsResult.error;
  }

  const talents = favoriteTalentsResult.data || [];

  return {
    movie: favoriteMovieResult.data?.movies || null,

    actor:
      talents.find(
        (talent) => talent.talent_type === "acting"
      ) || null,

    director:
      talents.find(
        (talent) => talent.talent_type === "directing"
      ) || null
  };
}

async function getReviewsForAffinity(profileId) {
  const { data, error } = await supabaseClient
    .from("reviews")
    .select(`
      movie_id,
      rating
    `)
    .eq("user_id", profileId);

  if (error) {
    throw error;
  }

  return data || [];
}

async function getMemberAffinity(
  memberProfile,
  friendship,
  memberCinema
) {
  /*
    L'affinité est une information intime :
    elle nécessite une amitié acceptée et l'accord
    des deux personnes concernées.
  */
  if (
    !currentUser ||
    currentUser.id === memberProfile.id ||
    friendship?.status !== "accepted" ||
    memberProfile.compatibility_visible === false
  ) {
    return null;
  }

  try {
    const [
      myProfileResult,
      myReviews,
      memberReviews,
      myCinema
    ] = await Promise.all([
      supabaseClient
        .from("profiles")
        .select(`
          id,
          favorite_genres,
          favorite_decades,
          compatibility_visible
        `)
        .eq("id", currentUser.id)
        .single(),

      getReviewsForAffinity(currentUser.id),
      getReviewsForAffinity(memberProfile.id),

      getProfileCinemaForAffinity(currentUser.id)
    ]);

    if (myProfileResult.error) {
      throw myProfileResult.error;
    }

    const myProfile = myProfileResult.data;

    if (myProfile.compatibility_visible === false) {
      return null;
    }

    const memberReviewsByMovieId = Object.fromEntries(
      memberReviews
        .filter((review) => review.movie_id)
        .map((review) => [
          review.movie_id,
          Number(review.rating) || 0
        ])
    );

    const commonRatings = myReviews
      .filter(
        (review) =>
          review.movie_id &&
          memberReviewsByMovieId[review.movie_id] !== undefined
      )
      .map((review) => {
        const myRating = Number(review.rating) || 0;

        const memberRating =
          memberReviewsByMovieId[review.movie_id];

        /*
          Les notes vont de 1 à 5 :
          un écart de 4 représente donc l'opposition maximale.
        */
        const similarity = Math.max(
          0,
          1 - Math.abs(myRating - memberRating) / 4
        );

        return similarity;
      });

    const commonMoviesCount = commonRatings.length;

    const averageRatingSimilarity = commonMoviesCount
      ? commonRatings.reduce(
          (total, similarity) => total + similarity,
          0
        ) / commonMoviesCount
      : 0;

    const genresOverlap = getAffinityOverlap(
      myProfile.favorite_genres,
      memberProfile.favorite_genres
    );

    const decadesOverlap = getAffinityOverlap(
      myProfile.favorite_decades,
      memberProfile.favorite_decades
    );

    const favoritesScore = getAffinityFavoriteScore(
      myCinema,
      memberCinema
    );

    /*
      Les films et notes en commun restent le cœur du score.
      Les goûts déclarés enrichissent seulement la lecture.
    */
    const score = Math.round(
      averageRatingSimilarity * 75 +
      genresOverlap.score * 15 +
      decadesOverlap.score * 7 +
      favoritesScore * 3
    );

    return {
      commonMoviesCount,
      score,
      label: getAffinityLabel(score, commonMoviesCount),
      description: getAffinityDescription(
        commonMoviesCount,
        genresOverlap.shared,
        decadesOverlap.shared,
        score
      ),
      sharedGenres: genresOverlap.shared,
      sharedDecades: decadesOverlap.shared
    };
  } catch (error) {
    console.error(
      "Impossible de calculer l’affinité cinéphile :",
      error
    );

    return null;
  }
}

function renderMemberAffinitySection(affinity) {
  if (!affinity) {
    return "";
  }

  const canShowScore = affinity.commonMoviesCount >= 6;

  return `
    <section class="member-affinity-section">
      <div class="member-affinity-kicker">
        Entre vos deux carnets
      </div>

      <div class="member-affinity-content">
        <div>
          <h2>${escapeHTML(affinity.label)}</h2>

          <p>
            ${escapeHTML(affinity.description)}
          </p>
        </div>

        ${
          canShowScore
            ? `
              <div
                class="member-affinity-score"
                aria-label="${affinity.score} pour cent d’affinité cinéphile"
              >
                <strong>${affinity.score}</strong>
                <span>%</span>
              </div>
            `
            : `
              <div class="member-affinity-common-count">
                <strong>${affinity.commonMoviesCount}</strong>
                <span>
                  film${
                    affinity.commonMoviesCount > 1 ? "s" : ""
                  }<br />
                  en commun
                </span>
              </div>
            `
        }
      </div>
    </section>
  `;
}

/* =====================================================
   AMIS PUBLICS — SON CERCLE
   ===================================================== */

function renderMemberFriendsSection(friends) {
  return `
    <section class="member-section member-friends-section">
      <div class="section-title member-friends-heading">
        <div>
          <div class="eyebrow red-eyebrow">
            Son cercle
          </div>

          <h2>Ses amis</h2>
        </div>

        <span
          class="my-circle-count member-friends-count"
          aria-label="Nombre d’amis"
        >
          ${friends.length}
        </span>
      </div>

      <div class="circle-friends-grid member-friends-grid">
        ${createFriendsMarkup(
          friends,
          `
            <strong>Ce cercle attend encore ses premiers visages.</strong>
            <br /><br />
            Les liens de cinéma se construisent doucement.
          `
        )}
      </div>
    </section>
  `;
}

/* =====================================================
   MICROCRITIQUES PUBLIQUES
   ===================================================== */

async function getPublicReviewsForMember(userId) {
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
    .eq("is_published", true)
    .order("created_at", {
      ascending: false
    });

  if (error) {
    throw error;
  }

  const profilesById = await getProfilesByUserIds(
    (reviews || []).map((review) => review.user_id)
  );

  const reviewsWithAuthors = addAuthorsToReviews(
    reviews || [],
    profilesById
  );

  return enrichReviews(reviewsWithAuthors);
}

/* =====================================================
   RENDU DU PROFIL PUBLIC
   ===================================================== */

function getMemberJournalCounts(reviews) {
  const allEntries = reviews || [];

  const microReviews = allEntries.filter((review) =>
    String(review.content || "").trim()
  );

  const notes = allEntries.filter(
    (review) => !String(review.content || "").trim()
  );

  return {
    microReviewsCount: microReviews.length,
    notesCount: notes.length
  };
}

function renderMemberPage(
  profile,
  reviews,
  collections,
  friendship,
  friends,
  cinema,
  affinity

) {
  if (!memberPageContent) {
    return;
  }

  const username = profile.username || "Membre";

  const bio = profile.bio?.trim() ||
    "Ici, quelques films et les traces qu’ils ont laissées.";

  const {
    wishlist,
    wishlistMovies,
    customLists,
    publicListCount
  } = collections;

  const friendCount = friends.length;

  const {
    microReviewsCount,
    notesCount
  } = getMemberJournalCounts(reviews);

  document.title = `${username} — Ciné Mojito`;

  memberPageContent.innerHTML = `
    <section class="member-hero-card">
      <div class="member-profile-identity">
        ${renderMemberAvatar(profile)}

        <div>
          <div class="eyebrow red-eyebrow">
            Carnet de cinéma
          </div>

          <h1>${escapeHTML(username)}</h1>

          <p>${escapeHTML(bio)}</p>
        </div>
      </div>


<div class="member-hero-aside">
  ${renderFriendshipAction(profile.id, friendship)}

  ${renderMessageAction(profile.id, friendship)}


        <div class="member-statistics member-statistics-detailed">
          <div class="member-stat">
            <strong>${microReviewsCount}</strong>

            <small>
              microcritique${
                microReviewsCount > 1 ? "s" : ""
              }
            </small>
          </div>

          <div class="member-stat member-stat-notes">
            <strong>${notesCount}</strong>

            <small>
              note${notesCount > 1 ? "s" : ""}
            </small>
          </div>

          <div class="member-stat">
            <strong>${publicListCount}</strong>

            <small>
              liste${publicListCount > 1 ? "s" : ""} publique${
                publicListCount > 1 ? "s" : ""
              }
            </small>
          </div>

          <div class="member-stat">
            <strong>${friendCount}</strong>

            <small>
              ami${friendCount > 1 ? "s" : ""}
            </small>
          </div>
        </div>
      </div>
    </section>

    ${renderMemberCinemaSection(profile, cinema)}
${renderMemberAffinitySection(affinity)}

    ${renderMemberWishlistSection(
      username,
      wishlist,
      wishlistMovies
    )}

    <section class="member-section">
      <div class="section-title">
        <div>
          <div class="eyebrow red-eyebrow">
            Ses listes
          </div>

          <h2>
            Les petites collections de ${escapeHTML(username)}
          </h2>
        </div>
      </div>

      <div class="lists-grid">
        ${
          customLists.length
            ? customLists.map(renderPublicListCard).join("")
            : `
              <div class="empty-state">
                <strong>Pas encore de liste publique.</strong>
                <br /><br />
                Les collections de ${escapeHTML(username)}
                apparaîtront ici.
              </div>
            `
        }
      </div>
    </section>

    ${renderMemberFriendsSection(friends)}

    <section class="member-section">
      <div class="section-title">
        <div>
          <div class="eyebrow red-eyebrow">
            Son journal
          </div>

          <h2>
            Le carnet de ${escapeHTML(username)}
          </h2>
        </div>
      </div>

      <div class="movies-grid member-reviews-grid">
        ${
          reviews.length
            ? reviews
                .map((review, index) =>
                  createMovieCard(review, index)
                )
                .join("")
            : `
              <div class="empty-state">
                <strong>Pas encore d’entrée publique dans ce carnet.</strong>
                <br /><br />
                Ce carnet garde encore un peu ses silences.
              </div>
            `
        }
      </div>
    </section>
  `;

  setupMemberLikeButtons();
  setupFriendshipButtons();
}

/* =====================================================
   LIKES
   ===================================================== */

function setupMemberLikeButtons() {
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

      button.disabled = true;

      try {
        await toggleReviewLike(button.dataset.reviewId);
        await loadMemberPage();
      } catch (error) {
        console.error("Erreur de like :", error);

        alert(
          `Impossible de modifier ton like : ${error.message}`
        );
      } finally {
        button.disabled = false;
      }
    });
  });
}

/* =====================================================
   CHARGEMENT DE LA PAGE
   ===================================================== */

async function loadMemberPage() {
  const memberId = getMemberIdFromUrl();

  if (!memberId) {
    renderMemberError(
      "Aucun identifiant de membre n’a été transmis."
    );

    return;
  }

  try {
    const { data: profile, error: profileError } =
      await supabaseClient
        .from("profiles")
        .select(`
          id,
          username,
          bio,
          avatar_url,
          favorite_quote,
          favorite_genres,
          favorite_decades,
          compatibility_visible
        `)
        .eq("id", memberId)
        .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      renderMemberError(
        "Ce profil n’existe pas ou n’est plus disponible."
      );

      return;
    }

    const [
      reviewsResult,
      collectionsResult,
      friendshipResult,
      friendsResult,
      cinemaResult
    ] = await Promise.allSettled([
      getPublicReviewsForMember(profile.id),
      getPublicCollectionsForMember(profile.id),
      getFriendshipWithMember(profile.id),
      getAcceptedFriends(profile.id),
      getMemberCinema(profile.id)
    ]);

    if (reviewsResult.status === "rejected") {
      throw reviewsResult.reason;
    }

    if (collectionsResult.status === "rejected") {
      throw collectionsResult.reason;
    }

    const reviews = reviewsResult.value;
    const collections = collectionsResult.value;

    const friendship =
      friendshipResult.status === "fulfilled"
        ? friendshipResult.value
        : null;

    const friends =
      friendsResult.status === "fulfilled"
        ? friendsResult.value
        : [];

    const cinema =
      cinemaResult.status === "fulfilled"
        ? cinemaResult.value
        : {
            movie: null,
            actor: null,
            director: null
          };
    
    const affinity = await getMemberAffinity(
      profile,
      friendship,
      cinema
    );


    if (friendshipResult.status === "rejected") {
      console.error(
        "Impossible de charger la relation d’amitié :",
        friendshipResult.reason
      );
    }

    if (friendsResult.status === "rejected") {
      console.error(
        "Impossible de charger le cercle du membre :",
        friendsResult.reason
      );
    }

    if (cinemaResult.status === "rejected") {
      console.error(
        "Impossible de charger les préférences cinéma du membre :",
        cinemaResult.reason
      );
    }

    renderMemberPage(
      profile,
      reviews,
      collections,
      friendship,
      friends,
      cinema,
      affinity
    );
  } catch (error) {
    console.error(
      "Erreur de chargement du profil public :",
      error
    );

    renderMemberError(
      "Une erreur est survenue pendant le chargement de ce profil."
    );
  }
}

/* =====================================================
   INITIALISATION
   ===================================================== */

document.addEventListener("authChanged", () => {
  loadMemberPage();
});

loadMemberPage();
