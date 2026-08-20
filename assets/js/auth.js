
let currentUser = null;
let currentProfile = null;
let authMode = "login";
let authRequestInProgress = false;

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
    forgotPasswordButton: document.getElementById(
      "forgotPasswordButton"
    ),
    authMessage: document.getElementById("authMessage"),
    userMenu: document.getElementById("userMenu"),
    userGreeting: document.getElementById("userGreeting"),
    navAvatar: document.getElementById("navAvatar"),
    logoutButton: document.getElementById("logoutButton"),
    adminLink: document.getElementById("adminLink")
  };
}

/* =====================================================
   OUTIL — ÉVITE UN BOUTON BLOQUÉ À L’INFINI
   ===================================================== */

function withAuthTimeout(promise, timeoutMs = 12000) {
  let timeoutId = null;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(
        new Error(
          "La connexion prend trop de temps. Vérifie ta connexion internet puis réessaie."
        )
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  });
}

/* =====================================================
   MESSAGES ET VALIDATION
   ===================================================== */

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

/* =====================================================
   MODALE
   ===================================================== */

function setAuthMode(mode) {
  authMode = mode === "signup" ? "signup" : "login";

  const {
    authTitle,
    authSubmitButton,
    authNote,
    usernameField,
    usernameInput,
    authPasswordInput,
    forgotPasswordButton
  } = getAuthElements();

  const isSignup = authMode === "signup";

  document.querySelectorAll(".auth-tab").forEach((tab) => {
    const isActive = tab.dataset.authMode === authMode;

    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });


if (usernameField) {
  usernameField.hidden = !isSignup;

  /*
    Safari ne doit pas pouvoir remplir un champ qui ne fait
    pas partie du parcours actuellement affiché.
  */
  usernameField
    .querySelectorAll("input, select, textarea")
    .forEach((field) => {
      field.disabled = !isSignup;
    });
}



if (usernameInput) {
  usernameInput.required = isSignup;
  usernameInput.disabled = !isSignup;

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

  if (forgotPasswordButton) {
    forgotPasswordButton.hidden = isSignup;
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
  const globalCarnetModal = document.getElementById(
    "globalCarnetModal"
  );

  const authIsOpen = authModal?.classList.contains("visible");

  const reviewIsOpen = reviewModal?.classList.contains("visible");

  const carnetIsOpen = globalCarnetModal?.classList.contains(
    "visible"
  );

  document.body.classList.toggle(
    "modal-open",
    Boolean(authIsOpen || reviewIsOpen || carnetIsOpen)
  );
}

function openAuthModal(mode = "login") {
  const { authModal, authForm } = getAuthElements();

  if (!authModal) {
    return;
  }

  /*
    Une seule modale est active à la fois.
  */
  document
    .querySelectorAll(".modal.visible, .modal-overlay.visible")
    .forEach((modal) => {
      if (modal.id !== "authModal") {
        modal.classList.remove("visible");
        modal.setAttribute("aria-hidden", "true");
      }
    });

  if (authForm) {
    authForm.reset();
  }

  authRequestInProgress = false;

  setAuthMode(mode);

  authModal.removeAttribute("hidden");
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
    authModal.setAttribute("hidden", "");
    authModal.setAttribute("aria-hidden", "true");
  }

  if (authForm) {
    authForm.reset();
  }

  authRequestInProgress = false;

  showAuthMessage("");

  updateModalBodyState();
}

/* =====================================================
   PROFIL ET NAVIGATION
   ===================================================== */

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

/* =====================================================
   CONNEXION / INSCRIPTION
   ===================================================== */

function setupAuth() {
  const {
    authButton,
    closeAuthModal: closeButton,
    authModal,
    authForm,
    authSubmitButton,
    usernameInput,
    forgotPasswordButton,
    logoutButton
  } = getAuthElements();

  authButton?.addEventListener("click", () => {
    openAuthModal("login");
  });

  closeButton?.addEventListener("click", closeAuthModal);

  forgotPasswordButton?.addEventListener("click", () => {
    window.location.href = "reset-password.html";
  });

  authModal?.addEventListener("click", (event) => {
    if (event.target === authModal) {
      closeAuthModal();
    }
  });

  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      if (!authRequestInProgress) {
        setAuthMode(tab.dataset.authMode);
      }
    });
  });

  authForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (authRequestInProgress) {
      return;
    }

    const emailInput = document.getElementById("authEmail");

    const passwordInput = document.getElementById(
      "authPassword"
    );

    /*
      Lecture directe de la valeur au moment du submit :
      compatible avec le remplissage automatique Safari.
    */
    const email = String(emailInput?.value || "")
      .trim()
      .toLowerCase();

    const password = String(passwordInput?.value || "");

    const username = String(usernameInput?.value || "").trim();

    if (!authSubmitButton) {
      return;
    }

    if (!email || !password) {
      showAuthMessage(
        "Renseigne ton adresse e-mail et ton mot de passe.",
        "error"
      );

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

      const passwordSecurityError =
        getPasswordSecurityError(password);

      if (passwordSecurityError) {
        showAuthMessage(passwordSecurityError, "error");

        passwordInput?.focus();
        return;
      }
    }

    authRequestInProgress = true;

    authSubmitButton.disabled = true;
    authSubmitButton.textContent = "Un instant…";

    showAuthMessage("");

    try {
      if (authMode === "signup") {
        const { error } = await withAuthTimeout(
          supabaseClient.auth.signUp({
            email,
            password,
            options: {
              data: {
                username
              },
              emailRedirectTo:
                window.location.origin + window.location.pathname
            }
          })
        );

        if (error) {
          throw error;
        }

        showAuthMessage(
          "Ton compte a été créé. Regarde ta boîte e-mail et confirme ton adresse avant de te connecter.",
          "success"
        );

        authForm.reset();
        setAuthMode("login");

        return;
      }

      const { data, error } = await withAuthTimeout(
        supabaseClient.auth.signInWithPassword({
          email,
          password
        })
      );

      if (error) {
        throw error;
      }

      currentUser =
        data?.session?.user ||
        data?.user ||
        null;

      if (!currentUser) {
        throw new Error(
          "Connexion non finalisée : aucune session n’a été créée."
        );
      }

      /*
        L'interface se ferme avant le chargement du profil :
        la connexion est visuellement immédiate.
      */
      closeAuthModal();

      /*
        Le menu est rendu immédiatement avec le fallback e-mail,
        puis enrichi dès que le profil est chargé.
      */
      updateNavigation();
      emitAuthChanged();

      /*
        Cette requête ne doit jamais maintenir la modale ouverte.
      */
      await loadCurrentProfile();

      emitAuthChanged();
    } catch (error) {
      console.error(
        "Erreur d’authentification :",
        error
      );

      showAuthMessage(
        error?.message ||
          "Une erreur est survenue. Réessaie dans un instant.",
        "error"
      );
    } finally {
      authRequestInProgress = false;

      authSubmitButton.disabled = false;

      authSubmitButton.textContent =
        authMode === "signup"
          ? "Créer mon compte"
          : "Se connecter";
    }
  });

  logoutButton?.addEventListener("click", async () => {
    try {
      const { error } = await withAuthTimeout(
        supabaseClient.auth.signOut()
      );

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

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      authModal?.classList.contains("visible")
    ) {
      closeAuthModal();
    }
  });
}

/* =====================================================
   INITIALISATION SUPABASE
   ===================================================== */

async function initialiseAuth() {
  setupAuth();
  setAuthMode("login");

  try {
    const {
      data: { session }
    } = await withAuthTimeout(
      supabaseClient.auth.getSession(),
      10000
    );

    currentUser = session?.user || null;

    await loadCurrentProfile();

    if (currentUser) {
      closeAuthModal();
    }

    emitAuthChanged();
  } catch (error) {
    console.error(
      "Impossible de restaurer la session Supabase :",
      error
    );

    currentUser = null;
    currentProfile = null;

    updateNavigation();
    emitAuthChanged();
  }

  /*
    Le callback reste volontairement léger.
    Les appels asynchrones sont effectués après sa fin.
  */
  supabaseClient.auth.onAuthStateChange(
    (_event, session) => {
      currentUser = session?.user || null;

      window.setTimeout(async () => {
        try {
          await loadCurrentProfile();

          if (currentUser) {
            closeAuthModal();
          }

          emitAuthChanged();
        } catch (error) {
          console.error(
            "Erreur lors de la mise à jour de session :",
            error
          );

          updateNavigation();
          emitAuthChanged();
        }
      }, 0);
    }
  );
}

initialiseAuth();
