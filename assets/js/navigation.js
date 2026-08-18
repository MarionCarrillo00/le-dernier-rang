
function getCurrentPageName() {
  const fileName = window.location.pathname.split("/").pop();

  return fileName || "index.html";
}

function isCurrentPage(pageName) {
  return getCurrentPageName() === pageName;
}

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

renderNavigation();
