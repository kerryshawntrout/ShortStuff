// GolfCourseAPI scorecards. The API has a course point, par, and yardage.
// It does not publish tee or green coordinates.
(function (root) {
  const ON_COURSE_MILES = 2;

  function courseDisplayName(course) {
    const club = String(course?.club_name || "").replace(/\s+/g, " ").trim();
    const name = String(course?.course_name || "").replace(/\s+/g, " ").trim();
    if (club && name && club.toLowerCase() !== name.toLowerCase()) return `${club}, ${name}`;
    return club || name || "Golf course";
  }

  function teeList(group) {
    return Array.isArray(group) ? group.filter((tee) => tee && typeof tee === "object" && !Array.isArray(tee)) : [];
  }

  function teeSets(course) {
    const tees = course?.tees || {};
    const male = teeList(tees.male);
    const female = teeList(tees.female);
    return { male, female };
  }

  function listTeeNames(course) {
    const sets = teeSets(course);
    const names = [];
    for (const tee of [...sets.male, ...sets.female]) {
      const name = String(tee.tee_name || "").trim();
      if (name && !names.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
        names.push(name);
      }
    }
    return names;
  }

  function pickTee(course, teeName) {
    const sets = teeSets(course);
    const all = [...sets.male, ...sets.female];
    if (!all.length) return null;
    if (teeName) {
      const wanted = String(teeName).trim().toLowerCase();
      const match = all.find((tee) => String(tee.tee_name || "").trim().toLowerCase() === wanted);
      if (match) return match;
    }
    const pool = sets.male.length ? sets.male : sets.female;
    const ranked = [...pool].sort((a, b) => (Number(b.total_yards) || 0) - (Number(a.total_yards) || 0));
    return ranked[Math.floor((ranked.length - 1) / 2)] || ranked[0];
  }

  function parsePar(value) {
    const n = Number(value);
    return n === 3 || n === 4 || n === 5 ? n : 4;
  }

  function courseToModel(course, teeName) {
    const tee = pickTee(course, teeName);
    const holes = (Array.isArray(tee?.holes) ? tee.holes : []).map((hole, index) => {
      const yardage = Number(hole?.yardage);
      const handicap = Number(hole?.handicap);
      return {
        hole: index + 1,
        par: parsePar(hole?.par),
        name: null,
        yardage: Number.isFinite(yardage) && yardage > 0 ? yardage : null,
        handicap: Number.isFinite(handicap) ? handicap : null,
        tee: null,
        green: null,
        pin: null,
        hazards: [],
        missing: true
      };
    });
    const loc = course?.location || {};
    const lat = Number(loc.latitude);
    const lng = Number(loc.longitude);
    const name = courseDisplayName(course);
    return {
      id: course?.id || null,
      name,
      teeName: tee?.tee_name || null,
      tees: listTeeNames(course),
      course: {
        id: course?.id || null,
        name,
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null
      },
      holes
    };
  }

  function unwrapCourse(payload) {
    if (!payload || typeof payload !== "object") return null;
    if (payload.course && typeof payload.course === "object" && payload.course.id) return payload.course;
    if (payload.id && (payload.club_name || payload.course_name || payload.tees)) return payload;
    return null;
  }

  function withinOnCourse(result, miles = ON_COURSE_MILES) {
    const distance = Number(result?.distance);
    return Number.isFinite(distance) && distance <= miles;
  }

  root.GolfCourseApi = {
    ON_COURSE_MILES,
    courseDisplayName,
    listTeeNames,
    pickTee,
    courseToModel,
    unwrapCourse,
    withinOnCourse
  };
})(typeof window !== "undefined" ? window : globalThis);
