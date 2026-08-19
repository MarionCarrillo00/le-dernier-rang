
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
  /*
    Supprime une éventuelle ancienne version écrite directement
    dans une page HTML, puis injecte l'unique version commune.

    Cette transition permet de tester navigation.js immédiatement,
    avant de retirer progressivement les anciens blocs authModal
    de chaque fichier HTML.
  */
  document.querySelector("#authModal")?.remove();

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div
        class="modal"
        id="authModal"
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
            <div class="field" id="usernameField" hidden>
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
                required
                placeholder="Ex. TotoCinephile"
              />
            </div>

            <div class="field">
              <label for="authEmail">Adresse e-mail *</label>

              <input
                id="authEmail"
                type="email"
                required
                autocomplete="email"
                placeholder="vous@exemple.fr"
              />
            </div>

            <div class="field">
              <label for="authPassword">Mot de passe *</label>

              <input
                id="authPassword"
                type="password"
                required
                minlength="12"
                autocomplete="current-password"
                placeholder="Au moins 12 caractères"
              />
            </div>

            <!--
              Ce bouton sera activé au prochain pas dans auth.js.
              Il est affiché uniquement sur l'onglet Connexion.
            -->
            <button
              id="forgotPasswordButton"
              class="forgot-password-button"
              type="button"
              hidden
            >
              Mot de passe oublié ?
            </button>

            <button
              class="button-primary"
              type="submit"
              id="authSubmitButton"
            >
              Se connecter
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
   NAVIGATION
   ===================================================== */

function renderNavigation() {
  const siteHeader = document.getElementById("siteHeader");

  if (!siteHeader) {
    return;
  }

  const isProfilePage = isCurrentPage("profil.html");
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
}

renderNavigation();
