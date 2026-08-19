
const globalMovieSearchModal = document.getElementById(
  "globalMovieSearchModal"
);

const globalMovieSearchOpenButton = document.getElementById(
  "openGlobalMovieSearch"
);

const globalMovieSearchCloseButton = document.getElementById(
  "closeGlobalMovieSearch"
);

const globalMovieSearchInput = document.getElementById(
  "globalMovieSearchInput"
);

const globalMovieSearchResults = document.getElementById(
  "globalMovieSearchResults"
);

let globalMovieSearchTimeout = null;
let latestGlobalMovieSearchQuery = "";

function openGlobalMovieSearch() {
  if (!globalMovieSearchModal) {
    return;
  }

  /*
    Évite de laisser une autre modale ouverte derrière la recherche.
  */
  document
    .querySelectorAll(".modal.visible, .modal-overlay.visible")
    .forEach((modal) => {
      if (modal.id !== "globalMovieSearchModal") {
        modal.classList.remove("visible");
      }
    });

  /*
    Important : la modale est initialement masquée avec l'attribut
    HTML hidden. Il faut le retirer avant d'ajouter .visible.
  */
  globalMovieSearchModal.removeAttribute("hidden");
  globalMovieSearchModal.classList.add("visible");
  globalMovieSearchModal.setAttribute("aria-hidden", "false");

  document.body.classList.add("modal-open");

  window.setTimeout(() => {
    globalMovieSearchInput?.focus();
  }, 50);
}



function closeGlobalMovieSearch() {
  if (!globalMovieSearchModal) {
    return;
  }

  globalMovieSearchModal.classList.remove("visible");
  globalMovieSearchModal.setAttribute("hidden", "");
  globalMovieSearchModal.setAttribute("aria-hidden", "true");

  if (globalMovieSearchInput) {
    globalMovieSearchInput.value = "";
  }

  clearGlobalMovieSearchResults();

  const anotherModalIsOpen = Boolean(
    document.querySelector(".modal.visible, .modal-overlay.visible")
  );

  document.body.classList.toggle(
    "modal-open",
    anotherModalIsOpen
  );

  globalMovieSearchOpenButton?.focus();
}


function clearGlobalMovieSearchResults() {
  if (!globalMovieSearchResults) {
    return;
  }

  globalMovieSearchResults.innerHTML = "";
}

function renderGlobalMovieSearchMessage(message) {
  if (!globalMovieSearchResults) {
    return;
  }

  globalMovieSearchResults.innerHTML = `
    <p class="global-movie-search-message">
      ${escapeHTML(message)}
    </p>
  `;
}

function getGlobalMoviePrimaryGenre(movie) {
  const genres = movie?.genres || [];

  if (genres.includes("Drame")) return "Drame";
  if (genres.includes("Romance")) return "Romance";
  if (genres.includes("Horreur")) return "Horreur";
  if (genres.includes("Animation")) return "Animation";
  if (genres.includes("Comédie")) return "Comédie";
  if (genres.includes("Documentaire")) return "Documentaire";
  if (genres.includes("Thriller")) return "Thriller";

  if (
    genres.includes("Science-Fiction") ||
    genres.includes("Science fiction") ||
    genres.includes("Science-Fiction & Fantastique")
  ) {
    return "Science-fiction";
  }

  return genres[0] || "";
}

function buildGlobalMovieMeta(movie) {
  const details = [
    movie.release_year || "",
    movie.director || "",
    getGlobalMoviePrimaryGenre(movie)
  ].filter(Boolean);

  return details.join(" · ");
}

function getGlobalMoviePosterMarkup(movie) {
  const title = movie.title || "Film sans titre";

  if (movie.poster_url) {
    return `
      <img
        src="${escapeHTML(movie.poster_url)}"
        alt="Affiche de ${escapeHTML(title)}"
        loading="lazy"
      />
    `;
  }

  return `
    <span class="global-movie-poster-placeholder">
      ${escapeHTML(title.charAt(0).toUpperCase() || "?")}
    </span>
  `;
}

function openGlobalMoviePage(tmdbId) {
  if (!tmdbId) {
    return;
  }

  window.location.href =
    `film.html?tmdb=${encodeURIComponent(tmdbId)}`;
}


function addGlobalMovieToCarnet(movie) {
  if (!movie?.tmdb_id) {
    return;
  }

  if (typeof openGlobalCarnetModal !== "function") {
    console.error(
      "La modale globale d’ajout au carnet est indisponible."
    );

    return;
  }

  openGlobalCarnetModal(movie, {
    /*
      La recherche se referme juste le temps de saisir la note,
      puis revient exactement au même endroit à la fermeture.
    */
    returnToSearch: true
  });
}


async function getOrCreateGlobalWishlist() {
  if (!currentUser) {
    throw new Error("AUTH_REQUIRED");
  }

  const { data: existingWishlist, error: searchError } =
    await supabaseClient
      .from("movie_lists")
      .select("id")
      .eq("user_id", currentUser.id)
      .eq("list_type", "wishlist")
      .maybeSingle();

  if (searchError) {
    throw searchError;
  }

  if (existingWishlist) {
    return existingWishlist;
  }

  const { data: createdWishlist, error: createError } =
    await supabaseClient
      .from("movie_lists")
      .insert({
        user_id: currentUser.id,
        title: "À voir",
        description:
          "Les films que je garde pour une prochaine séance.",
        is_public: true,
        list_type: "wishlist"
      })
      .select("id")
      .single();

  /*
    Protection si la wishlist a été créée en parallèle
    dans un autre onglet.
  */
  if (createError?.code === "23505") {
    const { data: concurrentWishlist, error: retryError } =
      await supabaseClient
        .from("movie_lists")
        .select("id")
        .eq("user_id", currentUser.id)
        .eq("list_type", "wishlist")
        .maybeSingle();

    if (retryError) {
      throw retryError;
    }

    if (concurrentWishlist) {
      return concurrentWishlist;
    }
  }

  if (createError) {
    throw createError;
  }

  return createdWishlist;
}

async function getOrCreateGlobalCatalogMovie(movie) {
  if (!currentUser) {
    throw new Error("AUTH_REQUIRED");
  }

  if (!movie?.tmdb_id) {
    throw new Error("Ce film ne possède pas d’identifiant TMDB.");
  }

  const { data: existingMovie, error: searchError } =
    await supabaseClient
      .from("movies")
      .select("id")
      .eq("tmdb_id", movie.tmdb_id)
      .maybeSingle();

  if (searchError) {
    throw searchError;
  }

  if (existingMovie) {
    return existingMovie;
  }

  const movieData = {
    tmdb_id: movie.tmdb_id,
    title: movie.title || "Film sans titre",
    original_title: movie.original_title || "",
    release_year: movie.release_year || null,
    director: movie.director || "",
    poster_path: movie.poster_path || null,
    poster_url: movie.poster_url || null,
    overview: movie.overview || "",
    genres: movie.genres || [],
    created_by: currentUser.id
  };

  const { data: createdMovie, error: createError } =
    await supabaseClient
      .from("movies")
      .insert(movieData)
      .select("id")
      .single();

  /*
    Même sécurité : si le film vient d'être créé dans un autre onglet,
    on récupère l'existant plutôt que de signaler un faux échec.
  */
  if (createError?.code === "23505") {
    const { data: concurrentMovie, error: retryError } =
      await supabaseClient
        .from("movies")
        .select("id")
        .eq("tmdb_id", movie.tmdb_id)
        .maybeSingle();

    if (retryError) {
      throw retryError;
    }

    if (concurrentMovie) {
      return concurrentMovie;
    }
  }

  if (createError) {
    throw createError;
  }

  return createdMovie;
}

async function addGlobalMovieToWishlist(movie, button) {
  if (!currentUser) {
    closeGlobalMovieSearch();

    setAuthMode("login");
    openAuthModal();

    showAuthMessage(
      "Connecte-toi ou crée un compte pour garder un film dans ta liste À voir.",
      "error"
    );

    return;
  }

  if (!movie?.tmdb_id) {
    return;
  }

  const originalLabel = button.textContent;

  button.disabled = true;
  button.textContent = "Ajout…";

  try {
    const [wishlist, catalogMovie] = await Promise.all([
      getOrCreateGlobalWishlist(),
      getOrCreateGlobalCatalogMovie(movie)
    ]);

    const { data: existingItem, error: itemSearchError } =
      await supabaseClient
        .from("movie_list_items")
        .select("id")
        .eq("list_id", wishlist.id)
        .eq("movie_id", catalogMovie.id)
        .maybeSingle();

    if (itemSearchError) {
      throw itemSearchError;
    }

    if (existingItem) {
      button.textContent = "Déjà dans À voir";

      window.setTimeout(() => {
        button.textContent = originalLabel;
        button.disabled = false;
      }, 1400);

      return;
    }

    const { error: insertError } = await supabaseClient
      .from("movie_list_items")
      .insert({
        list_id: wishlist.id,
        movie_id: catalogMovie.id
      });

    if (insertError?.code !== "23505" && insertError) {
      throw insertError;
    }

    button.classList.add("is-added");
    button.textContent = "Ajouté à À voir ✓";

    window.setTimeout(() => {
      button.textContent = "Dans ma liste À voir";
    }, 1400);
  } catch (error) {
    console.error(
      "Erreur lors de l’ajout depuis la recherche globale :",
      error
    );

    alert(
      `Impossible d’ajouter ce film à ta liste À voir : ${error.message}`
    );

    button.textContent = originalLabel;
    button.disabled = false;
  }
}

function renderGlobalMovieSearchResults(results) {
  if (!globalMovieSearchResults) {
    return;
  }

  /*
    L’Edge Function renvoie `type: "movie"` ou `type: "person"`.
    La recherche globale de cette version affiche seulement les films.
  */
  const movies = (results || [])
    .filter((result) => result?.type === "movie")
    .slice(0, 7);

  if (!movies.length) {
    renderGlobalMovieSearchMessage(
      "Aucun film trouvé. Essaie avec un autre titre."
    );

    return;
  }

  globalMovieSearchResults.innerHTML = movies
    .map((movie) => {
      const title = movie.title || "Film sans titre";
      const meta = buildGlobalMovieMeta(movie);
      const tmdbId = String(movie.tmdb_id || "");

      return `
        <article
          class="global-movie-result"
          data-tmdb-id="${escapeHTML(tmdbId)}"
        >
          <button
            class="global-movie-result-main"
            type="button"
            data-global-movie-open="${escapeHTML(tmdbId)}"
            aria-label="Ouvrir la fiche de ${escapeHTML(title)}"
          >
            <span class="global-movie-poster">
              ${getGlobalMoviePosterMarkup(movie)}
            </span>

            <span class="global-movie-result-copy">
              <strong>${escapeHTML(title)}</strong>

              ${
                meta
                  ? `<span>${escapeHTML(meta)}</span>`
                  : ""
              }
            </span>

            <span
              class="global-movie-result-arrow"
              aria-hidden="true"
            >
              →
            </span>
          </button>

          <div class="global-movie-result-actions">
            <button
              class="global-movie-wishlist-action"
              type="button"
              data-global-movie-wishlist="${escapeHTML(tmdbId)}"
            >
              + À voir
            </button>

            <button
              class="global-movie-carnet-action"
              type="button"
              data-global-movie-carnet="${escapeHTML(tmdbId)}"
            >
              Noter
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  movies.forEach((movie) => {
    const tmdbId = String(movie.tmdb_id || "");

    /*
      Recherche limitée à la modale : plus propre et évite
      de récupérer un éventuel bouton similaire ailleurs sur la page.
    */
    const openButton = globalMovieSearchResults.querySelector(
      `[data-global-movie-open="${CSS.escape(tmdbId)}"]`
    );

    const wishlistButton = globalMovieSearchResults.querySelector(
      `[data-global-movie-wishlist="${CSS.escape(tmdbId)}"]`
    );

    const carnetButton = globalMovieSearchResults.querySelector(
      `[data-global-movie-carnet="${CSS.escape(tmdbId)}"]`
    );

    openButton?.addEventListener("click", () => {
      openGlobalMoviePage(movie.tmdb_id);
    });

    wishlistButton?.addEventListener("click", () => {
      addGlobalMovieToWishlist(movie, wishlistButton);
    });

    carnetButton?.addEventListener("click", () => {
      addGlobalMovieToCarnet(movie.tmdb_id);
    });
  });
}


async function searchGlobalMovies(query) {
  const cleanQuery = String(query || "").trim();

  if (cleanQuery.length < 2) {
    clearGlobalMovieSearchResults();
    return;
  }

  latestGlobalMovieSearchQuery = cleanQuery;

  renderGlobalMovieSearchMessage("Recherche dans le cinéma…");

  try {
    const { data, error } = await supabaseClient.functions.invoke(
      "tmdb-discover",
      {
        body: {
          query: cleanQuery
        }
      }
    );

    /*
      Compatibilité avec ton ancienne Edge Function tmdb-search,
      si tmdb-discover n'est pas celle actuellement déployée.
    */
    if (error) {
      const fallback = await supabaseClient.functions.invoke(
        "tmdb-search",
        {
          body: {
            query: cleanQuery
          }
        }
      );

      if (fallback.error) {
        throw fallback.error;
      }

      if (latestGlobalMovieSearchQuery !== cleanQuery) {
        return;
      }

      renderGlobalMovieSearchResults(fallback.data?.results || []);
      return;
    }

    if (latestGlobalMovieSearchQuery !== cleanQuery) {
      return;
    }

    renderGlobalMovieSearchResults(data?.results || []);
  } catch (error) {
    console.error(
      "Erreur de recherche globale de films :",
      error
    );

    if (latestGlobalMovieSearchQuery === cleanQuery) {
      renderGlobalMovieSearchMessage(
        "Impossible de rechercher des films pour le moment."
      );
    }
  }
}

function setupGlobalMovieSearch() {
  globalMovieSearchOpenButton?.addEventListener(
    "click",
    openGlobalMovieSearch
  );

  globalMovieSearchCloseButton?.addEventListener(
    "click",
    closeGlobalMovieSearch
  );

  globalMovieSearchModal?.addEventListener("click", (event) => {
    if (event.target === globalMovieSearchModal) {
      closeGlobalMovieSearch();
    }
  });

  globalMovieSearchInput?.addEventListener("input", () => {
    const query = globalMovieSearchInput.value;

    clearTimeout(globalMovieSearchTimeout);

    if (query.trim().length < 2) {
      latestGlobalMovieSearchQuery = "";
      clearGlobalMovieSearchResults();
      return;
    }

    globalMovieSearchTimeout = window.setTimeout(() => {
      searchGlobalMovies(query);
    }, 350);
  });

  globalMovieSearchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeGlobalMovieSearch();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      globalMovieSearchModal?.classList.contains("visible")
    ) {
      closeGlobalMovieSearch();
    }
  });
}

setupGlobalMovieSearch();
