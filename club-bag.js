// Club bag helpers: add, edit, remove (park on a bench with yards), and sort carry distances.
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

  function findOnBench(bench, name) {
    const key = clubKey(name);
    if (!key) return null;
    return (bench || []).find((club) => clubKey(club.name) === key) || null;
  }

  function upsertBench(bench, club) {
    const list = cloneClubs(bench);
    if (!club || !normalizeClubName(club.name)) return sortBag(list);
    const key = clubKey(club.name);
    const saved = {
      name: normalizeClubName(club.name),
      distance: Number(club.distance) || 0,
      hits: Number(club.hits) || 0
    };
    const index = list.findIndex((item) => clubKey(item.name) === key);
    if (index >= 0) list[index] = saved;
    else list.push(saved);
    return sortBag(list);
  }

  function takeFromBench(bench, name) {
    const list = cloneClubs(bench);
    const key = clubKey(name);
    const index = list.findIndex((item) => clubKey(item.name) === key);
    if (index < 0) return { club: null, bench: list };
    const club = list[index];
    list.splice(index, 1);
    return { club, bench: list };
  }

  function addClubToBag(clubs, name, distance, bench) {
    const list = cloneClubs(clubs);
    const parked = cloneClubs(bench);
    if (list.length >= MAX_CLUBS) {
      return { ok: false, error: `Bag is full (${MAX_CLUBS} clubs).`, clubs: list, bench: parked };
    }
    const clubName = normalizeClubName(name);
    if (!clubName) return { ok: false, error: "Enter a club name.", clubs: list, bench: parked };
    if (list.some((club) => clubKey(club.name) === clubKey(clubName))) {
      return { ok: false, error: `${clubName} is already in the bag.`, clubs: list, bench: parked };
    }
    const remembered = findOnBench(parked, clubName);
    let yards = normalizeClubDistance(distance);
    if (yards == null && remembered) yards = remembered.distance;
    if (yards == null) {
      return { ok: false, error: `Yards must be ${MIN_CLUB_YARDS}–${MAX_CLUB_YARDS}.`, clubs: list, bench: parked };
    }
    const savedName = remembered ? remembered.name : clubName;
    list.push({
      name: savedName,
      distance: yards,
      hits: remembered ? remembered.hits : 0
    });
    return {
      ok: true,
      error: "",
      clubs: sortBag(list),
      bench: takeFromBench(parked, clubName).bench,
      added: savedName,
      restored: Boolean(remembered)
    };
  }

  function updateClubInBag(clubs, index, patch, bench) {
    const list = cloneClubs(clubs);
    let parked = cloneClubs(bench);
    const club = list[index];
    if (!club) return { ok: false, error: "Club not found.", clubs: list, bench: parked };
    if (patch && patch.name != null) {
      const clubName = normalizeClubName(patch.name);
      if (!clubName) return { ok: false, error: "Enter a club name.", clubs: list, bench: parked };
      if (list.some((item, i) => i !== index && clubKey(item.name) === clubKey(clubName))) {
        return { ok: false, error: `${clubName} is already in the bag.`, clubs: list, bench: parked };
      }
      club.name = clubName;
      parked = takeFromBench(parked, clubName).bench;
    }
    if (patch && patch.distance != null) {
      const yards = normalizeClubDistance(patch.distance);
      if (yards == null) {
        return { ok: false, error: `Yards must be ${MIN_CLUB_YARDS}–${MAX_CLUB_YARDS}.`, clubs: list, bench: parked };
      }
      club.distance = yards;
    }
    return { ok: true, error: "", clubs: sortBag(list), bench: parked };
  }

  function removeClubFromBag(clubs, index, bench) {
    const list = cloneClubs(clubs);
    const parked = cloneClubs(bench);
    if (list.length <= MIN_CLUBS) {
      return { ok: false, error: `Keep at least ${MIN_CLUBS} clubs.`, clubs: list, bench: parked };
    }
    if (!list[index]) return { ok: false, error: "Club not found.", clubs: list, bench: parked };
    const club = list[index];
    list.splice(index, 1);
    return {
      ok: true,
      error: "",
      clubs: sortBag(list),
      bench: upsertBench(parked, club),
      removed: club.name
    };
  }

  function restoreClubFromBench(clubs, bench, name) {
    const remembered = findOnBench(bench, name);
    if (!remembered) {
      return { ok: false, error: "Club is not on the bench.", clubs: cloneClubs(clubs), bench: cloneClubs(bench) };
    }
    return addClubToBag(clubs, remembered.name, remembered.distance, bench);
  }

  function resetClubBag(bench) {
    const clubs = cloneClubs(DEFAULT_CLUBS);
    const stockKeys = new Set(clubs.map((club) => clubKey(club.name)));
    const parked = cloneClubs(bench).filter((club) => !stockKeys.has(clubKey(club.name)));
    return { ok: true, error: "", clubs, bench: parked };
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
    restoreClubFromBench,
    findOnBench,
    resetClubBag,
    longestClubFrom,
    clubDownFromDriver,
    layupWedgeFrom
  };
})(typeof window !== "undefined" ? window : globalThis);
