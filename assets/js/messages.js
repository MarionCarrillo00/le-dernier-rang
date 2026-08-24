
const messagesPageContent = document.getElementById(
  "messagesPageContent"
);

const MESSAGES_REFRESH_INTERVAL = 25000;

let messagesInitialised = false;
let messagesRefreshIntervalId = null;

let directConversations = [];
let activeConversationId = null;
let activeFriendId = null;
let activeMessages = [];

/* =====================================================
   UTILITAIRES
   ===================================================== */

function getConversationFriendIdFromUrl() {
  const params = new URLSearchParams(window.location.search);

  return params.get("with");
}

function formatMessageDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  const differenceInSeconds = Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / 1000)
  );

  if (differenceInSeconds < 60) {
    return "À l’instant";
  }

  const differenceInMinutes = Math.floor(
    differenceInSeconds / 60
  );

  if (differenceInMinutes < 60) {
    return `Il y a ${differenceInMinutes} min`;
  }

  const differenceInHours = Math.floor(
    differenceInMinutes / 60
  );

  if (differenceInHours < 24) {
    return `Il y a ${differenceInHours} h`;
  }

  const differenceInDays = Math.floor(
    differenceInHours / 24
  );

  if (differenceInDays === 1) {
    return "Hier";
  }

  if (differenceInDays <= 6) {
    return `Il y a ${differenceInDays} jours`;
  }

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function formatConversationPreview(message) {
  const text = String(message || "").trim();

  if (!text) {
    return "Quelques mots entre deux séances.";
  }

  if (text.length <= 74) {
    return text;
  }

  return `${text.slice(0, 74).trim()}…`;
}

function getProfileInitial(username) {
  return String(username || "Membre")
    .trim()
    .charAt(0)
    .toUpperCase() || "?";
}

function renderMessagesError(message) {
  if (!messagesPageContent) {
    return;
  }

  messagesPageContent.innerHTML = `
    <section class="messages-error">
      <div class="eyebrow red-eyebrow">
        Mes échanges
      </div>

      <h1>Impossible d’ouvrir les échanges.</h1>

      <p>${escapeHTML(message)}</p>

      <a class="button-primary" href="profil.html">
        Retourner à mon espace
      </a>
    </section>
  `;
}

function renderMessagesLoginState() {
  if (!messagesPageContent) {
    return;
  }

  messagesPageContent.innerHTML = `
    <section class="messages-login-state">
      <div class="eyebrow red-eyebrow">
        Mes échanges
      </div>

      <h1>Quelques mots entre deux séances.</h1>

      <p>
        Connecte-toi pour retrouver les films, les phrases et les discussions
        de ton cercle.
      </p>

      <button
        id="openMessagesLoginButton"
        class="button-primary"
        type="button"
      >
        Se connecter
      </button>
    </section>
  `;

  document
    .getElementById("openMessagesLoginButton")
    ?.addEventListener("click", () => {
      setAuthMode("login");
      openAuthModal();

      showAuthMessage(
        "Connecte-toi pour retrouver tes échanges.",
        "error"
      );
    });
}

/* =====================================================
   SUPABASE — LECTURE
   ===================================================== */

async function getMyDirectConversations() {
  const { data, error } = await supabaseClient.rpc(
    "get_my_direct_conversations"
  );

  if (error) {
    throw error;
  }

  return data || [];
}

async function getConversationMessages(conversationId) {
  if (!conversationId) {
    return [];
  }

  const { data: messages, error } = await supabaseClient
    .from("messages")
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      created_at,
      edited_at,
      deleted_at
    `)
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", {
      ascending: true
    });

  if (error) {
    throw error;
  }

  const profilesById = await getProfilesByUserIds(
    (messages || []).map((message) => message.sender_id)
  );

  return (messages || []).map((message) => ({
    ...message,
    author: profilesById[message.sender_id] || {
      username: "Membre",
      avatar_url: ""
    }
  }));
}

async function getOrCreateConversation(friendId) {
  const { data, error } = await supabaseClient.rpc(
    "get_or_create_direct_conversation",
    {
      p_friend_id: friendId
    }
  );

  if (error) {
    throw error;
  }

  return data;
}

async function markConversationAsRead(conversationId) {
  const { error } = await supabaseClient.rpc(
    "mark_conversation_as_read",
    {
      p_conversation_id: conversationId
    }
  );

  if (error) {
    throw error;
  }
}

async function sendMessage(conversationId, content) {
  const cleanContent = String(content || "").trim();

  if (!cleanContent) {
    throw new Error("Écris quelques mots avant d’envoyer.");
  }

  if (cleanContent.length > 1000) {
    throw new Error(
      "Un message ne peut pas dépasser 1 000 caractères."
    );
  }

  const { error } = await supabaseClient
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: currentUser.id,
      content: cleanContent
    });

  if (error) {
    throw error;
  }
}

/* =====================================================
   RENDU — AVATARS
   ===================================================== */

function renderConversationAvatar(conversation) {
  const username = conversation.friend_username || "Membre";
  const avatarUrl = conversation.friend_avatar_url || "";

  if (avatarUrl) {
    return `
      <img
        class="messages-avatar"
        src="${escapeHTML(avatarUrl)}"
        alt="Photo de profil de ${escapeHTML(username)}"
        loading="lazy"
      />
    `;
  }

  return `
    <span
      class="messages-avatar messages-avatar-placeholder"
      aria-hidden="true"
    >
      ${escapeHTML(getProfileInitial(username))}
    </span>
  `;
}

function renderMessageAvatar(message) {
  const username = message.author?.username || "Membre";
  const avatarUrl = message.author?.avatar_url || "";

  if (avatarUrl) {
    return `
      <img
        class="message-avatar"
        src="${escapeHTML(avatarUrl)}"
        alt="Photo de profil de ${escapeHTML(username)}"
        loading="lazy"
      />
    `;
  }

  return `
    <span
      class="message-avatar message-avatar-placeholder"
      aria-hidden="true"
    >
      ${escapeHTML(getProfileInitial(username))}
    </span>
  `;
}

/* =====================================================
   RENDU — LISTE DES CONVERSATIONS
   ===================================================== */

function renderConversationListItem(conversation) {
  const isActive =
    String(conversation.conversation_id) ===
    String(activeConversationId);

  const username = conversation.friend_username || "Membre";
  const unreadCount = Number(conversation.unread_count || 0);

  return `
    <button
      class="messages-conversation-item ${
        isActive ? "is-active" : ""
      }"
      type="button"
      data-conversation-id="${conversation.conversation_id}"
      data-friend-id="${conversation.friend_id}"
      aria-current="${isActive ? "true" : "false"}"
    >
      ${renderConversationAvatar(conversation)}

      <span class="messages-conversation-copy">
        <strong>${escapeHTML(username)}</strong>

        <small>
          ${escapeHTML(
            formatConversationPreview(
              conversation.last_message_content
            )
          )}
        </small>
      </span>

      <span class="messages-conversation-side">
        ${
          conversation.last_message_created_at
            ? `
              <time>
                ${escapeHTML(
                  formatMessageDate(
                    conversation.last_message_created_at
                  )
                )}
              </time>
            `
            : ""
        }

        ${
          unreadCount > 0
            ? `
              <span
                class="messages-unread-count"
                aria-label="${unreadCount} message${
                  unreadCount > 1 ? "s" : ""
                } non lu${unreadCount > 1 ? "s" : ""}"
              >
                ${unreadCount > 99 ? "99+" : unreadCount}
              </span>
            `
            : ""
        }
      </span>
    </button>
  `;
}

function renderConversationsPanel() {
  if (!directConversations.length) {
    return `
      <aside class="messages-conversations-panel">
        <div class="messages-panel-heading">
          <div class="eyebrow red-eyebrow">
            Mes échanges
          </div>

          <h1>Quelques mots<br />entre deux séances.</h1>
        </div>

        <div class="messages-conversations-empty">
          <strong>Ton cercle n’a pas encore de conversation ouverte.</strong>

          <p>
            Depuis le profil d’un ami, choisis
            <em>Échanger autour du cinéma</em>.
          </p>
        </div>
      </aside>
    `;
  }

  return `
    <aside class="messages-conversations-panel">
      <div class="messages-panel-heading">
        <div class="eyebrow red-eyebrow">
          Mes échanges
        </div>

        <h1>Quelques mots<br />entre deux séances.</h1>
      </div>

      <div
        class="messages-conversations-list"
        aria-label="Mes conversations"
      >
        ${directConversations
          .map(renderConversationListItem)
          .join("")}
      </div>
    </aside>
  `;
}

/* =====================================================
   RENDU — DISCUSSION ACTIVE
   ===================================================== */

function getActiveConversation() {
  return directConversations.find(
    (conversation) =>
      String(conversation.conversation_id) ===
      String(activeConversationId)
  );
}

function renderMessage(message) {
  const isMine =
    String(message.sender_id) === String(currentUser?.id);

  const username = message.author?.username || "Membre";
  const dateLabel = formatMessageDate(message.created_at);

  return `
    <article class="message-item ${isMine ? "is-mine" : ""}">
      ${
        !isMine
          ? `
            <a
              class="message-avatar-link"
              href="membre.html?id=${encodeURIComponent(
                message.sender_id
              )}"
              title="Voir le profil de ${escapeHTML(username)}"
            >
              ${renderMessageAvatar(message)}
            </a>
          `
          : ""
      }

      <div class="message-bubble-wrap">
        ${
          !isMine
            ? `
              <span class="message-author">
                ${escapeHTML(username)}
              </span>
            `
            : ""
        }

        <p class="message-bubble">
          ${escapeHTML(message.content)}
        </p>

        <time
          class="message-date"
          datetime="${escapeHTML(message.created_at)}"
        >
          ${escapeHTML(dateLabel)}
        </time>
      </div>
    </article>
  `;
}

function renderMessagesThread() {
  const activeConversation = getActiveConversation();

  if (!activeConversation) {
    return `
      <section class="messages-thread messages-thread-empty">
        <div>
          <div class="eyebrow red-eyebrow">
            Une conversation
          </div>

          <h2>Vos films ont peut-être déjà une histoire à se raconter.</h2>

          <p>
            Ouvre le profil d’un ami pour commencer à échanger autour
            du cinéma.
          </p>
        </div>
      </section>
    `;
  }

  const username = activeConversation.friend_username || "Membre";

  return `
    <section class="messages-thread">
      <header class="messages-thread-header">
        <a
          class="messages-thread-profile"
          href="membre.html?id=${encodeURIComponent(
            activeConversation.friend_id
          )}"
        >
          ${renderConversationAvatar(activeConversation)}

          <span>
            <strong>${escapeHTML(username)}</strong>
            <small>Échanger autour du cinéma</small>
          </span>
        </a>

        <button
          id="refreshMessagesButton"
          class="messages-refresh-button"
          type="button"
        >
          Actualiser
        </button>
      </header>

      <div
        id="messagesThreadList"
        class="messages-thread-list"
        aria-live="polite"
      >
        ${
          activeMessages.length
            ? activeMessages.map(renderMessage).join("")
            : `
              <div class="messages-thread-empty-state">
                <strong>La conversation attend son premier mot.</strong>

                <p>
                  Un film, une image, une phrase… tout peut commencer ici.
                </p>
              </div>
            `
        }
      </div>

      <form
        id="messageForm"
        class="message-form"
      >
        <textarea
          id="messageInput"
          maxlength="1000"
          required
          placeholder="Écrire à ${escapeHTML(username)}…"
          aria-label="Écrire à ${escapeHTML(username)}"
        ></textarea>

        <div class="message-form-bottom">
          <span
            id="messageCharacterCounter"
            class="message-character-counter"
          >
            0 / 1000
          </span>

          <button
            id="messageSubmitButton"
            class="button-primary"
            type="submit"
          >
            Envoyer
          </button>
        </div>
      </form>
    </section>
  `;
}

function renderMessagesPage() {
  if (!messagesPageContent) {
    return;
  }

  messagesPageContent.innerHTML = `
    <div class="messages-layout">
      ${renderConversationsPanel()}
      ${renderMessagesThread()}
    </div>
  `;

  setupMessagesPageInteractions();
  scrollMessagesThreadToBottom();
}

/* =====================================================
   RAFRAÎCHISSEMENT ET OUVERTURE
   ===================================================== */

async function loadActiveConversationMessages() {
  if (!activeConversationId) {
    activeMessages = [];
    return;
  }

  activeMessages = await getConversationMessages(
    activeConversationId
  );

  await markConversationAsRead(activeConversationId);
}

async function openConversation(conversationId, friendId) {
  if (!conversationId || !friendId) {
    return;
  }

  activeConversationId = conversationId;
  activeFriendId = friendId;

  const url = new URL(window.location.href);

  url.searchParams.set("with", friendId);

  window.history.replaceState(
    {},
    "",
    `${url.pathname}${url.search}`
  );

  await loadActiveConversationMessages();
  renderMessagesPage();
}

async function openConversationFromFriendId(friendId) {
  if (!friendId) {
    return;
  }

  const conversationId = await getOrCreateConversation(friendId);

  directConversations = await getMyDirectConversations();

  activeConversationId = conversationId;
  activeFriendId = friendId;

  await loadActiveConversationMessages();
  renderMessagesPage();
}

async function refreshMessagesPage({ preserveScroll = false } = {}) {
  if (!currentUser) {
    renderMessagesLoginState();
    return;
  }

  const previousScrollPosition =
    document.getElementById("messagesThreadList")?.scrollTop || 0;

  directConversations = await getMyDirectConversations();

  if (activeConversationId) {
    const stillExists = directConversations.some(
      (conversation) =>
        String(conversation.conversation_id) ===
        String(activeConversationId)
    );

    if (!stillExists) {
      activeConversationId = null;
      activeFriendId = null;
      activeMessages = [];
    }
  }

  if (activeConversationId) {
    await loadActiveConversationMessages();
  }

  renderMessagesPage();

  if (preserveScroll) {
    const thread = document.getElementById("messagesThreadList");

    if (thread) {
      thread.scrollTop = previousScrollPosition;
    }
  }
}

function scrollMessagesThreadToBottom() {
  const thread = document.getElementById("messagesThreadList");

  if (thread) {
    thread.scrollTop = thread.scrollHeight;
  }
}

/* =====================================================
   INTERACTIONS
   ===================================================== */

function updateMessageCharacterCounter() {
  const input = document.getElementById("messageInput");
  const counter = document.getElementById(
    "messageCharacterCounter"
  );

  if (!input || !counter) {
    return;
  }

  const maximum = Number(input.maxLength) || 1000;
  const length = input.value.length;

  counter.textContent = `${length} / ${maximum}`;

  counter.classList.toggle(
    "limit-reached",
    length >= maximum
  );
}

function setupMessagesPageInteractions() {
  document
    .querySelectorAll(".messages-conversation-item")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        if (
          String(button.dataset.conversationId) ===
          String(activeConversationId)
        ) {
          return;
        }

        try {
          await openConversation(
            button.dataset.conversationId,
            button.dataset.friendId
          );
        } catch (error) {
          console.error(
            "Erreur d’ouverture de conversation :",
            error
          );

          alert(
            `Impossible d’ouvrir cette conversation : ${error.message}`
          );
        }
      });
    });

  document
    .getElementById("refreshMessagesButton")
    ?.addEventListener("click", async () => {
      try {
        await refreshMessagesPage();
      } catch (error) {
        console.error(
          "Erreur de rafraîchissement des messages :",
          error
        );
      }
    });

  const input = document.getElementById("messageInput");

  input?.addEventListener("input", updateMessageCharacterCounter);

  document
    .getElementById("messageForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const submitButton = document.getElementById(
        "messageSubmitButton"
      );

      const messageInput = document.getElementById("messageInput");

      if (
        !submitButton ||
        !messageInput ||
        !activeConversationId ||
        submitButton.disabled
      ) {
        return;
      }

      const content = messageInput.value.trim();

      if (!content) {
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "Envoi…";

      try {
        await sendMessage(activeConversationId, content);

        messageInput.value = "";
        updateMessageCharacterCounter();

        await refreshMessagesPage();
        scrollMessagesThreadToBottom();
      } catch (error) {
        console.error("Erreur d’envoi du message :", error);

        alert(
          `Impossible d’envoyer ce message : ${error.message}`
        );
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Envoyer";
      }
    });
}

/* =====================================================
   INITIALISATION
   ===================================================== */

function startMessagesAutoRefresh() {
  window.clearInterval(messagesRefreshIntervalId);

  messagesRefreshIntervalId = window.setInterval(async () => {
    if (!currentUser || document.hidden) {
      return;
    }

    try {
      await refreshMessagesPage({
        preserveScroll: true
      });
    } catch (error) {
      console.error(
        "Erreur d’actualisation automatique des échanges :",
        error
      );
    }
  }, MESSAGES_REFRESH_INTERVAL);
}

async function initialiseMessagesPage() {
  if (!currentUser) {
    renderMessagesLoginState();
    return;
  }

  try {
    const friendIdFromUrl = getConversationFriendIdFromUrl();

    if (friendIdFromUrl) {
      await openConversationFromFriendId(friendIdFromUrl);
    } else {
      await refreshMessagesPage();
    }

    startMessagesAutoRefresh();
  } catch (error) {
    console.error(
      "Erreur de chargement des échanges :",
      error
    );

    renderMessagesError(
      error.message ||
        "Une erreur est survenue pendant le chargement de tes échanges."
    );
  }
}

document.addEventListener("authChanged", () => {
  if (!messagesInitialised) {
    messagesInitialised = true;
    initialiseMessagesPage();
    return;
  }

  initialiseMessagesPage();
});

window.addEventListener("beforeunload", () => {
  window.clearInterval(messagesRefreshIntervalId);
});
