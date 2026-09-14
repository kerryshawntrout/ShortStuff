// Local course memory: holes Kerry teaches on-round, stored on this phone.
(function (root) {
  const GENERIC_NAMES = new Set([
    "unmapped course",
    "golf course",
    "on a golf course",
    "on course"
  ]);
  const MATCH_YD = 900;

  function slugCourseName(name) {
    const slug = String(name || "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug || "unnamed-course";
  }

  function isGenericCourseName(name) {
    return !name || GENERIC_NAMES.has(String(name).trim().toLowerCase());
  }

  function clonePoint(pt) {
    if (!pt) return null;
    const lat = Number(pt.lat);
    const lng = Number(pt.lng ?? pt.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  function distanceYards(a, b) {
    const pa = clonePoint(a);
    const pb = clonePoint(b);
    if (!pa || !pb) return Infinity;
    const R = 6371e3;
    const rad = Math.PI / 180;
    const dLat = (pb.lat - pa.lat) * rad;
    const dLng = (pb.lng - pa.lng) * rad;
    const sin = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(pa.lat * rad) * Math.cos(pb.lat * rad) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(sin), Math.sqrt(1 - sin));
    return (R * c) * 1.09361;
  }

  function emptyHole(n, extras) {
    return {
      hole: n,
      par: 4,
      name: null,
      tee: null,
      green: null,
      pin: null,
      hazards: [],
      ...extras
    };
  }

  function gpsKey(pos) {
    const pt = clonePoint(pos);
    if (!pt) return "unnamed-course";
    return `gps-${pt.lat.toFixed(3)}-${pt.lng.toFixed(3)}`;
  }

  function memoryKey(name, pos) {
    if (!isGenericCourseName(name)) return slugCourseName(name);
    return gpsKey(pos);
  }

  function findCourseMemory(store, pos, name) {
    const memories = store || {};
    if (!isGenericCourseName(name)) {
      const slug = slugCourseName(name);
      if (memories[slug]) return memories[slug];
    }
    let best = null;
    let bestYd = MATCH_YD;
    for (const mem of Object.values(memories)) {
      const yd = distanceYards(pos, mem);
      if (yd < bestYd) {
        bestYd = yd;
        best = mem;
      }
    }
    return best || null;
  }

  function upsertHoleMemory(memory, holeNum, patch) {
    const n = Number(holeNum);
    const holes = { ...(memory.holes || {}) };
    const prev = holes[String(n)] || { hole: n };
    const next = { ...prev, hole: n };
    const tee = clonePoint(patch.tee);
    const green = clonePoint(patch.green);
    if (tee) next.tee = tee;
    if (green) next.green = green;
    if (patch.par === 3 || patch.par === 4 || patch.par === 5) next.par = patch.par;
    if (patch.parSet) next.parSet = true;
    next.updatedAt = patch.updatedAt || Date.now();
    holes[String(n)] = next;

    const anchor = tee || green || clonePoint(memory);
    return {
      ...memory,
      holes,
      lat: Number.isFinite(memory.lat) ? memory.lat : anchor?.lat,
      lng: Number.isFinite(memory.lng) ? memory.lng : anchor?.lng
    };
  }

  function mergeCourseModel(osm, memory) {
    const source = osm || {};
    const saved = memory || {};
    const byNum = new Map();
    for (const hole of source.holes || []) {
      const n = Number(hole.hole);
      if (!Number.isInteger(n)) continue;
      byNum.set(n, {
        ...hole,
        hole: n,
        hazards: Array.isArray(hole.hazards) ? hole.hazards.slice() : []
      });
    }

    for (const rec of Object.values(saved.holes || {})) {
      const n = Number(rec.hole);
      if (!Number.isInteger(n) || n < 1 || n > 27) continue;
      const existing = byNum.get(n) || emptyHole(n);
      const merged = { ...existing };
      if (!merged.tee && rec.tee) merged.tee = clonePoint(rec.tee);
      if (!merged.green && rec.green) merged.green = clonePoint(rec.green);
      if (rec.parSet && (rec.par === 3 || rec.par === 4 || rec.par === 5)) {
        merged.par = rec.par;
      } else if (!existing.green && !existing.tee && (rec.par === 3 || rec.par === 4 || rec.par === 5)) {
        merged.par = rec.par;
      }
      if (rec.tee || rec.green) merged.learned = true;
      byNum.set(n, merged);
    }

    const holes = [...byNum.values()].sort((a, b) => a.hole - b.hole);
    const osmName = source.name || source.course?.name;
    const name = !isGenericCourseName(osmName)
      ? osmName
      : (saved.name || osmName || "Golf course");
    return {
      course: source.course || (holes.length ? { name } : null),
      name,
      holes
    };
  }

  function padCourseHoles(holes, currentHole) {
    const list = Array.isArray(holes) ? holes : [];
    const maxMapped = list.reduce((max, hole) => Math.max(max, Number(hole.hole) || 0), 0);
    const current = Number(currentHole) || 0;
    const max = Math.max(maxMapped, current);
    if (!max) return [];
    const last = max >= 10 ? Math.max(18, max) : Math.max(9, max);
    const map = new Map(list.map((hole) => [hole.hole, hole]));
    const out = [];
    for (let i = 1; i <= last; i++) {
      out.push(map.get(i) || emptyHole(i, { missing: true }));
    }
    return out;
  }

  function holeNeedsTee(hole) {
    return !hole || !clonePoint(hole.tee);
  }

  function holeNeedsGreen(hole) {
    return !hole || !clonePoint(hole.green);
  }

  root.CaddieCourseMemory = {
    MATCH_YD,
    slugCourseName,
    isGenericCourseName,
    clonePoint,
    distanceYards,
    gpsKey,
    memoryKey,
    findCourseMemory,
    upsertHoleMemory,
    mergeCourseModel,
    padCourseHoles,
    holeNeedsTee,
    holeNeedsGreen
  };
})(typeof window !== "undefined" ? window : globalThis);
