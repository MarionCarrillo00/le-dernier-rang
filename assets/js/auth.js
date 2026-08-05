
let currentUser = null;
let currentProfile = null;
let authMode = "login";

function getAuthElements() {
  return {
    authModal: document.getElementById("authModal"),
    authButton: document.getElementById("authButton"),
    closeAuthModal: document.getElementById("closeAuthModal"),
    authForm: document.getElementById("authForm"),
    authTitle: document.getElementById("authTitle"),
    authSubmitButton: document.getElementById("authSubmitButton"),
    authNote: document.getElementById("authNote"),
    usernameField: document.getElementById("usernameField"),
    usernameInput: document.getElementById("username"),
    authMessage: document.getElementById("authMessage"),
    userMenu: document.getElementById("userMenu"),
    userGreeting: document.getElementById("userGreeting"),
    navAvatar: document.getElementById("navAvatar"),
    logoutButton: document.getElementById("logoutButton"),
    adminLink: document.getElementById("adminLink")
  };
}

function showAuthMessage(message, type = "success") {
  const { authMessage } = getAuthElements();

  if (!authMessage) {
    return;
  }

  authMessage.textContent = message;
  authMessage.className = "status-message";

  if (message) {
    authMessage.classList.add("visible", type);
  }
}

/*
  Ferme toute autre modale ouverte avant l'ouverture
  de la modale d'authentification.

  Cela évite qu'un overlay de "Ajouter à mon carnet",
  "Écrire une critique", etc. reste au-dessus et bloque
  les clics de la modale de connexion.
*/
function closeOtherVisibleModals() {
  const { authModal } = getAuthElements();

  document
    .querySelectorAll(
      ".modal.visible, .modal-overlay.visible, [data-modal].visible"
    )
    .forEach((modal) => {
      if (modal === authModal) {
        return;
      }

      modal.classList.remove("visible");
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
    });

  /*
    Événement optionnel : les scripts film.js / home.js
    peuvent l'écouter pour fermer proprement leurs panneaux,
    réinitialiser leur état ou retirer leurs classes.
  */
  document.dispatchEvent(
    new CustomEvent("closeAppModals", {
      detail: {
        except: "authModal"
      }
    })
  );
}

function setAuthMode(mode) {
  authMode = mode === "signup" ? "signup" : "login";

  const {
    authTitle,
    authSubmitButton,
    authNote,
    usernameField,
    usernameInput
  } = getAuthElements();

  const isSignup = authMode === "signup";

  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.classList.toggle(
      "active",
      tab.dataset.authMode === authMode
    );

    tab.setAttribute(
      "aria-selected",
      String(tab.dataset.authMode === authMode)
    );
  });

  if (usernameField) {
    usernameField.hidden = !isSignup;
    usernameField.setAttribute(
      "aria-hidden",
      String(!isSignup)
    );
  }

  if (usernameInput) {
    usernameInput.required = isSignup;

    if (!isSignup) {
      usernameInput.value = "";
    }
  }

  if (authTitle) {
    authTitle.textContent = isSignup
      ? "Créer un compte"
      : "Bienvenue";
  }

  if (authSubmitButton) {
    authSubmitButton.textContent = isSignup
      ? "Créer mon compte"
      : "Se connecter";
  }

  if (authNote) {
    authNote.textContent = isSignup
      ? "Tu recevras un e-mail de confirmation avant de pouvoir te connecter."
      : "Connecte-toi pour publier une note ou une microcritique et retrouver tes films.";
  }

  showAuthMessage("");
}

function openAuthModal(mode = "login") {
  const { authModal, authForm } = getAuthElements();

  if (!authModal) {
    return;
  }

  /*
    Très important : on force le bon affichage avant
    d'afficher la modale. Ainsi, le champ Pseudo est caché
    à chaque ouverture en mode connexion.
  */
  setAuthMode(mode);

  closeOtherVisibleModals();

  if (authForm) {
    authForm.reset();
  }

  authModal.hidden = false;
  authModal.classList.add("visible");
  authModal.setAttribute("aria-hidden", "false");

  document.body.classList.add("modal-open");

  showAuthMessage("");

  window.setTimeout(() => {
    const targetInput = document.getElementById(
      authMode === "signup" ? "username" : "authEmail"
    );

    targetInput?.focus();
  }, 50);
}

function closeAuthModal() {
  const { authModal, authForm } = getAuthElements();

  if (authModal) {
    authModal.classList.remove("visible");
    authModal.hidden = true;
    authModal.setAttribute("aria-hidden", "true");
  }

  if (authForm) {
    authForm.reset();
  }

  document.body.classList.remove("modal-open");

  showAuthMessage("");
}

async function loadCurrentProfile() {
  if (!currentUser) {
    currentProfile = null;
    updateNavigation();
    return;
  }

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, username, bio, avatar_url, is_admin")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    console.error(
      "Erreur de chargement du profil :",
      error.message
    );

    currentProfile = null;
  } else {
    currentProfile = data;
  }

  updateNavigation();
}

function updateNavigation() {
  const {
    authButton,
    userMenu,
    userGreeting,
    adminLink,
    navAvatar
  } = getAuthElements();

  const isLoggedIn = Boolean(currentUser);
  const isAdmin = Boolean(
    currentUser && currentProfile?.is_admin
  );

  if (isLoggedIn) {
    if (authButton) {
      authButton.hidden = true;
      authButton.style.display = "none";
    }

    if (userMenu) {
      userMenu.hidden = false;
      userMenu.style.display = "flex";
    }

    const fallbackUsername =
      currentUser.email?.split("@")[0] || "Membre";

    const username =
      currentProfile?.username || fallbackUsername;

    if (userGreeting) {
      userGreeting.textContent = `Bonjour, ${username}`;
    }

    if (adminLink) {
      adminLink.hidden = !isAdmin;
    }

    const avatarUrl = currentProfile?.avatar_url;

    if (navAvatar) {
      if (avatarUrl) {
        navAvatar.src = `${avatarUrl}?v=${Date.now()}`;
        navAvatar.alt = `Photo de profil de ${username}`;
        navAvatar.hidden = false;
      } else {
        navAvatar.hidden = true;
        navAvatar.removeAttribute("src");
        navAvatar.alt = "";
      }
    }

    return;
  }

  if (authButton) {
    authButton.hidden = false;
    authButton.style.display = "inline-block";
  }

  if (userMenu) {
    userMenu.hidden = true;
    userMenu.style.display = "none";
  }

  if (userGreeting) {
    userGreeting.textContent = "";
  }

  if (adminLink) {
    adminLink.hidden = true;
  }

  if (navAvatar) {
    navAvatar.hidden = true;
    navAvatar.removeAttribute("src");
    navAvatar.alt = "";
  }
}

function emitAuthChanged() {
  document.dispatchEvent(
    new CustomEvent("authChanged", {
      detail: {
        user: currentUser,
        profile: currentProfile
      }
    })
  );
}

function setupAuth() {
  const {
    authButton,
    closeAuthModal: closeButton,
    authModal,
    authForm,
    authSubmitButton,
    usernameInput,
    logoutButton
  } = getAuthElements();

  if (authButton) {
    authButton.addEventListener("click", () => {
      openAuthModal("login");
    });
  }

  if (closeButton) {
    closeButton.addEventListener("click", closeAuthModal);
  }

  if (authModal) {
    authModal.addEventListener("click", (event) => {
      if (event.target === authModal) {
        closeAuthModal();
      }
    });
  }

  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      setAuthMode(tab.dataset.authMode);
    });
  });

  if (authForm) {
    authForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const emailInput = document.getElementById("authEmail");
      const passwordInput = document.getElementById("authPassword");

      const email = emailInput?.value.trim() || "";
      const password = passwordInput?.value || "";
      const username = usernameInput?.value.trim() || "";

      if (!authSubmitButton) {
        return;
      }

      if (authMode === "signup" && !username) {
        showAuthMessage(
          "Choisis un pseudo pour créer ton compte.",
          "error"
        );

        usernameInput?.focus();
        return;
      }

      authSubmitButton.disabled = true;
      authSubmitButton.textContent = "Un instant…";

      try {
        if (authMode === "signup") {
          const { error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
              data: {
                username
              },
              emailRedirectTo:
                window.location.origin + window.location.pathname
            }
          });

          if (error) {
            throw error;
          }

          showAuthMessage(
            "Ton compte a été créé. Regarde ta boîte e-mail et confirme ton adresse avant de te connecter.",
            "success"
          );

          authForm.reset();
          setAuthMode("login");
        } else {
          const { error } =
            await supabaseClient.auth.signInWithPassword({
              email,
              password
            });

          if (error) {
            throw error;
          }

          closeAuthModal();
        }
      } catch (error) {
        console.error(
          "Erreur d’authentification :",
          error
        );

        showAuthMessage(
          error.message ||
            "Une erreur est survenue. Réessaie dans un instant.",
          "error"
        );
      } finally {
        authSubmitButton.disabled = false;
        authSubmitButton.textContent =
          authMode === "signup"
            ? "Créer mon compte"
            : "Se connecter";
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      try {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
          throw error;
        }

        currentUser = null;
        currentProfile = null;

        updateNavigation();
        emitAuthChanged();

        if (window.location.pathname.endsWith("profil.html")) {
          window.location.href = "index.html";
        }
      } catch (error) {
        console.error(
          "Erreur de déconnexion :",
          error
        );

        alert(
          "La déconnexion n'a pas pu être effectuée. Réessaie."
        );
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      authModal?.classList.contains("visible")
    ) {
      closeAuthModal();
    }
  });
}

async function initialiseAuth() {
  setupAuth();

  /*
    État initial cohérent, même si un autre script ouvre
    directement la modale plus tard.
  */
  setAuthMode("login");

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  currentUser = session?.user || null;

  await loadCurrentProfile();
  emitAuthChanged();

  supabaseClient.auth.onAuthStateChange(
    async (_event, session) => {
      currentUser = session?.user || null;

      await loadCurrentProfile();
      emitAuthChanged();
    }
  );
}

initialiseAuth();
