
const adminPageContent = document.getElementById("adminPageContent");

let adminInitialised = false;
let adminData = null;
let adminReviewFilter = "all";

function adminEscapeHTML(value) {
  if (typeof escapeHTML === "function") {
    return escapeHTML(value);
  }

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatAdminDate(dateValue) {
  if (!dateValue) {
    return "Date inconnue";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function truncateAdminText(value, maxLength = 110) {
  const text = String(value || "").trim();

  if (!text) {
    return "Note seule";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}…`;
}

function renderAdminMessage(title, text, isError = false) {
  if (!adminPageContent) {
    return;
  }

  adminPageContent.innerHTML = `
    <section class="admin-message ${isError ? "admin-message-error" : ""}">
      <p class="eyebrow">La régie</p>
      <h1>${adminEscapeHTML(title)}</h1>
      <p>${adminEscapeHTML(text)}</p>
      <a class="button-primary" href="index.html">
        Retourner au carnet
      </a>
    </section>
  `;
}

function renderAdminLoading() {
  if (!adminPageContent) {
    return;
  }

  adminPageContent.innerHTML = `
    <div class="admin-loading">
      Chargement de la régie…
    </div>
  `;
}

async function getAdminDashboardData() {
  const [
    membersResult,
    publishedReviewsResult,
    publicListsResult,
    adminReviewsResult,
    recentProfilesResult
  ] = await Promise.all([
    supabaseClient
      .from("profiles")
      .select("*", { count: "exact", head: true }),

    supabaseClient
      .from("reviews")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true),

    supabaseClient
      .from("movie_lists")
      .select("*", { count: "exact", head: true })
      .eq("is_public", true),

    supabaseClient.rpc("admin_get_reviews", {
      p_limit: 200
    }),

    supabaseClient
      .from("profiles")
      .select("id, username, avatar_url, created_at")
      .order("created_at", { ascending: false })
      .limit(12)
  ]);

  const errors = [
    membersResult.error,
    publishedReviewsResult.error,
    publicListsResult.error,
    adminReviewsResult.error,
    recentProfilesResult.error
  ].filter(Boolean);

  if (errors.length) {
    throw errors[0];
  }

  const reviews = (adminReviewsResult.data || []).map((review) => ({
    id: review.review_id,
    user_id: review.review_user_id,
    movie_id: review.review_movie_id,
    rating: review.review_rating,
    content: review.review_content,
    is_published: review.review_is_published,
    created_at: review.review_created_at,
    movies: {
      title: review.movie_title,
      release_year: review.movie_release_year
    },
    author: {
      username: review.author_username
    }
  }));

  return {
    stats: {
      members: membersResult.count || 0,
      publishedReviews: publishedReviewsResult.count || 0,
      allReviews: reviews.length,
      lists: publicListsResult.count || 0
    },
    reviews,
    recentProfiles: recentProfilesResult.data || []
  };
}

function getFilteredAdminReviews() {
  if (!adminData?.reviews) {
    return [];
  }

  if (adminReviewFilter === "published") {
    return adminData.reviews.filter((review) => review.is_published);
  }

  if (adminReviewFilter === "unpublished") {
    return adminData.reviews.filter((review) => !review.is_published);
  }

  return adminData.reviews;
}

function renderAdminReviewRow(review) {
  const authorName = review.author?.username || "Membre";
  const movieTitle = review.movies?.title || "Film sans titre";
  const releaseYear = review.movies?.release_year || "";
  const content = String(review.content || "").trim();

  return `
    <tr>
      <td>
        <a href="membre.html?id=${encodeURIComponent(review.user_id)}">
          ${adminEscapeHTML(authorName)}
        </a>
      </td>

      <td>
        <a href="film.html?id=${encodeURIComponent(review.movie_id)}">
          ${adminEscapeHTML(movieTitle)}
        </a>
        ${
          releaseYear
            ? `<span class="admin-table-year">(${adminEscapeHTML(releaseYear)})</span>`
            : ""
        }
      </td>

      <td class="admin-table-rating">
        ${adminEscapeHTML(review.rating)} / 5
      </td>

      <td class="admin-table-content">
        <span title="${adminEscapeHTML(content || "Note seule")}">
          ${
            content
              ? adminEscapeHTML(truncateAdminText(content))
              : "<em>Note seule</em>"
          }
        </span>
      </td>

      <td class="admin-table-date">
        ${formatAdminDate(review.created_at)}
      </td>

      <td>
        <span
          class="admin-status-badge ${
            review.is_published
              ? "admin-status-published"
              : "admin-status-hidden"
          }"
        >
          ${review.is_published ? "Publiée" : "Dépubliée"}
        </span>
      </td>

      <td class="admin-table-actions">
        ${
          review.is_published
            ? `
              <button
                class="button-text admin-unpublish-button"
                type="button"
                data-review-id="${review.id}"
              >
                Dépublier
              </button>
            `
            : `
              <button
                class="button-text admin-republish-button"
                type="button"
                data-review-id="${review.id}"
              >
                Republier
              </button>
            `
        }

        <button
          class="button-text admin-delete-button"
          type="button"
          data-review-id="${review.id}"
          data-movie-title="${adminEscapeHTML(movieTitle)}"
        >
          Supprimer
        </button>
      </td>
    </tr>
  `;
}

function renderAdminReviewTable() {
  const reviews = getFilteredAdminReviews();

  if (!reviews.length) {
    return `
      <div class="empty-state">
        Aucune critique dans cette sélection.
      </div>
    `;
  }

  return `
    <div class="admin-table-wrapper">
      <table class="admin-review-table">
        <thead>
          <tr>
            <th>Auteur·rice</th>
            <th>Film</th>
            <th>Note</th>
            <th>Microcritique</th>
            <th>Date</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          ${reviews.map(renderAdminReviewRow).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderAdminMemberCard(profile) {
  const username = profile.username || "Membre";
  const initial = username.charAt(0).toUpperCase() || "M";

  const avatarMarkup = profile.avatar_url
    ? `
      <img
        src="${adminEscapeHTML(profile.avatar_url)}"
        alt="Avatar de ${adminEscapeHTML(username)}"
        loading="lazy"
      />
    `
    : `<span>${adminEscapeHTML(initial)}</span>`;

  return `
    <article class="admin-member-card">
      <div class="admin-member-avatar">
        ${avatarMarkup}
      </div>

      <div>
        <h3>${adminEscapeHTML(username)}</h3>
        <p>Inscription : ${formatAdminDate(profile.created_at)}</p>

        <a
          class="button-text"
          href="membre.html?id=${encodeURIComponent(profile.id)}"
        >
          Voir le profil
        </a>
      </div>
    </article>
  `;
}

function renderAdminDashboard() {
  if (!adminPageContent || !adminData) {
    return;
  }

  const membersMarkup = adminData.recentProfiles.length
    ? adminData.recentProfiles.map(renderAdminMemberCard).join("")
    : `
      <div class="empty-state">
        Aucun membre inscrit pour le moment.
      </div>
    `;

  const publishedCount = adminData.reviews.filter(
    (review) => review.is_published
  ).length;

  const unpublishedCount = adminData.reviews.filter(
    (review) => !review.is_published
  ).length;

  adminPageContent.innerHTML = `
    <section class="admin-hero">
      <div>
        <p class="eyebrow">Espace administratrice</p>
        <h1>La régie</h1>
        <p>
          Veiller sur les films, les mots et les visages
          du dernier rang.
        </p>
      </div>

      <a class="button-secondary" href="index.html#critiques">
        Voir le carnet public
      </a>
    </section>

    <section class="admin-stats-grid" aria-label="Indicateurs du site">
      <article class="admin-stat-card">
        <span class="admin-stat-number">${adminData.stats.members}</span>
        <span class="admin-stat-label">membres</span>
      </article>

      <article class="admin-stat-card">
        <span class="admin-stat-number">${publishedCount}</span>
        <span class="admin-stat-label">microcritiques publiées</span>
      </article>

      <article class="admin-stat-card">
        <span class="admin-stat-number">${unpublishedCount}</span>
        <span class="admin-stat-label">microcritiques dépubliées</span>
      </article>
    </section>

    <section class="admin-section">
      <div class="admin-section-heading">
        <div>
          <p class="eyebrow">Modération</p>
          <h2>Toutes les critiques</h2>
        </div>

        <button
          id="refreshAdminButton"
          class="button-secondary"
          type="button"
        >
          Actualiser
        </button>
      </div>

      <div class="admin-filters" aria-label="Filtrer les critiques">
        <button
          class="admin-filter-button ${
            adminReviewFilter === "all" ? "active" : ""
          }"
          type="button"
          data-admin-filter="all"
        >
          Toutes (${adminData.reviews.length})
        </button>

        <button
          class="admin-filter-button ${
            adminReviewFilter === "published" ? "active" : ""
          }"
          type="button"
          data-admin-filter="published"
        >
          Publiées (${publishedCount})
        </button>

        <button
          class="admin-filter-button ${
            adminReviewFilter === "unpublished" ? "active" : ""
          }"
          type="button"
          data-admin-filter="unpublished"
        >
          Dépubliées (${unpublishedCount})
        </button>
      </div>

      ${renderAdminReviewTable()}
    </section>

    <section class="admin-section">
      <div class="admin-section-heading">
        <div>
          <p class="eyebrow">Communauté</p>
          <h2>Derniers membres</h2>
        </div>
      </div>

      <div class="admin-members-grid">
        ${membersMarkup}
      </div>
    </section>
  `;

  setupAdminActions();
}

async function refreshAdminDashboard() {
  renderAdminLoading();

  try {
    adminData = await getAdminDashboardData();
    renderAdminDashboard();
  } catch (error) {
    console.error("Erreur de chargement de la régie :", error);

    renderAdminMessage(
      "Impossible de charger la régie",
      error.message ||
        "Une erreur est survenue lors du chargement des données.",
      true
    );
  }
}

async function setReviewPublication(reviewId, isPublished, button) {
  if (!reviewId) {
    return;
  }

  const previousText = button?.textContent || "";

  if (button) {
    button.disabled = true;
    button.textContent = "Un instant…";
  }

  try {
    const { error } = await supabaseClient.rpc(
      "admin_set_review_publication",
      {
        p_review_id: reviewId,
        p_is_published: isPublished
      }
    );

    if (error) {
      throw error;
    }

    await refreshAdminDashboard();
  } catch (error) {
    console.error("Erreur de modération :", error);

    alert(
      `Impossible de ${
        isPublished ? "republier" : "dépublier"
      } cette critique : ${error.message}`
    );

    if (button) {
      button.disabled = false;
      button.textContent = previousText;
    }
  }
}

async function deleteAdminReview(reviewId, movieTitle, button) {
  if (!reviewId) {
    return;
  }

  const confirmed = window.confirm(
    `Supprimer définitivement la critique associée à « ${movieTitle} » ?\n\nCette action est irréversible.`
  );

  if (!confirmed) {
    return;
  }

  const previousText = button?.textContent || "";

  if (button) {
    button.disabled = true;
    button.textContent = "Suppression…";
  }

  try {
    const { error } = await supabaseClient.rpc(
      "admin_delete_review",
      {
        p_review_id: reviewId
      }
    );

    if (error) {
      throw error;
    }

    await refreshAdminDashboard();
  } catch (error) {
    console.error("Erreur de suppression admin :", error);

    alert(
      `Impossible de supprimer cette critique : ${error.message}`
    );

    if (button) {
      button.disabled = false;
      button.textContent = previousText;
    }
  }
}

function setupAdminActions() {
  const refreshButton = document.getElementById("refreshAdminButton");

  if (refreshButton) {
    refreshButton.addEventListener("click", refreshAdminDashboard);
  }

  document.querySelectorAll(".admin-filter-button").forEach((button) => {
    button.addEventListener("click", () => {
      adminReviewFilter = button.dataset.adminFilter || "all";
      renderAdminDashboard();
    });
  });

  document.querySelectorAll(".admin-unpublish-button").forEach((button) => {
    button.addEventListener("click", () => {
      setReviewPublication(button.dataset.reviewId, false, button);
    });
  });

  document.querySelectorAll(".admin-republish-button").forEach((button) => {
    button.addEventListener("click", () => {
      setReviewPublication(button.dataset.reviewId, true, button);
    });
  });

  document.querySelectorAll(".admin-delete-button").forEach((button) => {
    button.addEventListener("click", () => {
      deleteAdminReview(
        button.dataset.reviewId,
        button.dataset.movieTitle || "ce film",
        button
      );
    });
  });
}

function handleAdminAuthChanged() {
  if (!currentUser) {
    renderAdminMessage(
      "La régie est privée",
      "Connecte-toi avec un compte administrateur pour accéder à cet espace."
    );
    return;
  }

  if (!currentProfile?.is_admin) {
    renderAdminMessage(
      "Accès réservé",
      "Cet espace est réservé à l’administration du Dernier rang.",
      true
    );
    return;
  }

  if (!adminInitialised) {
    adminInitialised = true;
    refreshAdminDashboard();
  }
}

document.addEventListener("authChanged", handleAdminAuthChanged);
