
const myReviewsGrid = document.getElementById("myReviewsGrid");
const reviewTotal = document.getElementById("reviewTotal");
const profileTitle = document.getElementById("profileTitle");
const profileSubtitle = document.getElementById("profileSubtitle");

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

function getCurrentUsername() {
  return (
    currentProfile?.username ||
    currentUser?.email?.split("@")[0] ||
    "Membre"
  );
}

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
      created_at
    `)
    .eq("user_id", currentUser.id)
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
            <span class="list-visibility ${list.is_public ? "public" : "private"}">
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
              ${list.is_public
                ? "Visible par tous"
                : "Visible uniquement par moi"}
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
        is_public: isPublic
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

async function loadMyProfilePage() {
  if (!currentUser) {
    myReviewsGrid.innerHTML = `
      <div class="empty-state">
        <strong>Connecte-toi pour accéder à ton espace personnel.</strong>
        <br /><br />
        Tes critiques, tes listes et tes futurs favoris seront rassemblés ici.
      </div>
    `;

    myListsGrid.innerHTML = "";

    reviewTotal.textContent = "0";
    profileTitle.textContent = "Mon carnet de cinéma";
    profileSubtitle.textContent =
      "Tes films, tes mots, les traces que les séances ont laissées.";

    openListFormButton.hidden = true;
    listForm.hidden = true;

    return;
  }

  openListFormButton.hidden = false;

  const [reviews, lists] = await Promise.all([
    getMyReviews(currentUser.id),
    getMyMovieLists()
  ]);

  renderProfileReviews(reviews);
  renderMovieLists(lists);
}

function setupProfilePage() {
  openListFormButton.addEventListener("click", showListForm);

  cancelListFormButton.addEventListener("click", hideListForm);

  listForm.addEventListener("submit", createMovieList);
}

document.addEventListener("authChanged", () => {
  loadMyProfilePage();
});

setupProfilePage();
loadMyProfilePage();
