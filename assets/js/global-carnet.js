
/* =====================================================
   CINÉ MOJITO — AJOUT AU CARNET DEPUIS N'IMPORTE QUELLE PAGE
   Dépendances :
   - supabaseClient
   - currentUser
   - publishReview() depuis reviews.js
   - setAuthMode(), openAuthModal(), showAuthMessage()
   ===================================================== */

const globalCarnetModal = document.getElementById(
  "globalCarnetModal"
);

const globalCarnetCloseButton = document.getElementById(
  "closeGlobalCarnetModal"
);

const globalCarnetForm = document.getElementById(
  "globalCarnetForm"
);

const globalCarnetMovie = document.getElementById(
  "globalCarnetMovie"
);

const globalCarnetMessage = document.getElementById(
  "globalCarnetMessage"
);

const globalCarnetRating = document.getElementById(
  "globalCarnetRating"
);

const globalCarnetContent = document.getElementById(
  "globalCarnetContent"
);

const globalCarnetCharacterCounter = document.getElementById(
  "globalCarnetCharacterCounter"
);

const globalCarnetSubmitButton = document.getElementById(
  "globalCarnetSubmitButton"
);

let globalCarnetSelectedMovie = null;


let globalCarnetContext = {
  returnToSearch: false,
  onSuccess: null,
  initialRating: null
};


/* =====================================================
   OUTILS
   ===================================================== */

function getGlobalCarnetPrimaryGenre(movie) {
  const genres = movie?.genres || [];

  if (genres.includes("Drame")) return "Drame";
  if (genres.includes("Romance")) return "Romance";
  if (genres.includes("Horreur")) return "Horreur";
  if (genres.includes("Animation")) return "Animation";

  if (
    genres.includes("Science-Fiction") ||
    genres.includes("Science fiction") ||
    genres.includes("Science-Fiction & Fantastique")
  ) {
    return "Science-fiction";
  }

  if (genres.includes("Comédie")) return "Comédie";
  if (genres.includes("Documentaire")) return "Documentaire";
  if (genres.includes("Thriller")) return "Thriller";

  return genres[0] || "Cinéma";
}

function showGlobalCarnetMessage(message, type = "") {
  if (!globalCarnetMessage) {
    return;
  }

  globalCarnetMessage.textContent = message;
  globalCarnetMessage.className = "status-message";

  if (message) {
    globalCarnetMessage.classList.add("visible", type);
  }
}

function clearGlobalCarnetMessage() {
  if (!globalCarnetMessage) {
    return;
  }

  globalCarnetMessage.textContent = "";
  globalCarnetMessage.className = "status-message";
}

function updateGlobalCarnetCharacterCounter() {
  if (!globalCarnetContent || !globalCarnetCharacterCounter) {
    return;
  }

  const maximum = Number(globalCarnetContent.maxLength || 140);
  const length = globalCarnetContent.value.length;

  globalCarnetCharacterCounter.textContent = `${length} / ${maximum}`;

  globalCarnetCharacterCounter.classList.toggle(
    "limit-reached",
    length >= maximum
  );
}

async function getGlobalCarnetTmdbDetails(tmdbId) {
  const { data, error } = await supabaseClient.functions.invoke(
    "tmdb-details",
    {
      body: {
        movieId: tmdbId
      }
    }
  );

  if (error) {
    throw error;
  }

  if (!data?.result) {
    throw new Error("Les détails du film sont introuvables.");
  }

  return data.result;
}

function renderGlobalCarnetMovie(movie) {
  if (!globalCarnetMovie) {
    return;
  }

  const title = movie?.title || "Film sans titre";

  const metadata = [
    movie?.release_year,
    movie?.director
  ]
    .filter(Boolean)
    .join(" · ");

  const posterMarkup = movie?.poster_url
    ? `
      <img
        src="${escapeHTML(movie.poster_url)}"
        alt="Affiche de ${escapeHTML(title)}"
      />
    `
    : `
      <div class="global-carnet-movie-placeholder">
        ${escapeHTML(title.charAt(0).toUpperCase() || "?")}
      </div>
    `;

  globalCarnetMovie.hidden = false;

  globalCarnetMovie.innerHTML = `
    <div class="global-carnet-movie-poster">
      ${posterMarkup}
    </div>

    <div class="global-carnet-movie-copy">
      <span>Film sélectionné</span>
      <strong>${escapeHTML(title)}</strong>

      ${
        metadata
          ? `<small>${escapeHTML(metadata)}</small>`
          : ""
      }
    </div>
  `;
}

function hideGlobalCarnetMovie() {
  if (!globalCarnetMovie) {
    return;
  }

  globalCarnetMovie.hidden = true;
  globalCarnetMovie.innerHTML = "";
}

function restoreGlobalSearchIfNeeded() {
  if (!globalCarnetContext.returnToSearch) {
    return;
  }

  const searchModal = document.getElementById(
    "globalMovieSearchModal"
  );

  if (!searchModal) {
    return;
  }

  searchModal.removeAttribute("hidden");
  searchModal.classList.add("visible");
  searchModal.setAttribute("aria-hidden", "false");
}


function closeGlobalCarnetModal() {
  if (!globalCarnetModal) {
    return;
  }

  /*
    On mémorise le contexte avant de le réinitialiser :
    depuis la recherche navbar, on veut retrouver la recherche
    exactement comme elle était.
  */
  const shouldReturnToSearch =
    globalCarnetContext.returnToSearch;

  globalCarnetModal.classList.remove("visible");
  globalCarnetModal.setAttribute("hidden", "");
  globalCarnetModal.setAttribute("aria-hidden", "true");

  globalCarnetForm?.reset();

  globalCarnetSelectedMovie = null;

  hideGlobalCarnetMovie();
  clearGlobalCarnetMessage();
  updateGlobalCarnetCharacterCounter();


  globalCarnetContext = {
    returnToSearch: false,
    onSuccess: null,
    initialRating: null
  };


  if (shouldReturnToSearch) {
    const searchModal = document.getElementById(
      "globalMovieSearchModal"
    );

    if (searchModal) {
      searchModal.removeAttribute("hidden");
      searchModal.classList.add("visible");
      searchModal.setAttribute("aria-hidden", "false");
    }
  }

  const anotherModalIsOpen = Boolean(
    document.querySelector(".modal.visible, .modal-overlay.visible")
  );

  document.body.classList.toggle(
    "modal-open",
    anotherModalIsOpen
  );
}


/* =====================================================
   OUVERTURE
   ===================================================== */

async function openGlobalCarnetModal(movieOrTmdbId, options = {}) {
  if (!currentUser) {
    setAuthMode("login");
    openAuthModal();

    showAuthMessage(
      "Connecte-toi ou crée un compte pour ajouter un film à ton carnet.",
      "error"
    );

    return;
  }

  const tmdbId = Number(
    typeof movieOrTmdbId === "object"
      ? movieOrTmdbId?.tmdb_id
      : movieOrTmdbId
  );

  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    alert("Impossible d’identifier ce film.");
    return;
  }


  const initialRating = Number(options.initialRating);

  const allowedRatings = [
    0.5,
    1,
    1.5,
    2,
    2.5,
    3,
    3.5,
    4,
    4.5,
    5
  ];

  globalCarnetContext = {
    returnToSearch: Boolean(options.returnToSearch),
    onSuccess:
      typeof options.onSuccess === "function"
        ? options.onSuccess
        : null,
    initialRating: allowedRatings.includes(initialRating)
      ? initialRating
      : null
  };


  /*
    Depuis la recherche globale, on masque temporairement
    la recherche sans effacer sa saisie ni ses résultats.
  */
  if (globalCarnetContext.returnToSearch) {
    const searchModal = document.getElementById(
      "globalMovieSearchModal"
    );

    searchModal?.classList.remove("visible");
    searchModal?.setAttribute("aria-hidden", "true");
  }

  globalCarnetModal?.removeAttribute("hidden");
  globalCarnetModal?.classList.add("visible");
  globalCarnetModal?.setAttribute("aria-hidden", "false");

  document.body.classList.add("modal-open");

   
  globalCarnetForm?.reset();

  /*
    Une note peut être préremplie depuis les étoiles
    affichées sur une fiche film.
  */
  if (
    globalCarnetRating &&
    globalCarnetContext.initialRating !== null
  ) {
    globalCarnetRating.value = String(
      globalCarnetContext.initialRating
    );
  }

  clearGlobalCarnetMessage();
  hideGlobalCarnetMovie();
  updateGlobalCarnetCharacterCounter();


  if (globalCarnetSubmitButton) {
    globalCarnetSubmitButton.disabled = true;
    globalCarnetSubmitButton.textContent = "Préparation…";
  }

  try {
    /*
      On recharge toujours les détails complets : les résultats
      de recherche légère ne possèdent pas nécessairement genres,
      réalisateur ou synopsis.
    */
    globalCarnetSelectedMovie = await getGlobalCarnetTmdbDetails(
      tmdbId
    );

    renderGlobalCarnetMovie(globalCarnetSelectedMovie);

    window.setTimeout(() => {
      globalCarnetRating?.focus();
    }, 50);
  } catch (error) {
    console.error(
      "Erreur lors du chargement du film pour le carnet :",
      error
    );

    showGlobalCarnetMessage(
      "Impossible de préparer ce film. Réessaie dans un instant.",
      "error"
    );
  } finally {
    if (globalCarnetSubmitButton) {
      globalCarnetSubmitButton.disabled =
        !globalCarnetSelectedMovie;

      globalCarnetSubmitButton.textContent =
        "Ajouter à mon carnet";
    }
  }
}

/* =====================================================
   PUBLICATION
   ===================================================== */

async function submitGlobalCarnetEntry(event) {
  event.preventDefault();

  if (!currentUser) {
    closeGlobalCarnetModal();

    setAuthMode("login");
    openAuthModal();

    showAuthMessage(
      "Connecte-toi pour ajouter ce film à ton carnet.",
      "error"
    );

    return;
  }

  if (!globalCarnetSelectedMovie) {
    showGlobalCarnetMessage(
      "Le film n’est pas encore prêt. Réessaie dans un instant.",
      "error"
    );

    return;
  }

  const rating = globalCarnetRating?.value || "";
  const content = globalCarnetContent?.value.trim() || "";

  if (!rating) {
    showGlobalCarnetMessage(
      "Choisis une note avant d’ajouter ce film à ton carnet.",
      "error"
    );

    globalCarnetRating?.focus();
    return;
  }

  if (globalCarnetSubmitButton) {
    globalCarnetSubmitButton.disabled = true;
    globalCarnetSubmitButton.textContent = "Ajout…";
  }

  clearGlobalCarnetMessage();

  try {
    const movie = globalCarnetSelectedMovie;


    const publishedEntry = await publishReview({
      title: movie.title || "Film sans titre",
      tmdbMovie: movie,
      year: movie.release_year || "",
      director: movie.director || "",
      genre: getGlobalCarnetPrimaryGenre(movie),
      rating,
      content: content || null,
      tags: []
    });

    /*
      Enrichissement discret du catalogue :
      réalisation + 8 premiers rôles TMDB.
      Une erreur de cache ne doit jamais empêcher la publication.
    */
    if (
      publishedEntry?.movieId &&
      typeof syncMovieTalentsSafely === "function"
    ) {
      await syncMovieTalentsSafely(
        publishedEntry.movieId,
        movie
      );
    }


    showGlobalCarnetMessage(
      content
        ? "Ta microcritique est ajoutée à ton carnet. ✨"
        : "Ta note est ajoutée à ton carnet. ✨",
      "success"
    );

    const onSuccess = globalCarnetContext.onSuccess;

    window.setTimeout(async () => {
      closeGlobalCarnetModal();

      if (onSuccess) {
        await onSuccess();
      }
    }, 800);
  } catch (error) {
    console.error(
      "Erreur lors de l’ajout global au carnet :",
      error
    );

    showGlobalCarnetMessage(
      `Impossible d’ajouter ce film à ton carnet : ${error.message}`,
      "error"
    );
  } finally {
    if (globalCarnetSubmitButton) {
      globalCarnetSubmitButton.disabled = false;
      globalCarnetSubmitButton.textContent =
        "Ajouter à mon carnet";
    }
  }
}

/* =====================================================
   ÉVÉNEMENTS
   ===================================================== */

globalCarnetContent?.addEventListener(
  "input",
  updateGlobalCarnetCharacterCounter
);

globalCarnetForm?.addEventListener(
  "submit",
  submitGlobalCarnetEntry
);

globalCarnetCloseButton?.addEventListener(
  "click",
  closeGlobalCarnetModal
);

globalCarnetModal?.addEventListener("click", (event) => {
  if (event.target === globalCarnetModal) {
    closeGlobalCarnetModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    globalCarnetModal?.classList.contains("visible")
  ) {
    closeGlobalCarnetModal();
  }
});
