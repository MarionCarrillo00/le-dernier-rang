
/* =====================================================
   SUGGESTIONS DE FILMS ENTRE AMIS — CINÉ MOJITO
   Utilisé depuis les fiches films.

   Dépendances :
   - supabaseClient
   - currentUser
   - getAcceptedFriends() depuis friends.js
   - currentFilmMovie et ensureCurrentFilmInCatalog()
     depuis film.js
   ===================================================== */

const recommendationModal = document.getElementById(
  "recommendationModal"
);

const recommendationForm = document.getElementById(
  "recommendationForm"
);

const recommendationFriends = document.getElementById(
  "recommendationFriends"
);

const recommendationMessage = document.getElementById(
  "recommendationMessage"
);

const recommendationCharacterCounter = document.getElementById(
  "recommendationCharacterCounter"
);

const recommendationStatusMessage = document.getElementById(
  "recommendationStatusMessage"
);

const closeRecommendationModalButton = document.getElementById(
  "closeRecommendationModal"
);

const cancelRecommendationButton = document.getElementById(
  "cancelRecommendationButton"
);

const sendRecommendationButton = document.getElementById(
  "sendRecommendationButton"
);

let recommendationFriendsCache = [];
let recommendationCatalogMovie = null;
let recommendationCatalogMoviePromise = null;

/* =====================================================
   OUTILS
   ===================================================== */

function escapeRecommendationHTML(value) {
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

function showRecommendationMessage(message, type = "") {
  if (!recommendationStatusMessage) {
    return;
  }

  recommendationStatusMessage.textContent = message;
  recommendationStatusMessage.className = "status-message";

  if (type) {
    recommendationStatusMessage.classList.add(type);
  }
}

function clearRecommendationMessage() {
  if (!recommendationStatusMessage) {
    return;
  }

  recommendationStatusMessage.textContent = "";
  recommendationStatusMessage.className = "status-message";
}

function updateRecommendationCharacterCounter() {
  if (!recommendationMessage || !recommendationCharacterCounter) {
    return;
  }

  const currentLength = recommendationMessage.value.length;
  const maxLength = Number(recommendationMessage.maxLength || 280);

  recommendationCharacterCounter.textContent = currentLength;

  recommendationCharacterCounter.classList.toggle(
    "limit-reached",
    currentLength >= maxLength
  );
}

function getRecommendationFriendInitial(friend) {
  const username = friend?.username || "Membre";

  return username.charAt(0).toUpperCase() || "?";
}

function renderRecommendationFriendAvatar(friend) {
  const username = friend?.username || "Membre";

  if (friend?.avatar_url) {
    return `
      <img
        src="${escapeRecommendationHTML(friend.avatar_url)}"
        alt="Photo de profil de ${escapeRecommendationHTML(username)}"
        loading="lazy"
      />
    `;
  }

  return `
    <span aria-hidden="true">
      ${escapeRecommendationHTML(
        getRecommendationFriendInitial(friend)
      )}
    </span>
  `;
}

function getSelectedRecommendationRecipients() {
  return [
    ...document.querySelectorAll(
      'input[name="recommendationRecipients"]:checked'
    )
  ]
    .map((input) => input.value)
    .filter(Boolean);
}

function getRecommendationFriendById(friendId) {
  return recommendationFriendsCache.find(
    (friend) => String(friend.id) === String(friendId)
  );
}

function getRecommendationFriendName(friendId) {
  return (
    getRecommendationFriendById(friendId)?.username || "Cette personne"
  );
}

/* =====================================================
   VÉRIFICATION — FILM DÉJÀ PRÉSENT DANS LE CARNET
   ===================================================== */

/*
  Le film peut provenir directement de TMDB et ne pas encore
  avoir un identifiant Supabase. On le crée donc seulement
  lorsque la vérification ou l'envoi le nécessite.

  La promesse est mémorisée : plusieurs clics sur les cases
  ne créent jamais plusieurs entrées catalogue.
*/
async function getRecommendationCatalogMovie() {
  if (recommendationCatalogMovie?.id) {
    return recommendationCatalogMovie;
  }

  if (recommendationCatalogMoviePromise) {
    return recommendationCatalogMoviePromise;
  }

  recommendationCatalogMoviePromise = ensureCurrentFilmInCatalog();

  try {
    const catalogMovie = await recommendationCatalogMoviePromise;

    if (!catalogMovie?.id) {
      throw new Error(
        "Le film n’a pas pu être enregistré dans le catalogue."
      );
    }

    recommendationCatalogMovie = catalogMovie;

    return recommendationCatalogMovie;
  } finally {
    recommendationCatalogMoviePromise = null;
  }
}

function getRecommendationSeenWarningElement() {
  return document.getElementById("recommendationSeenWarning");
}

function clearRecommendationSeenWarning() {
  const warning = getRecommendationSeenWarningElement();

  if (!warning) {
    return;
  }

  warning.hidden = true;
  warning.innerHTML = "";
}

function renderRecommendationSeenWarning(recipientIds, seenRecipientIds) {
  const warning = getRecommendationSeenWarningElement();

  if (!warning) {
    return;
  }

  if (!seenRecipientIds?.length) {
    clearRecommendationSeenWarning();
    return;
  }

  const seenNames = seenRecipientIds.map(getRecommendationFriendName);

  const selectedNotSeenCount = recipientIds.filter(
    (recipientId) => !seenRecipientIds.includes(recipientId)
  ).length;

  let title = "";
  let description = "";

  if (seenNames.length === 1) {
    title = `${seenNames[0]} a déjà noté ce film dans son carnet.`;
  } else if (seenNames.length === 2) {
    title = `${seenNames[0]} et ${seenNames[1]} ont déjà noté ce film dans leur carnet.`;
  } else {
    title = `${seenNames.length} personnes sélectionnées ont déjà noté ce film dans leur carnet.`;
  }

  if (selectedNotSeenCount > 0) {
    description =
      "Tu peux tout de même lui souffler ce film, tandis que les autres personnes le recevront normalement.";
  } else {
    description =
      "Tu peux tout de même leur souffler ce film — une recommandation peut aussi être une jolie invitation à le revoir ou à en reparler.";
  }

  warning.hidden = false;
  warning.innerHTML = `
    <strong>${escapeRecommendationHTML(title)}</strong>
    <span>${escapeRecommendationHTML(description)}</span>
  `;
}

/*
  Ne récupère volontairement que user_id.
  Aucun texte, aucune note, aucune information intime issue
  du carnet de la personne concernée n'est exposée ici.
*/
async function checkRecipientsAlreadySawCurrentFilm(recipientIds) {
  if (!recipientIds?.length) {
    clearRecommendationSeenWarning();
    return;
  }

  try {
    const catalogMovie = await getRecommendationCatalogMovie();

    const { data, error } = await supabaseClient
      .from("reviews")
      .select("user_id")
      .eq("movie_id", catalogMovie.id)
      .eq("is_published", true)
      .in("user_id", recipientIds);

    if (error) {
      throw error;
    }

    const seenRecipientIds = [
      ...new Set(
        (data || [])
          .map((review) => review.user_id)
          .filter(Boolean)
      )
    ];

    /*
      L'utilisatrice a pu décocher une personne pendant
      le temps de réponse Supabase : on vérifie toujours
      l'état actuel avant d'afficher le message.
    */
    const stillSelectedRecipientIds =
      getSelectedRecommendationRecipients();

    const stillSeenRecipientIds = seenRecipientIds.filter(
      (recipientId) =>
        stillSelectedRecipientIds.includes(recipientId)
    );

    renderRecommendationSeenWarning(
      stillSelectedRecipientIds,
      stillSeenRecipientIds
    );
  } catch (error) {
    /*
      La vérification est une aide, jamais un blocage :
      si elle échoue, l'envoi de suggestion reste possible.
    */
    console.warn(
      "Impossible de vérifier si le film est déjà dans les carnets :",
      error
    );

    clearRecommendationSeenWarning();
  }
}

function handleRecommendationRecipientChange() {
  const recipientIds = getSelectedRecommendationRecipients();

  if (!recipientIds.length) {
    clearRecommendationSeenWarning();
    return;
  }

  checkRecipientsAlreadySawCurrentFilm(recipientIds);
}

/* =====================================================
   MODALE
   ===================================================== */

function closeRecommendationModal() {
  if (!recommendationModal) {
    return;
  }

  recommendationModal.classList.remove("is-open");
  recommendationModal.setAttribute("aria-hidden", "true");
  recommendationModal.hidden = true;

  document.body.classList.remove("modal-open");

  clearRecommendationMessage();
  clearRecommendationSeenWarning();

  if (recommendationForm) {
    recommendationForm.reset();
  }

  updateRecommendationCharacterCounter();
}

function openRecommendationModal() {
  if (!recommendationModal) {
    return;
  }

  /*
    On ferme visuellement les autres modales ouvertes afin
    d'éviter les collisions d'overlays ou les clics interceptés.
  */
  document.querySelectorAll(".modal").forEach((modal) => {
    if (modal !== recommendationModal) {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
    }
  });

  recommendationModal.hidden = false;
  recommendationModal.classList.add("is-open");
  recommendationModal.setAttribute("aria-hidden", "false");

  document.body.classList.add("modal-open");

  updateRecommendationCharacterCounter();
}

function renderRecommendationFriends(friends) {
  if (!recommendationFriends) {
    return;
  }

  if (!friends || !friends.length) {
    recommendationFriends.innerHTML = `
      <div class="empty-state recommendation-empty-state">
        <strong>Ton cercle attend encore ses premiers visages.</strong>
        <br /><br />
        Ajoute des amis pour pouvoir leur souffler tes prochaines
        belles découvertes.
      </div>
    `;

    if (sendRecommendationButton) {
      sendRecommendationButton.disabled = true;
    }

    return;
  }

  recommendationFriends.innerHTML = `
    <p class="recommendation-friends-label">
      À qui veux-tu suggérer ce film ?
    </p>

    <div
      id="recommendationSeenWarning"
      class="recommendation-seen-warning"
      hidden
      aria-live="polite"
    ></div>

    <div class="recommendation-friends-list">
      ${friends
        .map((friend) => {
          const username = friend.username || "Membre";

          return `
            <label class="recommendation-friend-option">
              <input
                type="checkbox"
                name="recommendationRecipients"
                value="${escapeRecommendationHTML(friend.id)}"
              />

              <span class="recommendation-friend-avatar">
                ${renderRecommendationFriendAvatar(friend)}
              </span>

              <span class="recommendation-friend-name">
                ${escapeRecommendationHTML(username)}
              </span>
            </label>
          `;
        })
        .join("")}
    </div>
  `;

  if (sendRecommendationButton) {
    sendRecommendationButton.disabled = false;
  }
}

async function loadRecommendationFriends() {
  if (!recommendationFriends) {
    return;
  }

  if (!currentUser) {
    recommendationFriends.innerHTML = "";
    return;
  }

  recommendationFriends.innerHTML = `
    <div class="film-loading">
      Chargement de ton cercle…
    </div>
  `;

  if (sendRecommendationButton) {
    sendRecommendationButton.disabled = true;
  }

  try {
    recommendationFriendsCache = await getAcceptedFriends(
      currentUser.id
    );

    renderRecommendationFriends(recommendationFriendsCache);
  } catch (error) {
    console.error(
      "Erreur lors du chargement des amis pour la suggestion :",
      error
    );

    recommendationFriends.innerHTML = `
      <div class="empty-state recommendation-empty-state">
        Impossible de charger ton cercle pour le moment.
      </div>
    `;

    if (sendRecommendationButton) {
      sendRecommendationButton.disabled = true;
    }
  }
}

/* =====================================================
   OUVERTURE DEPUIS LA FICHE FILM
   ===================================================== */

async function openFilmRecommendationFlow() {
  if (!currentUser) {
    setAuthMode("login");
    openAuthModal();

    showAuthMessage(
      "Connecte-toi ou crée un compte pour suggérer un film à ton cercle.",
      "error"
    );

    return;
  }

  if (!currentFilmMovie) {
    alert("Le film en cours est introuvable.");
    return;
  }

  /*
    Chaque ouverture repart d'un état propre.
    Le film ne sera réellement ajouté au catalogue que si
    une vérification ou un envoi le nécessite.
  */
  recommendationCatalogMovie = null;
  recommendationCatalogMoviePromise = null;

  clearRecommendationMessage();
  clearRecommendationSeenWarning();

  openRecommendationModal();

  await loadRecommendationFriends();
}

/* =====================================================
   ENVOI DES SUGGESTIONS
   ===================================================== */

async function sendFilmRecommendations(event) {
  event.preventDefault();

  if (!currentUser) {
    closeRecommendationModal();

    setAuthMode("login");
    openAuthModal();

    showAuthMessage(
      "Connecte-toi pour envoyer cette suggestion.",
      "error"
    );

    return;
  }

  const recipientIds = getSelectedRecommendationRecipients();

  if (!recipientIds.length) {
    showRecommendationMessage(
      "Choisis au moins une personne de ton cercle.",
      "error"
    );

    return;
  }

  const message = String(
    recommendationMessage?.value || ""
  ).trim();

  if (message.length > 280) {
    showRecommendationMessage(
      "Ton petit mot ne peut pas dépasser 280 caractères.",
      "error"
    );

    return;
  }

  if (sendRecommendationButton) {
    sendRecommendationButton.disabled = true;
    sendRecommendationButton.textContent = "Envoi…";
  }

  clearRecommendationMessage();

  try {
    const catalogMovie = await getRecommendationCatalogMovie();

    const recommendations = recipientIds.map((recipientId) => ({
      sender_id: currentUser.id,
      recipient_id: recipientId,
      movie_id: catalogMovie.id,
      message: message || null
    }));

    const { error } = await supabaseClient
      .from("movie_recommendations")
      .insert(recommendations);

    /*
      Une recommandation identique existe déjà :
      même expéditrice, même destinataire, même film.
    */
    if (error?.code === "23505") {
      throw new Error(
        "Ce film a déjà été suggéré à l’une des personnes sélectionnées."
      );
    }

    if (error) {
      throw error;
    }

    const successMessage =
      recipientIds.length > 1
        ? "Tes suggestions ont été envoyées."
        : "Ta suggestion a été envoyée.";

    showRecommendationMessage(successMessage, "success");

    window.setTimeout(() => {
      closeRecommendationModal();
    }, 950);
  } catch (error) {
    console.error(
      "Erreur lors de l’envoi des recommandations :",
      error
    );

    showRecommendationMessage(
      `Impossible d’envoyer la suggestion : ${error.message}`,
      "error"
    );
  } finally {
    if (sendRecommendationButton) {
      sendRecommendationButton.disabled = false;
      sendRecommendationButton.textContent = "Envoyer la suggestion";
    }
  }
}

/* =====================================================
   ÉVÉNEMENTS
   ===================================================== */

if (recommendationMessage) {
  recommendationMessage.addEventListener(
    "input",
    updateRecommendationCharacterCounter
  );
}

if (recommendationFriends) {
  recommendationFriends.addEventListener("change", (event) => {
    if (
      event.target.matches(
        'input[name="recommendationRecipients"]'
      )
    ) {
      handleRecommendationRecipientChange();
    }
  });
}

if (recommendationForm) {
  recommendationForm.addEventListener(
    "submit",
    sendFilmRecommendations
  );
}

if (closeRecommendationModalButton) {
  closeRecommendationModalButton.addEventListener(
    "click",
    closeRecommendationModal
  );
}

if (cancelRecommendationButton) {
  cancelRecommendationButton.addEventListener(
    "click",
    closeRecommendationModal
  );
}

if (recommendationModal) {
  recommendationModal.addEventListener("click", (event) => {
    if (event.target === recommendationModal) {
      closeRecommendationModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    recommendationModal?.classList.contains("is-open")
  ) {
    closeRecommendationModal();
  }
});

/* =====================================================
   BOUTON INJECTÉ DANS film.js
   ===================================================== */

/*
  Cette fonction est appelée par renderFilmPage() dans film.js,
  après chaque rendu de la fiche. Le bouton étant injecté
  dynamiquement dans filmPageContent, son écouteur doit être
  réattaché après chaque affichage.
*/
function setupFilmRecommendationButton() {
  const recommendationButton = document.getElementById(
    "recommendFilmButton"
  );

  if (!recommendationButton) {
    return;
  }

  recommendationButton.addEventListener(
    "click",
    openFilmRecommendationFlow
  );
}
