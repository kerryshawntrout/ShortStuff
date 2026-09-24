// Club bag helpers: add, edit, remove, and sort carry distances.
(function (root) {
  const DEFAULT_CLUBS = [
    { name: "Driver", distance: 220, hits: 0 },
    { name: "5-Wood", distance: 210, hits: 0 },
    { name: "7-Wood", distance: 200, hits: 0 },
    { name: "3-Hybrid", distance: 190, hits: 0 },
    { name: "5-Iron", distance: 180, hits: 0 },
    { name: "6-Iron", distance: 170, hits: 0 },
    { name: "7-Iron", distance: 160, hits: 0 },
    { name: "8-Iron", distance: 150, hits: 0 },
    { name: "9-Iron", distance: 140, hits: 0 },
    { name: "Pitching Wedge", distance: 125, hits: 0 },
    { name: "Gap Wedge", distance: 110, hits: 0 },
    { name: "Sand Wedge", distance: 100, hits: 0 },
    { name: "Lob Wedge", distance: 75, hits: 0 }
  ];

  const MIN_CLUBS = 3;
  const MAX_CLUBS = 16;
  const MIN_CLUB_YARDS = 40;
  const MAX_CLUB_YARDS = 320;
  const MAX_CLUB_NAME_LEN = 18;

  function cloneClubs(clubs) {
    return (clubs || []).map((club) => ({
      name: club.name,
      distance: Number(club.distance) || 0,
      hits: Number(club.hits) || 0
    }));
  }

  function normalizeClubName(name) {
    return String(name || "").replace(/\s+/g, " ").trim().slice(0, MAX_CLUB_NAME_LEN);
  }

  function normalizeClubDistance(value) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n) || n < MIN_CLUB_YARDS || n > MAX_CLUB_YARDS) return null;
    return n;
  }

  function clubKey(name) {
    return normalizeClubName(name).toLowerCase();
  }

  function sortBag(clubs) {
    return cloneClubs(clubs).sort((a, b) => b.distance - a.distance || String(a.name).localeCompare(String(b.name)));
  }

  function addClubToBag(clubs, name, distance) {
    const list = cloneClubs(clubs);
    if (list.length >= MAX_CLUBS) {
      return { ok: false, error: `Bag is full (${MAX_CLUBS} clubs).`, clubs: list };
    }
    const clubName = normalizeClubName(name);
    const yards = normalizeClubDistance(distance);
    if (!clubName) return { ok: false, error: "Enter a club name.", clubs: list };
    if (yards == null) {
      return { ok: false, error: `Yards must be ${MIN_CLUB_YARDS}–${MAX_CLUB_YARDS}.`, clubs: list };
    }
    if (list.some((club) => clubKey(club.name) === clubKey(clubName))) {
      return { ok: false, error: `${clubName} is already in the bag.`, clubs: list };
    }
    list.push({ name: clubName, distance: yards, hits: 0 });
    return { ok: true, error: "", clubs: sortBag(list), added: clubName };
  }

  function updateClubInBag(clubs, index, patch) {
    const list = cloneClubs(clubs);
    const club = list[index];
    if (!club) return { ok: false, error: "Club not found.", clubs: list };
    if (patch && patch.name != null) {
      const clubName = normalizeClubName(patch.name);
      if (!clubName) return { ok: false, error: "Enter a club name.", clubs: list };
      if (list.some((item, i) => i !== index && clubKey(item.name) === clubKey(clubName))) {
        return { ok: false, error: `${clubName} is already in the bag.`, clubs: list };
      }
      club.name = clubName;
    }
    if (patch && patch.distance != null) {
      const yards = normalizeClubDistance(patch.distance);
      if (yards == null) {
        return { ok: false, error: `Yards must be ${MIN_CLUB_YARDS}–${MAX_CLUB_YARDS}.`, clubs: list };
      }
      club.distance = yards;
    }
    return { ok: true, error: "", clubs: sortBag(list) };
  }

  function removeClubFromBag(clubs, index) {
    const list = cloneClubs(clubs);
    if (list.length <= MIN_CLUBS) {
      return { ok: false, error: `Keep at least ${MIN_CLUBS} clubs.`, clubs: list };
    }
    if (!list[index]) return { ok: false, error: "Club not found.", clubs: list };
    const removed = list[index].name;
    list.splice(index, 1);
    return { ok: true, error: "", clubs: sortBag(list), removed };
  }

  function resetClubBag() {
    return { ok: true, error: "", clubs: cloneClubs(DEFAULT_CLUBS) };
  }

  function longestClubFrom(clubs) {
    if (!clubs || !clubs.length) return { name: "Driver", distance: 220, hits: 0 };
    return sortBag(clubs)[0];
  }

  function clubDownFromDriver(clubs, driver) {
    const list = clubs || [];
    const driverName = driver?.name;
    const named = list.find((club) =>
      club.name !== driverName && /wood|hybrid/i.test(club.name || "")
    );
    if (named) return named;
    const shorter = list
      .filter((club) => club.name !== driverName && club.distance < (driver?.distance || Infinity))
      .sort((a, b) => b.distance - a.distance)[0];
    return shorter || { name: "5-Wood", distance: Math.round((driver?.distance || 220) * 0.95) };
  }

  function layupWedgeFrom(clubs) {
    const list = clubs || [];
    const named = list.find((club) => /pitching|gap wedge/i.test(club.name || ""));
    if (named) return named;
    const scoring = list
      .filter((club) => club.distance >= 90 && club.distance <= 125)
      .sort((a, b) => a.distance - b.distance);
    if (scoring[0]) return scoring[0];
    const shortest = [...list].sort((a, b) => a.distance - b.distance)[0];
    return shortest || { name: "Pitching Wedge", distance: 125, hits: 0 };
  }

  root.CaddieBag = {
    DEFAULT_CLUBS,
    MIN_CLUBS,
    MAX_CLUBS,
    MIN_CLUB_YARDS,
    MAX_CLUB_YARDS,
    MAX_CLUB_NAME_LEN,
    cloneClubs,
    normalizeClubName,
    normalizeClubDistance,
    sortBag,
    addClubToBag,
    updateClubInBag,
    removeClubFromBag,
    resetClubBag,
    longestClubFrom,
    clubDownFromDriver,
    layupWedgeFrom
  };
})(typeof window !== "undefined" ? window : globalThis);
