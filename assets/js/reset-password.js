
/* =====================================================
   CINÉ MOJITO — RÉINITIALISATION DE MOT DE PASSE
   ===================================================== */

const requestPasswordResetForm = document.getElementById(
  "requestPasswordResetForm"
);

const updatePasswordForm = document.getElementById(
  "updatePasswordForm"
);

const passwordResetEmail = document.getElementById(
  "passwordResetEmail"
);

const requestPasswordResetButton = document.getElementById(
  "requestPasswordResetButton"
);

const newPassword = document.getElementById("newPassword");

const confirmNewPassword = document.getElementById(
  "confirmNewPassword"
);

const updatePasswordButton = document.getElementById(
  "updatePasswordButton"
);

const passwordResetMessage = document.getElementById(
  "passwordResetMessage"
);

let isPasswordRecoveryFlow = false;

/* =====================================================
   OUTILS D’AFFICHAGE
   ===================================================== */

function showPasswordResetMessage(message, type = "") {
  if (!passwordResetMessage) {
    return;
  }

  passwordResetMessage.textContent = message;
  passwordResetMessage.className = "status-message";

  if (message) {
    passwordResetMessage.classList.add("visible", type);
  }
}

function clearPasswordResetMessage() {
  if (!passwordResetMessage) {
    return;
  }

  passwordResetMessage.textContent = "";
  passwordResetMessage.className = "status-message";
}

function showRequestPasswordResetForm() {
  isPasswordRecoveryFlow = false;

  if (requestPasswordResetForm) {
    requestPasswordResetForm.hidden = false;
  }

  if (updatePasswordForm) {
    updatePasswordForm.hidden = true;
  }

  document.title = "Réinitialiser mon mot de passe — Ciné Mojito";

  const title = document.getElementById("passwordPageTitle");

  if (title) {
    title.textContent = "Retrouver ton accès";
  }
}

function showUpdatePasswordForm() {
  isPasswordRecoveryFlow = true;

  if (requestPasswordResetForm) {
    requestPasswordResetForm.hidden = true;
  }

  if (updatePasswordForm) {
    updatePasswordForm.hidden = false;
  }

  document.title = "Choisir un nouveau mot de passe — Ciné Mojito";

  const title = document.getElementById("passwordPageTitle");

  if (title) {
    title.textContent = "Choisir un nouveau mot de passe";
  }

  window.setTimeout(() => {
    newPassword?.focus();
  }, 50);
}

/* =====================================================
   SÉCURITÉ — MOT DE PASSE
   ===================================================== */

function getResetPasswordSecurityError(password) {
  /*
    Réutilise la règle déjà présente dans auth.js lorsque
    cette fonction est disponible sur la page.
  */
  if (typeof getPasswordSecurityError === "function") {
    return getPasswordSecurityError(password);
  }

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
   DEMANDE DU LIEN PAR E-MAIL
   ===================================================== */

async function requestPasswordReset(event) {
  event.preventDefault();

  const email = String(passwordResetEmail?.value || "")
    .trim()
    .toLowerCase();

  if (!email) {
    showPasswordResetMessage(
      "Indique ton adresse e-mail.",
      "error"
    );

    passwordResetEmail?.focus();
    return;
  }

  if (requestPasswordResetButton) {
    requestPasswordResetButton.disabled = true;
    requestPasswordResetButton.textContent = "Envoi en cours…";
  }

  clearPasswordResetMessage();

  try {
    const redirectTo = new URL(
      "reset-password.html",
      window.location.href
    ).href;

    const { error } =
      await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo
      });

    if (error) {
      throw error;
    }

    /*
      Message volontairement générique :
      ne jamais révéler si une adresse possède un compte.
    */
    showPasswordResetMessage(
      "Si cette adresse correspond à un compte, un lien de réinitialisation vient de lui être envoyé. Pense à vérifier tes courriers indésirables.",
      "success"
    );

    requestPasswordResetForm?.reset();
  } catch (error) {
    console.error(
      "Erreur lors de la demande de réinitialisation :",
      error
    );

    /*
      On conserve une formulation neutre même en cas de problème,
      afin de ne pas révéler l’existence éventuelle d’un compte.
    */
    showPasswordResetMessage(
      "Si cette adresse correspond à un compte, un lien de réinitialisation vient de lui être envoyé. Pense à vérifier tes courriers indésirables.",
      "success"
    );
  } finally {
    if (requestPasswordResetButton) {
      requestPasswordResetButton.disabled = false;
      requestPasswordResetButton.textContent =
        "Envoyer le lien de réinitialisation";
    }
  }
}

/* =====================================================
   ENREGISTREMENT DU NOUVEAU MOT DE PASSE
   ===================================================== */

async function updateRecoveredPassword(event) {
  event.preventDefault();

  if (!isPasswordRecoveryFlow) {
    showPasswordResetMessage(
      "Ce lien de réinitialisation n’est plus valide. Demande un nouveau lien.",
      "error"
    );

    showRequestPasswordResetForm();
    return;
  }

  const password = newPassword?.value || "";
  const confirmation = confirmNewPassword?.value || "";

  const passwordSecurityError =
    getResetPasswordSecurityError(password);

  if (passwordSecurityError) {
    showPasswordResetMessage(passwordSecurityError, "error");

    newPassword?.focus();
    return;
  }

  if (password !== confirmation) {
    showPasswordResetMessage(
      "Les deux mots de passe ne sont pas identiques.",
      "error"
    );

    confirmNewPassword?.focus();
    return;
  }

  if (updatePasswordButton) {
    updatePasswordButton.disabled = true;
    updatePasswordButton.textContent = "Enregistrement…";
  }

  clearPasswordResetMessage();

  try {
    const { error } = await supabaseClient.auth.updateUser({
      password
    });

    if (error) {
      throw error;
    }

    updatePasswordForm?.reset();

    showPasswordResetMessage(
      "Ton mot de passe a été mis à jour. Tu peux maintenant retrouver ton carnet.",
      "success"
    );

    window.setTimeout(() => {
      window.location.href = "index.html";
    }, 1800);
  } catch (error) {
    console.error(
      "Erreur lors de la mise à jour du mot de passe :",
      error
    );

    showPasswordResetMessage(
      "Ce lien est peut-être expiré ou déjà utilisé. Demande un nouveau lien de réinitialisation.",
      "error"
    );
  } finally {
    if (updatePasswordButton) {
      updatePasswordButton.disabled = false;
      updatePasswordButton.textContent =
        "Enregistrer mon nouveau mot de passe";
    }
  }
}

/* =====================================================
   DÉTECTION DU LIEN SUPABASE
   ===================================================== */

function isRecoveryUrl() {
  const hashParameters = new URLSearchParams(
    window.location.hash.replace(/^#/, "")
  );

  const searchParameters = new URLSearchParams(
    window.location.search
  );

  return (
    hashParameters.get("type") === "recovery" ||
    searchParameters.get("type") === "recovery"
  );
}

function setupPasswordRecoveryListener() {
  /*
    Le lien envoyé par Supabase déclenche cet événement
    et crée une session temporaire de récupération.
  */
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      clearPasswordResetMessage();
      showUpdatePasswordForm();
    }
  });
}

/* =====================================================
   INITIALISATION
   ===================================================== */

function initialiseResetPasswordPage() {
  setupPasswordRecoveryListener();

  if (isRecoveryUrl()) {
    /*
      Sur certains navigateurs, l’événement Supabase peut arriver
      avant l’écouteur. L’URL recovery garantit alors l’affichage
      du formulaire de nouveau mot de passe.
    */
    showUpdatePasswordForm();
  } else {
    showRequestPasswordResetForm();
  }

  requestPasswordResetForm?.addEventListener(
    "submit",
    requestPasswordReset
  );

  updatePasswordForm?.addEventListener(
    "submit",
    updateRecoveredPassword
  );
}

initialiseResetPasswordPage();
