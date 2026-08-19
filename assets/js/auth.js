
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
    authPasswordInput: document.getElementById("authPassword"),
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


function getUsernameSecurityError(username) {
  const isValidUsername =
    /^[A-Za-zÀ-ÖØ-öø-ÿ0-9_-]{3,18}$/u.test(username);

  if (!isValidUsername) {
    return (
      "Ton pseudo doit contenir entre 3 et 18 caractères : " +
      "lettres, chiffres, tirets et underscores uniquement."
    );
  }

  return "";
}


function getPasswordSecurityError(password) {
  if (password.length < 12) {
    return "Ton mot de passe doit contenir au moins 12 caractères.";
  }

  if (!/[a-z]/.test(password)) {
    return "Ton mot de passe doit contenir au moins une minuscule.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Ton mot de passe doit contenir au moins une majuscule.";
  }

  if (!/\d/.test(password)) {
    return "Ton mot de passe doit contenir au moins un chiffre.";
  }

  if (!/[^A-Za-z0-9\s]/.test(password)) {
    return "Ton mot de passe doit contenir au moins un symbole.";
  }

  return "";
}


function setAuthMode(mode) {
  authMode = mode === "signup" ? "signup" : "login";


const {
  authTitle,
  authSubmitButton,
  authNote,
  usernameField,
  usernameInput,
  authPasswordInput
} = getAuthElements();


  const isSignup = authMode === "signup";

  document.querySelectorAll(".auth-tab").forEach((tab) => {
    const isActive = tab.dataset.authMode === authMode;

    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  if (usernameField) {
    usernameField.hidden = !isSignup;
  }

  if (usernameInput) {
    usernameInput.required = isSignup;

    if (!isSignup) {
      usernameInput.value = "";
    }
  }

if (authPasswordInput) {
  authPasswordInput.minLength = isSignup ? 12 : 0;

  authPasswordInput.autocomplete = isSignup
    ? "new-password"
    : "current-password";

  authPasswordInput.placeholder = isSignup
    ? "12 caractères minimum"
    : "Ton mot de passe";
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

function updateModalBodyState() {
  const authModal = document.getElementById("authModal");
  const reviewModal = document.getElementById("reviewModal");

  const authIsOpen = authModal?.classList.contains("visible");
  const reviewIsOpen = reviewModal?.classList.contains("visible");

  document.body.classList.toggle(
    "modal-open",
    Boolean(authIsOpen || reviewIsOpen)
  );
}

function openAuthModal(mode = "login") {
  const { authModal, authForm } = getAuthElements();
  const reviewModal = document.getElementById("reviewModal");

  if (!authModal) {
    return;
  }

  /*
    Une seule modale doit être ouverte à la fois.
    Si la fenêtre « Ajouter à mon carnet » est ouverte,
    elle est fermée avant l'affichage de l'authentification.
  */
  if (reviewModal) {
    reviewModal.classList.remove("visible");
  }

  if (authForm) {
    authForm.reset();
  }

  setAuthMode(mode);

  authModal.classList.add("visible");
  authModal.setAttribute("aria-hidden", "false");

  updateModalBodyState();

  window.setTimeout(() => {
    const inputId =
      authMode === "signup"
        ? "username"
        : "authEmail";

    document.getElementById(inputId)?.focus();
  }, 50);
}

function closeAuthModal() {
  const { authModal, authForm } = getAuthElements();

  if (authModal) {
    authModal.classList.remove("visible");
    authModal.setAttribute("aria-hidden", "true");
  }

  if (authForm) {
    authForm.reset();
  }

  showAuthMessage("");

  updateModalBodyState();
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

if (authMode === "signup") {
  const usernameSecurityError =
    getUsernameSecurityError(username);

  if (usernameSecurityError) {
    showAuthMessage(usernameSecurityError, "error");

    usernameInput?.focus();
    return;
  }
}

if (authMode === "signup") {
  const passwordSecurityError = getPasswordSecurityError(password);

  if (passwordSecurityError) {
    showAuthMessage(passwordSecurityError, "error");

    passwordInput?.focus();
    return;
  }
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
  setAuthMode("login");

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  currentUser = session?.user || null;

  await loadCurrentProfile();

  /*
    Si Supabase restaure une session existante,
    une ancienne modale de connexion ne doit jamais
    rester affichée.
  */
  if (currentUser) {
    closeAuthModal();
  }

  emitAuthChanged();

  supabaseClient.auth.onAuthStateChange(
    async (_event, session) => {
      currentUser = session?.user || null;

      await loadCurrentProfile();

      if (currentUser) {
        closeAuthModal();
      }

      emitAuthChanged();
    }
  );
}

initialiseAuth();
