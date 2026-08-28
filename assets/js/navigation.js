
function getCurrentPageName() {
  const fileName = window.location.pathname.split("/").pop();

  return fileName || "index.html";
}

function isCurrentPage(pageName) {
  return getCurrentPageName() === pageName;
}

/* =====================================================
   MODALE COMMUNE — AUTHENTIFICATION
   ===================================================== */

function renderSharedAuthModal() {
  document.querySelector("#authModal")?.remove();

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div
        class="modal"
        id="authModal"
        hidden
        aria-hidden="true"
        role="dialog"
        aria-modal="true"
        aria-labelledby="authTitle"
      >
        <div class="modal-box">
          <div class="modal-head">
            <h3 id="authTitle">Bienvenue</h3>

            <button
              class="close-button"
              id="closeAuthModal"
              type="button"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>

          <div
            class="auth-tabs"
            role="tablist"
            aria-label="Connexion ou création de compte"
          >
            <button
              class="auth-tab active"
              id="loginAuthTab"
              type="button"
              data-auth-mode="login"
              role="tab"
              aria-selected="true"
            >
              Se connecter
            </button>

            <button
              class="auth-tab"
              id="signupAuthTab"
              type="button"
              data-auth-mode="signup"
              role="tab"
              aria-selected="false"
            >
              Créer un compte
            </button>
          </div>

          <div
            class="status-message"
            id="authMessage"
            aria-live="polite"
          ></div>

          <form id="authForm">
            <div
              class="field"
              id="usernameField"
              hidden
              aria-hidden="true"
            >
              <label for="username">Pseudo *</label>

              <input
                id="username"
                name="username"
                type="text"
                minlength="3"
                maxlength="18"
                pattern="[A-Za-zÀ-ÖØ-öø-ÿ0-9_-]{3,18}"
                title="3 à 18 caractères : lettres, chiffres, tirets et underscores uniquement."
                autocomplete="username"
                placeholder="Ex. TotoCinephile"
              />
            </div>

            <div class="field">
              <label for="authEmail">Adresse e-mail *</label>

              <input
                id="authEmail"
                name="email"
                type="email"
                inputmode="email"
                autocapitalize="none"
                autocorrect="off"
                spellcheck="false"
                required
                autocomplete="username"
                placeholder="vous@exemple.fr"
              />
            </div>

            <div class="field">
              <label for="authPassword">Mot de passe *</label>

              <input
                id="authPassword"
                name="password"
                type="password"
                required
                autocomplete="current-password"
                placeholder="Ton mot de passe"
              />
            </div>

            <button
              class="button-primary"
              type="submit"
              id="authSubmitButton"
            >
              Se connecter
            </button>

            <button
              id="forgotPasswordButton"
              class="forgot-password-button"
              type="button"
              hidden
            >
              Mot de passe oublié ?
            </button>

            <p class="form-note" id="authNote">
              Connecte-toi pour publier une note ou une microcritique
              et retrouver tes films.
            </p>
          </form>
        </div>
      </div>
    `
  );
}

/* =====================================================
   MODALE COMMUNE — RECHERCHE CINÉMA
   ===================================================== */

function renderGlobalMovieSearchModal() {
  document.querySelector("#globalMovieSearchModal")?.remove();

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div
        class="modal global-movie-search-modal"
        id="globalMovieSearchModal"
        hidden
        aria-hidden="true"
        role="dialog"
        aria-modal="true"
        aria-labelledby="globalMovieSearchTitle"
      >
        <div class="modal-box global-movie-search-box">
          <div class="modal-head">
            <div>
              <div class="eyebrow red-eyebrow">
                Retrouver un film
              </div>

              <h3 id="globalMovieSearchTitle">
                Quel film cherches-tu ?
              </h3>
            </div>

            <button
              class="close-button"
              id="closeGlobalMovieSearch"
              type="button"
              aria-label="Fermer la recherche"
            >
              ×
            </button>
          </div>

          <div class="global-movie-search-field">
            <span
              class="global-movie-search-icon"
              aria-hidden="true"
            >
              ⌕
            </span>

            <input
              id="globalMovieSearchInput"
              type="search"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="none"
              spellcheck="false"
              placeholder="Un titre, un souvenir de séance…"
              aria-label="Rechercher un film"
            />
          </div>

          <p class="global-movie-search-note">
            Recherche un film, puis choisis de le garder pour plus tard
            ou de l’ajouter à ton carnet.
          </p>

          <div
            id="globalMovieSearchResults"
            class="global-movie-search-results"
            aria-live="polite"
          ></div>
        </div>
      </div>
    `
  );
}

/* =====================================================
   MODALE COMMUNE — AJOUT AU CARNET
   ===================================================== */

function renderGlobalCarnetModal() {
  document.querySelector("#globalCarnetModal")?.remove();

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div
        class="modal global-carnet-modal"
        id="globalCarnetModal"
        hidden
        aria-hidden="true"
        role="dialog"
        aria-modal="true"
        aria-labelledby="globalCarnetTitle"
      >
        <div class="modal-box global-carnet-modal-box">
          <div class="modal-head">
            <div>
              <div class="eyebrow red-eyebrow">
                Une nouvelle séance
              </div>

              <h3 id="globalCarnetTitle">
                Ajouter à mon carnet
              </h3>
            </div>

            <button
              class="close-button"
              id="closeGlobalCarnetModal"
              type="button"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>

          <div
            id="globalCarnetMessage"
            class="status-message"
            aria-live="polite"
          ></div>

          <div
            id="globalCarnetMovie"
            class="global-carnet-movie"
            hidden
          ></div>

          <form id="globalCarnetForm">
            <div class="field">
              <label for="globalCarnetRating">
                Note *
              </label>

              <select id="globalCarnetRating" required>
                <option value="">Choisir une note</option>
                <option value="1">1 / 5</option>
                <option value="1.5">1,5 / 5</option>
                <option value="2">2 / 5</option>
                <option value="2.5">2,5 / 5</option>
                <option value="3">3 / 5</option>
                <option value="3.5">3,5 / 5</option>
                <option value="4">4 / 5</option>
                <option value="4.5">4,5 / 5</option>
                <option value="5">5 / 5</option>
              </select>
            </div>

            <div class="field">
              <label for="globalCarnetContent">
                Quelques mots sur le film
                <span class="optional-label">(facultatif)</span>
              </label>

              <textarea
                id="globalCarnetContent"
                maxlength="140"
                placeholder="Une image, une émotion, une phrase…"
              ></textarea>

              <p
                id="globalCarnetCharacterCounter"
                class="character-counter"
              >
                0 / 140
              </p>
            </div>

            <button
              id="globalCarnetSubmitButton"
              class="button-primary global-carnet-submit"
              type="submit"
            >
              Ajouter à mon carnet
            </button>
          </form>
        </div>
      </div>
    `
  );
}

/* =====================================================
   MODALE COMMUNE — SIGNALER UNE MICROCRITIQUE
   ===================================================== */

function renderReviewReportModal() {
  document.querySelector("#reviewReportModal")?.remove();

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div
        class="modal"
        id="reviewReportModal"
        hidden
        aria-hidden="true"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reviewReportTitle"
      >
        <div class="modal-box review-report-modal-box">
          <div class="modal-head">
            <div>
              <div class="eyebrow red-eyebrow">
                Modération
              </div>

              <h3 id="reviewReportTitle">
                Signaler cette critique
              </h3>
            </div>

            <button
              class="close-button"
              id="closeReviewReportModal"
              type="button"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>

          <p class="review-report-intro">
            Ton signalement sera examiné avec attention par La régie.
            Il reste confidentiel.
          </p>

          <p
            id="reviewReportMovie"
            class="review-report-movie"
          ></p>

          <div
            id="reviewReportMessage"
            class="status-message"
            aria-live="polite"
          ></div>

          <form id="reviewReportForm">
            <input
              id="reviewReportReviewId"
              type="hidden"
            />

            <div class="field">
              <label for="reviewReportReason">
                Quel est le problème ? *
              </label>

              <select id="reviewReportReason" required>
                <option value="">Choisir un motif</option>
                <option value="offensive">
                  Contenu offensant ou discriminatoire
                </option>
                <option value="harassment">
                  Harcèlement ou attaque personnelle
                </option>
                <option value="spam">
                  Spam ou publicité
                </option>
                <option value="spoiler">
                  Spoiler non signalé
                </option>
                <option value="other">
                  Autre problème
                </option>
              </select>
            </div>

            <div class="field">
              <label for="reviewReportDetails">
                Ajouter une précision
                <span class="optional-label">(facultatif)</span>
              </label>

              <textarea
                id="reviewReportDetails"
                maxlength="500"
                placeholder="Quelques mots pour aider La régie à comprendre…"
              ></textarea>

              <p
                id="reviewReportCharacterCounter"
                class="character-counter"
              >
                0 / 500
              </p>
            </div>

            <button
              id="reviewReportSubmitButton"
              class="button-primary"
              type="submit"
            >
              Envoyer le signalement
            </button>
          </form>
        </div>
      </div>
    `
  );
}

/* =====================================================
   NAVIGATION — COMPTEUR MESSAGES NON LUS
   ===================================================== */

function updateUnreadMessagesBadge(unreadCount) {
  const badge = document.getElementById("unreadMessagesBadge");
  const messagesLink = document.getElementById("navMessagesLink");

  if (!badge || !messagesLink) {
    return;
  }

  const safeUnreadCount = Math.max(0, Number(unreadCount) || 0);

  if (safeUnreadCount > 0) {
    badge.hidden = false;
    badge.textContent =
      safeUnreadCount > 9 ? "9+" : String(safeUnreadCount);

    const label = `Mes échanges — ${safeUnreadCount} message${
      safeUnreadCount > 1 ? "s" : ""
    } non lu${safeUnreadCount > 1 ? "s" : ""}`;

    badge.setAttribute("aria-label", label);
    messagesLink.setAttribute("aria-label", label);

    return;
  }

  badge.hidden = true;
  badge.textContent = "0";
  badge.setAttribute("aria-label", "Messages non lus");
  messagesLink.setAttribute("aria-label", "Mes échanges");
}

async function refreshNavigationUnreadMessagesBadge() {
  const isUserConnected =
    typeof currentUser !== "undefined" && currentUser;

  const canUseSupabase =
    typeof supabaseClient !== "undefined" &&
    supabaseClient &&
    typeof supabaseClient.rpc === "function";

  if (!isUserConnected || !canUseSupabase) {
    updateUnreadMessagesBadge(0);
    return;
  }

  try {
    const { data: conversations, error } = await supabaseClient.rpc(
      "get_my_direct_conversations"
    );

    if (error) {
      throw error;
    }

    const unreadCount = (conversations || []).reduce(
      (total, conversation) => {
        const conversationUnreadCount = Math.max(
          0,
          Number(conversation.unread_count) || 0
        );

        return total + conversationUnreadCount;
      },
      0
    );

    updateUnreadMessagesBadge(unreadCount);
  } catch (error) {
    console.error(
      "Impossible de mettre à jour la pastille des messages non lus :",
      error
    );

    updateUnreadMessagesBadge(0);
  }
}

/* =====================================================
   NAVIGATION
   ===================================================== */

function renderNavigation() {
  const siteHeader = document.getElementById("siteHeader");

  if (!siteHeader) {
    return;
  }

  const isProfilePage = isCurrentPage("profil.html");
  const isMessagesPage = isCurrentPage("messages.html");
  const isAdminPage = isCurrentPage("admin.html");

  siteHeader.className = "site-header";

  siteHeader.innerHTML = `
    <nav class="site-navigation" aria-label="Navigation principale">
      <a class="site-logo" href="index.html">
        Ciné Mojito
      </a>

      <div class="site-navigation-actions">
        <button
          id="openGlobalMovieSearch"
          class="site-search-button"
          type="button"
          aria-label="Rechercher un film"
          aria-haspopup="dialog"
          title="Rechercher un film"
        >
          <span
            class="site-search-button-icon"
            aria-hidden="true"
          >
            ⌕
          </span>

          <span class="site-search-button-label">
            Rechercher un film
          </span>
        </button>

        <button
          id="authButton"
          class="button-secondary site-login-button"
          type="button"
        >
          Connexion
        </button>

        <div id="userMenu" class="site-user-menu" hidden>
          <img
            id="navAvatar"
            class="nav-avatar"
            alt=""
            hidden
          />

          <span id="userGreeting"></span>

          <a
            href="profil.html"
            class="${isProfilePage ? "site-nav-current" : ""}"
            ${isProfilePage ? 'aria-current="page"' : ""}
          >
            Mon espace
          </a>

          <a
            href="messages.html"
            id="navMessagesLink"
            class="site-messages-link nav-messages-link ${
              isMessagesPage ? "site-nav-current" : ""
            }"
            aria-label="Mes échanges"
            title="Mes échanges"
            ${isMessagesPage ? 'aria-current="page"' : ""}
          >
            <svg
              class="nav-messages-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M3 5.5h18v13H3z"></path>
              <path d="m3 6 9 7 9-7"></path>
            </svg>

            <span
              id="unreadMessagesBadge"
              class="unread-messages-badge nav-messages-badge"
              aria-label="Messages non lus"
              hidden
            >
              0
            </span>
          </a>

          <a
            id="adminLink"
            href="admin.html"
            class="${isAdminPage ? "site-nav-current" : ""}"
            ${isAdminPage ? 'aria-current="page"' : ""}
            hidden
          >
            La régie
          </a>

          <button
            id="logoutButton"
            class="button-text site-logout-button"
            type="button"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </nav>
  `;

  renderSharedAuthModal();
  renderGlobalMovieSearchModal();
  renderGlobalCarnetModal();
  renderReviewReportModal();

  /*
    L'authentification peut encore être en cours lors du rendu initial.
    Ce petit délai permet à auth.js de terminer le chargement de session.
  */
  window.setTimeout(() => {
    refreshNavigationUnreadMessagesBadge();
  }, 250);
}

/* =====================================================
   ÉVÉNEMENTS GLOBAUX
   ===================================================== */

/*
  Après connexion ou déconnexion, auth.js déclenche déjà cet événement.
  La pastille est donc immédiatement recalculée.
*/
document.addEventListener("authChanged", () => {
  refreshNavigationUnreadMessagesBadge();
});

/*
  Optionnel mais utile si messages.js transmet le total immédiatement
  après qu'une conversation ait été lue.
*/
document.addEventListener("messagesUnreadCountChanged", (event) => {
  updateUnreadMessagesBadge(
    Number(event.detail?.unreadCount || 0)
  );
});

/*
  Vérifie les nouveaux messages toutes les 25 secondes,
  sans lancer de requête lorsque l'onglet est en arrière-plan.
*/
window.setInterval(() => {
  if (!document.hidden) {
    refreshNavigationUnreadMessagesBadge();
  }
}, 25000);

renderNavigation();
