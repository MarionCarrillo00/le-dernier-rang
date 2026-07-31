
const myReviewsGrid = document.getElementById("myReviewsGrid");
const reviewTotal = document.getElementById("reviewTotal");
const profileTitle = document.getElementById("profileTitle");
const profileSubtitle = document.getElementById("profileSubtitle");

const myWishlistGrid = document.getElementById("myWishlistGrid");

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

const editReviewRating = document.getElementById(
  "editReviewRating"
);

const editReviewContent = document.getElementById(
  "editReviewContent"
);

const editReviewCharacterCounter = document.getElementById(
  "editReviewCharacterCounter"
);

const saveEditReviewButton = document.getElementById(
  "saveEditReviewButton"
);

let editingReviewId = null;

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

function updateEditReviewCharacterCounter() {
  if (!editReviewContent || !editReviewCharacterCounter) {
    return;
  }

  const maximum = Number(editReviewContent.maxLength) || 140;
  const length = editReviewContent.value.length;

  editReviewCharacterCounter.textContent =
    `${length} / ${maximum}`;

  editReviewCharacterCounter.classList.toggle(
    "limit-reached",
    length >= maximum
  );
}

function openEditReviewModal(button) {
  if (
    !editReviewModal ||
    !editReviewContent ||
    !editReviewTitle ||
    !editReviewMovieTitle ||
    !editReviewRating ||
    !saveEditReviewButton
  ) {
    return;
  }

  editingReviewId = button.dataset.reviewId;

  const movieTitle =
    button.dataset.reviewTitle || "Film sans titre";

  const rating = Number(button.dataset.reviewRating) || 0;

  const currentContent =
    button.dataset.reviewContent || "";

  const hasExistingContent = Boolean(
    currentContent.trim()
  );

  editReviewTitle.textContent = hasExistingContent
    ? "Modifier mes mots"
    : "Ajouter quelques mots";

  editReviewMovieTitle.textContent = movieTitle;

  /*
    stars() renvoie volontairement du HTML.
    Il faut donc innerHTML, et non textContent.
  */
  editReviewRating.innerHTML =
    `${stars(rating)} <span>· ${rating}/5</span>`;

  editReviewContent.value = currentContent;

  saveEditReviewButton.textContent = hasExistingContent
    ? "Enregistrer mes modifications"
    : "Ajouter à ma note";

  updateEditReviewCharacterCounter();

  editReviewModal.classList.add("visible");

  window.setTimeout(() => {
    editReviewContent.focus();
  }, 50);
}

function closeEditReviewModal() {
  if (!editReviewModal) {
    return;
  }

  editReviewModal.classList.remove("visible");

  editingReviewId = null;

  if (editReviewContent) {
    editReviewContent.value = "";
  }

  updateEditReviewCharacterCounter();
}

function setupReviewEditButtons() {
  document.querySelectorAll(".edit-review").forEach((button) => {
    button.addEventListener("click", () => {
      openEditReviewModal(button);
    });
  });
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
   Les fonctions getAcceptedFriends() et createFriendsMarkup()
   viennent de assets/js/friends.js.
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

  /* On limite l’aperçu du profil à six films. */
  const visibleItems = items.slice(0, 6);

  const wishlistId = items[0]?.wishlist_id || "";

  myWishlistGrid.innerHTML = `
    ${visibleItems
      .map(({ wishlist_item_id, movie }) => {
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

              <button
                class="button-text wishlist-remove-button"
                type="button"
                data-wishlist-item-id="${wishlist_item_id}"
                title="Retirer ${escapeHTML(title)} de ma liste À voir"
              >
                Retirer
              </button>
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
        const wishlistItemId =
          button.dataset.wishlistItemId;

        if (!wishlistItemId) {
          return;
        }

        button.disabled = true;
        button.textContent = "Retrait…";

        try {
          const { error } = await supabaseClient
            .from("movie_list_items")
            .delete()
            .eq("id", wishlistItemId);

          if (error) {
            throw error;
          }

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

  myListsGrid.innerHTML = lists
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
    .join("");

  document.querySelectorAll(".delete-list-button").forEach((button) => {
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
   Chaque bloc charge indépendamment : une erreur sur les
   amis ne casse pas le carnet, la wishlist ou les listes.
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
    getAcceptedFriends(currentUser.id)
  ]);

  const [
    reviewsResult,
    wishlistResult,
    listsResult,
    friendRequestsResult,
    friendsResult
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

  if (avatarInput) {
    avatarInput.addEventListener("change", () => {
      const file = avatarInput.files?.[0];

      if (file) {
        uploadProfileAvatar(file);
      }
    });
  }

  if (
    closeEditReviewModalButton &&
    cancelEditReviewButton &&
    editReviewContent &&
    editReviewModal &&
    editReviewForm &&
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

    editReviewContent.addEventListener(
      "input",
      updateEditReviewCharacterCounter
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

      const content = editReviewContent.value.trim();

      saveEditReviewButton.disabled = true;
      saveEditReviewButton.textContent = "Enregistrement…";

      try {
        await updateReviewContent(editingReviewId, content);

        closeEditReviewModal();
        await loadMyProfilePage();
      } catch (error) {
        console.error(
          "Erreur de modification de la microcritique :",
          error
        );

        alert(
          `Impossible d’enregistrer tes mots : ${error.message}`
        );
      } finally {
        saveEditReviewButton.disabled = false;

        if (editingReviewId) {
          saveEditReviewButton.textContent =
            "Enregistrer mes modifications";
        }
      }
    });

    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        editReviewModal.classList.contains("visible")
      ) {
        closeEditReviewModal();
      }
    });
  }
}

document.addEventListener("authChanged", () => {
  loadMyProfilePage();
});

setupProfilePage();
loadMyProfilePage();
