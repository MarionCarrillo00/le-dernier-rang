
const myReviewsGrid = document.getElementById("myReviewsGrid");
const reviewTotal = document.getElementById("reviewTotal");
const profileTitle = document.getElementById("profileTitle");
const profileSubtitle = document.getElementById("profileSubtitle");

const myWishlistGrid = document.getElementById("myWishlistGrid");

const myListsGrid = document.getElementById("myListsGrid");
const listForm = document.getElementById("listForm");

const openListFormButton = document.getElementById(
  "openListFormButton"
);

const cancelListFormButton = document.getElementById(
  "cancelListFormButton"
);

const listTitleInput = document.getElementById("listTitle");

const listDescriptionInput = document.getElementById(
  "listDescription"
);

const listVisibilityInput = document.getElementById(
  "listVisibility"
);

/* Photo de profil */

const profileAvatar = document.getElementById("profileAvatar");

const profileAvatarPlaceholder = document.getElementById(
  "profileAvatarPlaceholder"
);

const avatarInput = document.getElementById("avatarInput");

const avatarStatus = document.getElementById("avatarStatus");

/* =====================================================
   PROFIL ET AVATAR
   ===================================================== */

function getCurrentUsername() {
  return (
    currentProfile?.username ||
    currentUser?.email?.split("@")[0] ||
    "Membre"
  );
}

function getAvatarInitial() {
  return getCurrentUsername().charAt(0).toUpperCase() || "?";
}

function showAvatarStatus(message, type = "") {
  avatarStatus.textContent = message;
  avatarStatus.className = "avatar-status";

  if (type) {
    avatarStatus.classList.add(type);
  }
}

function renderProfileAvatar() {
  if (!currentUser) {
    profileAvatar.hidden = true;
    profileAvatar.removeAttribute("src");

    profileAvatarPlaceholder.hidden = false;
    profileAvatarPlaceholder.textContent = "?";

    showAvatarStatus("");
    return;
  }

  const avatarUrl = currentProfile?.avatar_url;

  if (avatarUrl) {
    /*
      Le paramètre ?v= évite que le navigateur conserve
      une ancienne photo après un nouveau téléversement.
    */
    profileAvatar.src = `${avatarUrl}?v=${Date.now()}`;
    profileAvatar.alt = `Photo de profil de ${getCurrentUsername()}`;

    profileAvatar.hidden = false;
    profileAvatarPlaceholder.hidden = true;
  } else {
    profileAvatar.hidden = true;
    profileAvatar.removeAttribute("src");

    profileAvatarPlaceholder.hidden = false;
    profileAvatarPlaceholder.textContent = getAvatarInitial();
  }
}

async function uploadProfileAvatar(file) {
  if (!currentUser) {
    return;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {
    showAvatarStatus(
      "Choisis une image JPG, PNG ou WebP.",
      "error"
    );
    return;
  }

  const maximumSize = 2 * 1024 * 1024;

  if (file.size > maximumSize) {
    showAvatarStatus(
      "La photo doit faire moins de 2 Mo.",
      "error"
    );
    return;
  }

  showAvatarStatus("Téléversement de la photo…");

  /*
    Une seule photo par membre :
    avatars/<id_utilisateur>/avatar
  */
  const filePath = `${currentUser.id}/avatar`;

  try {
    const { error: uploadError } = await supabaseClient.storage
      .from("avatars")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } = supabaseClient.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const avatarUrl = publicUrlData.publicUrl;

    const { error: profileError } = await supabaseClient
      .from("profiles")
      .update({
        avatar_url: avatarUrl
      })
      .eq("id", currentUser.id);

    if (profileError) {
      throw profileError;
    }

    currentProfile = {
      ...currentProfile,
      avatar_url: avatarUrl
    };

    renderProfileAvatar();

    document.dispatchEvent(
      new CustomEvent("authChanged", {
        detail: {
          user: currentUser,
          profile: currentProfile
        }
      })
    );

    showAvatarStatus(
      "Ta photo de profil est enregistrée.",
      "success"
    );
  } catch (error) {
    console.error("Erreur de téléversement de l’avatar :", error);

    showAvatarStatus(
      `Impossible d’enregistrer cette photo : ${error.message}`,
      "error"
    );
  } finally {
    avatarInput.value = "";
  }
}

/* =====================================================
   FORMULAIRE DE LISTE
   ===================================================== */

function showListForm() {
  listForm.hidden = false;
  openListFormButton.hidden = true;
  listTitleInput.focus();
}

function hideListForm() {
  listForm.hidden = true;
  openListFormButton.hidden = false;
  listForm.reset();
}

/* =====================================================
   CRITIQUES DU PROFIL
   ===================================================== */

function renderProfileReviews(reviews) {
  const username = getCurrentUsername();

  profileTitle.textContent = `Le carnet de ${username}`;

  profileSubtitle.textContent =
    "Tes films, tes mots, les traces que les séances ont laissées.";

  reviewTotal.textContent = reviews.length;

  const label =
    reviews.length > 1
      ? "microcritiques"
      : "microcritique";

  document.querySelector(".profile-stat small").textContent = label;

  renderProfileAvatar();

  if (reviews.length === 0) {
    myReviewsGrid.innerHTML = `
      <div class="empty-state">
        <strong>Ton carnet est encore vide.</strong>
        <br /><br />
        Retourne sur l’accueil pour écrire ta première microcritique.
        <br /><br />
        <a class="button-primary" href="index.html">
          Écrire une critique
        </a>
      </div>
    `;

    return;
  }

  myReviewsGrid.innerHTML = reviews
    .map((review, index) =>
      createMovieCard(review, index, {
        author: username,
        canDelete: true
      })
    )
    .join("");

  document.querySelectorAll(".delete-review").forEach((button) => {
    button.addEventListener("click", async () => {
      const reviewId = button.dataset.reviewId;

      const confirmation = confirm(
        "Veux-tu vraiment supprimer cette microcritique ? Cette action est définitive."
      );

      if (!confirmation) {
        return;
      }

      button.disabled = true;
      button.textContent = "Suppression…";

      try {
        await deleteReview(reviewId);
        await loadMyProfilePage();
      } catch (error) {
        console.error("Erreur de suppression :", error);

        alert(`Impossible de supprimer : ${error.message}`);

        button.disabled = false;
        button.textContent = "Supprimer";
      }
    });
  });
}

/* =====================================================
   WISHLIST : À VOIR
   ===================================================== */

/*
  Recherche la liste système de l'utilisatrice :
  list_type = "wishlist".
*/
async function getMyWishlist() {
  if (!currentUser) {
    return null;
  }

  const { data, error } = await supabaseClient
    .from("movie_lists")
    .select("id, title, description, is_public, list_type")
    .eq("user_id", currentUser.id)
    .eq("list_type", "wishlist")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/*
  Récupère les films de la wishlist « À voir ».
  La liste n'est créée qu'au premier ajout effectué depuis
  une fiche film : son absence est donc un état normal.
*/
async function getMyWishlistMovies() {
  const wishlist = await getMyWishlist();

  if (!wishlist) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from("movie_list_items")
    .select(`
      id,
      created_at,
      movies (
        id,
        tmdb_id,
        title,
        original_title,
        release_year,
        director,
        poster_url,
        genres
      )
    `)
    .eq("list_id", wishlist.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || [])
    .filter((item) => item.movies)
    .map((item) => ({
      wishlist_item_id: item.id,
      added_at: item.created_at,
      movie: item.movies
    }));
}

function renderWishlistMovies(items) {
  if (!currentUser) {
    myWishlistGrid.innerHTML = "";
    return;
  }

  if (!items.length) {
    myWishlistGrid.innerHTML = `
      <div class="empty-state wishlist-empty-state">
        <strong>Ta liste À voir attend sa première séance.</strong>
        <br /><br />
        Explore les fiches films et ajoute ceux que tu veux garder
        pour plus tard.
        <br /><br />
        <a class="button-primary" href="index.html#critiques">
          Découvrir les microcritiques
        </a>
      </div>
    `;

    return;
  }

  myWishlistGrid.innerHTML = items
    .map(({ wishlist_item_id, movie }) => {
      const title = movie.title || "Film sans titre";
      const releaseYear = movie.release_year || "—";
      const director =
        movie.director || "Réalisation non renseignée";

      const posterMarkup = movie.poster_url
        ? `
          <img
            src="${escapeHTML(movie.poster_url)}"
            alt="Affiche de ${escapeHTML(title)}"
            loading="lazy"
          />
        `
        : `
          <div class="wishlist-poster-placeholder">
            <span>${escapeHTML(String(releaseYear))}</span>
            <strong>${escapeHTML(title)}</strong>
          </div>
        `;

      return `
        <article class="wishlist-movie-card">
          <a
            class="wishlist-poster-link"
            href="film.html?id=${encodeURIComponent(movie.id)}"
            title="Voir la fiche de ${escapeHTML(title)}"
          >
            ${posterMarkup}
          </a>

          <div class="wishlist-movie-content">
            <h3>
              <a
                href="film.html?id=${encodeURIComponent(movie.id)}"
              >
                ${escapeHTML(title)}
              </a>
            </h3>

            <p>
              ${escapeHTML(String(releaseYear))} ·
              ${escapeHTML(director)}
            </p>

            <button
              class="button-text wishlist-remove-button"
              type="button"
              data-wishlist-item-id="${wishlist_item_id}"
              title="Retirer ${escapeHTML(title)} de ma liste À voir"
            >
              Retirer
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  document
    .querySelectorAll(".wishlist-remove-button")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        const wishlistItemId = button.dataset.wishlistItemId;

        button.disabled = true;
        button.textContent = "Retrait…";

        try {
          const { error } = await supabaseClient
            .from("movie_list_items")
            .delete()
            .eq("id", wishlistItemId);

          if (error) {
            throw error;
          }

          await loadMyProfilePage();
        } catch (error) {
          console.error(
            "Erreur de retrait du film de la wishlist :",
            error
          );

          alert(
            `Impossible de retirer ce film de ta liste À voir : ${error.message}`
          );

          button.disabled = false;
          button.textContent = "Retirer";
        }
      });
    });
}

/* =====================================================
   LISTES PERSONNALISÉES
   ===================================================== */

/*
  Charge uniquement les listes créées manuellement.
  La wishlist « À voir » est exclue car elle est affichée
  dans sa propre section au-dessus.
*/
async function getMyMovieLists() {
  if (!currentUser) {
    return [];
  }

  const { data: lists, error } = await supabaseClient
    .from("movie_lists")
    .select(`
      id,
      title,
      description,
      is_public,
      list_type,
      created_at
    `)
    .eq("user_id", currentUser.id)
    .eq("list_type", "custom")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur de chargement des listes :", error.message);
    return [];
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
    console.error(
      "Erreur de chargement des films des listes :",
      itemsError.message
    );
  }

  return lists.map((list) => ({
    ...list,
    movie_count: (items || []).filter(
      (item) => item.list_id === list.id
    ).length
  }));
}

function renderMovieLists(lists) {
  if (!currentUser) {
    myListsGrid.innerHTML = "";
    return;
  }

  if (lists.length === 0) {
    myListsGrid.innerHTML = `
      <div class="empty-state lists-empty-state">
        <strong>Tu n’as pas encore créé de liste.</strong>
        <br /><br />
        Crée une collection pour réunir les films qui restent avec toi.
      </div>
    `;

    return;
  }

  myListsGrid.innerHTML = lists
    .map((list) => {
      const visibilityLabel = list.is_public
        ? "Publique"
        : "Privée";

      const movieLabel =
        list.movie_count > 1
          ? "films"
          : "film";

      return `
        <article class="movie-list-card">
          <div class="movie-list-card-top">
            <span class="list-visibility ${
              list.is_public ? "public" : "private"
            }">
              ${visibilityLabel}
            </span>

            <button
              class="delete-list-button"
              type="button"
              data-list-id="${list.id}"
              data-list-title="${escapeHTML(list.title)}"
              title="Supprimer cette liste"
            >
              Supprimer
            </button>
          </div>

          <h3>
            <a
              class="movie-list-link"
              href="liste.html?id=${encodeURIComponent(list.id)}"
            >
              ${escapeHTML(list.title)}
            </a>
          </h3>

          <p>
            ${
              list.description
                ? escapeHTML(list.description)
                : "Une collection de films à faire grandir."
            }
          </p>

          <div class="movie-list-card-bottom">
            <span>
              ${list.movie_count} ${movieLabel}
            </span>

            <span>
              ${
                list.is_public
                  ? "Visible par tous"
                  : "Visible uniquement par moi"
              }
            </span>
          </div>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll(".delete-list-button").forEach((button) => {
    button.addEventListener("click", async () => {
      const listId = button.dataset.listId;
      const listTitle = button.dataset.listTitle;

      const confirmation = confirm(
        `Supprimer la liste « ${listTitle} » ? Les films qui y sont associés seront retirés de cette liste, mais aucune fiche film ne sera supprimée.`
      );

      if (!confirmation) {
        return;
      }

      button.disabled = true;
      button.textContent = "Suppression…";

      try {
        const { error } = await supabaseClient
          .from("movie_lists")
          .delete()
          .eq("id", listId);

        if (error) {
          throw error;
        }

        await loadMyProfilePage();
      } catch (error) {
        console.error("Erreur de suppression de liste :", error);

        alert(`Impossible de supprimer la liste : ${error.message}`);

        button.disabled = false;
        button.textContent = "Supprimer";
      }
    });
  });
}

async function createMovieList(event) {
  event.preventDefault();

  if (!currentUser) {
    return;
  }

  const title = listTitleInput.value.trim();
  const description = listDescriptionInput.value.trim();
  const isPublic = listVisibilityInput.value === "public";

  if (title.length < 2) {
    alert("Le titre de la liste doit contenir au moins 2 caractères.");
    return;
  }

  const submitButton = listForm.querySelector(
    'button[type="submit"]'
  );

  submitButton.disabled = true;
  submitButton.textContent = "Création…";

  try {
    const { error } = await supabaseClient
      .from("movie_lists")
      .insert({
        user_id: currentUser.id,
        title,
        description: description || null,
        is_public: isPublic,
        list_type: "custom"
      });

    if (error) {
      throw error;
    }

    hideListForm();
    await loadMyProfilePage();
  } catch (error) {
    console.error("Erreur de création de liste :", error);

    alert(`Impossible de créer la liste : ${error.message}`);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Créer ma liste";
  }
}

/* =====================================================
   CHARGEMENT DE LA PAGE
   ===================================================== */

async function loadMyProfilePage() {
  if (!currentUser) {
    myReviewsGrid.innerHTML = `
      <div class="empty-state">
        <strong>Connecte-toi pour accéder à ton espace personnel.</strong>
        <br /><br />
        Tes critiques, tes listes et tes futurs favoris seront rassemblés ici.
      </div>
    `;

    myWishlistGrid.innerHTML = "";
    myListsGrid.innerHTML = "";

    reviewTotal.textContent = "0";
    profileTitle.textContent = "Mon carnet de cinéma";

    profileSubtitle.textContent =
      "Tes films, tes mots, les traces que les séances ont laissées.";

    openListFormButton.hidden = true;
    listForm.hidden = true;

    renderProfileAvatar();

    return;
  }

  openListFormButton.hidden = false;

  try {
    const [reviews, wishlistMovies, lists] = await Promise.all([
      getMyReviews(currentUser.id),
      getMyWishlistMovies(),
      getMyMovieLists()
    ]);

    renderProfileReviews(reviews);
    renderWishlistMovies(wishlistMovies);
    renderMovieLists(lists);
  } catch (error) {
    console.error(
      "Erreur de chargement de l’espace personnel :",
      error
    );

    myWishlistGrid.innerHTML = `
      <div class="empty-state">
        Impossible de charger ta liste À voir pour le moment.
      </div>
    `;
  }
}

function setupProfilePage() {
  openListFormButton.addEventListener("click", showListForm);

  cancelListFormButton.addEventListener("click", hideListForm);

  listForm.addEventListener("submit", createMovieList);

  avatarInput.addEventListener("change", () => {
    const file = avatarInput.files?.[0];

    if (file) {
      uploadProfileAvatar(file);
    }
  });
}

document.addEventListener("authChanged", () => {
  loadMyProfilePage();
});

setupProfilePage();
loadMyProfilePage();
