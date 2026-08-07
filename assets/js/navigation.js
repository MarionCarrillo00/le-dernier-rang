
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

  const isHomePage = isCurrentPage("index.html");
  const isProfilePage = isCurrentPage("profil.html");
  const isAdminPage = isCurrentPage("admin.html");

  /*
    Sur l'accueil :
    - home.js intercepte le clic sur #openModal
    - la modale de publication s'ouvre.

    Sur les autres pages :
    - la modale de publication n'existe pas forcément ;
    - le lien ramène donc proprement vers l'accueil.
  */
  const writeReviewHref = isHomePage ? "#reviewModal" : "index.html";

  siteHeader.className = "site-header";

  siteHeader.innerHTML = `
    <nav class="site-navigation" aria-label="Navigation principale">
      <a class="site-logo" href="index.html">
        Ciné Mojito
      </a>

      <div class="site-navigation-actions">
        <a
          id="openModal"
          class="button-primary site-write-button"
          href="${writeReviewHref}"
        >
          Écrire une critique
        </a>

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
}

renderNavigation();
