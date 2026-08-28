
/* =====================================================
   CINÉ MOJITO — EXPLORER MON CARNET
   Navigation personnelle du profil
   ===================================================== */

let profileCarnetNavigationRefreshTimeout = null;

/* =====================================================
   OUTILS
   ===================================================== */

function getProfileCarnetCountLabel(count, singular, plural) {
  return Number(count) > 1 ? plural : singular;
}

function getEmptyProfileCarnetNavigationData() {
  return {
    watchedCount: 0,
    notesCount: 0,
    reviewsCount: 0,
    wishlistCount: 0,
    wishlistId: "",
    listsCount: 0,
    friendsCount: 0
  };
}

function removeProfileCarnetNavigation() {
  document
    .querySelector("#profileCarnetNavigation")
    ?.remove();
}

/* =====================================================
   DONNÉES
   ===================================================== */

async function getProfileCarnetNavigationData() {
  if (!currentUser) {
    return getEmptyProfileCarnetNavigationData();
  }

  const results = await Promise.allSettled([
    getMyReviews(currentUser.id),

    supabaseClient
      .from("movie_lists")
      .select("id")
      .eq("user_id", currentUser.id)
      .eq("list_type", "wishlist")
      .maybeSingle(),

    supabaseClient
      .from("movie_lists")
      .select("id")
      .eq("user_id", currentUser.id)
      .or("list_type.eq.custom,list_type.is.null"),

    getAcceptedFriends(currentUser.id)
  ]);

  const [
    reviewsResult,
    wishlistResult,
    listsResult,
    friendsResult
  ] = results;

  const reviews =
    reviewsResult.status === "fulfilled"
      ? reviewsResult.value
      : [];

  const wishlist =
    wishlistResult.status === "fulfilled"
      ? wishlistResult.value.data
      : null;

  const lists =
    listsResult.status === "fulfilled"
      ? listsResult.value.data || []
      : [];

  const friends =
    friendsResult.status === "fulfilled"
      ? friendsResult.value
      : [];

  let wishlistCount = 0;

  if (wishlist?.id) {
    const { count, error } = await supabaseClient
      .from("movie_list_items")
      .select("id", {
        count: "exact",
        head: true
      })
      .eq("list_id", wishlist.id);

    if (!error) {
      wishlistCount = Number(count || 0);
    }
  }

  const notesCount = reviews.filter(
    (review) => !String(review.content || "").trim()
  ).length;

  const reviewsCount = reviews.filter((review) =>
    String(review.content || "").trim()
  ).length;

  return {
    watchedCount: reviews.length,
    notesCount,
    reviewsCount,
    wishlistCount,
    wishlistId: wishlist?.id || "",
    listsCount: lists.length,
    friendsCount: friends.length
  };
}

/* =====================================================
   RENDU
   ===================================================== */

function renderProfileCarnetNavigation(data) {
  const profileHero = document.querySelector(".profile-hero-card");

  if (!profileHero || !currentUser) {
    removeProfileCarnetNavigation();
    return;
  }

  removeProfileCarnetNavigation();

  const {
    watchedCount,
    notesCount,
    reviewsCount,
    wishlistCount,
    wishlistId,
    listsCount,
    friendsCount
  } = data;

  const wishlistUrl = wishlistId
    ? `liste.html?id=${encodeURIComponent(wishlistId)}`
    : "#myWishlistSection";

  const section = document.createElement("section");

  section.id = "profileCarnetNavigation";
  section.className = "profile-carnet-navigation";

  section.innerHTML = `


    <div class="profile-carnet-navigation-groups">
      <section class="profile-carnet-navigation-group">
        <span class="profile-carnet-navigation-group-label">
          Mon carnet
        </span>

        <nav
          class="profile-carnet-navigation-links"
          aria-label="Explorer mon carnet"
        >
          <a
            class="profile-carnet-navigation-link"
            href="carnet.html"
          >
            <span>Films vus</span>

            <small>
              ${watchedCount}
              ${getProfileCarnetCountLabel(
                watchedCount,
                "film",
                "films"
              )}
            </small>
          </a>

          <a
            class="profile-carnet-navigation-link"
            href="carnet.html?view=notes"
          >
            <span>Notes</span>

            <small>
              ${notesCount}
              ${getProfileCarnetCountLabel(
                notesCount,
                "note",
                "notes"
              )}
            </small>
          </a>

          <a
            class="profile-carnet-navigation-link"
            href="carnet.html?view=critiques"
          >
            <span>Critiques</span>

            <small>
              ${reviewsCount}
              ${getProfileCarnetCountLabel(
                reviewsCount,
                "critique",
                "critiques"
              )}
            </small>
          </a>

          <a
            class="profile-carnet-navigation-link profile-carnet-navigation-link-arrow"
            href="talents-carnet.html"
          >
            <span>Talents</span>
            <small aria-hidden="true">→</small>
          </a>
        </nav>
      </section>

      <section class="profile-carnet-navigation-group">
        <span class="profile-carnet-navigation-group-label">
          Mon cercle & mes envies
        </span>

        <nav
          class="profile-carnet-navigation-links"
          aria-label="Explorer mon cercle et mes envies"
        >
          <a
            class="profile-carnet-navigation-link"
            href="${wishlistUrl}"
          >
            <span>À voir</span>

            <small>
              ${wishlistCount}
              ${getProfileCarnetCountLabel(
                wishlistCount,
                "film",
                "films"
              )}
            </small>
          </a>

          <a
            class="profile-carnet-navigation-link"
            href="#myListsSection"
          >
            <span>Mes listes</span>

            <small>
              ${listsCount}
              ${getProfileCarnetCountLabel(
                listsCount,
                "liste",
                "listes"
              )}
            </small>
          </a>

          <a
            class="profile-carnet-navigation-link"
            href="#myCircleSection"
          >
            <span>Amis</span>

            <small>
              ${friendsCount}
              ${getProfileCarnetCountLabel(
                friendsCount,
                "ami",
                "amis"
              )}
            </small>
          </a>
        </nav>
      </section>
    </div>
  `;

  /*
    On ajoute d'abord le bloc après le hero.
    S'il y a déjà « Mon cinéma », on le replace juste après
    cette navigation. Aucune boucle, aucun observateur.
  */
  profileHero.insertAdjacentElement("afterend", section);

  const cinemaSection = document.querySelector("#myCinemaSection");

  if (cinemaSection) {
    section.insertAdjacentElement("afterend", cinemaSection);
  }
}

/* =====================================================
   RAFRAÎCHISSEMENT
   ===================================================== */

async function refreshProfileCarnetNavigation() {
  if (!currentUser) {
    removeProfileCarnetNavigation();
    return;
  }

  try {
    const data = await getProfileCarnetNavigationData();
    renderProfileCarnetNavigation(data);
  } catch (error) {
    console.error(
      "Erreur de chargement de la navigation du carnet :",
      error
    );

    renderProfileCarnetNavigation(
      getEmptyProfileCarnetNavigationData()
    );
  }
}

function scheduleProfileCarnetNavigationRefresh() {
  window.clearTimeout(profileCarnetNavigationRefreshTimeout);

  /*
    profile-preferences.js charge « Mon cinéma » de façon asynchrone.
    Le léger délai garantit l'ordre : Hero → Navigation → Mon cinéma.
  */
  profileCarnetNavigationRefreshTimeout = window.setTimeout(() => {
    refreshProfileCarnetNavigation();
  }, 450);
}

/* =====================================================
   INITIALISATION
   ===================================================== */

document.addEventListener("authChanged", () => {
  scheduleProfileCarnetNavigationRefresh();
});

document.addEventListener(
  "profileCarnetNavigationRefresh",
  () => {
    scheduleProfileCarnetNavigationRefresh();
  }
);

scheduleProfileCarnetNavigationRefresh();
