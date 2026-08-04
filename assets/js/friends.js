
/* =====================================================
   AMITIÉS ET ACTIVITÉ DU CERCLE — MODULE PARTAGÉ
   Utilisé par profil.html, membre.html et index.html
   ===================================================== */

const MEMBER_PROFILE_PAGE = "membre.html";

/* =====================================================
   OUTILS
   ===================================================== */

function escapeFriendHTML(value) {
  if (typeof escapeHTML === "function") {
    return escapeHTML(value);
  }

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatFriendDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function renderCircleActivityMessage(message) {
  const circleActivityFeed = document.getElementById("circleActivityFeed");

  if (!circleActivityFeed) {
    return;
  }

  circleActivityFeed.innerHTML = `
    <div class="circle-activity-empty">
      ${escapeFriendHTML(message)}
    </div>
  `;
}

/* =====================================================
   LECTURE DES AMITIÉS ACCEPTÉES
   ===================================================== */

async function getAcceptedFriends(userId) {
  if (!userId) {
    return [];
  }

  const { data: friendships, error } = await supabaseClient
    .from("friendships")
    .select(`
      id,
      requester_id,
      recipient_id,
      status,
      accepted_at,
      created_at
    `)
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("accepted_at", {
      ascending: false
    });

  if (error) {
    throw error;
  }

  if (!friendships || friendships.length === 0) {
    return [];
  }

  const friendIds = [
    ...new Set(
      friendships
        .map((friendship) => {
          return friendship.requester_id === userId
            ? friendship.recipient_id
            : friendship.requester_id;
        })
        .filter(Boolean)
    )
  ];

  if (!friendIds.length) {
    return [];
  }

  const { data: profiles, error: profilesError } = await supabaseClient
    .from("profiles")
    .select(`
      id,
      username,
      bio,
      avatar_url
    `)
    .in("id", friendIds);

  if (profilesError) {
    throw profilesError;
  }

  const profilesById = Object.fromEntries(
    (profiles || []).map((profile) => [
      profile.id,
      profile
    ])
  );

  return friendIds
    .map((friendId) => {
      const friendship = friendships.find((item) => {
        return (
          (item.requester_id === userId &&
            item.recipient_id === friendId) ||
          (item.recipient_id === userId &&
            item.requester_id === friendId)
        );
      });

      const profile = profilesById[friendId];

      if (!profile) {
        return null;
      }

      return {
        friendship_id: friendship?.id || null,
        friendship_created_at:
          friendship?.accepted_at ||
          friendship?.created_at ||
          null,
        ...profile
      };
    })
    .filter(Boolean);
}

/* =====================================================
   AFFICHAGE DES CARTES AMIS
   ===================================================== */

function getFriendInitial(friend) {
  const username = friend?.username || "Membre";

  return username.charAt(0).toUpperCase() || "?";
}

function renderFriendAvatar(friend) {
  const username = friend?.username || "Membre";

  if (friend?.avatar_url) {
    return `
      <img
        class="circle-friend-avatar"
        src="${escapeFriendHTML(friend.avatar_url)}"
        alt="Photo de profil de ${escapeFriendHTML(username)}"
        loading="lazy"
      />
    `;
  }

  return `
    <div
      class="circle-friend-avatar circle-friend-avatar-placeholder"
      aria-hidden="true"
    >
      ${escapeFriendHTML(getFriendInitial(friend))}
    </div>
  `;
}

function createFriendCard(friend) {
  const username = friend?.username || "Membre";

  const profileUrl =
    `${MEMBER_PROFILE_PAGE}?id=${encodeURIComponent(friend.id)}`;

  const biography = friend?.bio?.trim()
    ? `
      <p class="circle-friend-bio">
        ${escapeFriendHTML(friend.bio.trim())}
      </p>
    `
    : `
      <p class="circle-friend-bio circle-friend-bio-empty">
        Un carnet de cinéma à découvrir.
      </p>
    `;

  return `
    <article class="circle-friend-card">
      <a
        class="circle-friend-avatar-link"
        href="${profileUrl}"
        title="Voir le profil de ${escapeFriendHTML(username)}"
      >
        ${renderFriendAvatar(friend)}
      </a>

      <div class="circle-friend-content">
        <h3>
          <a href="${profileUrl}">
            ${escapeFriendHTML(username)}
          </a>
        </h3>

        ${biography}

        <a
          class="circle-friend-link"
          href="${profileUrl}"
        >
          Voir le profil
        </a>
      </div>
    </article>
  `;
}

function createFriendsMarkup(friends, emptyMessage) {
  if (!friends || friends.length === 0) {
    return `
      <div class="empty-state circle-empty-state">
        ${emptyMessage}
      </div>
    `;
  }

  return friends.map(createFriendCard).join("");
}

/* =====================================================
   ACTIVITÉ DU CERCLE — ACCUEIL
   ===================================================== */

function createCircleActivityCard(review) {
  const author = review.author || {};
  const movie = review.movies || {};

  const username = author.username || "Un membre";
  const movieTitle = movie.title || "un film";
  const releaseYear = movie.release_year || "";
  const reviewText = String(review.content || "").trim();

  const profileUrl =
    `${MEMBER_PROFILE_PAGE}?id=${encodeURIComponent(review.user_id)}`;

  const filmUrl =
    `film.html?id=${encodeURIComponent(review.movie_id)}`;

  const avatarMarkup = author.avatar_url
    ? `
      <img
        src="${escapeFriendHTML(author.avatar_url)}"
        alt="Photo de profil de ${escapeFriendHTML(username)}"
        loading="lazy"
      />
    `
    : `
      <span>
        ${escapeFriendHTML(username.charAt(0).toUpperCase() || "M")}
      </span>
    `;

  return `
    <article class="circle-activity-card">
      <a
        class="circle-activity-avatar"
        href="${profileUrl}"
        title="Voir le profil de ${escapeFriendHTML(username)}"
      >
        ${avatarMarkup}
      </a>

      <div class="circle-activity-content">
        <p class="circle-activity-meta">
          <a href="${profileUrl}">
            ${escapeFriendHTML(username)}
          </a>
          a ajouté à son carnet
        </p>

        <h3>
          <a href="${filmUrl}">
            ${escapeFriendHTML(movieTitle)}
          </a>
          ${
            releaseYear
              ? `<span>(${escapeFriendHTML(releaseYear)})</span>`
              : ""
          }
        </h3>

        <p class="circle-activity-rating">
          ${escapeFriendHTML(review.rating)} / 5
          ${
            formatFriendDate(review.created_at)
              ? ` · ${formatFriendDate(review.created_at)}`
              : ""
          }
        </p>

        ${
          reviewText
            ? `
              <p class="circle-activity-review">
                “${escapeFriendHTML(reviewText)}”
              </p>
            `
            : `
              <p class="circle-activity-review circle-activity-note-only">
                Note seule
              </p>
            `
        }
      </div>
    </article>
  `;
}

async function getCircleActivity(userId) {
  const friends = await getAcceptedFriends(userId);

  const friendIds = friends
    .map((friend) => friend.id)
    .filter(Boolean);

  if (!friendIds.length) {
    return [];
  }

  const { data: reviews, error } = await supabaseClient
    .from("reviews")
    .select(`
      id,
      user_id,
      movie_id,
      rating,
      content,
      created_at,
      movies (
        id,
        title,
        release_year
      )
    `)
    .eq("is_published", true)
    .in("user_id", friendIds)
    .order("created_at", {
      ascending: false
    })
    .limit(10);

  if (error) {
    throw error;
  }

  const profilesById = Object.fromEntries(
    friends.map((friend) => [friend.id, friend])
  );

  return (reviews || []).map((review) => ({
    ...review,
    author: profilesById[review.user_id] || null
  }));
}

async function loadCircleActivity() {
  const circleActivityFeed = document.getElementById("circleActivityFeed");

  /*
    Cette fonction ne s'exécute que sur l'accueil,
    car les autres pages ne possèdent pas ce conteneur.
  */
  if (!circleActivityFeed) {
    return;
  }

  if (!currentUser) {
    renderCircleActivityMessage(
      "Connecte-toi pour retrouver l’activité de ton cercle."
    );
    return;
  }

  circleActivityFeed.innerHTML = `
    <div class="circle-activity-loading">
      Chargement de l’activité…
    </div>
  `;

  try {
    const activity = await getCircleActivity(currentUser.id);

    if (!activity.length) {
      renderCircleActivityMessage(
        "Les prochaines séances de ton cercle apparaîtront ici."
      );
      return;
    }

    circleActivityFeed.innerHTML = activity
      .map(createCircleActivityCard)
      .join("");
  } catch (error) {
    console.error(
      "Erreur lors du chargement de l’activité du cercle :",
      error
    );

    renderCircleActivityMessage(
      "Impossible de charger l’activité du cercle pour le moment."
    );
  }
}

/* =====================================================
   INITIALISATION
   ===================================================== */

document.addEventListener("authChanged", () => {
  loadCircleActivity();
});

/*
  Utile si la session est déjà initialisée au chargement
  de friends.js.
*/
if (typeof currentUser !== "undefined" && currentUser) {
  loadCircleActivity();
}
