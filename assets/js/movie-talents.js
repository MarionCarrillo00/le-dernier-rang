
/* =====================================================
   CINÉ MOJITO — SYNCHRONISATION DES TALENTS D’UN FILM
   =====================================================

   Rôle :
   - enregistre le ou la réalisateur·rice ;
   - enregistre les 8 premiers rôles TMDB ;
   - évite les doublons dans public.movie_talents.

   Dépendances :
   - supabaseClient
   - currentUser
   ===================================================== */

function normalizeMovieTalentId(value) {
  const numericValue = Number(value);

  return Number.isInteger(numericValue) && numericValue > 0
    ? numericValue
    : null;
}

function getMovieTalentCredits(tmdbDetails) {
  if (!tmdbDetails) {
    return [];
  }

  const credits = [];

  const director = tmdbDetails.director_person;

  const directorId = normalizeMovieTalentId(director?.tmdb_id);

  if (directorId) {
    credits.push({
      tmdb_person_id: directorId,
      person_name:
        String(director?.name || "").trim() ||
        "Réalisateur·rice non précisé·e",
      role_type: "directing",
      cast_order: null,
      profile_url: director?.profile_url || null
    });
  }

  const uniqueActorIds = new Set();

  (tmdbDetails.cast || [])
    .slice(0, 8)
    .forEach((person, index) => {
      const personId = normalizeMovieTalentId(person?.tmdb_id);

      if (!personId || uniqueActorIds.has(personId)) {
        return;
      }

      uniqueActorIds.add(personId);

      credits.push({
        tmdb_person_id: personId,
        person_name:
          String(person?.name || "").trim() ||
          "Interprète non précisé·e",
        role_type: "acting",

        /*
          On conserve l'ordre TMDB réel si disponible.
          Sinon, l'ordre de l'array (0 à 7) reste fiable.
        */
        cast_order:
          Number.isInteger(Number(person?.cast_order)) &&
          Number(person.cast_order) >= 0
            ? Number(person.cast_order)
            : index,

        profile_url: person?.profile_url || null
      });
    });

  return credits;
}

async function syncMovieTalents(movieId, tmdbDetails) {
  /*
    La synchronisation est un enrichissement :
    elle ne doit jamais empêcher l'affichage d'un film
    ou l'ajout d'une note si une personne n'est pas connectée.
  */
  if (!currentUser || !movieId || !tmdbDetails) {
    return [];
  }

  const credits = getMovieTalentCredits(tmdbDetails);

  if (!credits.length) {
    return [];
  }

  const { data: existingTalents, error: existingTalentsError } =
    await supabaseClient
      .from("movie_talents")
      .select("tmdb_person_id, role_type")
      .eq("movie_id", movieId);

  if (existingTalentsError) {
    throw existingTalentsError;
  }

  const existingKeys = new Set(
    (existingTalents || []).map(
      (talent) =>
        `${talent.tmdb_person_id}:${talent.role_type}`
    )
  );

  const missingCredits = credits.filter((credit) => {
    const key =
      `${credit.tmdb_person_id}:${credit.role_type}`;

    return !existingKeys.has(key);
  });

  if (!missingCredits.length) {
    return credits;
  }

  const rowsToInsert = missingCredits.map((credit) => ({
    movie_id: movieId,
    tmdb_person_id: credit.tmdb_person_id,
    person_name: credit.person_name,
    role_type: credit.role_type,
    cast_order: credit.cast_order,
    profile_url: credit.profile_url
  }));

  const { error: insertError } = await supabaseClient
    .from("movie_talents")
    .insert(rowsToInsert);

  /*
    Deux onglets peuvent synchroniser le même film exactement
    au même moment : la contrainte unique protège la base.
    Dans ce cas, on considère que la synchronisation a réussi.
  */
  if (insertError?.code === "23505") {
    return credits;
  }

  if (insertError) {
    throw insertError;
  }

  return credits;
}

async function syncMovieTalentsSafely(movieId, tmdbDetails) {
  try {
    return await syncMovieTalents(movieId, tmdbDetails);
  } catch (error) {
    /*
      Le cache de crédits reste une amélioration progressive :
      on journalise l'erreur sans casser le parcours cinéma.
    */
    console.warn(
      "Impossible de synchroniser les talents de ce film :",
      error
    );

    return [];
  }
}
