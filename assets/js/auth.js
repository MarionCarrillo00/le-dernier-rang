
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
    logoutButton: document.getElementById("logoutButton")
  };
}

function showAuthMessage(message, type = "success") {
  const { authMessage } = getAuthElements();

  authMessage.textContent = message;
  authMessage.className = "status-message";

  if (message) {
    authMessage.classList.add("visible", type);
  }
}

function setAuthMode(mode) {
  authMode = mode;

  const {
    authTitle,
    authSubmitButton,
    authNote,
    usernameField,
    usernameInput
  } = getAuthElements();

  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.authMode === mode);
  });

  const isSignup = mode === "signup";

  usernameField.hidden = !isSignup;
  usernameInput.required = isSignup;

  authTitle.textContent = isSignup
    ? "Créer un compte"
    : "Bienvenue";

  authSubmitButton.textContent = isSignup
    ? "Créer mon compte"
    : "Se connecter";

  authNote.textContent = isSignup
    ? "Tu recevras un e-mail de confirmation avant de pouvoir te connecter."
    : "Connecte-toi pour publier une microcritique et retrouver tes films.";

  showAuthMessage("");
}

function openAuthModal() {
  const { authModal } = getAuthElements();

  authModal.classList.add("visible");
  showAuthMessage("");
}

function closeAuthModal() {
  const { authModal, authForm } = getAuthElements();

  authModal.classList.remove("visible");
  authForm.reset();
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
    .select("username, bio, avatar_url")
    .eq("id", currentUser.id)
    .single();

  if (!error) {
    currentProfile = data;
  }

  updateNavigation();
}

function updateNavigation() {
  const {
    authButton,
    userMenu,
    userGreeting
  } = getAuthElements();

  if (currentUser) {
    authButton.hidden = true;
    userMenu.hidden = false;

    const fallbackUsername = currentUser.email.split("@")[0];
    const username = currentProfile?.username || fallbackUsername;

    userGreeting.textContent = `Bonjour, ${username}`;
  } else {
    authButton.hidden = false;
    userMenu.hidden = true;
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

  authButton.addEventListener("click", () => {
    setAuthMode("login");
    openAuthModal();
  });

  closeButton.addEventListener("click", closeAuthModal);

  authModal.addEventListener("click", (event) => {
    if (event.target === authModal) {
      closeAuthModal();
    }
  });

  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      setAuthMode(tab.dataset.authMode);
    });
  });

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const username = usernameInput.value.trim();

    authSubmitButton.disabled = true;
    authSubmitButton.textContent = "Un instant…";

    try {
      if (authMode === "signup") {
        const { error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username
            },
            emailRedirectTo:
              window.location.origin + window.location.pathname
          }
        });

        if (error) throw error;

        showAuthMessage(
          "Ton compte a été créé. Regarde ta boîte e-mail et confirme ton adresse avant de te connecter.",
          "success"
        );

        authForm.reset();
      } else {
        const { error } =
          await supabaseClient.auth.signInWithPassword({
            email,
            password
          });

        if (error) throw error;

        closeAuthModal();
      }
    } catch (error) {
      showAuthMessage(error.message, "error");
    } finally {
      authSubmitButton.disabled = false;

      authSubmitButton.textContent =
        authMode === "signup"
          ? "Créer mon compte"
          : "Se connecter";
    }
  });

  logoutButton.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();

    if (window.location.pathname.endsWith("profil.html")) {
      window.location.href = "index.html";
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAuthModal();
    }
  });
}

async function initialiseAuth() {
  setupAuth();

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  currentUser = session?.user || null;

  await loadCurrentProfile();
  emitAuthChanged();

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;

    await loadCurrentProfile();
    emitAuthChanged();
  });
}

initialiseAuth();
