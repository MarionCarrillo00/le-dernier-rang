
const memberPageContent = document.getElementById(
  "memberPageContent"
);

function getMemberIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function renderMemberError(message) {
  memberPageContent.innerHTML = `
    <div class="film-error">
      <h1>Ce profil est introuvable.</h1>

      <p>${escapeHTML(message)}</p>

      <a class="button-primary" href="index.html#critiques">
        Retour aux microcritiques
      </a>
    </div>
  `;
}

function getMemberInitial(profile) {
  const username = profile?.username || "Membre";
  return username.charAt(0).toUpperCase();
}

function renderMemberAvatar(profile) {
  if (profile.avatar_url) {
    return `
      <img
        class="member-avatar-large"
        src="${escapeHTML(profile.avatar_url)}"
        alt="Photo de profil de ${escapeHTML(profile.username)}"
      />
    `;
  }

  return `
    <div
      class="member-avatar-large member-avatar-placeholder"
      aria-hidden="true"
    >
      ${escapeHTML(getMemberInitial(profile))}
    </div>
  `;
}

function renderPublicListCard(list) {
  const movieCount = Number(list.movie_count || 0);
  const label = movieCount > 1 ? "films" : "film";

  return `
    <a
      class="movie-list-card member-list-card"
      href="liste.html?id=${encodeURIComponent(list.id)}"
    >
      <div class="movie-list-card-top">
        <span class="list-visibility public">
          Publique
        </span>
      </div>

      <h3>${escapeHTML(list.title)}</h3>

      <p>
        ${
          list.description
            ? escapeHTML(list.description)
            : "Une collection de films à faire grandir."
        }
      </p>

      <div class="movie-list-card-bottom">
        <span>${movieCount} ${label}</span>
        <span>Voir la liste →</span>
      </div>
    </a>
  `;
}

async function getPublicListsForMember(userId) {
  const { data: lists, error } = await supabaseClient
    .from("movie_lists")
    .select(`
      id,
      title,
      description,
      is_public,
      created_at
    `)
    .eq("user_id", userId)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  if (!lists || lists.length === 0) {
    return [];
  }

  const listIds = lists.map((list) => list.id);

  const { data: items, error: itemsError } = await supabaseClient
    .from("movie_list_items")
    .select("list_id")
    .in("list_id", listIds);

  if (itemsError) {
    throw itemsError;
  }

  return lists.map((list) => ({
    ...list,
    movie_count: (items || []).filter(
      (item) => item.list_id === list.id
    ).length
  }));
}

async function getPublicReviewsForMember(userId) {
  const { data: reviews, error } = await supabaseClient
    .from("reviews")
    .select(`
      id,
      user_id,
      rating,
      content,
      created_at,
      movies (
        id,
        title,
        release_year,
        director,
        poster_url,
        genres
      )
    `)
    .eq("user_id", userId)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const profilesById = await getProfilesByUserIds(
    (reviews || []).map((review) => review.user_id)
  );

  const reviewsWithAuthors = addAuthorsToReviews(
    reviews || [],
    profilesById
  );

  return enrichReviewsWithLikes(reviewsWithAuthors);
}

function renderMemberPage(profile, reviews, lists) {
  const username = profile.username || "Membre";
  const bio = profile.bio?.trim() ||
    "Ici, quelques films et les traces qu’ils ont laissées.";

  document.title = `${username} — Le dernier rang`;

  memberPageContent.innerHTML = `
    <section class="member-hero-card">
      <div class="member-profile-identity">
        ${renderMemberAvatar(profile)}

        <div>
          <div class="eyebrow red-eyebrow">Carnet de cinéma</div>

          <h1>${escapeHTML(username)}</h1>

          <p>${escapeHTML(bio)}</p>
        </div>
      </div>

      <div class="member-statistics">
        <div class="member-stat">
          <strong>${reviews.length}</strong>
          <small>
            microcritique${reviews.length > 1 ? "s" : ""}
          </small>
        </div>

        <div class="member-stat">
          <strong>${lists.length}</strong>
          <small>
            liste${lists.length > 1 ? "s" : ""} publique${
              lists.length > 1 ? "s" : ""
            }
          </small>
        </div>
      </div>
    </section>

    <section class="member-section">
      <div class="section-title">
        <div>
          <div class="eyebrow red-eyebrow">Ses listes</div>
          <h2>Les petites collections de ${escapeHTML(username)}</h2>
        </div>
      </div>

      <div class="lists-grid">
        ${
          lists.length
            ? lists.map(renderPublicListCard).join("")
            : `
              <div class="empty-state">
                <strong>Pas encore de liste publique.</strong>
                <br /><br />
                Les collections de ${escapeHTML(username)}
                apparaîtront ici.
              </div>
            `
        }
      </div>
    </section>

    <section class="member-section">
      <div class="section-title">
        <div>
          <div class="eyebrow red-eyebrow">Son journal</div>
          <h2>Les microcritiques de ${escapeHTML(username)}</h2>
        </div>
      </div>

      <div class="movies-grid member-reviews-grid">
        ${
          reviews.length
            ? reviews
                .map((review, index) =>
                  createMovieCard(review, index)
                )
                .join("")
            : `
              <div class="empty-state">
                <strong>Pas encore de microcritique publique.</strong>
                <br /><br />
                Ce carnet garde encore un peu ses silences.
              </div>
            `
        }
      </div>
    </section>
  `;

  setupMemberLikeButtons();
}

function setupMemberLikeButtons() {
  document.querySelectorAll(".favorite").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!currentUser) {
        setAuthMode("login");
        openAuthModal();

        showAuthMessage(
          "Connecte-toi ou crée un compte pour aimer une microcritique.",
          "error"
        );

        return;
      }

      button.disabled = true;

      try {
        await toggleReviewLike(button.dataset.reviewId);
        await loadMemberPage();
      } catch (error) {
        console.error("Erreur de like :", error);

        alert(`Impossible de modifier ton like : ${error.message}`);
      } finally {
        button.disabled = false;
      }
    });
  });
}

async function loadMemberPage() {
  const memberId = getMemberIdFromUrl();

  if (!memberId) {
    renderMemberError("Aucun identifiant de membre n’a été transmis.");
    return;
  }

  try {
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id, username, bio, avatar_url")
      .eq("id", memberId)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      renderMemberError(
        "Ce profil n’existe pas ou n’est plus disponible."
      );
      return;
    }

    const [reviews, lists] = await Promise.all([
      getPublicReviewsForMember(profile.id),
      getPublicListsForMember(profile.id)
    ]);

    renderMemberPage(profile, reviews, lists);
  } catch (error) {
    console.error("Erreur de chargement du profil public :", error);

    renderMemberError(
      "Une erreur est survenue pendant le chargement de ce profil."
    );
  }
}

document.addEventListener("authChanged", () => {
  loadMemberPage();
});

loadMemberPage();
