
const myReviewsGrid = document.getElementById("myReviewsGrid");
const reviewTotal = document.getElementById("reviewTotal");
const profileTitle = document.getElementById("profileTitle");
const profileSubtitle = document.getElementById("profileSubtitle");

function renderProfileReviews(reviews) {
  const username =
    currentProfile?.username ||
    currentUser?.email?.split("@")[0] ||
    "Membre";

  profileTitle.textContent = `Le carnet de ${username}`;
  profileSubtitle.textContent =
    "Tes films, tes mots, les traces que les séances ont laissées.";

  reviewTotal.textContent = reviews.length;

  const label = reviews.length > 1
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
    .map((review, index) => {
      return createMovieCard(review, index, {
        author: username,
        canDelete: true
      });
    })
    .join("");

  document.querySelectorAll(".delete-review").forEach((button) => {
    button.addEventListener("click", async () => {
      const reviewId = button.dataset.reviewId;

      const confirmation = confirm(
        "Veux-tu vraiment supprimer cette microcritique ? Cette action est définitive."
      );

      if (!confirmation) return;

      button.disabled = true;
      button.textContent = "Suppression…";

      try {
        await deleteReview(reviewId);
        await loadMyProfilePage();
      } catch (error) {
        console.error(error);
        alert(`Impossible de supprimer : ${error.message}`);

        button.disabled = false;
        button.textContent = "Supprimer";
      }
    });
  });
}

async function loadMyProfilePage() {
  if (!currentUser) {
    myReviewsGrid.innerHTML = `
      <div class="empty-state">
        <strong>Connecte-toi pour accéder à ton espace personnel.</strong>
        <br /><br />
        Tes critiques, tes futurs favoris et tes listes seront rassemblés ici.
      </div>
    `;

    reviewTotal.textContent = "0";
    profileTitle.textContent = "Mon carnet de cinéma";

    return;
  }

  const reviews = await getMyReviews(currentUser.id);

  renderProfileReviews(reviews);
}

document.addEventListener("authChanged", () => {
  loadMyProfilePage();
});

loadMyProfilePage();
