
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
   AMIS PUBLICS — SON CERCLE
   getAcceptedFriends() et createFriendsMarkup()
   sont disponibles grâce à friends.js.
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

  /*
    Garde ton nom de fonction existant :
    dans ton reviews.js actuel, enrichReviews() est déjà utilisé.
  */
  return enrichReviews(reviewsWithAuthors);
}

/* =====================================================
   RENDU DU PROFIL PUBLIC
   ===================================================== */

function renderMemberPage(
  profile,
  reviews,
  collections,
  friendship,
  friends
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

  document.title = `${username} — Le dernier rang`;

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

        <div class="member-statistics">
          <div class="member-stat">
            <strong>${reviews.length}</strong>

            <small>
              microcritique${reviews.length > 1 ? "s" : ""}
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
            Les microcritiques de ${escapeHTML(username)}
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
                <strong>Pas encore de microcritique publique.</strong>
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
        .select("id, username, bio, avatar_url")
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

    /*
      Le cercle est séparé des données principales :
      si une policy RLS manque temporairement sur friendships,
      le profil du membre reste entièrement lisible.
    */
    const [
      reviewsResult,
      collectionsResult,
      friendshipResult,
      friendsResult
    ] = await Promise.allSettled([
      getPublicReviewsForMember(profile.id),
      getPublicCollectionsForMember(profile.id),
      getFriendshipWithMember(profile.id),
      getAcceptedFriends(profile.id)
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

    renderMemberPage(
      profile,
      reviews,
      collections,
      friendship,
      friends
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
