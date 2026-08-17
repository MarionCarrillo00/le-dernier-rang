
const myReviewsGrid = document.getElementById("myReviewsGrid");
const reviewTotal = document.getElementById("reviewTotal");
const profileTitle = document.getElementById("profileTitle");
const profileSubtitle = document.getElementById("profileSubtitle");

const myWishlistGrid = document.getElementById("myWishlistGrid");

/* =====================================================
   WISHLIST : FILM VU → AJOUT AU CARNET
   ===================================================== */

const watchlistReviewModal = document.getElementById(
  "watchlistReviewModal"
);

const watchlistReviewForm = document.getElementById(
  "watchlistReviewForm"
);

const watchlistReviewFilm = document.getElementById(
  "watchlistReviewFilm"
);

const watchlistReviewRating = document.getElementById(
  "watchlistReviewRating"
);

const watchlistReviewContent = document.getElementById(
  "watchlistReviewContent"
);

const watchlistReviewCharacterCounter = document.getElementById(
  "watchlistReviewCharacterCounter"
);

const closeWatchlistReviewModalButton = document.getElementById(
  "closeWatchlistReviewModal"
);

const cancelWatchlistReviewButton = document.getElementById(
  "cancelWatchlistReviewButton"
);

const saveWatchlistReviewButton = document.getElementById(
  "saveWatchlistReviewButton"
);

let selectedWishlistMovie = null;

const myListsGrid = document.getElementById("myListsGrid");
const listForm = document.getElementById("listForm");

const openListFormButton = document.getElementById(
  "openListFormButton"
);

const cancelListFormButton = document.getElementById(
  "cancelListFormButton"
);

const listTitleInput = document.getElementById("listTitle");

const listDescriptionInput = document.getElementById(
  "listDescription"
);

const listVisibilityInput = document.getElementById(
  "listVisibility"
);

/* =====================================================
   DEMANDES D'AMIS
   ===================================================== */

const friendRequestsSection = document.getElementById(
  "friendRequestsSection"
);

const friendRequestsGrid = document.getElementById(
  "friendRequestsGrid"
);

const friendRequestsCount = document.getElementById(
  "friendRequestsCount"
);

/* =====================================================
   MON CERCLE — AMIS ACCEPTÉS
   ===================================================== */

const myCircleSection = document.getElementById(
  "myCircleSection"
);

const myCircleGrid = document.getElementById(
  "myCircleGrid"
);

const myCircleCount = document.getElementById(
  "myCircleCount"
);

/* =====================================================
   ACTIVITÉ / NOTIFICATIONS
   ===================================================== */

const activityFeed = document.getElementById(
  "activityFeed"
);

const activityUnreadCount = document.getElementById(
  "activityUnreadCount"
);

const markAllNotificationsReadButton = document.getElementById(
  "markAllNotificationsReadButton"
);

/* =====================================================
   RECOMMANDATIONS DE FILMS REÇUES
   ===================================================== */

const receivedRecommendationsGrid = document.getElementById(
  "receivedRecommendationsGrid"
);

const receivedRecommendationsCount = document.getElementById(
  "receivedRecommendationsCount"
);

/* =====================================================
   RECOMMANDATIONS DE FILMS ENVOYÉES
   ===================================================== */

const sentRecommendationsGrid = document.getElementById(
  "sentRecommendationsGrid"
);

const sentRecommendationsCount = document.getElementById(
  "sentRecommendationsCount"
);

/* =====================================================
   MODALE D'ÉDITION DES MICROCRITIQUES
   ===================================================== */

const editReviewModal = document.getElementById(
  "editReviewModal"
);

const editReviewForm = document.getElementById(
  "editReviewForm"
);

const closeEditReviewModalButton = document.getElementById(
  "closeEditReviewModal"
);

const cancelEditReviewButton = document.getElementById(
  "cancelEditReviewButton"
);

const editReviewTitle = document.getElementById(
  "editReviewTitle"
);

const editReviewMovieTitle = document.getElementById(
  "editReviewMovieTitle"
);

const editReviewRatingInput = document.getElementById(
  "editReviewRatingInput"
);

const saveEditReviewButton = document.getElementById(
  "saveEditReviewButton"
);

let editingReviewId = null;

let addingContentReviewId = null;

const addReviewContentModal = document.getElementById(
  "addReviewContentModal"
);

const addReviewContentForm = document.getElementById(
  "addReviewContentForm"
);

const closeAddReviewContentModalButton = document.getElementById(
  "closeAddReviewContentModal"
);

const cancelAddReviewContentButton = document.getElementById(
  "cancelAddReviewContentButton"
);

const addReviewContentMovieTitle = document.getElementById(
  "addReviewContentMovieTitle"
);

const addReviewContentInput = document.getElementById(
  "addReviewContentInput"
);

const addReviewContentCharacterCounter = document.getElementById(
  "addReviewContentCharacterCounter"
);

const saveAddReviewContentButton = document.getElementById(
  "saveAddReviewContentButton"
);

let areAllMovieListsVisible = false;

/* =====================================================
   PHOTO DE PROFIL
   ===================================================== */

const profileAvatar = document.getElementById("profileAvatar");

const profileAvatarPlaceholder = document.getElementById(
  "profileAvatarPlaceholder"
);

const avatarInput = document.getElementById("avatarInput");

const avatarStatus = document.getElementById("avatarStatus");

/* =====================================================
   PROFIL ET AVATAR
   ===================================================== */

function getCurrentUsername() {
  return (
    currentProfile?.username ||
    currentUser?.email?.split("@")[0] ||
    "Membre"
  );
}

function getAvatarInitial() {
  return getCurrentUsername().charAt(0).toUpperCase() || "?";
}

function showAvatarStatus(message, type = "") {
  if (!avatarStatus) {
    return;
  }

  avatarStatus.textContent = message;
  avatarStatus.className = "avatar-status";

  if (type) {
    avatarStatus.classList.add(type);
  }
}

function renderProfileAvatar() {
  if (!profileAvatar || !profileAvatarPlaceholder) {
    return;
  }

  if (!currentUser) {
    profileAvatar.hidden = true;
    profileAvatar.removeAttribute("src");

    profileAvatarPlaceholder.hidden = false;
    profileAvatarPlaceholder.textContent = "?";

    showAvatarStatus("");
    return;
  }

  const avatarUrl = currentProfile?.avatar_url;

  if (avatarUrl) {
    profileAvatar.src = `${avatarUrl}?v=${Date.now()}`;
    profileAvatar.alt =
      `Photo de profil de ${getCurrentUsername()}`;

    profileAvatar.hidden = false;
    profileAvatarPlaceholder.hidden = true;
  } else {
    profileAvatar.hidden = true;
    profileAvatar.removeAttribute("src");

    profileAvatarPlaceholder.hidden = false;
    profileAvatarPlaceholder.textContent = getAvatarInitial();
  }
}

async function uploadProfileAvatar(file) {
  if (!currentUser || !file) {
    return;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {
    showAvatarStatus(
      "Choisis une image JPG, PNG ou WebP.",
      "error"
    );
    return;
  }

  const maximumSize = 2 * 1024 * 1024;

  if (file.size > maximumSize) {
    showAvatarStatus(
      "La photo doit faire moins de 2 Mo.",
      "error"
    );
    return;
  }

  showAvatarStatus("Téléversement de la photo…");

  const filePath = `${currentUser.id}/avatar`;

  try {
    const { error: uploadError } = await supabaseClient.storage
      .from("avatars")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } = supabaseClient.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const avatarUrl = publicUrlData.publicUrl;

    const { error: profileError } = await supabaseClient
      .from("profiles")
      .update({
        avatar_url: avatarUrl
      })
      .eq("id", currentUser.id);

    if (profileError) {
      throw profileError;
    }

    currentProfile = {
      ...currentProfile,
      avatar_url: avatarUrl
    };

    renderProfileAvatar();

    document.dispatchEvent(
      new CustomEvent("authChanged", {
        detail: {
          user: currentUser,
          profile: currentProfile
        }
      })
    );

    showAvatarStatus(
      "Ta photo de profil est enregistrée.",
      "success"
    );
  } catch (error) {
    console.error("Erreur de téléversement de l’avatar :", error);

    showAvatarStatus(
      `Impossible d’enregistrer cette photo : ${error.message}`,
      "error"
    );
  } finally {
    avatarInput.value = "";
  }
}

/* =====================================================
   FORMULAIRE DE LISTE
   ===================================================== */

function showListForm() {
  if (
    !listForm ||
    !openListFormButton ||
    !listTitleInput
  ) {
    return;
  }

  listForm.hidden = false;
  openListFormButton.hidden = true;
  listTitleInput.focus();
}

function hideListForm() {
  if (!listForm || !openListFormButton) {
    return;
  }

  listForm.hidden = true;
  openListFormButton.hidden = false;
  listForm.reset();
}

/* =====================================================
   ÉDITION DES NOTES ET MICROCRITIQUES
   ===================================================== */

function openEditReviewModal(button) {
  if (
    !editReviewModal ||
    !editReviewTitle ||
    !editReviewMovieTitle ||
    !editReviewRatingInput ||
    !saveEditReviewButton
  ) {
    return;
  }

  editingReviewId = button.dataset.reviewId;

  const movieTitle =
    button.dataset.reviewTitle || "Film sans titre";

  const rating = String(
    Number(button.dataset.reviewRating) || 1
  );

  editReviewTitle.textContent = "Modifier ma note";
  editReviewMovieTitle.textContent = movieTitle;
  editReviewRatingInput.value = rating;
  saveEditReviewButton.textContent = "Enregistrer ma note";

  editReviewModal.classList.add("visible");

  window.setTimeout(() => {
    editReviewRatingInput.focus();
  }, 50);
}

function closeEditReviewModal() {
  if (!editReviewModal) {
    return;
  }

  editReviewModal.classList.remove("visible");
  editingReviewId = null;
}

function setupReviewEditButtons() {
  document.querySelectorAll(".edit-review").forEach((button) => {
    button.addEventListener("click", () => {
      openEditReviewModal(button);
    });
  });

  document
    .querySelectorAll(".add-review-content")
    .forEach((button) => {
      button.addEventListener("click", () => {
        openAddReviewContentModal(button);
      });
    });
}

function updateAddReviewContentCharacterCounter() {
  if (
    !addReviewContentInput ||
    !addReviewContentCharacterCounter
  ) {
    return;
  }

  const maximum =
    Number(addReviewContentInput.maxLength) || 140;

  const length = addReviewContentInput.value.length;

  addReviewContentCharacterCounter.textContent =
    `${length} / ${maximum}`;

  addReviewContentCharacterCounter.classList.toggle(
    "limit-reached",
    length >= maximum
  );
}

function openAddReviewContentModal(button) {
  if (
    !addReviewContentModal ||
    !addReviewContentMovieTitle ||
    !addReviewContentInput
  ) {
    return;
  }

  addingContentReviewId = button.dataset.reviewId;

  addReviewContentMovieTitle.textContent =
    button.dataset.reviewTitle || "Film sans titre";

  addReviewContentInput.value = "";

  updateAddReviewContentCharacterCounter();

  addReviewContentModal.classList.add("visible");

  window.setTimeout(() => {
    addReviewContentInput.focus();
  }, 50);
}

function closeAddReviewContentModal() {
  if (!addReviewContentModal) {
    return;
  }

  addReviewContentModal.classList.remove("visible");

  addingContentReviewId = null;

  if (addReviewContentInput) {
    addReviewContentInput.value = "";
  }

  updateAddReviewContentCharacterCounter();
}

/* =====================================================
   CRITIQUES DU PROFIL
   ===================================================== */

function renderProfileReviews(reviews) {
  const username = getCurrentUsername();

  if (profileTitle) {
    profileTitle.textContent = `Le carnet de ${username}`;
  }

  if (profileSubtitle) {
    profileSubtitle.textContent =
      "Tes films, tes mots, les traces que les séances ont laissées.";
  }

  if (reviewTotal) {
    reviewTotal.textContent = reviews.length;
  }

  const profileStatLabel = document.querySelector(
    ".profile-stat small"
  );

  if (profileStatLabel) {
    profileStatLabel.textContent =
      reviews.length > 1
        ? "microcritiques"
        : "microcritique";
  }

  renderProfileAvatar();

  if (!myReviewsGrid) {
    return;
  }

  if (reviews.length === 0) {
    myReviewsGrid.innerHTML = `
      <div class="empty-state">
        <strong>Ton carnet est encore vide.</strong>
        <br /><br />
        Retourne sur l’accueil pour ajouter ta première note
        ou écrire ta première microcritique.
        <br /><br />
        <a class="button-primary" href="index.html">
          Ajouter à mon carnet
        </a>
      </div>
    `;

    return;
  }

  myReviewsGrid.innerHTML = reviews
    .map((review, index) =>
      createMovieCard(review, index, {
        author: username,
        canDelete: true,
        canEdit: true,
        hideAuthor: true,
        hideDiscussionLink: true
      })
    )
    .join("");

  document.querySelectorAll(".delete-review").forEach((button) => {
    button.addEventListener("click", async () => {
      const reviewId = button.dataset.reviewId;

      const confirmation = confirm(
        "Veux-tu vraiment supprimer cette entrée de ton carnet ? Cette action est définitive."
      );

      if (!confirmation) {
        return;
      }

      button.disabled = true;
      button.textContent = "Suppression…";

      try {
        await deleteReview(reviewId);
        await loadMyProfilePage();
      } catch (error) {
        console.error("Erreur de suppression :", error);

        alert(`Impossible de supprimer : ${error.message}`);

        button.disabled = false;
        button.textContent = "Supprimer";
      }
    });
  });

  setupReviewEditButtons();
}

/* =====================================================
   DEMANDES D'AMIS
   ===================================================== */

async function getIncomingFriendRequests() {
  if (!currentUser) {
    return [];
  }

  const { data: friendships, error } = await supabaseClient
    .from("friendships")
    .select(`
      id,
      requester_id,
      recipient_id,
      status,
      created_at
    `)
    .eq("recipient_id", currentUser.id)
    .eq("status", "pending")
    .order("created_at", {
      ascending: false
    });

  if (error) {
    throw error;
  }

  if (!friendships || friendships.length === 0) {
    return [];
  }

  const requesterIds = friendships.map(
    (friendship) => friendship.requester_id
  );

  const { data: profiles, error: profilesError } =
    await supabaseClient
      .from("profiles")
      .select(`
        id,
        username,
        avatar_url,
        bio
      `)
      .in("id", requesterIds);

  if (profilesError) {
    throw profilesError;
  }

  const profilesById = Object.fromEntries(
    (profiles || []).map((profile) => [
      profile.id,
      profile
    ])
  );

  return friendships.map((friendship) => ({
    ...friendship,
    requester: profilesById[friendship.requester_id] || null
  }));
}

function getFriendRequestInitial(profile) {
  const username = profile?.username || "Membre";

  return username.charAt(0).toUpperCase() || "?";
}

function renderFriendRequestAvatar(profile) {
  const username = profile?.username || "Membre";

  if (profile?.avatar_url) {
    return `
      <img
        class="friend-request-avatar"
        src="${escapeHTML(profile.avatar_url)}"
        alt="Photo de profil de ${escapeHTML(username)}"
        loading="lazy"
      />
    `;
  }

  return `
    <div
      class="friend-request-avatar friend-request-avatar-placeholder"
      aria-hidden="true"
    >
      ${escapeHTML(getFriendRequestInitial(profile))}
    </div>
  `;
}

function renderFriendRequests(requests) {
  if (
    !friendRequestsSection ||
    !friendRequestsGrid ||
    !friendRequestsCount
  ) {
    return;
  }

  if (!currentUser || requests.length === 0) {
    friendRequestsSection.hidden = true;
    friendRequestsGrid.innerHTML = "";
    friendRequestsCount.textContent = "0";
    return;
  }

  friendRequestsSection.hidden = false;
  friendRequestsCount.textContent = String(requests.length);

  friendRequestsGrid.innerHTML = requests
    .map((request) => {
      const profile = request.requester;
      const username = profile?.username || "Un membre";

      const profileUrl =
        `membre.html?id=${encodeURIComponent(request.requester_id)}`;

      return `
        <article class="friend-request-card">
          <a
            class="friend-request-profile-link"
            href="${profileUrl}"
            title="Voir le profil de ${escapeHTML(username)}"
          >
            ${renderFriendRequestAvatar(profile)}
          </a>

          <div class="friend-request-content">
            <p>
              <a
                href="${profileUrl}"
                class="friend-request-username"
              >
                ${escapeHTML(username)}
              </a>
              <span>souhaite devenir ton ami·e.</span>
            </p>

            ${
              profile?.bio?.trim()
                ? `
                  <small>
                    ${escapeHTML(profile.bio.trim())}
                  </small>
                `
                : ""
            }

            <div class="friend-request-actions">
              <button
                class="button-primary friend-request-accept"
                type="button"
                data-friend-request-action="accept"
                data-friendship-id="${request.id}"
              >
                Accepter
              </button>

              <button
                class="button-text friend-request-refuse"
                type="button"
                data-friend-request-action="refuse"
                data-friendship-id="${request.id}"
              >
                Refuser
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  setupFriendRequestButtons();
}

async function acceptIncomingFriendRequest(friendshipId) {
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

async function refuseIncomingFriendRequest(friendshipId) {
  if (!currentUser) {
    throw new Error(
      "Tu dois être connectée pour refuser une demande d’amis."
    );
  }

  const { error } = await supabaseClient
    .from("friendships")
    .delete()
    .eq("id", friendshipId)
    .eq("recipient_id", currentUser.id)
    .eq("status", "pending");

  if (error) {
    throw error;
  }
}

function setupFriendRequestButtons() {
  document
    .querySelectorAll("[data-friend-request-action]")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        const action = button.dataset.friendRequestAction;
        const friendshipId = button.dataset.friendshipId;

        if (!friendshipId) {
          return;
        }

        const originalText = button.textContent;

        button.disabled = true;

        if (action === "accept") {
          button.textContent = "Acceptation…";
        }

        if (action === "refuse") {
          button.textContent = "Refus…";
        }

        try {
          if (action === "accept") {
            await acceptIncomingFriendRequest(friendshipId);
          }

          if (action === "refuse") {
            await refuseIncomingFriendRequest(friendshipId);
          }

          await loadMyProfilePage();
        } catch (error) {
          console.error(
            "Erreur de traitement de la demande d’amis :",
            error
          );

          alert(
            `Impossible de mettre à jour cette demande : ${error.message}`
          );

          button.disabled = false;
          button.textContent = originalText;
        }
      });
    });
}

/* =====================================================
   MON CERCLE — AMIS ACCEPTÉS
   ===================================================== */

function renderMyCircle(friends) {
  if (
    !myCircleSection ||
    !myCircleGrid ||
    !myCircleCount
  ) {
    return;
  }

  if (!currentUser) {
    myCircleSection.hidden = true;
    myCircleGrid.innerHTML = "";
    myCircleCount.textContent = "0";
    return;
  }

  myCircleSection.hidden = false;
  myCircleCount.textContent = String(friends.length);

  myCircleGrid.innerHTML = createFriendsMarkup(
    friends,
    `
      <strong>Ton cercle attend ses premiers visages.</strong>
      <br /><br />
      Explore les carnets des autres membres pour envoyer
      une demande d’ami.
      <br /><br />
      <a class="button-primary" href="index.html#critiques">
        Explorer les critiques
      </a>
    `
  );
}

/* =====================================================
   ACTIVITÉ / NOTIFICATIONS
   ===================================================== */

function formatNotificationDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);
  const now = new Date();

  const differenceInSeconds = Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / 1000)
  );

  if (differenceInSeconds < 60) {
    return "À l’instant";
  }

  const differenceInMinutes = Math.floor(
    differenceInSeconds / 60
  );

  if (differenceInMinutes < 60) {
    return `Il y a ${differenceInMinutes} min`;
  }

  const differenceInHours = Math.floor(
    differenceInMinutes / 60
  );

  if (differenceInHours < 24) {
    return `Il y a ${differenceInHours} h`;
  }

  const differenceInDays = Math.floor(
    differenceInHours / 24
  );

  if (differenceInDays === 1) {
    return "Hier";
  }

  if (differenceInDays < 7) {
    return `Il y a ${differenceInDays} jours`;
  }

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short"
  });
}

function getActivityInitial(profile) {
  const username = profile?.username || "Membre";

  return username.charAt(0).toUpperCase() || "?";
}

function renderActivityAvatar(profile) {
  const username = profile?.username || "Membre";

  if (profile?.avatar_url) {
    return `
      <img
        class="activity-avatar"
        src="${escapeHTML(profile.avatar_url)}"
        alt="Photo de profil de ${escapeHTML(username)}"
        loading="lazy"
      />
    `;
  }

  return `
    <div
      class="activity-avatar activity-avatar-placeholder"
      aria-hidden="true"
    >
      ${escapeHTML(getActivityInitial(profile))}
    </div>
  `;
}


async function getMyNotifications() {
  if (!currentUser) {
    return [];
  }

  const { data: notifications, error } = await supabaseClient
    .from("notifications")
    .select(`
      id,
      recipient_id,
      actor_id,
      type,
      review_id,
      comment_id,
      friendship_id,
      movie_id,
      recommendation_id,
      created_at,
      read_at
    `)
    .eq("recipient_id", currentUser.id)
    .order("created_at", {
      ascending: false
    })
    .limit(8);

  if (error) {
    throw error;
  }

  if (!notifications || notifications.length === 0) {
    return [];
  }

  const actorIds = [
    ...new Set(
      notifications
        .map((notification) => notification.actor_id)
        .filter(Boolean)
    )
  ];

  const reviewIds = [
    ...new Set(
      notifications
        .map((notification) => notification.review_id)
        .filter(Boolean)
    )
  ];

  const movieIds = [
    ...new Set(
      notifications
        .map((notification) => notification.movie_id)
        .filter(Boolean)
    )
  ];

  const [
    profilesResult,
    reviewsResult,
    moviesResult
  ] = await Promise.all([
    actorIds.length
      ? supabaseClient
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", actorIds)
      : Promise.resolve({ data: [], error: null }),

    reviewIds.length
      ? supabaseClient
          .from("reviews")
          .select(`
            id,
            movies (
              id,
              title
            )
          `)
          .in("id", reviewIds)
      : Promise.resolve({ data: [], error: null }),

    movieIds.length
      ? supabaseClient
          .from("movies")
          .select(`
            id,
            title,
            release_year
          `)
          .in("id", movieIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (profilesResult.error) {
    throw profilesResult.error;
  }

  if (reviewsResult.error) {
    throw reviewsResult.error;
  }

  if (moviesResult.error) {
    throw moviesResult.error;
  }

  const profilesById = Object.fromEntries(
    (profilesResult.data || []).map((profile) => [
      profile.id,
      profile
    ])
  );

  const reviewsById = Object.fromEntries(
    (reviewsResult.data || []).map((review) => [
      review.id,
      review
    ])
  );

  const moviesById = Object.fromEntries(
    (moviesResult.data || []).map((movie) => [
      movie.id,
      movie
    ])
  );

  return notifications.map((notification) => ({
    ...notification,
    actor: profilesById[notification.actor_id] || null,
    review: reviewsById[notification.review_id] || null,
    movie: moviesById[notification.movie_id] || null
  }));
}



function getActivityMessage(notification) {
  const actorName =
    notification.actor?.username || "Un membre";

  const movieId =
    notification.review?.movies?.id || "";

  const movieTitle =
    notification.review?.movies?.title || "une critique";

  const reviewDestination =
    movieId && notification.review_id
      ? `film.html?id=${encodeURIComponent(
          movieId
        )}#review-${encodeURIComponent(notification.review_id)}`
      : "";

  if (notification.type === "review_like") {
    return {
      main: `${actorName} a aimé ta critique`,
      detail: `« ${movieTitle} »`,
      destination: reviewDestination
    };
  }

  if (notification.type === "review_comment") {
    return {
      main: `${actorName} a répondu à ta critique`,
      detail: `« ${movieTitle} »`,
      destination: reviewDestination
    };
  }

  if (notification.type === "friend_request") {
    return {
      main: `${actorName} souhaite rejoindre ton cercle`,
      detail: "Répondre à la demande",
      destination: "#friendRequestsSection"
    };
  }

  if (notification.type === "friend_accepted") {
    return {
      main: `${actorName} a accepté ta demande d’ami`,
      detail: "Voir son profil",
      destination: notification.actor?.id
        ? `membre.html?id=${encodeURIComponent(
            notification.actor.id
          )}`
        : ""
    };
  }

  
if (notification.type === "movie_recommendation") {
  const recommendedMovieTitle =
    notification.movie?.title || "un film";

  const destination = notification.recommendation_id
    ? `#recommendation-${notification.recommendation_id}`
    : "#receivedRecommendationsGrid";

  return {
    main: `${actorName} t’a soufflé un film`,
    detail: `« ${recommendedMovieTitle} »`,
    destination
  };
}

  return {
    main: "Une nouvelle activité concerne ton carnet",
    detail: "",
    destination: ""
  };
}


function renderActivityItem(notification) {
  const message = getActivityMessage(notification);

  const mainContent = `
    <strong>${escapeHTML(message.main)}</strong>
    ${
      message.detail
        ? `
          <span class="activity-detail">
            ${escapeHTML(message.detail)}
          </span>
        `
        : ""
    }
  `;

  const contentMarkup = message.destination
    ? `
      <a
        class="activity-content-link"
        href="${message.destination}"
        data-notification-link
        data-notification-id="${notification.id}"
      >
        ${mainContent}
      </a>
    `
    : `
      <div class="activity-content-link">
        ${mainContent}
      </div>
    `;

  return `
    <article
      class="activity-item ${
        notification.read_at ? "" : "is-unread"
      }"
      data-notification-id="${notification.id}"
    >
      ${
        notification.actor?.id
          ? `
            <a
              class="activity-avatar-link"
              href="membre.html?id=${encodeURIComponent(
                notification.actor.id
              )}"
              title="Voir le profil de ${escapeHTML(
                notification.actor.username || "Membre"
              )}"
            >
              ${renderActivityAvatar(notification.actor)}
            </a>
          `
          : renderActivityAvatar(notification.actor)
      }

      <div class="activity-content">
        ${contentMarkup}

        <time
          class="activity-date"
          datetime="${escapeHTML(notification.created_at)}"
        >
          ${escapeHTML(
            formatNotificationDate(notification.created_at)
          )}
        </time>
      </div>
    </article>
  `;
}

async function markNotificationAsRead(notificationId) {
  if (!currentUser || !notificationId) {
    return;
  }

  const { error } = await supabaseClient
    .from("notifications")
    .update({
      read_at: new Date().toISOString()
    })
    .eq("id", notificationId)
    .eq("recipient_id", currentUser.id)
    .is("read_at", null);

  if (error) {
    throw error;
  }
}

async function markAllNotificationsAsRead() {
  if (!currentUser) {
    return;
  }

  const { error } = await supabaseClient
    .from("notifications")
    .update({
      read_at: new Date().toISOString()
    })
    .eq("recipient_id", currentUser.id)
    .is("read_at", null);

  if (error) {
    throw error;
  }
}

function refreshActivityUnreadCount() {
  if (!activityUnreadCount) {
    return;
  }

  const unreadCount = document.querySelectorAll(
    ".activity-item.is-unread"
  ).length;

  activityUnreadCount.textContent = String(unreadCount);
  activityUnreadCount.hidden = unreadCount === 0;
}

function setupActivityNotificationLinks() {
  document
    .querySelectorAll("[data-notification-link]")
    .forEach((link) => {
      link.addEventListener("click", async (event) => {
        event.preventDefault();

        const notificationId = link.dataset.notificationId;
        const destination = link.getAttribute("href");

        const activityItem = document.querySelector(
          `.activity-item[data-notification-id="${notificationId}"]`
        );

        try {
          await markNotificationAsRead(notificationId);

          if (activityItem) {
            activityItem.classList.remove("is-unread");
          }

          refreshActivityUnreadCount();
        } catch (error) {
          console.error(
            "Impossible de marquer la notification comme lue :",
            error
          );
        } finally {
          if (destination) {
            window.location.href = destination;
          }
        }
      });
    });
}

function renderActivityFeed(notifications) {
  if (!activityFeed || !activityUnreadCount) {
    return;
  }

  if (!currentUser) {
    activityFeed.innerHTML = "";
    activityUnreadCount.hidden = true;

    if (markAllNotificationsReadButton) {
      markAllNotificationsReadButton.hidden = true;
    }

    return;
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.read_at
  ).length;

  activityUnreadCount.textContent = String(unreadCount);
  activityUnreadCount.hidden = unreadCount === 0;

  if (markAllNotificationsReadButton) {
    markAllNotificationsReadButton.hidden = unreadCount === 0;
  }

  if (!notifications.length) {
    activityFeed.innerHTML = `
      <div class="activity-empty-state">
        <strong>Ton activité est encore paisible.</strong>
        <br /><br />
        Les likes, réponses et nouvelles amitiés apparaîtront ici.
      </div>
    `;

    return;
  }

  activityFeed.innerHTML = notifications
    .map(renderActivityItem)
    .join("");

  setupActivityNotificationLinks();
}

/* =====================================================
   RECOMMANDATIONS DE FILMS REÇUES
   ===================================================== */

function formatRecommendationDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function getRecommendationInitial(profile) {
  const username = profile?.username || "Membre";

  return username.charAt(0).toUpperCase() || "?";
}

function renderRecommendationAvatar(profile) {
  const username = profile?.username || "Membre";

  if (profile?.avatar_url) {
    return `
      <img
        class="recommendation-sender-avatar"
        src="${escapeHTML(profile.avatar_url)}"
        alt="Photo de profil de ${escapeHTML(username)}"
        loading="lazy"
      />
    `;
  }

  return `
    <div
      class="recommendation-sender-avatar recommendation-sender-avatar-placeholder"
      aria-hidden="true"
    >
      ${escapeHTML(getRecommendationInitial(profile))}
    </div>
  `;
}

async function getReceivedRecommendations() {
  if (!currentUser) {
    return [];
  }

  const { data: recommendations, error } = await supabaseClient
    .from("movie_recommendations")
    .select(`
      id,
      sender_id,
      recipient_id,
      movie_id,
      message,
      created_at,
      seen_at,
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
    .eq("recipient_id", currentUser.id)
    .order("created_at", {
      ascending: false
    });

  if (error) {
    throw error;
  }

  const validRecommendations = (recommendations || []).filter(
    (recommendation) => recommendation.movies
  );

  if (validRecommendations.length === 0) {
    return [];
  }

  const senderIds = [
    ...new Set(
      validRecommendations
        .map((recommendation) => recommendation.sender_id)
        .filter(Boolean)
    )
  ];

  const { data: profiles, error: profilesError } =
    await supabaseClient
      .from("profiles")
      .select(`
        id,
        username,
        avatar_url
      `)
      .in("id", senderIds);

  if (profilesError) {
    throw profilesError;
  }

  const profilesById = Object.fromEntries(
    (profiles || []).map((profile) => [
      profile.id,
      profile
    ])
  );

  return validRecommendations.map((recommendation) => ({
    ...recommendation,
    sender: profilesById[recommendation.sender_id] || null
  }));
}

async function getOrCreateMyWishlist() {
  const existingWishlist = await getMyWishlist();

  if (existingWishlist) {
    return existingWishlist;
  }

  const { data: createdWishlist, error } = await supabaseClient
    .from("movie_lists")
    .insert({
      user_id: currentUser.id,
      title: "À voir",
      description: "Les films que je garde pour plus tard.",
      is_public: true,
      list_type: "wishlist"
    })
    .select(`
      id,
      title,
      description,
      is_public,
      list_type
    `)
    .single();

  if (error) {
    throw error;
  }

  return createdWishlist;
}

async function addRecommendedMovieToWishlist(movieId) {
  if (!currentUser || !movieId) {
    throw new Error(
      "Tu dois être connectée pour ajouter ce film à ta liste À voir."
    );
  }

  const wishlist = await getOrCreateMyWishlist();

  const { data: existingItem, error: existingItemError } =
    await supabaseClient
      .from("movie_list_items")
      .select("id")
      .eq("list_id", wishlist.id)
      .eq("movie_id", movieId)
      .maybeSingle();

  if (existingItemError) {
    throw existingItemError;
  }

  if (existingItem) {
    return {
      alreadyInWishlist: true
    };
  }

  const { error: insertError } = await supabaseClient
    .from("movie_list_items")
    .insert({
      list_id: wishlist.id,
      movie_id: movieId
    });

  if (insertError) {
    throw insertError;
  }

  return {
    alreadyInWishlist: false
  };
}

async function markRecommendationAsSeen(recommendationId) {
  if (!currentUser || !recommendationId) {
    return;
  }

  const { error } = await supabaseClient
    .from("movie_recommendations")
    .update({
      seen_at: new Date().toISOString()
    })
    .eq("id", recommendationId)
    .eq("recipient_id", currentUser.id)
    .is("seen_at", null);

  if (error) {
    throw error;
  }
}

function renderReceivedRecommendations(recommendations) {
  if (
    !receivedRecommendationsGrid ||
    !receivedRecommendationsCount
  ) {
    return;
  }

  if (!currentUser) {
    receivedRecommendationsGrid.innerHTML = "";
    receivedRecommendationsCount.hidden = true;
    receivedRecommendationsCount.textContent = "0";
    return;
  }

  receivedRecommendationsCount.textContent = String(
    recommendations.length
  );

  receivedRecommendationsCount.hidden =
    recommendations.length === 0;

  if (!recommendations.length) {
    receivedRecommendationsGrid.innerHTML = `
      <div class="recommendations-empty-state">
        <strong>Ton cercle ne t’a pas encore soufflé de film.</strong>
        <br /><br />
        Les recommandations de tes ami·es apparaîtront ici,
        comme de petits mots glissés après la séance.
      </div>
    `;

    return;
  }

  receivedRecommendationsGrid.innerHTML = recommendations
    .map((recommendation) => {
      const movie = recommendation.movies;

      const title = movie?.title || "Film sans titre";
      const releaseYear = movie?.release_year || "—";

      const director =
        movie?.director || "Réalisation non renseignée";

      const senderName =
        recommendation.sender?.username || "Un membre";

      const senderProfileUrl = recommendation.sender?.id
        ? `membre.html?id=${encodeURIComponent(
            recommendation.sender.id
          )}`
        : "";

      const movieUrl =
        `film.html?id=${encodeURIComponent(movie.id)}`;

      const posterMarkup = movie?.poster_url
        ? `
          <img
            src="${escapeHTML(movie.poster_url)}"
            alt="Affiche de ${escapeHTML(title)}"
            loading="lazy"
          />
        `
        : `
          <div class="recommendation-poster-placeholder">
            <span>${escapeHTML(String(releaseYear))}</span>
            <strong>${escapeHTML(title)}</strong>
          </div>
        `;

      return `


<article
  id="recommendation-${recommendation.id}"
  class="received-recommendation-card ${
    recommendation.seen_at ? "" : "is-unseen"
  }"
  data-recommendation-id="${recommendation.id}"
>


          <a
            class="recommendation-poster-link"
            href="${movieUrl}"
            data-recommendation-movie-link
            data-recommendation-id="${recommendation.id}"
            title="Voir la fiche de ${escapeHTML(title)}"
          >
            ${posterMarkup}
          </a>

          <div class="received-recommendation-content">
            <div class="recommendation-card-top">
              <div>
                <h3>
                  <a
                    href="${movieUrl}"
                    data-recommendation-movie-link
                    data-recommendation-id="${recommendation.id}"
                  >
                    ${escapeHTML(title)}
                  </a>
                </h3>

                <p class="recommendation-movie-meta">
                  ${escapeHTML(String(releaseYear))} ·
                  ${escapeHTML(director)}
                </p>
              </div>

              ${
                recommendation.seen_at
                  ? ""
                  : `
                    <span
                      class="recommendation-new-badge"
                      aria-label="Nouvelle suggestion"
                    >
                      Nouveau
                    </span>
                  `
              }
            </div>

            <div class="recommendation-sender">
              ${
                senderProfileUrl
                  ? `
                    <a
                      href="${senderProfileUrl}"
                      class="recommendation-sender-link"
                    >
                      ${renderRecommendationAvatar(
                        recommendation.sender
                      )}
                    </a>
                  `
                  : renderRecommendationAvatar(recommendation.sender)
              }

              <p>
                Soufflé par
                ${
                  senderProfileUrl
                    ? `
                      <a href="${senderProfileUrl}">
                        ${escapeHTML(senderName)}
                      </a>
                    `
                    : `<strong>${escapeHTML(senderName)}</strong>`
                }
                <span>
                  · ${escapeHTML(
                    formatRecommendationDate(
                      recommendation.created_at
                    )
                  )}
                </span>
              </p>
            </div>

            ${
              recommendation.message?.trim()
                ? `
                  <blockquote class="recommendation-message">
                    “${escapeHTML(
                      recommendation.message.trim()
                    )}”
                  </blockquote>
                `
                : ""
            }

            <div class="recommendation-actions">
              <button
                class="button-primary recommendation-add-to-wishlist"
                type="button"
                data-recommendation-id="${recommendation.id}"
                data-movie-id="${movie.id}"
              >
                Ajouter à ma liste À voir
              </button>

              <a
                class="button-text recommendation-see-movie"
                href="${movieUrl}"
                data-recommendation-movie-link
                data-recommendation-id="${recommendation.id}"
              >
                Voir la fiche
              </a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  setupReceivedRecommendationButtons();
}

function setupReceivedRecommendationButtons() {
  document
    .querySelectorAll(".recommendation-add-to-wishlist")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        const recommendationId =
          button.dataset.recommendationId;

        const movieId = button.dataset.movieId;

        if (!recommendationId || !movieId) {
          return;
        }

        const originalText = button.textContent;

        button.disabled = true;
        button.textContent = "Ajout…";

        try {
          const result = await addRecommendedMovieToWishlist(
            movieId
          );

          await markRecommendationAsSeen(recommendationId);

          await loadMyProfilePage();

          alert(
            result.alreadyInWishlist
              ? "Ce film est déjà dans ta liste À voir."
              : "Le film a été ajouté à ta liste À voir. ✨"
          );
        } catch (error) {
          console.error(
            "Erreur lors de l’ajout à la wishlist :",
            error
          );

          alert(
            `Impossible d’ajouter ce film à ta liste À voir : ${error.message}`
          );

          button.disabled = false;
          button.textContent = originalText;
        }
      });
    });

  document
    .querySelectorAll("[data-recommendation-movie-link]")
    .forEach((link) => {
      link.addEventListener("click", async (event) => {
        event.preventDefault();

        const recommendationId =
          link.dataset.recommendationId;

        const destination = link.getAttribute("href");

        try {
          await markRecommendationAsSeen(recommendationId);
        } catch (error) {
          console.error(
            "Impossible de marquer la suggestion comme lue :",
            error
          );
        } finally {
          if (destination) {
            window.location.href = destination;
          }
        }
      });
    });
}

/* =====================================================
   RECOMMANDATIONS DE FILMS ENVOYÉES
   ===================================================== */

async function getSentRecommendations() {
  if (!currentUser) {
    return [];
  }

  const { data: recommendations, error } = await supabaseClient
    .from("movie_recommendations")
    .select(`
      id,
      sender_id,
      recipient_id,
      movie_id,
      message,
      created_at,
      seen_at,
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
    .eq("sender_id", currentUser.id)
    .order("created_at", {
      ascending: false
    });

  if (error) {
    throw error;
  }

  const validRecommendations = (recommendations || []).filter(
    (recommendation) => recommendation.movies
  );

  if (!validRecommendations.length) {
    return [];
  }

  const recipientIds = [
    ...new Set(
      validRecommendations
        .map((recommendation) => recommendation.recipient_id)
        .filter(Boolean)
    )
  ];

  const { data: profiles, error: profilesError } =
    await supabaseClient
      .from("profiles")
      .select(`
        id,
        username,
        avatar_url
      `)
      .in("id", recipientIds);

  if (profilesError) {
    throw profilesError;
  }

  const profilesById = Object.fromEntries(
    (profiles || []).map((profile) => [
      profile.id,
      profile
    ])
  );

  return validRecommendations.map((recommendation) => ({
    ...recommendation,
    recipient:
      profilesById[recommendation.recipient_id] || null
  }));
}

function getSentRecommendationStatus(recommendation) {
  if (recommendation.seen_at) {
    return {
      label: "Découvert",
      className: "is-seen",
      description:
        "Cette suggestion a été consultée."
    };
  }

  return {
    label: "Pas encore découvert",
    className: "is-pending",
    description:
      "Cette suggestion n’a pas encore été consultée."
  };
}

function renderSentRecommendations(recommendations) {
  if (
    !sentRecommendationsGrid ||
    !sentRecommendationsCount
  ) {
    return;
  }

  if (!currentUser) {
    sentRecommendationsGrid.innerHTML = "";
    sentRecommendationsCount.hidden = true;
    sentRecommendationsCount.textContent = "0";
    return;
  }

  sentRecommendationsCount.textContent = String(
    recommendations.length
  );

  sentRecommendationsCount.hidden =
    recommendations.length === 0;

  if (!recommendations.length) {
    sentRecommendationsGrid.innerHTML = `
      <div class="recommendations-empty-state">
        <strong>Tu n’as pas encore soufflé de film.</strong>
        <br /><br />
        Depuis une fiche film, utilise le bouton
        « Suggérer à un ami » pour partager une belle découverte
        avec ton cercle.
      </div>
    `;

    return;
  }

  sentRecommendationsGrid.innerHTML = recommendations
    .map((recommendation) => {
      const movie = recommendation.movies;

      const title = movie?.title || "Film sans titre";

      const releaseYear = movie?.release_year || "—";

      const director =
        movie?.director || "Réalisation non renseignée";

      const recipientName =
        recommendation.recipient?.username || "Un membre";

      const recipientProfileUrl = recommendation.recipient?.id
        ? `membre.html?id=${encodeURIComponent(
            recommendation.recipient.id
          )}`
        : "";

      const movieUrl =
        `film.html?id=${encodeURIComponent(movie.id)}`;

      const status = getSentRecommendationStatus(
        recommendation
      );

      const posterMarkup = movie?.poster_url
        ? `
          <img
            src="${escapeHTML(movie.poster_url)}"
            alt="Affiche de ${escapeHTML(title)}"
            loading="lazy"
          />
        `
        : `
          <div class="recommendation-poster-placeholder">
            <span>${escapeHTML(String(releaseYear))}</span>
            <strong>${escapeHTML(title)}</strong>
          </div>
        `;

      return `
        <article
          class="sent-recommendation-card ${status.className}"
          data-recommendation-id="${recommendation.id}"
        >
          <a
            class="recommendation-poster-link"
            href="${movieUrl}"
            title="Voir la fiche de ${escapeHTML(title)}"
          >
            ${posterMarkup}
          </a>

          <div class="sent-recommendation-content">
            <div class="recommendation-card-top">
              <div>
                <h3>
                  <a href="${movieUrl}">
                    ${escapeHTML(title)}
                  </a>
                </h3>

                <p class="recommendation-movie-meta">
                  ${escapeHTML(String(releaseYear))} ·
                  ${escapeHTML(director)}
                </p>
              </div>

              <span
                class="sent-recommendation-status ${status.className}"
                title="${escapeHTML(status.description)}"
              >
                ${escapeHTML(status.label)}
              </span>
            </div>

            <div class="recommendation-sender">
              ${
                recipientProfileUrl
                  ? `
                    <a
                      href="${recipientProfileUrl}"
                      class="recommendation-sender-link"
                      title="Voir le profil de ${escapeHTML(
                        recipientName
                      )}"
                    >
                      ${renderRecommendationAvatar(
                        recommendation.recipient
                      )}
                    </a>
                  `
                  : renderRecommendationAvatar(
                      recommendation.recipient
                    )
              }

              <p>
                Soufflé à
                ${
                  recipientProfileUrl
                    ? `
                      <a href="${recipientProfileUrl}">
                        ${escapeHTML(recipientName)}
                      </a>
                    `
                    : `<strong>${escapeHTML(recipientName)}</strong>`
                }
                <span>
                  · ${escapeHTML(
                    formatRecommendationDate(
                      recommendation.created_at
                    )
                  )}
                </span>
              </p>
            </div>

            ${
              recommendation.message?.trim()
                ? `
                  <blockquote class="recommendation-message">
                    “${escapeHTML(
                      recommendation.message.trim()
                    )}”
                  </blockquote>
                `
                : ""
            }
          </div>
        </article>
      `;
    })
    .join("");
}

function formatWishlistAddedDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long"
  });
}

/* =====================================================
   WISHLIST : À VOIR
   ===================================================== */

async function getMyWishlist() {
  if (!currentUser) {
    return null;
  }

  const { data, error } = await supabaseClient
    .from("movie_lists")
    .select("id, title, description, is_public, list_type")
    .eq("user_id", currentUser.id)
    .eq("list_type", "wishlist")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getMyWishlistMovies() {
  const wishlist = await getMyWishlist();

  if (!wishlist) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from("movie_list_items")
    .select(`
      id,
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
    .eq("list_id", wishlist.id)
    .order("created_at", {
      ascending: false
    });

  if (error) {
    throw error;
  }

  return (data || [])
    .filter((item) => item.movies)
    .map((item) => ({
      wishlist_id: wishlist.id,
      wishlist_item_id: item.id,
      added_at: item.created_at,
      movie: item.movies
    }));
}


function renderWishlistMovies(items) {
  if (!myWishlistGrid) {
    return;
  }

  if (!currentUser) {
    myWishlistGrid.innerHTML = "";
    return;
  }

  if (!items.length) {
    myWishlistGrid.innerHTML = `
      <div class="empty-state wishlist-empty-state">
        <strong>Ta liste À voir attend sa première séance.</strong>
        <br /><br />
        Explore les fiches films et ajoute ceux que tu veux garder
        pour plus tard.
        <br /><br />
        <a class="button-primary" href="index.html#critiques">
          Découvrir les microcritiques
        </a>
      </div>
    `;

    return;
  }

  const visibleItems = items.slice(0, 4);
  const wishlistId = items[0]?.wishlist_id || "";

  myWishlistGrid.innerHTML = `
    ${visibleItems
   .map(({ wishlist_item_id, added_at, movie }) => {
        const title = movie.title || "Film sans titre";

        const releaseYear = movie.release_year || "—";

        const director =
          movie.director || "Réalisation non renseignée";

        const addedDate = formatWishlistAddedDate(added_at);

        const posterMarkup = movie.poster_url
          ? `
            <img
              src="${escapeHTML(movie.poster_url)}"
              alt="Affiche de ${escapeHTML(title)}"
              loading="lazy"
            />
          `
          : `
            <div class="wishlist-poster-placeholder">
              <span>${escapeHTML(String(releaseYear))}</span>
              <strong>${escapeHTML(title)}</strong>
            </div>
          `;

        return `
          <article class="wishlist-movie-card">
            <a
              class="wishlist-poster-link"
              href="film.html?id=${encodeURIComponent(movie.id)}"
              title="Voir la fiche de ${escapeHTML(title)}"
            >
              ${posterMarkup}
            </a>

            <div class="wishlist-movie-content">
              <h3>
                <a href="film.html?id=${encodeURIComponent(movie.id)}">
                  ${escapeHTML(title)}
                </a>
              </h3>


<p>
  ${escapeHTML(String(releaseYear))} ·
  ${escapeHTML(director)}
</p>

${
  addedDate
    ? `
      <time
        class="wishlist-movie-added-date"
        datetime="${escapeHTML(added_at)}"
      >
        Ajouté le ${escapeHTML(addedDate)}
      </time>
    `
    : ""
}

<div class="wishlist-movie-actions">

                <button
                  class="wishlist-watched-button wishlist-watched-button-compact"
                  type="button"
                  data-wishlist-item-id="${escapeHTML(
                    wishlist_item_id
                  )}"
                  data-movie-id="${escapeHTML(movie.id)}"
                  data-movie-title="${escapeHTML(title)}"
                  data-movie-year="${escapeHTML(String(releaseYear))}"
                  data-movie-director="${escapeHTML(director)}"
                  data-movie-poster-url="${escapeHTML(
                    movie.poster_url || ""
                  )}"
                  title="Marquer ${escapeHTML(
                    title
                  )} comme vu et l’ajouter à mon carnet"
                >
                  Vu
                </button>

                <button
                  class="button-text wishlist-remove-button"
                  type="button"
                  data-wishlist-item-id="${wishlist_item_id}"
                  title="Retirer ${escapeHTML(title)} de ma liste À voir"
                >
                  Retirer
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join("")}

    ${
      items.length > visibleItems.length && wishlistId
        ? `
          <a
            class="wishlist-see-all-link"
            href="liste.html?id=${encodeURIComponent(wishlistId)}"
          >
            Voir les ${items.length} films à voir →
          </a>
        `
        : ""
    }
  `;

  document
    .querySelectorAll(".wishlist-remove-button")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        const wishlistItemId = button.dataset.wishlistItemId;

        if (!wishlistItemId) {
          return;
        }

        button.disabled = true;
        button.textContent = "Retrait…";

        try {
          await removeMovieFromWishlist(wishlistItemId);
          await loadMyProfilePage();
        } catch (error) {
          console.error(
            "Erreur de retrait du film de la wishlist :",
            error
          );

          alert(
            `Impossible de retirer ce film de ta liste À voir : ${error.message}`
          );

          button.disabled = false;
          button.textContent = "Retirer";
        }
      });
    });

  setupWishlistWatchedButtons();
}


/* =====================================================
   WISHLIST : FILM VU → AJOUT AU CARNET
   ===================================================== */

function updateWatchlistReviewCharacterCounter() {
  if (
    !watchlistReviewContent ||
    !watchlistReviewCharacterCounter
  ) {
    return;
  }

  const maximum =
    Number(watchlistReviewContent.maxLength) || 1000;

  const length = watchlistReviewContent.value.length;

  watchlistReviewCharacterCounter.textContent =
    `${length} / ${maximum}`;

  watchlistReviewCharacterCounter.classList.toggle(
    "limit-reached",
    length >= maximum
  );
}

function openWatchlistReviewModal(movie) {
  if (
    !watchlistReviewModal ||
    !watchlistReviewFilm ||
    !watchlistReviewRating ||
    !watchlistReviewContent
  ) {
    return;
  }

  selectedWishlistMovie = movie;

  const title = movie.title || "Film sans titre";
  const releaseYear = movie.release_year || "—";

  const director =
    movie.director || "Réalisation non renseignée";

  const posterMarkup = movie.poster_url
    ? `
      <img
        src="${escapeHTML(movie.poster_url)}"
        alt="Affiche de ${escapeHTML(title)}"
      />
    `
    : `
      <div class="watchlist-review-profile-placeholder">
        ${escapeHTML(title)}
      </div>
    `;

  watchlistReviewFilm.innerHTML = `
    <div class="watchlist-review-profile-poster">
      ${posterMarkup}
    </div>

    <div class="watchlist-review-profile-copy">
      <span>${escapeHTML(String(releaseYear))}</span>

      <strong>${escapeHTML(title)}</strong>

      <p>${escapeHTML(director)}</p>
    </div>
  `;

  watchlistReviewForm?.reset();
  updateWatchlistReviewCharacterCounter();

  watchlistReviewModal.classList.add("visible");

  window.setTimeout(() => {
    watchlistReviewRating.focus();
  }, 50);
}

function closeWatchlistReviewModal() {
  if (!watchlistReviewModal) {
    return;
  }

  watchlistReviewModal.classList.remove("visible");

  selectedWishlistMovie = null;

  watchlistReviewForm?.reset();
  updateWatchlistReviewCharacterCounter();
}

async function removeMovieFromWishlist(wishlistItemId) {
  if (!currentUser || !wishlistItemId) {
    throw new Error(
      "Impossible d’identifier ce film dans ta liste À voir."
    );
  }

  const { error } = await supabaseClient
    .from("movie_list_items")
    .delete()
    .eq("id", wishlistItemId);

  if (error) {
    throw error;
  }
}

function setupWishlistWatchedButtons() {
  document
    .querySelectorAll(".wishlist-watched-button")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const movieId = button.dataset.movieId;
        const wishlistItemId = button.dataset.wishlistItemId;

        if (!movieId || !wishlistItemId) {
          return;
        }

        const movie = {
          id: movieId,
          wishlist_item_id: wishlistItemId,
          title: button.dataset.movieTitle || "Film sans titre",
          release_year: button.dataset.movieYear || "",
          director: button.dataset.movieDirector || "",
          poster_url: button.dataset.moviePosterUrl || ""
        };

        openWatchlistReviewModal(movie);
      });
    });
}

/* =====================================================
   LISTES PERSONNALISÉES
   ===================================================== */

async function getMyMovieLists() {
  if (!currentUser) {
    return [];
  }

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
    .eq("user_id", currentUser.id)
    .or("list_type.eq.custom,list_type.is.null")
    .order("created_at", {
      ascending: false
    });

  if (error) {
    throw error;
  }

  if (!lists || lists.length === 0) {
    return [];
  }

  const listIds = lists.map((list) => list.id);

  const { data: items, error: itemsError } = await supabaseClient
    .from("movie_list_items")
    .select("list_id")
    .in("list_id", listIds);

  if (itemsError) {
    throw itemsError;
  }

  return lists.map((list) => ({
    ...list,
    movie_count: (items || []).filter(
      (item) => item.list_id === list.id
    ).length
  }));
}

function renderMovieLists(lists) {
  if (!myListsGrid) {
    return;
  }

  if (!currentUser) {
    myListsGrid.innerHTML = "";
    return;
  }

  if (lists.length === 0) {
    myListsGrid.innerHTML = `
      <div class="empty-state lists-empty-state">
        <strong>Tu n’as pas encore créé de liste.</strong>
        <br /><br />
        Crée une collection pour réunir les films qui restent avec toi.
      </div>
    `;

    return;
  }

  const previewLimit = 3;

  const visibleLists = areAllMovieListsVisible
    ? lists
    : lists.slice(0, previewLimit);

  myListsGrid.innerHTML = `
    ${visibleLists
      .map((list) => {
        const visibilityLabel = list.is_public
          ? "Publique"
          : "Privée";

        const movieLabel =
          list.movie_count > 1
            ? "films"
            : "film";

        return `
          <article class="movie-list-card">
            <div class="movie-list-card-top">
              <span class="list-visibility ${
                list.is_public ? "public" : "private"
              }">
                ${visibilityLabel}
              </span>

              <button
                class="delete-list-button"
                type="button"
                data-list-id="${list.id}"
                data-list-title="${escapeHTML(list.title)}"
                title="Supprimer cette liste"
              >
                Supprimer
              </button>
            </div>

            <h3>
              <a
                class="movie-list-link"
                href="liste.html?id=${encodeURIComponent(list.id)}"
              >
                ${escapeHTML(list.title)}
              </a>
            </h3>

            <p>
              ${
                list.description
                  ? escapeHTML(list.description)
                  : "Une collection de films à faire grandir."
              }
            </p>

            <div class="movie-list-card-bottom">
              <span>${list.movie_count} ${movieLabel}</span>

              <span>
                ${
                  list.is_public
                    ? "Visible par tous"
                    : "Visible uniquement par moi"
                }
              </span>
            </div>
          </article>
        `;
      })
      .join("")}

    ${
      lists.length > previewLimit
        ? `
          <button
            class="profile-lists-toggle"
            type="button"
            aria-expanded="${areAllMovieListsVisible}"
          >
            ${
              areAllMovieListsVisible
                ? "Réduire les collections"
                : `Voir les ${lists.length} collections`
            }
            <span aria-hidden="true">
              ${areAllMovieListsVisible ? "↑" : "→"}
            </span>
          </button>
        `
        : ""
    }
  `;

  document
    .querySelectorAll(".delete-list-button")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        const listId = button.dataset.listId;
        const listTitle = button.dataset.listTitle;

        const confirmation = confirm(
          `Supprimer la liste « ${listTitle} » ? Les films qui y sont associés seront retirés de cette liste, mais aucune fiche film ne sera supprimée.`
        );

        if (!confirmation) {
          return;
        }

        button.disabled = true;
        button.textContent = "Suppression…";

        try {
          const { error } = await supabaseClient
            .from("movie_lists")
            .delete()
            .eq("id", listId);

          if (error) {
            throw error;
          }

          await loadMyProfilePage();
        } catch (error) {
          console.error(
            "Erreur de suppression de liste :",
            error
          );

          alert(
            `Impossible de supprimer la liste : ${error.message}`
          );

          button.disabled = false;
          button.textContent = "Supprimer";
        }
      });
    });

  const toggleButton = document.querySelector(
    ".profile-lists-toggle"
  );

  if (toggleButton) {
    toggleButton.addEventListener("click", () => {
      areAllMovieListsVisible = !areAllMovieListsVisible;
      renderMovieLists(lists);
    });
  }
}

async function createMovieList(event) {
  event.preventDefault();

  if (!currentUser || !listForm) {
    return;
  }

  const title = listTitleInput.value.trim();

  const description = listDescriptionInput.value.trim();

  const isPublic = listVisibilityInput.value === "public";

  if (title.length < 2) {
    alert(
      "Le titre de la liste doit contenir au moins 2 caractères."
    );
    return;
  }

  const submitButton = listForm.querySelector(
    'button[type="submit"]'
  );

  if (!submitButton) {
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Création…";

  try {
    const { error } = await supabaseClient
      .from("movie_lists")
      .insert({
        user_id: currentUser.id,
        title,
        description: description || null,
        is_public: isPublic,
        list_type: "custom"
      });

    if (error) {
      throw error;
    }

    hideListForm();
    await loadMyProfilePage();
  } catch (error) {
    console.error(
      "Erreur de création de liste :",
      error
    );

    alert(
      `Impossible de créer la liste : ${error.message}`
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Créer ma liste";
  }
}

/* =====================================================
   CHARGEMENT DE LA PAGE
   ===================================================== */

async function loadMyProfilePage() {
  if (!currentUser) {
    if (myReviewsGrid) {
      myReviewsGrid.innerHTML = `
        <div class="empty-state">
          <strong>Connecte-toi pour accéder à ton espace personnel.</strong>
          <br /><br />
          Tes notes, tes critiques, tes listes et tes futurs favoris
          seront rassemblés ici.
        </div>
      `;
    }

    if (myWishlistGrid) {
      myWishlistGrid.innerHTML = "";
    }

    if (myListsGrid) {
      myListsGrid.innerHTML = "";
    }

    if (friendRequestsSection) {
      friendRequestsSection.hidden = true;
    }

    if (friendRequestsGrid) {
      friendRequestsGrid.innerHTML = "";
    }

    if (friendRequestsCount) {
      friendRequestsCount.textContent = "0";
    }

    if (myCircleSection) {
      myCircleSection.hidden = true;
    }

    if (myCircleGrid) {
      myCircleGrid.innerHTML = "";
    }

    if (myCircleCount) {
      myCircleCount.textContent = "0";
    }

    if (reviewTotal) {
      reviewTotal.textContent = "0";
    }

    if (profileTitle) {
      profileTitle.textContent = "Mon carnet de cinéma";
    }

    if (profileSubtitle) {
      profileSubtitle.textContent =
        "Tes films, tes mots, les traces que les séances ont laissées.";
    }

    if (openListFormButton) {
      openListFormButton.hidden = true;
    }

    if (listForm) {
      listForm.hidden = true;
    }

    if (activityFeed) {
      activityFeed.innerHTML = "";
    }

    if (activityUnreadCount) {
      activityUnreadCount.hidden = true;
      activityUnreadCount.textContent = "0";
    }

    if (markAllNotificationsReadButton) {
      markAllNotificationsReadButton.hidden = true;
    }

    if (receivedRecommendationsGrid) {
      receivedRecommendationsGrid.innerHTML = "";
    }

    if (receivedRecommendationsCount) {
      receivedRecommendationsCount.hidden = true;
      receivedRecommendationsCount.textContent = "0";
    }
    
    if (sentRecommendationsGrid) {
      sentRecommendationsGrid.innerHTML = "";
    }

    if (sentRecommendationsCount) {
      sentRecommendationsCount.hidden = true;
      sentRecommendationsCount.textContent = "0";
    }


    renderProfileAvatar();
    return;
  }

  if (openListFormButton) {
    openListFormButton.hidden = false;
  }


const results = await Promise.allSettled([
  getMyReviews(currentUser.id),
  getMyWishlistMovies(),
  getMyMovieLists(),
  getIncomingFriendRequests(),
  getAcceptedFriends(currentUser.id),
  getMyNotifications(),
  getReceivedRecommendations(),
  getSentRecommendations()
]);



const [
  reviewsResult,
  wishlistResult,
  listsResult,
  friendRequestsResult,
  friendsResult,
  notificationsResult,
  recommendationsResult,
  sentRecommendationsResult
] = results;


  /* Critiques */

  if (reviewsResult.status === "fulfilled") {
    renderProfileReviews(reviewsResult.value);
  } else {
    console.error(
      "Erreur de chargement des critiques :",
      reviewsResult.reason
    );

    if (myReviewsGrid) {
      myReviewsGrid.innerHTML = `
        <div class="empty-state">
          Impossible de charger ton carnet pour le moment.
        </div>
      `;
    }
  }

  /* Wishlist */

  if (wishlistResult.status === "fulfilled") {
    renderWishlistMovies(wishlistResult.value);
  } else {
    console.error(
      "Erreur de chargement de la wishlist :",
      wishlistResult.reason
    );

    if (myWishlistGrid) {
      myWishlistGrid.innerHTML = `
        <div class="empty-state wishlist-empty-state">
          Impossible de charger ta liste À voir pour le moment.
        </div>
      `;
    }
  }

  /* Listes personnalisées */

  if (listsResult.status === "fulfilled") {
    renderMovieLists(listsResult.value);
  } else {
    console.error(
      "Erreur de chargement des listes :",
      listsResult.reason
    );

    if (myListsGrid) {
      myListsGrid.innerHTML = `
        <div class="empty-state lists-empty-state">
          Impossible de charger tes listes pour le moment.
        </div>
      `;
    }
  }

  /* Demandes d'amis */

  if (friendRequestsResult.status === "fulfilled") {
    renderFriendRequests(friendRequestsResult.value);
  } else {
    console.error(
      "Erreur de chargement des demandes d’amis :",
      friendRequestsResult.reason
    );

    if (friendRequestsSection) {
      friendRequestsSection.hidden = true;
    }

    if (friendRequestsGrid) {
      friendRequestsGrid.innerHTML = "";
    }

    if (friendRequestsCount) {
      friendRequestsCount.textContent = "0";
    }
  }

  /* Mon cercle */

  if (friendsResult.status === "fulfilled") {
    renderMyCircle(friendsResult.value);
  } else {
    console.error(
      "Erreur de chargement des amis :",
      friendsResult.reason
    );

    if (myCircleSection) {
      myCircleSection.hidden = true;
    }

    if (myCircleGrid) {
      myCircleGrid.innerHTML = "";
    }

    if (myCircleCount) {
      myCircleCount.textContent = "0";
    }
  }

  /* Activité */

  if (notificationsResult.status === "fulfilled") {
    renderActivityFeed(notificationsResult.value);
  } else {
    console.error(
      "Erreur de chargement des notifications :",
      notificationsResult.reason
    );

    if (activityFeed) {
      activityFeed.innerHTML = `
        <div class="activity-empty-state">
          Impossible de charger ton activité pour le moment.
        </div>
      `;
    }

    if (activityUnreadCount) {
      activityUnreadCount.hidden = true;
      activityUnreadCount.textContent = "0";
    }

    if (markAllNotificationsReadButton) {
      markAllNotificationsReadButton.hidden = true;
    }
  }

  /* Recommandations de films reçues */

  if (recommendationsResult.status === "fulfilled") {
    renderReceivedRecommendations(
      recommendationsResult.value
    );
  } else {
    console.error(
      "Erreur de chargement des recommandations reçues :",
      recommendationsResult.reason
    );

    if (receivedRecommendationsGrid) {
      receivedRecommendationsGrid.innerHTML = `
        <div class="recommendations-empty-state">
          Impossible de charger les films que l’on t’a soufflés
          pour le moment.
        </div>
      `;
    }

    if (receivedRecommendationsCount) {
      receivedRecommendationsCount.hidden = true;
      receivedRecommendationsCount.textContent = "0";
    }
  }
  
  /* Recommandations de films envoyées */

  if (sentRecommendationsResult.status === "fulfilled") {
    renderSentRecommendations(
      sentRecommendationsResult.value
    );
  } else {
    console.error(
      "Erreur de chargement des recommandations envoyées :",
      sentRecommendationsResult.reason
    );

    if (sentRecommendationsGrid) {
      sentRecommendationsGrid.innerHTML = `
        <div class="recommendations-empty-state">
          Impossible de charger les films que tu as soufflés
          pour le moment.
        </div>
      `;
    }

    if (sentRecommendationsCount) {
      sentRecommendationsCount.hidden = true;
      sentRecommendationsCount.textContent = "0";
    }
  }

}

/* =====================================================
   ÉVÉNEMENTS
   ===================================================== */

function setupProfilePage() {
  if (
    openListFormButton &&
    listForm &&
    cancelListFormButton
  ) {
    openListFormButton.addEventListener(
      "click",
      showListForm
    );

    cancelListFormButton.addEventListener(
      "click",
      hideListForm
    );

    listForm.addEventListener(
      "submit",
      createMovieList
    );
  }

  if (markAllNotificationsReadButton) {
    markAllNotificationsReadButton.addEventListener(
      "click",
      async () => {
        const originalText =
          markAllNotificationsReadButton.textContent;

        markAllNotificationsReadButton.disabled = true;
        markAllNotificationsReadButton.textContent = "Lecture…";

        try {
          await markAllNotificationsAsRead();

          document
            .querySelectorAll(".activity-item.is-unread")
            .forEach((item) => {
              item.classList.remove("is-unread");
            });

          refreshActivityUnreadCount();

          markAllNotificationsReadButton.hidden = true;
        } catch (error) {
          console.error(
            "Impossible de marquer les notifications comme lues :",
            error
          );

          alert(
            `Impossible de mettre à jour les notifications : ${error.message}`
          );
        } finally {
          markAllNotificationsReadButton.disabled = false;
          markAllNotificationsReadButton.textContent = originalText;
        }
      }
    );
  }

  if (avatarInput) {
    avatarInput.addEventListener("change", () => {
      const file = avatarInput.files?.[0];

      if (file) {
        uploadProfileAvatar(file);
      }
    });
  }

  /* ---------------------------------
     Modale : ajouter une microcritique
     à une note existante
  --------------------------------- */

  if (
    addReviewContentModal &&
    addReviewContentForm &&
    addReviewContentInput &&
    saveAddReviewContentButton
  ) {
    closeAddReviewContentModalButton?.addEventListener(
      "click",
      closeAddReviewContentModal
    );

    cancelAddReviewContentButton?.addEventListener(
      "click",
      closeAddReviewContentModal
    );

    addReviewContentInput.addEventListener(
      "input",
      updateAddReviewContentCharacterCounter
    );

    addReviewContentModal.addEventListener("click", (event) => {
      if (event.target === addReviewContentModal) {
        closeAddReviewContentModal();
      }
    });

    addReviewContentForm.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        if (!addingContentReviewId) {
          return;
        }

        const content = addReviewContentInput.value.trim();

        if (!content) {
          alert("Écris quelques mots avant de publier.");
          addReviewContentInput.focus();
          return;
        }

        saveAddReviewContentButton.disabled = true;
        saveAddReviewContentButton.textContent = "Publication…";

        try {
          await addReviewContent(
            addingContentReviewId,
            content
          );

          closeAddReviewContentModal();

          await loadMyProfilePage();

          alert(
            "Ta microcritique est publiée. Ses mots sont désormais définitifs. ✨"
          );
        } catch (error) {
          console.error(
            "Erreur d’ajout de la microcritique :",
            error
          );

          alert(
            `Impossible de publier tes mots : ${error.message}`
          );
        } finally {
          saveAddReviewContentButton.disabled = false;
          saveAddReviewContentButton.textContent =
            "Publier mes mots";
        }
      }
    );
  }

  /* ---------------------------------
     Modale : modifier ma note
  --------------------------------- */

  if (
    closeEditReviewModalButton &&
    cancelEditReviewButton &&
    editReviewModal &&
    editReviewForm &&
    editReviewRatingInput &&
    saveEditReviewButton
  ) {
    closeEditReviewModalButton.addEventListener(
      "click",
      closeEditReviewModal
    );

    cancelEditReviewButton.addEventListener(
      "click",
      closeEditReviewModal
    );

    editReviewModal.addEventListener("click", (event) => {
      if (event.target === editReviewModal) {
        closeEditReviewModal();
      }
    });

    editReviewForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!editingReviewId) {
        return;
      }

      const rating = editReviewRatingInput.value;

      saveEditReviewButton.disabled = true;
      saveEditReviewButton.textContent = "Enregistrement…";

      try {
        await updateReviewRating(editingReviewId, rating);

        closeEditReviewModal();

        await loadMyProfilePage();
      } catch (error) {
        console.error(
          "Erreur de modification de la note :",
          error
        );

        alert(
          `Impossible d’enregistrer ta note : ${error.message}`
        );
      } finally {
        saveEditReviewButton.disabled = false;
        saveEditReviewButton.textContent =
          "Enregistrer ma note";
      }
    });
  }

  /* ---------------------------------
     Touche Escape : fermer les modales
  --------------------------------- */

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    if (editReviewModal?.classList.contains("visible")) {
      closeEditReviewModal();
    }

    if (
      addReviewContentModal?.classList.contains("visible")
    ) {
      closeAddReviewContentModal();
    }
    
    if (
      watchlistReviewModal?.classList.contains("visible")
    ) {
      closeWatchlistReviewModal();
    }

  });
  
  /* ---------------------------------
     Modale : film vu → ajout au carnet
  --------------------------------- */

  if (
    watchlistReviewModal &&
    watchlistReviewForm &&
    watchlistReviewRating &&
    watchlistReviewContent &&
    saveWatchlistReviewButton
  ) {
    closeWatchlistReviewModalButton?.addEventListener(
      "click",
      closeWatchlistReviewModal
    );

    cancelWatchlistReviewButton?.addEventListener(
      "click",
      closeWatchlistReviewModal
    );

    watchlistReviewModal.addEventListener("click", (event) => {
      if (event.target === watchlistReviewModal) {
        closeWatchlistReviewModal();
      }
    });

    watchlistReviewContent.addEventListener(
      "input",
      updateWatchlistReviewCharacterCounter
    );

    watchlistReviewForm.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        if (!selectedWishlistMovie) {
          return;
        }

        const rating = Number(watchlistReviewRating.value);

        const content =
          watchlistReviewContent.value.trim();

        if (!rating) {
          alert("Choisis une note avant d’enregistrer ta séance.");
          watchlistReviewRating.focus();
          return;
        }

        const originalText = saveWatchlistReviewButton.textContent;

        saveWatchlistReviewButton.disabled = true;
        saveWatchlistReviewButton.textContent = "Enregistrement…";

        try {
          /*
            On crée d'abord l'entrée dans le carnet.
            Le film ne disparaît jamais de la wishlist
            tant que la note n’est pas correctement sauvegardée.
          */
          await createReviewForExistingMovie(
            selectedWishlistMovie.id,
            rating,
            content
          );

          await removeMovieFromWishlist(
            selectedWishlistMovie.wishlist_item_id
          );

          const destination =
            `film.html?id=${encodeURIComponent(
              selectedWishlistMovie.id
            )}`;

          window.location.href = destination;
        } catch (error) {
          console.error(
            "Erreur lors de l’ajout du film au carnet :",
            error
          );

          alert(
            `Impossible d’enregistrer cette séance : ${error.message}`
          );

          saveWatchlistReviewButton.disabled = false;
          saveWatchlistReviewButton.textContent = originalText;
        }
      }
    );
  }

}

document.addEventListener("authChanged", () => {
  loadMyProfilePage();
});

setupProfilePage();
loadMyProfilePage();
