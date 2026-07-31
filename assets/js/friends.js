
/* =====================================================
   AMITIÉS — MODULE PARTAGÉ
   Utilisé par profil.html et member.html
   ===================================================== */

const MEMBER_PROFILE_PAGE = "membre.html";

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
    .or(
      `requester_id.eq.${userId},recipient_id.eq.${userId}`
    )
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

  const { data: profiles, error: profilesError } =
    await supabaseClient
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
      const friendship = friendships.find(
        (item) =>
          item.requester_id === friendId ||
          item.recipient_id === friendId
      );

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
        src="${escapeHTML(friend.avatar_url)}"
        alt="Photo de profil de ${escapeHTML(username)}"
        loading="lazy"
      />
    `;
  }

  return `
    <div
      class="circle-friend-avatar circle-friend-avatar-placeholder"
      aria-hidden="true"
    >
      ${escapeHTML(getFriendInitial(friend))}
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
        ${escapeHTML(friend.bio.trim())}
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
        title="Voir le profil de ${escapeHTML(username)}"
      >
        ${renderFriendAvatar(friend)}
      </a>

      <div class="circle-friend-content">
        <h3>
          <a href="${profileUrl}">
            ${escapeHTML(username)}
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
