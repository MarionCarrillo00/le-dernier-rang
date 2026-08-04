
const adminPageContent = document.getElementById("adminPageContent");

let adminInitialised = false;

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
    reviewsResult,
    listsResult,
    recentReviewsResult,
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

    supabaseClient
      .from("reviews")
      .select(`
        id,
        user_id,
        movie_id,
        rating,
        content,
        is_published,
        created_at,
        movies (
          id,
          title,
          release_year
        )
      `)
      .order("created_at", { ascending: false })
      .limit(20),

    supabaseClient
      .from("profiles")
      .select("id, username, avatar_url, created_at")
      .order("created_at", { ascending: false })
      .limit(12)
  ]);

  const errors = [
    membersResult.error,
    reviewsResult.error,
    listsResult.error,
    recentReviewsResult.error,
    recentProfilesResult.error
  ].filter(Boolean);

  if (errors.length) {
    throw errors[0];
  }

  const recentReviews = recentReviewsResult.data || [];
  const reviewUserIds = [
    ...new Set(
      recentReviews
        .map((review) => review.user_id)
        .filter(Boolean)
    )
  ];

  let profilesById = {};

  if (reviewUserIds.length) {
    const { data: profiles, error: profilesError } = await supabaseClient
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", reviewUserIds);

    if (profilesError) {
      throw profilesError;
    }

    profilesById = (profiles || []).reduce((accumulator, profile) => {
      accumulator[profile.id] = profile;
      return accumulator;
    }, {});
  }

  return {
    stats: {
      members: membersResult.count || 0,
      reviews: reviewsResult.count || 0,
      lists: listsResult.count || 0
    },
    recentReviews: recentReviews.map((review) => ({
      ...review,
      author: profilesById[review.user_id] || null
    })),
    recentProfiles: recentProfilesResult.data || []
  };
}

function renderAdminReviewCard(review) {
  const authorName = review.author?.username || "Membre";
  const movie = review.movies || {};
  const movieTitle = movie.title || "Film sans titre";
  const releaseYear = movie.release_year || "";
  const content = String(review.content || "").trim();

  return `
    <article class="admin-review-card">
      <div class="admin-review-card-header">
        <div>
          <p class="admin-review-film">
            <a href="film.html?id=${encodeURIComponent(review.movie_id)}">
              ${adminEscapeHTML(movieTitle)}
            </a>
            ${
              releaseYear
                ? `<span>(${adminEscapeHTML(releaseYear)})</span>`
                : ""
            }
          </p>

          <p class="admin-review-meta">
            Par
            <a href="member.html?id=${encodeURIComponent(review.user_id)}">
              ${adminEscapeHTML(authorName)}
            </a>
            · ${formatAdminDate(review.created_at)}
            · ${adminEscapeHTML(review.rating)} / 5
          </p>
        </div>

        <span
          class="admin-status-badge ${
            review.is_published
              ? "admin-status-published"
              : "admin-status-hidden"
          }"
        >
          ${review.is_published ? "Publiée" : "Dépubliée"}
        </span>
      </div>

      <p class="admin-review-content">
        ${
          content
            ? adminEscapeHTML(content)
            : "<em>Note seule — sans microcritique.</em>"
        }
      </p>

      <div class="admin-review-actions">
        <a
          class="button-text"
          href="member.html?id=${encodeURIComponent(review.user_id)}"
        >
          Voir le profil
        </a>

        <a
          class="button-text"
          href="film.html?id=${encodeURIComponent(review.movie_id)}"
        >
          Voir le film
        </a>

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
      </div>
    </article>
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
    : `
      <span>${adminEscapeHTML(initial)}</span>
    `;

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
          href="member.html?id=${encodeURIComponent(profile.id)}"
        >
          Voir le profil
        </a>
      </div>
    </article>
  `;
}

function renderAdminDashboard(data) {
  if (!adminPageContent) {
    return;
  }

  const reviewsMarkup = data.recentReviews.length
    ? data.recentReviews
        .map(renderAdminReviewCard)
        .join("")
    : `
      <div class="empty-state">
        Aucune microcritique à modérer pour le moment.
      </div>
    `;

  const membersMarkup = data.recentProfiles.length
    ? data.recentProfiles
        .map(renderAdminMemberCard)
        .join("")
    : `
      <div class="empty-state">
        Aucun membre inscrit pour le moment.
      </div>
    `;

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
        <span class="admin-stat-number">${data.stats.members}</span>
        <span class="admin-stat-label">
          membre${data.stats.members > 1 ? "s" : ""}
        </span>
      </article>

      <article class="admin-stat-card">
        <span class="admin-stat-number">${data.stats.reviews}</span>
        <span class="admin-stat-label">
          microcritique${data.stats.reviews > 1 ? "s" : ""} publiée${
            data.stats.reviews > 1 ? "s" : ""
          }
        </span>
      </article>

      <article class="admin-stat-card">
        <span class="admin-stat-number">${data.stats.lists}</span>
        <span class="admin-stat-label">
          liste${data.stats.lists > 1 ? "s" : ""} publique${
            data.stats.lists > 1 ? "s" : ""
          }
        </span>
      </article>
    </section>

    <section class="admin-section">
      <div class="admin-section-heading">
        <div>
          <p class="eyebrow">Modération</p>
          <h2>Dernières critiques</h2>
        </div>

        <button
          id="refreshAdminButton"
          class="button-secondary"
          type="button"
        >
          Actualiser
        </button>
      </div>

      <div class="admin-reviews-list">
        ${reviewsMarkup}
      </div>
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
    const data = await getAdminDashboardData();
    renderAdminDashboard(data);
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
    const { error } = await supabaseClient
      .from("reviews")
      .update({ is_published: isPublished })
      .eq("id", reviewId);

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
    const { error } = await supabaseClient
      .from("reviews")
      .delete()
      .eq("id", reviewId);

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
  /*
    auth.js émet cet événement lorsque la session
    et le profil Supabase ont fini de se charger.
  */
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

