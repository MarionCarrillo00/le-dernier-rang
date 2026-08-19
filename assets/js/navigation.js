
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
  renderGlobalCarnetModal();
}

renderNavigation();
