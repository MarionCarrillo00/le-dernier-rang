
function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value || "";
  return div.innerHTML;
}

function stars(rating) {
  const numericRating = Number(rating || 0);
  const full = Math.floor(numericRating);
  const hasHalf = numericRating % 1 !== 0;
  const empty = 5 - full - (hasHalf ? 1 : 0);

  return `
    <span
      class="stars"
      aria-label="Note : ${numericRating} sur 5"
    >
      ${'<span class="star-full">★</span>'.repeat(full)}
      ${
        hasHalf
          ? '<span class="star-half">★</span>'
          : ""
      }
      ${'<span class="star-empty">☆</span>'.repeat(empty)}
    </span>
  `;
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

/* =====================================================
   LISTE DES LIKES
   ===================================================== */

let reviewLikesModalReady = false;

function ensureReviewLikesModal() {
  if (document.getElementById("reviewLikesModal")) {
    return;
  }

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div class="modal" id="reviewLikesModal">
        <div class="modal-box review-likes-modal-box">
          <div class="modal-head">
            <h3 id="reviewLikesModalTitle">Aimé par</h3>

            <button
              class="close-button"
              id="closeReviewLikesModal"
              type="button"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>

          <div
            class="review-likes-list"
            id="reviewLikesList"
          ></div>
        </div>
      </div>
    `
  );
}

function closeReviewLikesModal() {
  document
    .getElementById("reviewLikesModal")
    ?.classList.remove("visible");
}

function renderReviewLikePerson(profile) {
  const username = profile.username || "Membre";
  const avatarUrl = profile.avatar_url || "";

  const avatarMarkup = avatarUrl
    ? `
      <img
        class="review-like-avatar"
        src="${escapeHTML(avatarUrl)}"
        alt="Photo de profil de ${escapeHTML(username)}"
        loading="lazy"
      />
    `
    : `
      <span
        class="review-like-avatar review-like-avatar-placeholder"
        aria-hidden="true"
      >
        ${escapeHTML(username.charAt(0).toUpperCase() || "?")}
      </span>
    `;

  return `
    <a
      class="review-like-person"
      href="membre.html?id=${encodeURIComponent(profile.id)}"
      title="Voir le profil de ${escapeHTML(username)}"
    >
      ${avatarMarkup}
      <span>${escapeHTML(username)}</span>
    </a>
  `;
}

async function openReviewLikesModal(reviewId) {
  ensureReviewLikesModal();

  const modal = document.getElementById("reviewLikesModal");
  const title = document.getElementById("reviewLikesModalTitle");
  const list = document.getElementById("reviewLikesList");

  modal.classList.add("visible");

  title.textContent = "Chargement des likes…";

  list.innerHTML = `
    <p class="review-likes-message">
      Un instant…
    </p>
  `;

  try {
    const { data: likes, error } = await supabaseClient
      .from("review_likes")
      .select("user_id")
      .eq("review_id", reviewId);

    if (error) {
      throw error;
    }

    const userIds = (likes || []).map((like) => like.user_id);

    if (!userIds.length) {
      title.textContent = "Personne n’a encore aimé";

      list.innerHTML = `
        <p class="review-likes-message">
          Cette entrée attend encore son premier petit cœur.
        </p>
      `;

      return;
    }

    const profilesById = await getProfilesByUserIds(userIds);

    const profiles = userIds
      .map((userId) => profilesById[userId])
      .filter(Boolean);

    title.textContent =
      `Aimé par ${profiles.length} personne${
        profiles.length > 1 ? "s" : ""
      }`;

    list.innerHTML = profiles.length
      ? profiles.map(renderReviewLikePerson).join("")
      : `
        <p class="review-likes-message">
          Impossible d’afficher les profils associés à ces likes.
        </p>
      `;
  } catch (error) {
    console.error(
      "Erreur de chargement de la liste des likes :",
      error
    );

    title.textContent = "Likes";

    list.innerHTML = `
      <p class="review-likes-message">
        Impossible de charger la liste des personnes ayant aimé cette entrée.
      </p>
    `;
  }
}

function setupReviewLikesModalInteractions() {
  if (reviewLikesModalReady) {
    return;
  }

  reviewLikesModalReady = true;

  document.addEventListener("click", (event) => {
    const countButton = event.target.closest(".review-like-count");

    if (countButton) {
      event.preventDefault();
      event.stopPropagation();

      openReviewLikesModal(countButton.dataset.reviewId);
      return;
    }

    if (
      event.target.id === "closeReviewLikesModal" ||
      event.target.id === "reviewLikesModal"
    ) {
      closeReviewLikesModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeReviewLikesModal();
    }
  });
}

/* =====================================================
   RÉPONSES AUX MICROCRITIQUES
   ===================================================== */

const openedReviewCommentIds = new Set();
let reviewCommentInteractionsReady = false;

function getCommentAuthorInitial(comment) {
  const username = comment.author?.username || "Membre";

  return username.charAt(0).toUpperCase() || "?";
}

function renderCommentAvatar(comment) {
  const username = comment.author?.username || "Membre";
  const avatarUrl = comment.author?.avatar_url || "";

  if (avatarUrl) {
    return `
      <img
        class="review-comment-avatar"
        src="${escapeHTML(avatarUrl)}"
        alt="Photo de profil de ${escapeHTML(username)}"
        loading="lazy"
      />
    `;
  }

  return `
    <span
      class="review-comment-avatar review-comment-avatar-placeholder"
      aria-hidden="true"
    >
      ${escapeHTML(getCommentAuthorInitial(comment))}
    </span>
  `;
}

function formatReviewCommentDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

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

  if (differenceInDays <= 5) {
    return `Il y a ${differenceInDays} jours`;
  }

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}


function renderReviewComment(comment) {
  const username = comment.author?.username || "Membre";

  const profileLink = comment.user_id
    ? `membre.html?id=${encodeURIComponent(comment.user_id)}`
    : "";

  const relativeDate = formatReviewCommentDate(
    comment.created_at
  );

  const authorIdentityMarkup = `
    ${renderCommentAvatar(comment)}

    <span class="review-comment-author-meta">
      <strong>${escapeHTML(username)}</strong>

      ${
        relativeDate
          ? `
            <time
              class="review-comment-date"
              datetime="${escapeHTML(comment.created_at || "")}"
            >
              ${escapeHTML(relativeDate)}
            </time>
          `
          : ""
      }
    </span>
  `;

  const authorMarkup = profileLink
    ? `
      <a
        class="review-comment-author"
        href="${profileLink}"
        title="Voir le profil de ${escapeHTML(username)}"
      >
        ${authorIdentityMarkup}
      </a>
    `
    : `
      <div class="review-comment-author">
        ${authorIdentityMarkup}
      </div>
    `;

  const deleteButton =
    currentUser?.id === comment.user_id
      ? `
        <button
          class="delete-review-comment"
          type="button"
          data-comment-id="${comment.id}"
          title="Supprimer cette réponse"
        >
          Supprimer
        </button>
      `
      : "";

  return `
    <article class="review-comment">
      <div class="review-comment-top">
        ${authorMarkup}
        ${deleteButton}
      </div>

      <p>${escapeHTML(comment.content)}</p>
    </article>
  `;
}


function renderReviewCommentSection(review) {
  const comments = review.comments || [];
  const isOpen = openedReviewCommentIds.has(review.id);

  if (!isOpen) {
    return "";
  }

  return `
    <div class="review-comments-panel">
      <div class="review-comments-list">
        ${
          comments.length
            ? comments.map(renderReviewComment).join("")
            : `
              <p class="review-comments-empty">
                Aucun écho pour le moment.
              </p>
            `
        }
      </div>

      ${
        currentUser
          ? `
            <form
              class="review-comment-form"
              data-review-id="${review.id}"
            >
              <textarea
                class="review-comment-input"
                maxlength="1000"
                required
                placeholder="Répondre avec quelques mots…"
                aria-label="Répondre à cette microcritique"
              ></textarea>

              <div class="review-comment-form-bottom">
                <span class="review-comment-counter">
                  0 / 1000
                </span>

                <button
                  class="button-text review-comment-submit"
                  type="submit"
                >
                  Répondre
                </button>
              </div>
            </form>
          `
          : `
            <p class="review-comments-login">
              <button
                class="review-comment-login"
                type="button"
              >
                Connecte-toi
              </button>
              pour répondre à cette microcritique.
            </p>
          `
      }
    </div>
  `;
}

function renderReviewCommentButton(review) {
  const comments = review.comments || [];
  const commentCount = comments.length;
  const isOpen = openedReviewCommentIds.has(review.id);

  return `
    <button
      class="review-comment-toggle ${isOpen ? "is-open" : ""}"
      type="button"
      data-review-id="${review.id}"
      aria-expanded="${isOpen ? "true" : "false"}"
      title="Voir ou ajouter une réponse"
    >
      ${isOpen ? "Fermer" : "Répondre"}
      <span>${commentCount}</span>
    </button>
  `;
}

async function getCommentsByReviewIds(reviewIds) {
  const validReviewIds = reviewIds.filter(Boolean);

  if (!validReviewIds.length) {
    return {};
  }

  const { data: comments, error } = await supabaseClient
    .from("review_comments")
    .select(`
      id,
      review_id,
      user_id,
      content,
      created_at
    `)
    .in("review_id", validReviewIds)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(
      "Erreur de chargement des réponses :",
      error.message
    );

    return {};
  }

  const authorProfiles = await getProfilesByUserIds(
    (comments || []).map((comment) => comment.user_id)
  );

  return (comments || []).reduce((commentsByReviewId, comment) => {
    if (!commentsByReviewId[comment.review_id]) {
      commentsByReviewId[comment.review_id] = [];
    }

    commentsByReviewId[comment.review_id].push({
      ...comment,
      author: authorProfiles[comment.user_id] || {
        username: "Membre",
        avatar_url: ""
      }
    });

    return commentsByReviewId;
  }, {});
}

async function enrichReviewsWithComments(reviews) {
  if (!reviews || reviews.length === 0) {
    return [];
  }

  const commentsByReviewId = await getCommentsByReviewIds(
    reviews.map((review) => review.id)
  );

  return reviews.map((review) => ({
    ...review,
    comments: commentsByReviewId[review.id] || []
  }));
}

async function createReviewComment(reviewId, content) {
  if (!currentUser) {
    throw new Error(
      "Connecte-toi pour répondre à une microcritique."
    );
  }

  const cleanContent = String(content || "").trim();

  if (!cleanContent) {
    throw new Error("Écris quelques mots avant de répondre.");
  }

  if (cleanContent.length > 1000) {
    throw new Error(
      "Une réponse ne peut pas dépasser 1000 caractères."
    );
  }

  const { error } = await supabaseClient
    .from("review_comments")
    .insert({
      review_id: reviewId,
      user_id: currentUser.id,
      content: cleanContent
    });

  if (error) {
    throw error;
  }
}

async function deleteReviewComment(commentId) {
  if (!currentUser) {
    throw new Error(
      "Connecte-toi pour supprimer cette réponse."
    );
  }

  const { error } = await supabaseClient
    .from("review_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", currentUser.id);

  if (error) {
    throw error;
  }
}

async function refreshCurrentReviewView() {
  if (typeof refreshHomeReviews === "function") {
    await refreshHomeReviews();
    return;
  }

  if (typeof initialiseFilmPage === "function") {
    await initialiseFilmPage();
    return;
  }

  if (typeof loadMyProfilePage === "function") {
    await loadMyProfilePage();
    return;
  }

  if (typeof loadMemberPage === "function") {
    await loadMemberPage();
  }
}

function setupReviewCommentInteractions() {
  if (reviewCommentInteractionsReady) {
    return;
  }

  reviewCommentInteractionsReady = true;

  document.addEventListener("click", async (event) => {
    const toggleButton = event.target.closest(
      ".review-comment-toggle"
    );

    if (toggleButton) {
      const reviewId = toggleButton.dataset.reviewId;
      const isCurrentlyOpen = openedReviewCommentIds.has(reviewId);

      /*
        Ferme instantanément sans recharger toutes les données.
      */
      if (isCurrentlyOpen) {
        openedReviewCommentIds.delete(reviewId);

        const card = toggleButton.closest(".movie-card");

        const commentsPanel = card?.querySelector(
          ".review-comments-panel"
        );

        commentsPanel?.remove();

        const count =
          toggleButton.querySelector("span")?.textContent || "0";

        toggleButton.classList.remove("is-open");

        toggleButton.setAttribute("aria-expanded", "false");

        toggleButton.innerHTML = `
          Répondre
          <span>${escapeHTML(count)}</span>
        `;

        return;
      }

      /*
        À l'ouverture, recharge les commentaires actualisés.
      */
      openedReviewCommentIds.add(reviewId);

      await refreshCurrentReviewView();
      return;
    }

    const loginButton = event.target.closest(
      ".review-comment-login"
    );

    if (loginButton) {
      setAuthMode("login");
      openAuthModal();

      showAuthMessage(
        "Connecte-toi ou crée un compte pour répondre à une microcritique.",
        "error"
      );

      return;
    }

    const deleteButton = event.target.closest(
      ".delete-review-comment"
    );

    if (deleteButton) {
      const confirmation = confirm(
        "Supprimer cette réponse ? Cette action est définitive."
      );

      if (!confirmation) {
        return;
      }

      deleteButton.disabled = true;
      deleteButton.textContent = "Suppression…";

      try {
        await deleteReviewComment(deleteButton.dataset.commentId);
        await refreshCurrentReviewView();
      } catch (error) {
        console.error(
          "Erreur de suppression de la réponse :",
          error
        );

        alert(
          `Impossible de supprimer cette réponse : ${error.message}`
        );

        deleteButton.disabled = false;
        deleteButton.textContent = "Supprimer";
      }
    }
  });

  document.addEventListener("input", (event) => {
    const input = event.target;

    if (!input.classList.contains("review-comment-input")) {
      return;
    }

    const form = input.closest(".review-comment-form");

    const counter = form?.querySelector(
      ".review-comment-counter"
    );

    if (!counter) {
      return;
    }

    const maximum = Number(input.maxLength) || 280;
    const length = input.value.length;

    counter.textContent = `${length} / ${maximum}`;

    counter.classList.toggle(
      "limit-reached",
      length >= maximum
    );
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target;

    if (!form.classList.contains("review-comment-form")) {
      return;
    }

    event.preventDefault();

    if (!currentUser) {
      setAuthMode("login");
      openAuthModal();

      showAuthMessage(
        "Connecte-toi ou crée un compte pour répondre à une microcritique.",
        "error"
      );

      return;
    }

    const reviewId = form.dataset.reviewId;

    const input = form.querySelector(".review-comment-input");

    const submitButton = form.querySelector(
      ".review-comment-submit"
    );

    if (!input || !submitButton) {
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Envoi…";

    try {
      await createReviewComment(reviewId, input.value);

      openedReviewCommentIds.add(reviewId);

      await refreshCurrentReviewView();
    } catch (error) {
      console.error("Erreur de publication de réponse :", error);

      alert(
        `Impossible de publier ta réponse : ${error.message}`
      );

      submitButton.disabled = false;
      submitButton.textContent = "Répondre";
    }
  });
}

/* =====================================================
   CARTES DE MICROCRITIQUES
   ===================================================== */


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

  /*
    Le contenu doit être défini avant de calculer la date :
    une note seule ne reçoit pas de date visible.
  */
  const reviewContent = String(review.content || "").trim();

  const reviewDate = reviewContent
    ? formatReviewCommentDate(review.created_at)
    : "";

  const authorProfileLink = review.user_id

    ? `membre.html?id=${encodeURIComponent(review.user_id)}`
    : "";

  const posterUrl = movie.poster_url || "";
  const likeCount = Number(review.like_count || 0);
  const hasLiked = Boolean(review.liked_by_current_user);

  const isCompactFilmReview = Boolean(options.compactFilmReview);

  /*
    Arrivée depuis le lien « Répondre » de l'accueil :
    ouvre automatiquement la bonne discussion sur film.html.
  */
  if (
    isCompactFilmReview &&
    window.location.hash === `#review-${review.id}`
  ) {
    openedReviewCommentIds.add(review.id);

    const cleanUrl =
      window.location.pathname + window.location.search;

    window.history.replaceState({}, "", cleanUrl);
  }
  
const isNoteOnly = !reviewContent;

const canReceiveInteractions = Boolean(reviewContent);

  const canReceiveLikes = Boolean(reviewContent);




const reviewMarkup = reviewContent
  ? `
      <p class="review">
        “${escapeHTML(reviewContent)}”
      </p>
    `
  : `
      <p class="movie-card-note-meta">
        Note du carnet · ${escapeHTML(primaryGenre)}
      </p>
    `;



const tagsMarkup = isNoteOnly
  ? ""
  : `
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
  : canReceiveLikes
    ? `
        <div class="review-like-actions">
          <button
            class="favorite ${hasLiked ? "liked" : ""}"
            type="button"
            data-review-id="${review.id}"
            title="${
              hasLiked
                ? "Retirer mon like"
                : "J’aime cette microcritique"
            }"
            aria-label="${
              hasLiked
                ? "Retirer mon like"
                : "J’aime cette microcritique"
            }"
          >
            ${hasLiked ? "♥" : "♡"}
          </button>

          <button
            class="review-like-count"
            type="button"
            data-review-id="${review.id}"
            title="Voir les personnes ayant aimé cette microcritique"
            aria-label="Voir les personnes ayant aimé cette microcritique"
          >
            ${likeCount}
          </button>
        </div>
      `
    : "";



const editButton = options.canEdit
  ? `
      <button
        class="edit-review"
        type="button"
        data-review-id="${review.id}"
        data-review-title="${escapeHTML(
          movie.title || "Film sans titre"
        )}"
        data-review-rating="${escapeHTML(
          String(review.rating || "")
        )}"
        title="Modifier ma note"
      >
        Modifier ma note
      </button>
    `
  : "";

const addContentButton =
  options.canEdit && !reviewContent
    ? `
      <button
        class="add-review-content"
        type="button"
        data-review-id="${review.id}"
        data-review-title="${escapeHTML(
          movie.title || "Film sans titre"
        )}"
        data-review-rating="${escapeHTML(
          String(review.rating || "")
        )}"
        title="Ajouter une microcritique"
      >
        Ajouter une microcritique
      </button>
    `
    : "";


  const movieUrl = movie.id
    ? `film.html?id=${encodeURIComponent(movie.id)}`
    : "";


const commentButton =
  isCompactFilmReview && canReceiveInteractions
    ? renderReviewCommentButton(review)
    : "";

const commentPanel =
  isCompactFilmReview && canReceiveInteractions
    ? renderReviewCommentSection(review)
    : "";


  const commentCount = (review.comments || []).length;


const discussionLink =
  movieUrl && canReceiveInteractions
    ? `

      <a
        class="review-discussion-link"
        href="${movieUrl}#review-${review.id}"
        title="Voir les réponses sur la fiche du film"
      >
        Répondre
        <span>${commentCount}</span>
      </a>
    `
    : "";

  const shouldShowAuthor = !options.hideAuthor;
  const shouldShowDiscussionLink = !options.hideDiscussionLink;

  const posterContent = posterUrl
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


const posterMarkup = isNoteOnly
  ? ""
  : movieUrl
    ? `
      <a
        class="movie-poster-link"
        href="${movieUrl}"
        title="Voir la fiche de ${escapeHTML(
          movie.title || "ce film"
        )}"
      >
        ${posterContent}
      </a>
    `
    : posterContent;


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

 
  const authorIdentityMarkup = `
    ${authorAvatarMarkup}

    <span class="review-author-meta">
      <span class="author">
        Par ${escapeHTML(author)}
      </span>

      ${
        reviewDate
          ? `
            <time
              class="review-date"
              datetime="${escapeHTML(review.created_at || "")}"
            >
              ${escapeHTML(reviewDate)}
            </time>
          `
          : ""
      }
    </span>
  `;

  const authorMarkup = authorProfileLink
    ? `
      <a
        class="review-author review-author-link"
        href="${authorProfileLink}"
        title="Voir le profil de ${escapeHTML(author)}"
      >
        ${authorIdentityMarkup}
      </a>
    `
    : `
      <div class="review-author">
        ${authorIdentityMarkup}
      </div>
    `;


  /*
    Variante fiche film :
    sans affiche répétée, réponses affichées uniquement ici.
  */
  if (isCompactFilmReview) {
    return `

<article
  class="movie-card movie-card-film-review ${
    isNoteOnly ? "movie-card-note-only" : ""
  }"
  id="review-${review.id}"
>

        <div class="movie-content">
          <div class="film-review-header">
            ${authorMarkup}


<span class="rating" title="${review.rating}/5">
  ${stars(review.rating)}
</span>

          </div>

          ${reviewMarkup}

${tagsMarkup}


          <div class="card-bottom">
            <span class="film-review-meta">
              ${
                reviewContent
                  ? "Microcritique"
                  : "Note ajoutée au carnet"
              }
            </span>

            <div class="card-actions">
              ${commentButton}
              ${actionButton}
            </div>
          </div>

          ${commentPanel}
        </div>
      </article>
    `;
  }

  /*
    Variante accueil / profil / membre :
    aucune conversation déroulée dans la grille.
  */

return `
  <article
    id="review-${escapeHTML(review.id)}"
    class="movie-card ${isNoteOnly ? "movie-card-note-only" : ""}"
  >

      ${posterMarkup}

      <div class="movie-content">
        <div class="movie-card-heading">
          <div class="movie-card-identification">
            <h3 class="movie-card-title">
              ${
                movieUrl
                  ? `
                    <a
                      href="${movieUrl}"
                      title="Voir la fiche de ${escapeHTML(
                        movie.title || "ce film"
                      )}"
                    >
                      ${escapeHTML(movie.title || "Film sans titre")}
                    </a>
                  `
                  : escapeHTML(movie.title || "Film sans titre")
              }
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

${tagsMarkup}


        <div class="card-bottom ${
          shouldShowAuthor ? "" : "card-bottom-own-profile"
        }">
          ${
            shouldShowAuthor
              ? authorMarkup
              : ""
          }

          <div class="card-actions">
            ${
              shouldShowDiscussionLink
                ? discussionLink
                : ""
            }

${editButton}
${addContentButton}
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

async function enrichReviews(reviews) {
  const reviewsWithLikes = await enrichReviewsWithLikes(reviews);

  return enrichReviewsWithComments(reviewsWithLikes);
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
    (reviews || []).map((review) => review.user_id)
  );

  const reviewsWithAuthors = addAuthorsToReviews(
    reviews || [],
    profilesById
  );

  return enrichReviews(reviewsWithAuthors);
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
    (reviews || []).map((review) => review.user_id)
  );

  const reviewsWithAuthors = addAuthorsToReviews(
    reviews || [],
    profilesById
  );

  return enrichReviews(reviewsWithAuthors);
}

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
    (reviews || []).map((review) => review.user_id)
  );

  const reviewsWithAuthors = addAuthorsToReviews(
    reviews || [],
    profilesById
  );

  return enrichReviews(reviewsWithAuthors);
}

/* =====================================================
   PUBLICATION D'UNE NOTE / MICROCRITIQUE
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
   AJOUT AU CARNET DEPUIS UNE WISHLIST
   ===================================================== */

async function createReviewForExistingMovie(
  movieId,
  rating,
  content = ""
) {
  if (!currentUser) {
    throw new Error(
      "Tu dois être connectée pour ajouter ce film à ton carnet."
    );
  }

  if (!movieId) {
    throw new Error(
      "Impossible d’identifier le film à ajouter au carnet."
    );
  }

  const numericRating = Number(rating);

  const allowedRatings = [
    1,
    1.5,
    2,
    2.5,
    3,
    3.5,
    4,
    4.5,
    5
  ];

  if (!allowedRatings.includes(numericRating)) {
    throw new Error(
      "Choisis une note comprise entre 1 et 5."
    );
  }

  const reviewContent = String(content || "").trim();

  if (reviewContent.length > 1000) {
    throw new Error(
      "Ton entrée de carnet ne peut pas dépasser 1000 caractères."
    );
  }

  const { data, error } = await supabaseClient
    .from("reviews")
    .insert({
      user_id: currentUser.id,
      movie_id: movieId,
      rating: numericRating,
      content: reviewContent || null,
      is_published: true
    })
    .select("id, movie_id, rating, content, created_at")
    .single();

  if (error?.code === "23505") {
    throw new Error(
      "Tu as déjà ajouté une note ou une microcritique pour ce film."
    );
  }

  if (error) {
    throw error;
  }

  return data;
}

/* =====================================================
   ÉDITION DU TEXTE UNIQUEMENT
   ===================================================== */

async function updateReviewRating(reviewId, rating) {
  if (!currentUser) {
    throw new Error(
      "Tu dois être connectée pour modifier ta note."
    );
  }

  const numericRating = Number(rating);

  const allowedRatings = [
    1,
    1.5,
    2,
    2.5,
    3,
    3.5,
    4,
    4.5,
    5
  ];

  if (!allowedRatings.includes(numericRating)) {
    throw new Error(
      "Choisis une note comprise entre 1 et 5."
    );
  }

  const { data, error } = await supabaseClient
    .from("reviews")
    .update({
      rating: numericRating
    })
    .eq("id", reviewId)
    .eq("user_id", currentUser.id)
    .select("id, rating")
    .single();

  if (error) {
    throw error;
  }

  return data;
}


async function addReviewContent(reviewId, content) {
  if (!currentUser) {
    throw new Error(
      "Tu dois être connectée pour ajouter une microcritique."
    );
  }

  const cleanContent = String(content || "").trim();

  if (!cleanContent) {
    throw new Error(
      "Écris quelques mots avant d’enregistrer."
    );
  }

  if (cleanContent.length > 140) {
    throw new Error(
      "Ta microcritique ne peut pas dépasser 140 caractères."
    );
  }

  const { data: currentReview, error: currentReviewError } =
    await supabaseClient
      .from("reviews")
      .select("id, content")
      .eq("id", reviewId)
      .eq("user_id", currentUser.id)
      .single();

  if (currentReviewError) {
    throw currentReviewError;
  }

  if (String(currentReview.content || "").trim()) {
    throw new Error(
      "Cette microcritique possède déjà un texte définitif."
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
   SUPPRESSION D'UNE NOTE / MICROCRITIQUE
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

/* =====================================================
   INITIALISATION
   ===================================================== */

setupReviewCommentInteractions();
setupReviewLikesModalInteractions();
