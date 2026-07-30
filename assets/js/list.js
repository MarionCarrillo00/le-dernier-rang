
const listPageContent = document.getElementById("listPageContent");

function getListIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function renderListError(message) {
  listPageContent.innerHTML = `
    <div class="film-error">
      <h1>Cette liste est introuvable.</h1>

      <p>${escapeHTML(message)}</p>

      <a class="button-primary" href="profil.html">
        Retour à mon espace
      </a>
    </div>
  `;
}

function renderListMovieCard(movie) {
  const posterUrl = movie.poster_url || "";
  const genres = movie.genres || [];
  const primaryGenre = genres[0] || "Cinéma";

  return `
    <a
      class="list-movie-card"
      href="film.html?id=${encodeURIComponent(movie.id)}"
    >
      <div class="list-movie-poster">
        ${
          posterUrl
            ? `
              <img
                src="${escapeHTML(posterUrl)}"
                alt="Affiche de ${escapeHTML(movie.title || "ce film")}"
                loading="lazy"
              />
            `
            : `
              <div class="list-movie-placeholder">
                ${escapeHTML(movie.title || "Film sans titre")}
              </div>
            `
        }
      </div>

      <div class="list-movie-content">
        <span class="list-movie-year">
          ${escapeHTML(String(movie.release_year || "—"))}
        </span>

        <h2>${escapeHTML(movie.title || "Film sans titre")}</h2>

        <p>
          ${escapeHTML(
            movie.director || "Réalisateur·rice non précisé·e"
          )}
        </p>

        <span class="tag">
          ${escapeHTML(primaryGenre)}
        </span>
      </div>
    </a>
  `;
}

async function getListOwnerName(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data?.username) {
    return "Membre";
  }

  return data.username;
}

function getListMovieLabel(count) {
  return count > 1 ? "films" : "film";
}

function renderStandardListPage(list, ownerName, movies, isOwner) {
  const movieCount = movies.length;
  const movieLabel = getListMovieLabel(movieCount);

  return `
    <section class="list-hero-card">
      <div>
        <div class="eyebrow red-eyebrow">
          ${list.is_public ? "Liste publique" : "Liste privée"}
        </div>

        <h1>${escapeHTML(list.title)}</h1>

        <p class="list-description">
          ${
            list.description
              ? escapeHTML(list.description)
              : "Une collection de films à garder tout près de soi."
          }
        </p>

        <div class="list-hero-meta">
          <span>Par ${escapeHTML(ownerName)}</span>
          <span>${movieCount} ${movieLabel}</span>
          <span>
            ${
              list.is_public
                ? "Visible par tous"
                : "Visible uniquement par moi"
            }
          </span>
        </div>
      </div>

      ${
        isOwner
          ? `
            <a class="button-secondary" href="profil.html">
              Gérer mes listes
            </a>
          `
          : ""
      }
    </section>

    <section class="list-movies-section">
      <div class="section-title">
        <div>
          <div class="eyebrow red-eyebrow">La sélection</div>
          <h2>Les films de cette liste</h2>
        </div>
      </div>

      <div class="list-movies-grid">
        ${
          movies.length
            ? movies.map(renderListMovieCard).join("")
            : `
              <div class="empty-state">
                <strong>Cette liste est encore vide.</strong>
                <br /><br />
                ${
                  isOwner
                    ? "Ouvre une fiche film et ajoute-y un premier titre."
                    : "Sa créatrice n’y a pas encore ajouté de film."
                }
              </div>
            `
        }
      </div>
    </section>
  `;
}

function renderWishlistPage(list, ownerName, movies, isOwner) {
  const movieCount = movies.length;
  const movieLabel = getListMovieLabel(movieCount);

  return `
    <section class="list-hero-card wishlist-hero-card">
      <div>
        <div class="eyebrow red-eyebrow">
          Prochaines séances
        </div>

        <h1>
          Les prochaines séances de ${escapeHTML(ownerName)}
        </h1>

        <p class="list-description">
          ${
            list.description
              ? escapeHTML(list.description)
              : `Les films que ${escapeHTML(
                  ownerName
                )} garde précieusement pour une prochaine séance.`
          }
        </p>

        <div class="list-hero-meta">
          <span>${movieCount} ${movieLabel} attendent leur séance</span>
          <span>Liste publique</span>
        </div>
      </div>

      ${
        isOwner
          ? `
            <a class="button-secondary" href="profil.html">
              Gérer ma liste À voir
            </a>
          `
          : ""
      }
    </section>

    <section class="list-movies-section">
      <div class="section-title">
        <div>
          <div class="eyebrow red-eyebrow">À découvrir</div>
          <h2>Les films qui attendent leur séance</h2>
        </div>
      </div>

      <div class="list-movies-grid">
        ${
          movies.length
            ? movies.map(renderListMovieCard).join("")
            : `
              <div class="empty-state">
                <strong>Cette liste À voir est encore vide.</strong>
                <br /><br />
                ${
                  isOwner
                    ? `
                      Ouvre une fiche film et clique sur
                      « Ajouter à ma liste À voir ».
                    `
                    : `
                      ${escapeHTML(
                        ownerName
                      )} n’a pas encore ajouté de film à ses prochaines séances.
                    `
                }
              </div>
            `
        }
      </div>
    </section>
  `;
}

async function loadListPage() {
  const listId = getListIdFromUrl();

  if (!listId) {
    renderListError("Aucun identifiant de liste n’a été transmis.");
    return;
  }

  try {
    const { data: list, error: listError } = await supabaseClient
      .from("movie_lists")
      .select(`
        id,
        user_id,
        title,
        description,
        is_public,
        list_type,
        created_at
      `)
      .eq("id", listId)
      .maybeSingle();

    if (listError) {
      throw listError;
    }

    /*
      Une liste privée renvoie null aux autres membres
      grâce aux règles RLS Supabase.
    */
    if (!list) {
      renderListError(
        "Cette liste est privée, n’existe plus ou n’est pas accessible."
      );
      return;
    }

    const { data: items, error: itemsError } = await supabaseClient
      .from("movie_list_items")
      .select(`
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
      .eq("list_id", list.id)
      .order("created_at", { ascending: false });

    if (itemsError) {
      throw itemsError;
    }

    const [ownerName] = await Promise.all([
      getListOwnerName(list.user_id)
    ]);

    const movies = (items || [])
      .map((item) => item.movies)
      .filter(Boolean);

    const isOwner = currentUser?.id === list.user_id;
    const isWishlist = list.list_type === "wishlist";

    document.title = isWishlist
      ? `Les prochaines séances de ${ownerName} — Le dernier rang`
      : `${list.title} — Le dernier rang`;

    listPageContent.innerHTML = isWishlist
      ? renderWishlistPage(list, ownerName, movies, isOwner)
      : renderStandardListPage(list, ownerName, movies, isOwner);
  } catch (error) {
    console.error("Erreur de chargement de la liste :", error);

    renderListError(
      "Une erreur est survenue pendant le chargement de cette liste."
    );
  }
}

document.addEventListener("authChanged", () => {
  loadListPage();
});

loadListPage();
