// ==========================================
// 1. STATE MANAGEMENT & LOCAL STORAGE
// ==========================================
if (typeof window !== "undefined" && !window.CaddieBag) {
  window.CaddieBag = {
    DEFAULT_CLUBS: [],
    MIN_CLUBS: 3,
    MAX_CLUBS: 16,
    MIN_CLUB_YARDS: 40,
    MAX_CLUB_YARDS: 320,
    MAX_CLUB_NAME_LEN: 18,
    cloneClubs(clubs) { return clubs || []; },
    addClubToBag(clubs) { return { ok: false, error: "Bag helper missing.", clubs: clubs || [], bench: [] }; },
    updateClubInBag(clubs) { return { ok: false, error: "Bag helper missing.", clubs: clubs || [], bench: [] }; },
    removeClubFromBag(clubs) { return { ok: false, error: "Bag helper missing.", clubs: clubs || [], bench: [] }; },
    restoreClubFromBench(clubs, bench) { return { ok: false, error: "Bag helper missing.", clubs: clubs || [], bench: bench || [] }; },
    findOnBench() { return null; },
    sortBag(clubs) { return clubs || []; },
    resetClubBag() { return { ok: false, error: "Bag helper missing.", clubs: [], bench: [] }; },
    longestClubFrom() { return { name: "Driver", distance: 220 }; },
    clubDownFromDriver() { return { name: "5-Wood", distance: 210 }; },
    layupWedgeFrom() { return { name: "Pitching Wedge", distance: 125 }; }
  };
}

const Bag = (typeof window !== "undefined" && window.CaddieBag) ? window.CaddieBag : globalThis.CaddieBag;
if (typeof globalThis.CaddieVoice === "undefined") {
  globalThis.CaddieVoice = {
    isEnglishVoice() { return false; },
    isIrishVoice() { return false; },
    voiceGenderScore() { return 0; },
    scoreCaddieVoice() { return 0; },
    pickCaddieVoice() { return null; },
    speechSettings() { return { lang: "en-GB", pitch: 0.86, rate: 0.94 }; },
    describeCaddieVoice() { return "No English voice yet. Install English (Ireland) and Connor, or English (UK) and Daniel."; }
  };
}
const Voice = (typeof window !== "undefined" && window.CaddieVoice) ? window.CaddieVoice : globalThis.CaddieVoice;
if (typeof globalThis.GolfCourseApi === "undefined") {
  globalThis.GolfCourseApi = {
    ON_COURSE_MILES: 2,
    courseDisplayName() { return "Golf course"; },
    listTeeNames() { return []; },
    pickTee() { return null; },
    courseToModel() { return { id: null, name: "Golf course", teeName: null, tees: [], holes: [] }; },
    unwrapCourse(payload) { return payload || null; },
    withinOnCourse() { return false; },
    normalizeApiKey(value) { return String(value || "").trim(); }
  };
}
const GolfApi = (typeof window !== "undefined" && window.GolfCourseApi) ? window.GolfCourseApi : globalThis.GolfCourseApi;
const DEFAULT_CLUBS = Bag.DEFAULT_CLUBS;
const MIN_CLUBS = Bag.MIN_CLUBS;
const MAX_CLUBS = Bag.MAX_CLUBS;
const MIN_CLUB_YARDS = Bag.MIN_CLUB_YARDS;
const MAX_CLUB_YARDS = Bag.MAX_CLUB_YARDS;
const MAX_CLUB_NAME_LEN = Bag.MAX_CLUB_NAME_LEN;

const TELEMETRY_REFRESH_MS = 25000;
const COURSE_REQUERY_YD = 350;
const COURSE_REQUERY_MS = 4 * 60 * 1000;
const API_TIMEOUT_MS = 10000;
const NEARBY_PIN_YD = 2200;
const TEE_PROXIMITY_YD = 80;
const GPS_UI_MS = 800;
const RESUME_DEBOUNCE_MS = 800;
const MAX_COURSE_MEMORIES = 6;
const MAX_SAVED_ROUNDS = 12;
const APP_VERSION = "v20";

if (typeof window !== "undefined" && !window.CaddieCourseMemory) {
  window.CaddieCourseMemory = {
    holeNeedsGreen() { return false; },
    holeNeedsTee() { return true; },
    padCourseHoles(holes) { return holes || []; },
    findCourseMemory() { return null; },
    mergeCourseModel(model) { return model || { holes: [] }; },
    upsertHoleMemory(memory) { return memory; },
    memoryKey() { return "unnamed-course"; },
    slugCourseName() { return "unnamed-course"; },
    isGenericCourseName() { return true; },
    holeLoopName() { return ""; },
    courseNameForLoop(courseName) { return courseName || "Golf course"; },
    selectHolesByLoop(holes) { return { holes: holes || [], loopName: "" }; }
  };
}

const GOLF_API_BASE = "https://api.golfcourseapi.com";
const GOLF_API_KEY = "caddie_golfcourse_api_key";

const DEMO_MODE = new URLSearchParams(window.location.search).get("demo");
const DEMO_POSITIONS = {
  home: { lat: 40.440624, lng: -79.995888 },
  course: { lat: 40.438009, lng: -79.934861 },
  learn: { lat: 40.438009, lng: -79.934861 }
};
const OSM_GAP_HOLES = new Set([5, 6, 7, 16]);
const COURSE_MEMORY_KEY = "caddie_course_memory";
const CLUB_BENCH_KEY = "caddie_clubs_bench";

function getDemoCourse() {
  return {
    name: "Bob O'Connor Golf Course",
    holes: [
      { hole: 1, par: 4, name: "Fairfield", tee: { lat: 40.438009, lng: -79.934861 }, green: { lat: 40.438469, lng: -79.937753 }, hazards: [{ type: "bunker", lat: 40.43842, lng: -79.93755 }] },
      { hole: 2, par: 4, name: "The Moor", tee: { lat: 40.438200, lng: -79.937582 }, green: { lat: 40.437009, lng: -79.934240 } },
      { hole: 3, par: 4, name: "Lowlands", tee: { lat: 40.436723, lng: -79.934063 }, green: { lat: 40.437892, lng: -79.938162 } },
      { hole: 4, par: 4, name: "Greenheath", tee: { lat: 40.437382, lng: -79.937890 }, green: { lat: 40.436464, lng: -79.934201 } },
      { hole: 5, par: 3, name: "Belle View", tee: { lat: 40.436229, lng: -79.934066 }, green: { lat: 40.435678, lng: -79.935129 }, hazards: [{ type: "bunker", lat: 40.43580, lng: -79.93485 }] },
      { hole: 6, par: 4, name: "Midlothian", tee: { lat: 40.436241, lng: -79.934780 }, green: { lat: 40.436786, lng: -79.937455 } },
      { hole: 7, par: 3, name: "The Copse", tee: { lat: 40.436681, lng: -79.936571 }, green: { lat: 40.437339, lng: -79.938316 } },
      { hole: 8, par: 4, name: "Midway", tee: { lat: 40.437489, lng: -79.939156 }, green: { lat: 40.439579, lng: -79.939621 } },
      { hole: 9, par: 4, name: "The Ravine", tee: { lat: 40.439480, lng: -79.939963 }, green: { lat: 40.437309, lng: -79.939544 }, hazards: [{ type: "water", lat: 40.43755, lng: -79.93985 }] },
      { hole: 10, par: 4, name: "Westward Ho", tee: { lat: 40.437519, lng: -79.939880 }, green: { lat: 40.438590, lng: -79.942002 } },
      { hole: 11, par: 4, name: "The Meadow", tee: { lat: 40.438927, lng: -79.942319 }, green: { lat: 40.437106, lng: -79.943515 }, hazards: [{ type: "bunker", lat: 40.43725, lng: -79.94330 }] },
      { hole: 12, par: 3, name: "Long Acre", tee: { lat: 40.437017, lng: -79.942996 }, green: { lat: 40.438239, lng: -79.942052 } },
      { hole: 13, par: 4, name: "The Hillside", tee: { lat: 40.437853, lng: -79.942035 }, green: { lat: 40.437119, lng: -79.939772 } },
      { hole: 14, par: 3, name: "The Dell", tee: { lat: 40.437155, lng: -79.939493 }, green: { lat: 40.435674, lng: -79.938935 } },
      { hole: 15, par: 3, name: "San Juan", tee: { lat: 40.435563, lng: -79.938759 }, green: { lat: 40.436074, lng: -79.937051 } },
      { hole: 16, par: 4, name: "Fort Pitt", tee: { lat: 40.436190, lng: -79.936818 }, green: { lat: 40.437228, lng: -79.939272 } },
      { hole: 17, par: 4, name: "Home", tee: { lat: 40.437438, lng: -79.938874 }, green: { lat: 40.439493, lng: -79.939004 } },
      { hole: 18, par: 4, name: "The Reach", tee: { lat: 40.439484, lng: -79.938702 }, green: { lat: 40.438382, lng: -79.935149 } }
    ]
  };
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Ignoring corrupt localStorage key "${key}":`, err);
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Unable to save "${key}":`, err);
  }
}

const OLD_FACTORY_CLUB_NAMES = [
  "Driver", "3-Wood", "4-Iron", "5-Iron", "6-Iron", "7-Iron", "8-Iron",
  "9-Iron", "Pitching Wedge", "Gap Wedge", "Sand Wedge", "Lob Wedge"
];

function cloneClubs(clubs) {
  return Bag.cloneClubs(clubs);
}

function isOldFactoryBag(clubs) {
  if (!Array.isArray(clubs) || clubs.length !== OLD_FACTORY_CLUB_NAMES.length) return false;
  return clubs.every((club, i) => club && club.name === OLD_FACTORY_CLUB_NAMES[i]);
}

function migrateClubBag(stored) {
  if (!stored || !Array.isArray(stored) || stored.length === 0) return cloneClubs(DEFAULT_CLUBS);
  if (!isOldFactoryBag(stored)) return cloneClubs(stored);
  const byName = Object.fromEntries(stored.map((club) => [club.name, club]));
  return DEFAULT_CLUBS.map((fresh) => {
    const prev = byName[fresh.name];
    if (!prev) return { ...fresh };
    return {
      name: fresh.name,
      distance: Number.isFinite(Number(prev.distance)) ? Number(prev.distance) : fresh.distance,
      hits: Number(prev.hits) || 0
    };
  });
}

function loadClubDatabase() {
  const stored = loadJSON("caddie_clubs", null);
  if (!stored || isOldFactoryBag(stored)) {
    const clubs = Bag.sortBag(migrateClubBag(stored));
    saveJSON("caddie_clubs", clubs);
    return clubs;
  }
  return Bag.sortBag(cloneClubs(stored));
}

function loadClubBench() {
  const stored = loadJSON(CLUB_BENCH_KEY, []);
  return Array.isArray(stored) ? Bag.sortBag(stored) : [];
}

let clubDatabase = loadClubDatabase();
let clubBench = loadClubBench();
let playerProfile = loadJSON("caddie_profile", {
  name: "Kerry",
  handicap: 14,
  lateralBias: 0,
  distanceBias: 0
});
if (!playerProfile.name) playerProfile.name = "Kerry";
if (!Number.isFinite(Number(playerProfile.handicap))) playerProfile.handicap = 14;
let roundHistory = loadJSON("caddie_rounds", []);
if (Array.isArray(roundHistory) && roundHistory.length > MAX_SAVED_ROUNDS) {
  roundHistory = roundHistory.slice(0, MAX_SAVED_ROUNDS);
  saveJSON("caddie_rounds", roundHistory);
}
let savedPin = loadJSON("caddie_pin", null);
let targetPin = null;

const savedRound = loadJSON("caddie_active_round", null);
let currentHole = savedRound?.currentHole || 1;
let currentHolePar = savedRound?.currentHolePar || 4;
let currentHoleStrokes = savedRound?.currentHoleStrokes || 0;
let completedHoles = Array.isArray(savedRound?.completedHoles) ? savedRound.completedHoles : [];

let currentPos = null;
let playsLikeDistYards = 0;
let recommendedClubObj = null;
let currentStrategy = "";
let wakeLock = null;
let watchId = null;
let caddieOn = false;
let telemetryInFlight = false;
let lastTelemetryAt = 0;
let lastElevYards = null;
let lastWindData = null;
let lastGpsErrorCode = null;
let locationMode = "searching";
let locationOverride = null;
let detectedCourse = null;
let courseHoles = [];
let pinSource = "none";
let courseMemoryStore = loadJSON(COURSE_MEMORY_KEY, {});
if (!courseMemoryStore || typeof courseMemoryStore !== "object") courseMemoryStore = {};
let activeCourseMemory = null;
let lastCourseQueryAt = 0;
let lastCourseQueryPos = null;
let courseLookupInFlight = false;
let courseLock = null;
let loadedCourse = null;
let proximityBlocked = false;
let caddieVoice = null;
let lastGpsUiAt = 0;
let gpsUiTimer = 0;
let lastResumeAt = 0;

// ==========================================
// 2. INITIALIZATION & LISTENERS
// ==========================================
function onElement(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js")
        .then((reg) => console.log("Service Worker registered:", reg.scope))
        .catch((err) => console.error("Service Worker registration failed:", err));
    }

    onElement("startBtn", "click", toggleCaddie);
    onElement("screenToggleBtn", "click", toggleScreen);
    onElement("bagBackBtn", "click", () => showScreen("round"));
    onElement("markPinBtn", "click", () => markPinHere(true));
    onElement("saveTeeBtn", "click", () => saveTeeHere(true));
    onElement("addStrokeBtn", "click", () => addStroke(true));
    onElement("goodShotBtn", "click", logGoodShot);
    onElement("undoStrokeBtn", "click", () => undoStroke(true));
    onElement("scoreBtn", "click", speakScore);
    onElement("nextHoleBtn", "click", () => completeHole(false, true));
    onElement("skipHoleBtn", "click", () => completeHole(true, true));
    onElement("finishRoundBtn", "click", () => finishRound(true));
    onElement("askCaddieBtn", "click", speakRecommendation);
    onElement("shortBtn", "click", () => logMiss("short"));
    onElement("longBtn", "click", () => logMiss("long"));
    onElement("leftBtn", "click", () => logMiss("left"));
    onElement("rightBtn", "click", () => logMiss("right"));
    onElement("par3Btn", "click", () => setHolePar(3, true));
    onElement("par4Btn", "click", () => setHolePar(4, true));
    onElement("par5Btn", "click", () => setHolePar(5, true));
    onElement("onCourseBtn", "click", () => setLocationOverride("course", true));
    onElement("offCourseBtn", "click", () => setLocationOverride("home", true));
    onElement("whereBtn", "click", speakLocation);
    onElement("previewVoiceBtn", "click", previewCaddieVoice);
    onElement("playerNameInput", "change", (event) => setGolferName(event.target.value, true));
    onElement("playerNameInput", "blur", onNameInputChange);
    onElement("handicapInput", "change", (event) => setHandicap(event.target.value, true));
    onElement("handicapInput", "blur", onHandicapInputChange);
    onElement("addClubBtn", "click", onAddClub);
    onElement("resetBagBtn", "click", onResetBag);
    onElement("newClubName", "keydown", (event) => {
      if (event.key === "Enter") onAddClub();
    });
    onElement("newClubYards", "keydown", (event) => {
      if (event.key === "Enter") onAddClub();
    });
    onElement("newClubName", "blur", onNewClubNameBlur);
    onElement("golfApiKeyInput", "input", scheduleGolfApiKeySave);
    onElement("golfApiKeyInput", "change", () => commitTypedGolfApiKey(true));
    onElement("golfApiKeyInput", "blur", () => commitTypedGolfApiKey(true));
    onElement("golfApiKeyToggle", "click", toggleGolfApiKeyVisibility);
    onElement("courseSearchBtn", "click", onCourseSearch);
    onElement("courseSearchInput", "keydown", (event) => {
      if (event.key === "Enter") onCourseSearch();
    });
    onElement("teeSelect", "change", onTeeChange);

    initSpeechVoices();
    const versionEl = document.getElementById("appVersion");
    if (versionEl) {
      versionEl.textContent = APP_VERSION;
      versionEl.setAttribute("aria-label", `App version ${APP_VERSION}`);
    }
    updateProfileUI();
    renderBagEditor();
    updateScoreUI();
    updatePinUI();
    updateLocationUI();
    updateHeroForMode();
    renderRoundHistory();
    persistCourseMemory();
  } catch (err) {
    console.error("Startup error", err);
  }
  startGpsWatch();
});

function showScreen(name) {
  const onBag = name === "bag";
  const round = document.getElementById("roundScreen");
  const bag = document.getElementById("bagScreen");
  if (round) round.classList.toggle("hidden", onBag);
  if (bag) bag.classList.toggle("hidden", !onBag);
  const btn = document.getElementById("screenToggleBtn");
  if (btn) {
    btn.textContent = onBag ? "Round" : "Bag";
    btn.setAttribute("aria-pressed", onBag ? "true" : "false");
    btn.setAttribute("aria-label", onBag ? "Back to the round" : "Open your bag");
  }
  window.scrollTo(0, 0);
}

function toggleScreen() {
  const bag = document.getElementById("bagScreen");
  showScreen(bag && !bag.classList.contains("hidden") ? "round" : "bag");
}

async function toggleCaddie() {
  if (caddieOn) {
    stopCaddie();
    return;
  }
  await startCaddie();
}

async function startCaddie() {
  caddieOn = true;
  updateStartButton();
  updateStatus("Caddie ready", true);
  speakFeedback(`How's it going, ${golferName()}. Tap the buttons and I'll talk you through the round.`);
  startGpsWatch();
  await requestWakeLock();
}

function stopCaddie() {
  caddieOn = false;
  releaseWakeLock();
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  updateStartButton();
  updateStatus("Standby", false);
}

function startGpsWatch(options = {}) {
  if (watchId !== null) return;
  lastResumeAt = Date.now();

  const demoPos = DEMO_POSITIONS[DEMO_MODE] || (DEMO_MODE === "learn" ? DEMO_POSITIONS.learn : null);
  if (demoPos) {
    watchId = "demo";
    lastGpsErrorCode = null;
    onPositionUpdate({
      coords: { latitude: demoPos.lat, longitude: demoPos.lng, accuracy: 8 }
    });
    return;
  }

  if (!("geolocation" in navigator)) {
    updateStatus("GPS not supported", false, true);
    locationMode = "unknown";
    updateLocationUI("This browser cannot read GPS. Scorekeeping still works.");
    updateHeroForMode();
    return;
  }

  const onFix = (position) => {
    lastGpsErrorCode = null;
    onPositionUpdate(position);
  };
  const onGpsError = (err) => {
    lastGpsErrorCode = err.code;
    console.error("GPS Error:", err);
    const denied = err.code === err.PERMISSION_DENIED;
    updateStatus(denied ? "Location permission denied" : "Waiting for GPS fix", caddieOn, denied);
    if (denied) {
      locationMode = "unknown";
      updateLocationUI("Location permission denied. Scorekeeping still works. Enable GPS to detect a golf course.");
      updateHeroForMode();
      updatePinUI();
    }
  };
  const gpsOptions = {
    enableHighAccuracy: true,
    timeout: 25000,
    maximumAge: options.fresh ? 0 : 15000
  };
  navigator.geolocation.getCurrentPosition(onFix, onGpsError, gpsOptions);
  watchId = navigator.geolocation.watchPosition(onFix, onGpsError, gpsOptions);
}

function stopGpsWatch() {
  if (watchId != null && watchId !== "demo") {
    try {
      navigator.geolocation.clearWatch(watchId);
    } catch (err) {
      // Watch already gone.
    }
  }
  watchId = null;
}

function restartGpsWatch(options = {}) {
  stopGpsWatch();
  startGpsWatch(options);
}

function shouldForceCourseLookup(mode = locationMode, override = locationOverride) {
  if (override === "home") return false;
  return mode !== "course";
}

function resumeLocation() {
  const now = Date.now();
  if (now - lastResumeAt < RESUME_DEBOUNCE_MS) return;
  lastResumeAt = now;
  courseLookupInFlight = false;
  if (shouldForceCourseLookup()) {
    lastCourseQueryAt = 0;
    lastCourseQueryPos = null;
    if (locationMode !== "course" && locationOverride !== "home") {
      updateLocationUI("Checking GPS again after coming back. If you're playing, tap I'm on a course.");
    }
  }
  restartGpsWatch({ fresh: true });
}

async function releaseWakeLock() {
  const lock = wakeLock;
  wakeLock = null;
  if (!lock) return;
  try {
    await lock.release();
  } catch (err) {
    // Already released.
  }
}

// ==========================================
// 4. GPS & TELEMETRY ENGINE
// ==========================================
async function onPositionUpdate(position) {
  currentPos = {
    lat: position.coords.latitude,
    lng: position.coords.longitude
  };
  if (!lastGpsUiAt || locationMode === "searching" || locationMode === "unknown") {
    updateLocationUI();
  }

  try {
    await maybeRefreshCourseContext(currentPos);
  } catch (err) {
    console.error("Course lookup failed", err);
    if (locationMode === "searching") {
      locationMode = "unknown";
      updateLocationUI("GPS is on, but the course map did not load. Tap I'm on a course if you're playing.");
      updateHeroForMode();
    }
  }

  if (caddieOn) {
    updateStatus("Caddie ready", true);
  } else if (locationMode === "course") {
    updateStatus("On course", false);
  } else if (locationMode === "home") {
    updateStatus("At home", false);
  } else if (currentPos) {
    updateStatus("GPS active", false);
  }

  scheduleGpsUi();
}

function scheduleGpsUi() {
  const wait = lastGpsUiAt ? GPS_UI_MS - (Date.now() - lastGpsUiAt) : 0;
  if (wait <= 0) {
    flushGpsUi();
    return;
  }
  if (gpsUiTimer) return;
  gpsUiTimer = setTimeout(flushGpsUi, wait);
}

function flushGpsUi() {
  if (gpsUiTimer) {
    clearTimeout(gpsUiTimer);
    gpsUiTimer = 0;
  }
  lastGpsUiAt = Date.now();
  updateLocationUI();
  refreshYardage();
}

async function refreshYardage() {
  if (!currentPos || !targetPin) {
    const raw = document.getElementById("rawDistance");
    if (raw) {
      raw.innerText = locationMode === "home"
        ? "Off course"
        : (locationMode === "course" ? "No green yet" : "-- yd");
    }
    updatePinUI();
    updateHeroForMode();
    return;
  }

  const rawYards = calculateHaversineDistanceYards(currentPos, targetPin);
  document.getElementById("rawDistance").innerText = `${Math.round(rawYards)} yd`;
  updatePinUI(rawYards);

  const now = Date.now();
  const shouldRefreshTelemetry = !telemetryInFlight && (now - lastTelemetryAt > TELEMETRY_REFRESH_MS || lastWindData === null);

  if (!shouldRefreshTelemetry) {
    applyYardage(rawYards, lastElevYards ?? 0, lastWindData);
    return;
  }

  telemetryInFlight = true;
  try {
    const [elevDiff, windData] = await Promise.all([
      getElevationDiffMeters(currentPos, targetPin),
      getWindData(currentPos)
    ]);

    lastElevYards = elevDiff * 1.09361;
    lastWindData = windData;
    lastTelemetryAt = Date.now();
    applyYardage(rawYards, lastElevYards, lastWindData);
  } catch (err) {
    console.error("API Error - Falling back to raw GPS distance:", err);
    applyYardage(rawYards, lastElevYards ?? 0, lastWindData);
  } finally {
    telemetryInFlight = false;
  }
}

function applyYardage(rawYards, elevAdjustYards, windData) {
  const windAdjustYards = windData
    ? calculateWindAdjustment(currentPos, targetPin, windData, rawYards)
    : 0;

  playsLikeDistYards = Math.round(rawYards + elevAdjustYards + windAdjustYards + (playerProfile.distanceBias || 0));

  const strategy = runCourseManagementEngine(playsLikeDistYards, rawYards);
  recommendedClubObj = getBestClub(strategy.targetDistance, { preferLonger: strategy.preferLonger });
  currentStrategy = strategy.advice;

  document.getElementById("playsLike").innerText = `${playsLikeDistYards} yd`;
  document.getElementById("recommendedClub").innerText = recommendedClubObj
    ? `Club: ${recommendedClubObj.name}`
    : "No club data";
  const planEl = document.getElementById("playPlan");
  if (planEl) planEl.innerText = strategy.planLabel || playStyleLabel();
  document.getElementById("strategyAdvice").innerText = strategy.advice;
  document.getElementById("elevDiff").innerText = `${elevAdjustYards >= 0 ? "+" : ""}${Math.round(elevAdjustYards)} yd`;

  if (windData) {
    document.getElementById("windInfo").innerText = `${Math.round(windData.speed)} mph @ ${windData.direction}°`;
  }
}

async function markPinHere(announce) {
  startGpsWatch();

  if (!currentPos) {
    const denied = lastGpsErrorCode === 1;
    const message = denied
      ? "Location permission denied. Enable GPS in the browser to mark the pin."
      : "Still waiting on a GPS fix. Try again in a moment.";
    if (announce) speakFeedback(message);
    updateStatus(denied ? "Location permission denied" : "Waiting for GPS fix", caddieOn, denied);
    return;
  }

  targetPin = { lat: currentPos.lat, lng: currentPos.lng };
  savedPin = targetPin;
  pinSource = locationMode === "home" ? "practice" : "manual";
  lastTelemetryAt = 0;
  lastWindData = null;
  lastElevYards = null;
  saveJSON("caddie_pin", targetPin);

  let learnedGreen = false;
  if (locationMode === "course") {
    learnedGreen = rememberHolePoint("green", currentPos);
  }

  updatePinUI(0);
  document.getElementById("rawDistance").innerText = "0 yd";
  document.getElementById("playsLike").innerText = "0 yd";
  document.getElementById("recommendedClub").innerText = pinSource === "practice" ? "Practice pin" : "Pin marked";
  document.getElementById("strategyAdvice").innerText = pinSource === "practice"
    ? "Practice pin dropped. This is for testing at home, not a course green."
    : (learnedGreen
      ? `Hole ${currentHole} green saved on this phone. Next round I'll aim here from the tee.`
      : "Walk to your ball, then ask for distance or tap Ask Caddie.");
  if (announce) {
    speakFeedback(pinSource === "practice"
      ? `Practice pin marked, ${golferName()}. That's only for a test off the course.`
      : (learnedGreen
        ? `Green saved for hole ${currentHole}, ${golferName()}. I'll have it the next time.`
        : `Pin marked, ${golferName()}. Walk on to the ball and tap Ask Caddie.`));
  }
  refreshYardage();
}

function saveTeeHere(announce) {
  startGpsWatch();
  if (!currentPos) {
    const denied = lastGpsErrorCode === 1;
    const message = denied
      ? "Location permission denied. Enable GPS to save the tee."
      : "Still waiting on a GPS fix. Try again in a moment.";
    if (announce) speakFeedback(message);
    updateStatus(denied ? "Location permission denied" : "Waiting for GPS fix", caddieOn, denied);
    return;
  }
  if (locationMode !== "course") {
    if (announce) speakFeedback(`Save the tee once you're on a course, ${golferName()}.`);
    return;
  }
  const saved = rememberHolePoint("tee", currentPos);
  updateLocationUI();
  updateHeroForMode();
  if (announce) {
    speakFeedback(saved
      ? `Tee saved for hole ${currentHole}, ${golferName()}. Mark the pin when you get to the green.`
      : `Hole ${currentHole} already has a tee, ${golferName()}.`);
  }
}

function updatePinUI(rawYards) {
  const pinElem = document.getElementById("pinStatus");
  if (!pinElem) return;

  if (!targetPin) {
    pinElem.classList.remove("set");
    if (locationMode === "home") {
      pinElem.innerText = "No pin needed at home. Drop a practice pin only if you want to test GPS.";
    } else if (locationMode === "course" && CaddieCourseMemory.holeNeedsGreen(holeByNumber(currentHole))) {
      pinElem.innerText = "No green yet for this hole. Stand on the green, mark the pin, and I'll remember it next time.";
    } else if (locationMode === "course") {
      pinElem.innerText = "Aiming at this hole's green once GPS settles.";
    } else if (lastGpsErrorCode === 1) {
      pinElem.innerText = "Location permission denied. Enable GPS to detect a course.";
    } else {
      pinElem.innerText = "Waiting for GPS to see if you are on a course.";
    }
    return;
  }

  pinElem.classList.add("set");
  const coords = `${targetPin.lat.toFixed(5)}, ${targetPin.lng.toFixed(5)}`;
  const sourceLabel = pinSource === "course"
    ? "green"
    : (pinSource === "practice" ? "practice pin" : "marked pin");
  if (Number.isFinite(rawYards)) {
    pinElem.innerText = `${sourceLabel.charAt(0).toUpperCase()}${sourceLabel.slice(1)} at ${coords} · ${Math.round(rawYards)} yd from here`;
  } else {
    pinElem.innerText = `${sourceLabel.charAt(0).toUpperCase()}${sourceLabel.slice(1)} at ${coords}`;
  }
}

// ==========================================
// 4b. COURSE AWARENESS (GolfCourseAPI)
// ==========================================
function setLocationOverride(mode, announce) {
  locationOverride = mode;
  lastCourseQueryAt = 0;
  lastCourseQueryPos = null;
  pinSource = "none";

  if (mode === "home") {
    courseLock = null;
    applyHomeMode("You're marked as at home. Pin setup stays optional.");
    if (announce) speakFeedback(`You're at home, ${golferName()}. I won't be asking you to set a pin.`);
    return;
  }

  applyUnmappedCourse(currentPos);
  if (currentPos) {
    maybeRefreshCourseContext(currentPos).then(() => refreshYardage());
  }
  if (announce) speakFeedback(`Grand, ${golferName()}. I'll treat this as a course. Mark the pin if I've no green.`);
}

function speakLocation() {
  if (locationMode === "home") {
    speakFeedback(`You're off the course, ${golferName()}. I'm not asking for a pin.`);
    return;
  }
  if (locationMode === "course") {
    const course = detectedCourse?.name || "a golf course";
    const mapped = holeByNumber(currentHole);
    const holeText = mapped?.name || `hole ${currentHole}`;
    speakFeedback(`${golferName()}, you're on ${course}, ${holeText}, par ${currentHolePar}.`);
    return;
  }
  speakFeedback(`I haven't a course confirmed yet, ${golferName()}.`);
}

async function maybeRefreshCourseContext(pos) {
  if (locationOverride === "home") {
    applyHomeMode("You're marked as at home.");
    return;
  }

  if (DEMO_MODE === "home" && locationOverride !== "course") {
    applyHomeMode("No golf course around this GPS point.");
    return;
  }

  if (DEMO_MODE === "home" && locationOverride === "course") {
    applyUnmappedCourse(pos);
    return;
  }

  if ((DEMO_MODE === "course" || DEMO_MODE === "learn") && locationOverride !== "home") {
    if (locationMode !== "course") applyCourseModel(demoCourseModel(), pos);
    else syncHoleTarget(pos);
    return;
  }

  if (courseLookupInFlight) return;

  const recentlyQueried = lastCourseQueryPos &&
    (Date.now() - lastCourseQueryAt) < COURSE_REQUERY_MS &&
    calculateHaversineDistanceYards(pos, lastCourseQueryPos) < COURSE_REQUERY_YD;

  if (recentlyQueried) {
    if (locationMode === "course") syncHoleTarget(pos);
    return;
  }

  courseLookupInFlight = true;
  try {
    await lookupCourseFromApi(pos);
  } finally {
    courseLookupInFlight = false;
  }
}

let golfKeySaveTimer = 0;

function storedGolfApiKey() {
  return GolfApi.normalizeApiKey(loadJSON(GOLF_API_KEY, ""));
}

function golfApiKey() {
  return storedGolfApiKey();
}

function setGolfApiKeyStatus(text) {
  const status = document.getElementById("golfApiKeyStatus");
  if (status) status.innerText = text || "";
}

function commitTypedGolfApiKey(writeBack) {
  window.clearTimeout(golfKeySaveTimer);
  const input = document.getElementById("golfApiKeyInput");
  const key = input ? GolfApi.normalizeApiKey(input.value) : storedGolfApiKey();
  if (writeBack && input && input.value !== key) input.value = key;
  const previous = storedGolfApiKey();
  saveJSON(GOLF_API_KEY, key);
  if (key !== previous) {
    proximityBlocked = false;
    lastCourseQueryAt = 0;
    setGolfApiKeyStatus(key ? "Key saved on this phone." : "No key saved.");
    if (currentPos && key) maybeRefreshCourseContext(currentPos);
  }
  return key;
}

function scheduleGolfApiKeySave() {
  window.clearTimeout(golfKeySaveTimer);
  golfKeySaveTimer = window.setTimeout(() => commitTypedGolfApiKey(false), 400);
}

function toggleGolfApiKeyVisibility() {
  const input = document.getElementById("golfApiKeyInput");
  const btn = document.getElementById("golfApiKeyToggle");
  if (!input || !btn) return;
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  btn.textContent = show ? "Hide" : "Show";
  btn.setAttribute("aria-label", show ? "Hide GolfCourseAPI key" : "Show GolfCourseAPI key");
}

function golfApiErrorText(err) {
  if (err?.status === 401) return "GolfCourseAPI rejected that key. Paste it again from your account, then tap Find.";
  if (err?.status === 403) return "That call needs a Pro key. Name search works on the free key.";
  if (err?.status === 0) return "Add a GolfCourseAPI key first.";
  if (err?.name === "AbortError") return "GolfCourseAPI took too long. Tap Find again.";
  return err?.apiMessage || "Couldn't reach GolfCourseAPI.";
}

function golfApiMessage(data, status) {
  if (typeof data?.error === "string" && data.error.trim()) return data.error.trim();
  if (data?.error && typeof data.error === "object") {
    const text = Object.values(data.error).filter((item) => typeof item === "string").join(" ");
    if (text) return text;
  }
  return `GolfCourseAPI HTTP ${status}`;
}

async function golfApiSend(url, authorization) {
  const res = await fetchWithTimeout(url.toString(), {
    headers: {
      Authorization: authorization,
      Accept: "application/json"
    }
  }, API_TIMEOUT_MS);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(golfApiMessage(data, res.status));
    err.status = res.status;
    err.apiMessage = err.message;
    throw err;
  }
  return data;
}

async function golfApiGet(path, params) {
  const key = golfApiKey();
  if (!key) {
    const err = new Error("missing key");
    err.status = 0;
    throw err;
  }
  const url = new URL(GOLF_API_BASE + path);
  for (const [name, value] of Object.entries(params || {})) {
    if (value != null && value !== "") url.searchParams.set(name, String(value));
  }
  try {
    return await golfApiSend(url, `Bearer ${key}`);
  } catch (err) {
    if (err.status !== 401) throw err;
    return golfApiSend(url, `Key ${key}`);
  }
}

function showApiCourse(course, teeName, pos) {
  loadedCourse = course;
  applyCourseModel(GolfApi.courseToModel(course, teeName), pos || currentPos);
}

async function lookupCourseFromApi(pos) {
  lastCourseQueryAt = Date.now();
  lastCourseQueryPos = { lat: pos.lat, lng: pos.lng };

  if (!golfApiKey()) {
    if (locationOverride === "course") {
      if (locationMode !== "course") applyUnmappedCourse(pos);
      return;
    }
    if (locationMode !== "course") {
      locationMode = "unknown";
      updateLocationUI("Add a GolfCourseAPI key to find the course. Scorekeeping works without it.");
      updateHeroForMode();
      updatePinUI();
    }
    return;
  }

  if (proximityBlocked) {
    if (locationMode === "course") syncHoleTarget(pos);
    return;
  }

  try {
    const data = await golfApiGet("/v1/proximity", {
      latitude: pos.lat,
      longitude: pos.lng,
      radius: GolfApi.ON_COURSE_MILES,
      unit: "mi",
      limit: 5
    });
    setGolfApiKeyStatus("Key accepted.");
    const nearest = (data.courses || [])[0];
    if (!nearest || !GolfApi.withinOnCourse(nearest)) {
      if (courseLock === "search") {
        syncHoleTarget(pos);
        return;
      }
      if (locationOverride === "course") {
        if (locationMode !== "course") applyUnmappedCourse(pos);
        return;
      }
      applyHomeMode("No GolfCourseAPI course within 2 miles. Search by name, or tap I'm on a course.");
      return;
    }
    if (detectedCourse?.id === nearest.id && locationMode === "course") {
      courseLock = "proximity";
      syncHoleTarget(pos);
      return;
    }
    const detail = await golfApiGet(`/v1/courses/${encodeURIComponent(nearest.id)}`);
    const course = GolfApi.unwrapCourse(detail);
    if (!course) {
      applyUnmappedCourse(pos);
      return;
    }
    courseLock = "proximity";
    showApiCourse(course, detectedCourse?.teeName, pos);
  } catch (err) {
    console.warn("GolfCourseAPI", err);
    if (err.status === 403) {
      proximityBlocked = true;
      setGolfApiKeyStatus("Key accepted. GPS lookup needs a Pro key. Search by course name.");
      if (locationMode !== "course") {
        locationMode = "unknown";
        updateLocationUI("GPS course search needs a GolfCourseAPI Pro key. Search by course name, or tap I'm on a course.");
        updateHeroForMode();
        updatePinUI();
      }
      return;
    }
    if (err.status === 401) {
      locationMode = "unknown";
      setGolfApiKeyStatus(golfApiErrorText(err));
      updateLocationUI("GolfCourseAPI rejected that key. Paste the key from your account and save it again.");
      updateHeroForMode();
      updatePinUI();
      return;
    }
    if (locationMode !== "course") {
      locationMode = "unknown";
      updateLocationUI("Couldn't reach GolfCourseAPI. Scorekeeping works. If you're playing, search by name or tap I'm on a course.");
      updateHeroForMode();
      updatePinUI();
    }
  }
}

function setCourseSearchStatus(text) {
  const el = document.getElementById("courseSearchStatus");
  if (el) el.innerText = text || "";
}

function renderCourseResults(courses) {
  const list = document.getElementById("courseSearchResults");
  if (!list) return;
  list.replaceChildren();
  if (!courses.length) {
    setCourseSearchStatus("No courses matched that name.");
    return;
  }
  setCourseSearchStatus(courses.length === 1 ? "1 course." : `${courses.length} courses. Tap one.`);
  for (const course of courses.slice(0, 6)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "score-btn";
    const place = [course.location?.city, course.location?.state].filter(Boolean).join(", ");
    btn.textContent = place
      ? `${GolfApi.courseDisplayName(course)} · ${place}`
      : GolfApi.courseDisplayName(course);
    btn.addEventListener("click", () => loadCourseById(course.id));
    list.appendChild(btn);
  }
}

async function onCourseSearch() {
  const query = document.getElementById("courseSearchInput")?.value.trim();
  if (!query) {
    setCourseSearchStatus("Type a course name.");
    return;
  }
  const key = commitTypedGolfApiKey(true);
  if (!key) {
    setCourseSearchStatus("Add a GolfCourseAPI key first.");
    setGolfApiKeyStatus("Paste a GolfCourseAPI key, then tap Find.");
    return;
  }
  setCourseSearchStatus("Searching…");
  try {
    const data = await golfApiGet("/v1/search", { search_query: query });
    setGolfApiKeyStatus("Key accepted.");
    renderCourseResults(data.courses || []);
  } catch (err) {
    console.warn("GolfCourseAPI search", err);
    const message = golfApiErrorText(err);
    setCourseSearchStatus(message);
    if (err.status === 401 || err.status === 403 || err.status === 0) setGolfApiKeyStatus(message);
  }
}

async function loadCourseById(id, teeName) {
  if (!id) return;
  setCourseSearchStatus("Loading the scorecard…");
  try {
    const detail = await golfApiGet(`/v1/courses/${encodeURIComponent(id)}`);
    const course = GolfApi.unwrapCourse(detail);
    if (!course) {
      setCourseSearchStatus("GolfCourseAPI returned no scorecard.");
      return;
    }
    courseLock = "search";
    lastCourseQueryAt = Date.now();
    if (currentPos) lastCourseQueryPos = { lat: currentPos.lat, lng: currentPos.lng };
    showApiCourse(course, teeName || detectedCourse?.teeName, currentPos);
    setGolfApiKeyStatus("Key accepted.");
    setCourseSearchStatus(`${GolfApi.courseDisplayName(course)} loaded. Mark the pin for yardage.`);
    const list = document.getElementById("courseSearchResults");
    if (list) list.replaceChildren();
  } catch (err) {
    console.warn("GolfCourseAPI course", err);
    const message = golfApiErrorText(err);
    setCourseSearchStatus(message);
    if (err.status === 401 || err.status === 403) setGolfApiKeyStatus(message);
  }
}

function onTeeChange(event) {
  if (!loadedCourse) return;
  showApiCourse(loadedCourse, event.target.value, currentPos);
}

function demoCourseModel() {
  const course = getDemoCourse();
  if (DEMO_MODE === "learn") {
    return {
      name: "Totteridge Golf Course",
      holes: course.holes.filter((hole) => !OSM_GAP_HOLES.has(hole.hole))
    };
  }
  return course;
}

function persistCourseMemory() {
  const records = Object.values(courseMemoryStore);
  if (records.length > MAX_COURSE_MEMORIES) {
    records.sort((a, b) => newestCourseMemory(a) - newestCourseMemory(b));
    records.slice(0, records.length - MAX_COURSE_MEMORIES).forEach((old) => {
      if (old?.key) delete courseMemoryStore[old.key];
    });
  }
  saveJSON(COURSE_MEMORY_KEY, courseMemoryStore);
}

function newestCourseMemory(mem) {
  const holes = Object.values(mem?.holes || {});
  return holes.reduce((max, hole) => Math.max(max, Number(hole.updatedAt) || 0), 0);
}

function ensureActiveCourseMemory(pos, name) {
  const Mem = window.CaddieCourseMemory;
  const courseName = name || detectedCourse?.name;
  const at = pos || currentPos;
  let mem = Mem.findCourseMemory(courseMemoryStore, at, courseName);
  if (!mem) {
    const key = Mem.memoryKey(courseName, at);
    mem = {
      key,
      name: Mem.isGenericCourseName(courseName) ? "Golf course" : courseName,
      lat: at?.lat,
      lng: at?.lng,
      holes: {}
    };
  } else if (!Mem.isGenericCourseName(courseName) && mem.key !== Mem.slugCourseName(courseName)) {
    delete courseMemoryStore[mem.key];
    mem = { ...mem, key: Mem.slugCourseName(courseName), name: courseName };
  }
  activeCourseMemory = mem;
  return mem;
}

function rememberHolePoint(kind, pos) {
  const Mem = window.CaddieCourseMemory;
  if (!pos || locationMode !== "course") return false;
  const hole = holeByNumber(currentHole);
  if (kind === "tee" && !Mem.holeNeedsTee(hole)) return false;
  if (kind === "green" && !Mem.holeNeedsGreen(hole)) return false;

  const mem = ensureActiveCourseMemory(pos, detectedCourse?.name);
  const patch = { par: currentHolePar, updatedAt: Date.now() };
  patch[kind] = { lat: pos.lat, lng: pos.lng };
  activeCourseMemory = Mem.upsertHoleMemory(mem, currentHole, patch);
  courseMemoryStore[activeCourseMemory.key] = activeCourseMemory;
  persistCourseMemory();
  applyLearnedHoleToState(currentHole, activeCourseMemory.holes[String(currentHole)]);
  return true;
}

function applyLearnedHoleToState(holeNum, saved) {
  if (!saved) return;
  let hole = holeByNumber(holeNum);
  if (!hole) {
    hole = {
      hole: holeNum,
      par: saved.par || currentHolePar || 4,
      name: null,
      tee: null,
      green: null,
      pin: null,
      hazards: []
    };
    courseHoles.push(hole);
  }
  if (saved.tee && !hole.tee) hole.tee = { ...saved.tee };
  if (saved.green && !hole.green) hole.green = { ...saved.green };
  if (saved.par) hole.par = saved.par;
  hole.learned = true;
  hole.missing = !hole.green;
  courseHoles = window.CaddieCourseMemory.padCourseHoles(courseHoles, currentHole);
  renderHoleStrip();
  updateLocationUI();
  updateMarkPinButton();
  updateSaveTeeButton();
}

function mergeModelWithMemory(model, pos) {
  const Mem = window.CaddieCourseMemory;
  const mem = Mem.findCourseMemory(courseMemoryStore, pos, model?.name);
  const merged = Mem.mergeCourseModel(model, mem);
  merged.holes = Mem.padCourseHoles(merged.holes, currentHole);
  return merged;
}

function applyHomeMode(detail) {
  locationMode = "home";
  detectedCourse = null;
  loadedCourse = null;
  courseHoles = [];
  activeCourseMemory = null;
  if (pinSource !== "practice") {
    targetPin = null;
    playsLikeDistYards = 0;
    recommendedClubObj = null;
    currentStrategy = "";
    document.getElementById("playsLike").innerText = "-- yd";
    document.getElementById("rawDistance").innerText = "Off course";
    document.getElementById("elevDiff").innerText = "-- yd";
    document.getElementById("windInfo").innerText = "-- mph";
  }
  if (!caddieOn) updateStatus("At home", false);
  updateLocationUI(detail);
  renderHoleStrip();
  updateMarkPinButton();
  updatePinUI();
  updateHeroForMode();
}

function applyUnmappedCourse(pos) {
  loadedCourse = null;
  const Mem = window.CaddieCourseMemory;
  const mem = Mem.findCourseMemory(courseMemoryStore, pos, detectedCourse?.name);
  if (mem && Object.keys(mem.holes || {}).length) {
    applyCourseModel({ name: mem.name || "Golf course", holes: [] }, pos);
    return;
  }
  locationMode = "course";
  detectedCourse = { name: "Unmapped course" };
  courseHoles = Mem.padCourseHoles([{
    hole: 18,
    par: 4,
    name: null,
    tee: null,
    green: null,
    pin: null,
    hazards: [],
    missing: true
  }], currentHole);
  ensureActiveCourseMemory(pos, detectedCourse.name);
  if (pinSource !== "manual") {
    if (pos && savedPin && calculateHaversineDistanceYards(pos, savedPin) < NEARBY_PIN_YD) {
      targetPin = savedPin;
      pinSource = "manual";
    } else {
      targetPin = null;
      pinSource = "none";
    }
  }
  updateLocationUI("Treating this as a course. No GolfCourseAPI scorecard yet. Save the tee, then mark the pin on each green. I'll remember them next round.");
  renderHoleStrip();
  updateMarkPinButton();
  updatePinUI();
  updateHeroForMode();
  if (!targetPin) {
    const raw = document.getElementById("rawDistance");
    if (raw) raw.innerText = "No green yet";
  }
  if (!caddieOn) updateStatus("On course", false);
}

function applyCourseModel(model, pos) {
  locationMode = "course";
  const merged = mergeModelWithMemory(model, pos);
  detectedCourse = {
    name: merged.name || model.name || model.course?.name || "Golf course",
    id: model.id || null,
    teeName: model.teeName || null,
    tees: Array.isArray(model.tees) ? model.tees : []
  };
  courseHoles = (merged.holes || []).map((hole) => ({ ...hole }));
  ensureActiveCourseMemory(pos, detectedCourse.name);

  if (!completedHoles.length && currentHoleStrokes === 0) {
    const inferred = inferHoleFromPosition(pos, courseHoles);
    if (inferred) {
      currentHole = inferred.hole;
      currentHolePar = inferred.par || currentHolePar;
    }
  }

  const mapped = holeByNumber(currentHole);
  if (mapped?.par) currentHolePar = mapped.par;
  persistRoundState();
  updateScoreUI();

  restoreOrAimPin(pos);
  updateLocationUI();
  renderHoleStrip();
  updateMarkPinButton();
  updateHeroForMode();
}

function restoreOrAimPin(pos) {
  if (pinSource === "manual" && targetPin) return;
  if (pinSource === "practice") return;

  const mapped = holeByNumber(currentHole);
  if (mapped?.green || mapped?.pin) {
    aimAtCurrentHoleGreen();
    return;
  }

  if (savedPin && pos && calculateHaversineDistanceYards(pos, savedPin) < NEARBY_PIN_YD) {
    targetPin = savedPin;
    pinSource = "manual";
    updatePinUI();
    return;
  }

  targetPin = null;
  pinSource = "none";
  updatePinUI();
}

function aimAtCurrentHoleGreen() {
  const mapped = holeByNumber(currentHole);
  const aim = mapped?.pin || mapped?.green;
  if (!aim) {
    if (pinSource === "course" || pinSource === "none") {
      targetPin = null;
      pinSource = "none";
      updatePinUI();
    }
    return false;
  }

  const same = targetPin && calculateHaversineDistanceYards(targetPin, aim) < 3;
  pinSource = "course";
  if (same) {
    updatePinUI();
    return true;
  }

  targetPin = { lat: aim.lat, lng: aim.lng };
  lastTelemetryAt = 0;
  lastWindData = null;
  lastElevYards = null;
  updatePinUI();
  return true;
}

function syncHoleTarget(pos) {
  if (!courseHoles.length) return;
  if (!completedHoles.length && currentHoleStrokes === 0) {
    const inferred = inferHoleFromPosition(pos, courseHoles);
    if (inferred && inferred.hole !== currentHole) {
      currentHole = inferred.hole;
      currentHolePar = inferred.par || currentHolePar;
      persistRoundState();
      updateScoreUI();
      renderHoleStrip();
      if (pinSource !== "manual") aimAtCurrentHoleGreen();
      updateLocationUI();
    }
  } else if (pinSource !== "manual" && pinSource !== "practice") {
    aimAtCurrentHoleGreen();
  }
}

function goToHole(n, announce) {
  const holeNum = Number(n);
  if (!Number.isInteger(holeNum) || holeNum < 1 || holeNum > 27) {
    if (announce) speakFeedback("I only know holes 1 through 27.");
    return;
  }

  if (holeNum !== currentHole && currentHoleStrokes > 0) {
    completedHoles.push({
      hole: currentHole,
      par: currentHolePar,
      strokes: currentHoleStrokes
    });
  }

  currentHole = holeNum;
  currentHoleStrokes = 0;
  const mapped = holeByNumber(holeNum);
  currentHolePar = mapped?.par || currentHolePar || 4;
  if (pinSource === "manual" || pinSource === "practice") pinSource = "none";
  persistRoundState();
  updateScoreUI();
  aimAtCurrentHoleGreen();
  renderHoleStrip();
  updateLocationUI();
  updateHeroForMode();
  if (announce) {
    const label = mapped?.name || String(holeNum);
    if (CaddieCourseMemory.holeNeedsGreen(mapped)) {
      speakFeedback(`${golferName()}, hole ${label} isn't mapped yet. Save the tee here, then mark the pin on the green. I'll keep it for the next round.`);
    } else {
      speakFeedback(`${golferName()}, hole ${label}, par ${currentHolePar}.`);
    }
  }
  if (currentPos) refreshYardage();
}

function holeByNumber(n) {
  return courseHoles.find((hole) => hole.hole === n) || null;
}

function inferHoleFromPosition(pos, holes) {
  if (!pos || !holes.length) return null;
  let best = null;
  let bestScore = Infinity;
  for (const hole of holes) {
    const dTee = hole.tee ? calculateHaversineDistanceYards(pos, hole.tee) : Infinity;
    const dGreen = hole.green ? calculateHaversineDistanceYards(pos, hole.green) : Infinity;
    const dCenter = hole.center ? calculateHaversineDistanceYards(pos, hole.center) : Infinity;
    const score = dTee < TEE_PROXIMITY_YD ? dTee / 2 : Math.min(dTee, dCenter, dGreen + 40);
    if (score < bestScore) {
      bestScore = score;
      best = hole;
    }
  }
  if (bestScore > 250) return null;
  return best;
}

function gpsFixLabel(pos = currentPos) {
  if (!pos || !Number.isFinite(pos.lat) || !Number.isFinite(pos.lng)) return "";
  return ` GPS ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}.`;
}

function renderTeeSelect() {
  const wrap = document.getElementById("teeSelectWrap");
  const sel = document.getElementById("teeSelect");
  if (!wrap || !sel) return;
  const tees = detectedCourse?.tees || [];
  if (locationMode !== "course" || tees.length < 2) {
    wrap.classList.add("hidden");
    return;
  }
  wrap.classList.remove("hidden");
  const current = detectedCourse.teeName || "";
  const same = sel.options.length === tees.length && [...sel.options].every((opt, i) => opt.value === tees[i]);
  if (!same) {
    sel.replaceChildren();
    for (const name of tees) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      sel.appendChild(opt);
    }
  }
  if ([...sel.options].some((opt) => opt.value === current)) sel.value = current;
}

function updateLocationUI(detail) {
  const card = document.getElementById("locationCard");
  const nameEl = document.getElementById("courseName");
  const detailEl = document.getElementById("courseDetail");
  if (!card || !nameEl || !detailEl) return;

  card.classList.remove("searching", "home", "course");
  const demoNote = DEMO_MODE ? " Demo location is on." : "";
  const gpsNote = gpsFixLabel();

  if (locationMode === "home") {
    card.classList.add("home");
    nameEl.innerText = "At home / off course";
    detailEl.innerText = (detail || "No GolfCourseAPI course within 2 miles. Keep score here, or search by course name.") + gpsNote + demoNote;
  } else if (locationMode === "course") {
    card.classList.add("course");
    const mapped = holeByNumber(currentHole);
    const holeLabel = mapped
      ? `${mapped.name || `Hole ${mapped.hole}`} · Par ${mapped.par || currentHolePar}`
      : `Hole ${currentHole}`;
    nameEl.innerText = detectedCourse?.name || "On a golf course";
    const learnedCount = courseHoles.filter((hole) => hole.learned && (hole.tee || hole.green)).length;
    const learnedNote = learnedCount
      ? ` ${learnedCount} hole${learnedCount === 1 ? "" : "s"} saved on this phone.`
      : "";
    const cardYards = mapped?.yardage ? ` Scorecard ${mapped.yardage} yards.` : "";
    let fallback = `${holeLabel}.${cardYards} Mark the pin on the green.`;
    if (CaddieCourseMemory.holeNeedsGreen(mapped)) {
      fallback = `${holeLabel} has no green coordinates.${cardYards} Stand on the green and tap Mark Pin Here. I'll remember it next round.`;
    } else if (CaddieCourseMemory.holeNeedsTee(mapped)) {
      fallback = `${holeLabel}. Pin is saved. Tap Save tee if you're on the tee so I recognize this hole next time.`;
    } else {
      fallback = `${holeLabel}. Targeting the pin saved for this hole.${learnedNote}`;
    }
    detailEl.innerText = (detail || fallback) + demoNote;
  } else {
    card.classList.add("searching");
    nameEl.innerText = locationMode === "unknown" ? "Location unclear" : "Locating you…";
    detailEl.innerText = (detail || "Checking GPS for a nearby golf course. At home you can keep score without setting a pin.") + gpsNote + demoNote;
  }

  updateMarkPinButton();
  renderTeeSelect();
}

function updateHeroForMode() {
  if (targetPin && recommendedClubObj) return;

  const club = document.getElementById("recommendedClub");
  const advice = document.getElementById("strategyAdvice");
  const planEl = document.getElementById("playPlan");
  if (!club || !advice) return;

  if (targetPin) return;
  if (planEl) planEl.innerText = playStyleLabel();

  if (locationMode === "home") {
    club.innerText = "At home";
    advice.innerText = "No GolfCourseAPI course within 2 miles. Keep score, search by name, or drop an optional practice pin.";
  } else if (locationMode === "course") {
    club.innerText = detectedCourse?.name || "On course";
    advice.innerText = CaddieCourseMemory.holeNeedsGreen(holeByNumber(currentHole))
      ? "Scorecard is loaded. Mark the pin on the green for yardage. Next round I'll aim at the pin you saved."
      : "Targeting the pin saved for this hole. Walk to your ball for yardage, or override the pin if it's tucked.";
  } else if (locationMode === "unknown") {
    club.innerText = "Scorekeeper ready";
    advice.innerText = "Couldn't confirm a nearby course. Scorekeeping works now. Search by name, or tap I'm on a course.";
  } else {
    club.innerText = "Locating you";
    advice.innerText = "Checking whether you are on a golf course. Pin setup is only needed on the course.";
  }
}

function updateMarkPinButton() {
  const btn = document.getElementById("markPinBtn");
  if (!btn) return;
  const needsGreen = CaddieCourseMemory.holeNeedsGreen(holeByNumber(currentHole));
  const needsPin = locationMode === "course" && needsGreen && !targetPin;
  btn.classList.toggle("primary", needsPin);
  if (locationMode === "course") {
    btn.innerText = needsGreen ? "Mark Pin Here" : "Override pin here";
  } else {
    btn.innerText = "Drop practice pin";
  }
  updateSaveTeeButton();
}

function updateSaveTeeButton() {
  const btn = document.getElementById("saveTeeBtn");
  if (!btn) return;
  const show = locationMode === "course" && CaddieCourseMemory.holeNeedsTee(holeByNumber(currentHole));
  btn.classList.toggle("hidden", !show);
}

function renderHoleStrip() {
  const strip = document.getElementById("holeStrip");
  if (!strip) return;
  strip.replaceChildren();
  if (locationMode !== "course" || courseHoles.length === 0) {
    strip.classList.add("hidden");
    return;
  }

  strip.classList.remove("hidden");
  for (const hole of courseHoles) {
    const btn = document.createElement("button");
    btn.type = "button";
    const missing = CaddieCourseMemory.holeNeedsGreen(hole);
    btn.className = "hole-chip"
      + (hole.hole === currentHole ? " active" : "")
      + (missing ? " missing" : "")
      + (hole.learned ? " learned" : "");
    btn.textContent = String(hole.hole);
    const card = hole.yardage ? ` · ${hole.yardage} yd` : "";
    btn.title = missing
      ? `${hole.name || `Hole ${hole.hole}`} · Par ${hole.par}${card} · mark the pin`
      : `${hole.name || `Hole ${hole.hole}`} · Par ${hole.par}${card}`;
    btn.addEventListener("click", () => goToHole(hole.hole, true));
    strip.appendChild(btn);
  }
}

async function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ==========================================
// 5. SCREEN WAKE LOCK CONTROL
// ==========================================
async function requestWakeLock() {
  if (!("wakeLock" in navigator)) return;
  try {
    await releaseWakeLock();
    wakeLock = await navigator.wakeLock.request("screen");
  } catch (err) {
    console.error(`Wake Lock Error: ${err.name}, ${err.message}`);
  }
}

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "hidden") {
    await releaseWakeLock();
    return;
  }
  if (document.visibilityState !== "visible") return;
  resumeLocation();
  if (caddieOn) {
    await requestWakeLock();
  }
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) resumeLocation();
});

// ==========================================
// 6. STRATEGY & SHOT LOGGING
// ==========================================
function classifyHazard(hole, hazard) {
  const tee = hole.tee || hole.center;
  const green = hole.green;
  if (!tee || !green) return { ...hazard, zone: "fairway", side: "center", yardsFromTee: Infinity, yardsFromGreen: Infinity };
  const yardsFromTee = calculateHaversineDistanceYards(tee, hazard);
  const yardsFromGreen = calculateHaversineDistanceYards(green, hazard);
  const holeLen = calculateHaversineDistanceYards(tee, green);
  let zone = "fairway";
  if (yardsFromTee < 80) zone = "tee";
  else if (yardsFromGreen < 50) zone = "green";
  else if (yardsFromTee > holeLen * 0.65) zone = "approach";

  const holeHeading = calculateHeading(tee, green);
  const hazHeading = calculateHeading(tee, hazard);
  const delta = ((hazHeading - holeHeading + 540) % 360) - 180;
  const side = Math.abs(delta) < 10 ? "center" : (delta < 0 ? "left" : "right");
  return { ...hazard, zone, side, yardsFromTee, yardsFromGreen };
}

function playerHandicap() {
  const n = Number(playerProfile?.handicap);
  return Number.isFinite(n) ? Math.min(54, Math.max(0, Math.round(n))) : 14;
}

function playStyle(handicap = playerHandicap()) {
  if (handicap <= 8) return "attack";
  if (handicap <= 18) return "smart";
  return "safe";
}

function playStyleLabel(style = playStyle()) {
  if (style === "attack") return "Attack when it's on";
  if (style === "safe") return "Protect the double";
  return "Play smart";
}

function longestClubFrom(clubs) {
  return Bag.longestClubFrom(clubs);
}

function clubDownFromDriver(clubs, driver) {
  return Bag.clubDownFromDriver(clubs, driver);
}

function holeLengthYards(hole) {
  if (hole?.tee && hole?.green) return calculateHaversineDistanceYards(hole.tee, hole.green);
  const card = Number(hole?.yardage);
  if (Number.isFinite(card) && card > 0) return card;
  return null;
}

function isNearPoint(pos, point, yards) {
  return Boolean(pos && point && calculateHaversineDistanceYards(pos, point) <= yards);
}

function buildStrategy(ctx) {
  const playsLikeYards = ctx.playsLikeYards;
  const rawYards = ctx.rawYards;
  const hole = ctx.hole;
  const par = hole?.par || ctx.par || 4;
  const hcp = ctx.handicap ?? 14;
  const style = playStyle(hcp);
  const clubs = ctx.clubs || [];
  const driver = longestClubFrom(clubs);
  const wood = clubDownFromDriver(clubs, driver);
  const wedge = Bag.layupWedgeFrom(clubs);
  const extra = style === "attack" ? 2 : (style === "smart" ? 8 : 12);
  const holeLen = holeLengthYards(hole);
  const nearTee = isNearPoint(ctx.pos, hole?.tee, TEE_PROXIMITY_YD);
  const onThisHoleTee = ctx.strokes === 0 && (
    nearTee || (holeLen != null && Math.abs(rawYards - holeLen) < 50)
  );
  const hazards = (hole?.hazards || []).map((h) => classifyHazard(hole, h));
  const frontGreenTrouble = hazards.filter((h) => h.yardsFromGreen < 48);
  const landingTrouble = hazards.filter((h) => (
    h.zone !== "green" && Math.abs(h.yardsFromTee - (driver.distance || 250)) < 45
  ));
  const waterShort = hazards.filter((h) => h.type === "water" && h.yardsFromGreen < 80);
  const advice = [];
  let targetDistance = playsLikeYards;
  let preferLonger = style !== "attack";
  let planLabel = playStyleLabel(style);

  if (holeLen != null && rawYards > holeLen + 90) {
    advice.push("The GPS isn't on this hole yet. Walk to the tee or the ball before you trust that number.");
    return { targetDistance: driver.distance, advice: advice.join(" "), preferLonger: false, planLabel, style };
  }

  if (onThisHoleTee && par === 3) {
    targetDistance = playsLikeYards + extra;
    if (frontGreenTrouble.length || waterShort.length) {
      targetDistance += 6;
      preferLonger = true;
      advice.push("There's trouble short of this par 3. Take enough club and use the middle.");
    } else if (style === "attack" && rawYards <= 150) {
      advice.push("Par 3, and you're in range. Look at the pin if it's not tucked. Otherwise the fat of the green.");
    } else {
      advice.push("Par 3. A three is a good score. Aim the fat of the green, not a sucker pin.");
    }
  } else if (onThisHoleTee && par === 4) {
    const shortPar4 = holeLen != null && holeLen < (driver.distance || 250) + 30;
    if ((landingTrouble.length || shortPar4) && style !== "attack") {
      targetDistance = Math.min(wood.distance, Math.max(180, (holeLen || rawYards) - 40));
      planLabel = "Club down";
      advice.push(shortPar4
        ? `Short par 4. ${wood.name} off the tee, and leave yourself a full wedge. The driver can run through.`
        : `There's trouble in the landing area. ${wood.name} off the tee, then a simple approach.`);
    } else {
      targetDistance = driver.distance;
      preferLonger = false;
      advice.push("Tee shot. Find the fairway. Aim away from the trouble and don't force it.");
    }
    const left = hazards.some((h) => h.side === "left" && h.zone !== "green");
    const right = hazards.some((h) => h.side === "right" && h.zone !== "green");
    if (left && !right) advice.push("Keep it down the right.");
    if (right && !left) advice.push("Keep it down the left.");
    if (hole?.dogleg) advice.push(`It doglegs ${hole.dogleg}. Don't be cutting the corner.`);
  } else if (onThisHoleTee && par === 5) {
    targetDistance = landingTrouble.length && style !== "attack" ? wood.distance : driver.distance;
    preferLonger = false;
    advice.push("Par 5. Fairway first. Leave yourself a wedge in, rather than hunting the eagle.");
  } else if (par === 5 && playsLikeYards > (wood.distance || 220) + 15 && style !== "attack") {
    const layupTo = Math.max(95, Math.min(wedge.distance || 125, 115));
    targetDistance = Math.max(90, playsLikeYards - layupTo);
    preferLonger = false;
    planLabel = "Lay up";
    advice.push(`Don't go for this green. Lay up to about ${layupTo} and take the wedge.`);
    if (waterShort.length) advice.push("Water's short. Lay up well before it.");
  } else {
    targetDistance = playsLikeYards + extra;
    if (frontGreenTrouble.length || waterShort.length) {
      targetDistance += 6;
      preferLonger = true;
      advice.push("Trouble short of the green. Take one more club and miss long or in the middle.");
    } else if (rawYards > 140 || style !== "attack") {
      advice.push("Aim the middle of the green. The center beats a hero pin.");
    } else {
      advice.push("You're in scoring range. You can be a bit more aggressive, but miss on the fat side.");
    }
  }

  if (ctx.bias?.lateralBias > 2) advice.push("Your stock miss is a fade. Start it a touch left of the safe line.");
  else if (ctx.bias?.lateralBias < -2) advice.push("Your stock miss is a draw. Start it a touch right of the safe line.");

  return {
    targetDistance: Math.round(targetDistance),
    advice: advice.join(" "),
    preferLonger,
    planLabel,
    style
  };
}

function runCourseManagementEngine(playsLikeYards, rawYards) {
  return buildStrategy({
    playsLikeYards,
    rawYards,
    hole: holeByNumber(currentHole),
    par: currentHolePar,
    pos: currentPos,
    strokes: currentHoleStrokes,
    handicap: playerHandicap(),
    clubs: clubDatabase,
    bias: playerProfile
  });
}

function logShot(type) {
  if (!recommendedClubObj) return;

  const club = clubDatabase.find((c) => c.name === recommendedClubObj.name);
  if (!club) return;

  if (type === "short") {
    club.distance += 2;
    playerProfile.distanceBias += 1;
  } else if (type === "long") {
    club.distance -= 2;
    playerProfile.distanceBias -= 1;
  } else if (type === "left") {
    playerProfile.lateralBias -= 1;
  } else if (type === "right") {
    playerProfile.lateralBias += 1;
  } else if (type === "hit") {
    club.hits += 1;
  }

  saveJSON("caddie_clubs", clubDatabase);
  saveJSON("caddie_profile", playerProfile);
  updateProfileUI();
}

function speakScore() {
  const relText = getRelativeScoreSpeech(completedHoles, currentHoleStrokes, currentHolePar);
  speakFeedback(`${golferName()}, you're on hole ${currentHole} with ${currentHoleStrokes} strokes. Overall, you're ${relText}.`);
}

function logGoodShot() {
  addStroke(false);
  const hadClub = Boolean(recommendedClubObj);
  logShot("hit");
  if (hadClub) {
    speakFeedback(`Fair play, ${golferName()}. That's a good one. Stroke ${currentHoleStrokes} counted.`);
    return;
  }
  speakFeedback(`Stroke ${currentHoleStrokes} counted, ${golferName()}. Tap Ask Caddie first if you want that hit saved on the club.`);
}

function logMiss(type) {
  const hadClub = Boolean(recommendedClubObj);
  logShot(type);
  if (!hadClub) {
    speakFeedback(`${golferName()}, tap Ask Caddie first, then tell me how that one finished.`);
    return;
  }
  const lines = {
    short: "Logged short. I'll give the clubs a couple of yards.",
    long: "Logged long. I'll take a couple of yards off.",
    left: "Logged left. I'll allow for the draw.",
    right: "Logged right. I'll allow for the fade."
  };
  speakFeedback(lines[type] || "Logged.");
}

// ==========================================
// 7. SCOREKEEPING & HISTORY UTILITIES
// ==========================================
function persistRoundState() {
  saveJSON("caddie_active_round", {
    currentHole,
    currentHolePar,
    currentHoleStrokes,
    completedHoles
  });
}

function setHolePar(par, announce) {
  currentHolePar = par;
  persistRoundState();
  if (locationMode === "course") {
    const mem = ensureActiveCourseMemory(currentPos, detectedCourse?.name);
    activeCourseMemory = CaddieCourseMemory.upsertHoleMemory(mem, currentHole, {
      par,
      parSet: true,
      updatedAt: Date.now()
    });
    courseMemoryStore[activeCourseMemory.key] = activeCourseMemory;
    persistCourseMemory();
    const hole = holeByNumber(currentHole);
    if (hole) hole.par = par;
  }
  updateScoreUI();
  updateLocationUI();
  if (announce) speakFeedback(`Hole ${currentHole} set to par ${par}.`);
}

function addStroke(announce) {
  currentHoleStrokes++;
  persistRoundState();
  updateScoreUI();
  if (announce) speakFeedback(`Stroke ${currentHoleStrokes} logged.`);
}

function undoStroke(announce) {
  if (currentHoleStrokes <= 0) {
    if (announce) speakFeedback("No strokes to undo on this hole.");
    return;
  }
  currentHoleStrokes--;
  persistRoundState();
  updateScoreUI();
  if (announce) speakFeedback(`Undo. ${currentHoleStrokes} strokes on hole ${currentHole}.`);
}

function completeHole(skip, announce) {
  if (!skip && currentHoleStrokes === 0) {
    if (announce) speakFeedback("No strokes logged for this hole. Tap Add Stroke, or Skip Hole.");
    return;
  }

  if (!skip) {
    completedHoles.push({
      hole: currentHole,
      par: currentHolePar,
      strokes: currentHoleStrokes
    });
  }

  const nextHole = currentHole + 1;
  const relText = getRelativeScoreSpeech(completedHoles);
  const message = skip
    ? `Skipping hole ${currentHole}. On to hole ${nextHole}, ${golferName()}.`
    : `Hole ${currentHole} logged with ${currentHoleStrokes} strokes. You're ${relText}. On to hole ${nextHole}, ${golferName()}.`;

  currentHole = nextHole;
  currentHoleStrokes = 0;
  currentHolePar = holeByNumber(nextHole)?.par || 4;
  if (pinSource === "manual" || pinSource === "practice") pinSource = "none";
  persistRoundState();
  updateScoreUI();
  aimAtCurrentHoleGreen();
  renderHoleStrip();
  updateLocationUI();
  if (announce) {
    const nextMapped = holeByNumber(nextHole);
    const teach = CaddieCourseMemory.holeNeedsGreen(nextMapped)
      ? ` Hole ${nextHole} isn't mapped yet. Save the tee, then mark the pin on the green.`
      : "";
    speakFeedback(message + teach);
  }
  if (currentPos) refreshYardage();
}

function finishRound(announce) {
  if (currentHoleStrokes > 0) {
    completedHoles.push({
      hole: currentHole,
      par: currentHolePar,
      strokes: currentHoleStrokes
    });
  }

  if (completedHoles.length === 0) {
    if (announce) speakFeedback("No holes to save yet.");
    return;
  }

  saveRoundToHistory();
  const totalStrokes = completedHoles.reduce((acc, h) => acc + h.strokes, 0);
  const totalPar = completedHoles.reduce((acc, h) => acc + h.par, 0);
  const diff = totalStrokes - totalPar;
  const finalRel = diff === 0 ? "Even par" : `${Math.abs(diff)} ${diff > 0 ? "over" : "under"}`;

  if (announce) {
    speakFeedback(`Fair play, ${golferName()}. Round saved. You completed ${completedHoles.length} holes with ${totalStrokes} gross, finishing ${finalRel}.`);
  }

  currentHole = 1;
  currentHoleStrokes = 0;
  currentHolePar = 4;
  completedHoles = [];
  persistRoundState();
  updateScoreUI();
}

function updateScoreUI() {
  const holeElem = document.getElementById("currentHoleDisplay");
  const strokesElem = document.getElementById("holeStrokesDisplay");
  const totalElem = document.getElementById("totalScoreDisplay");

  const mapped = holeByNumber(currentHole);
  const holeTitle = mapped?.name || `Hole ${currentHole}`;
  if (holeElem) holeElem.innerText = `${holeTitle} (Par ${currentHolePar})`;
  if (strokesElem) strokesElem.innerText = `${currentHoleStrokes} strokes`;
  updateParButtons();

  if (totalElem) {
    const relScore = calculateRelativeScore(completedHoles, currentHoleStrokes, currentHolePar);
    totalElem.innerText = relScore.formatted;
  }
}

function updateParButtons() {
  [3, 4, 5].forEach((par) => {
    const btn = document.getElementById(`par${par}Btn`);
    if (!btn) return;
    const selected = currentHolePar === par;
    btn.classList.toggle("active", selected);
    btn.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}

function calculateRelativeScore(completed, activeStrokes = 0, activePar = 0) {
  const totalStrokes = completed.reduce((acc, h) => acc + h.strokes, 0) + activeStrokes;
  const totalPar = completed.reduce((acc, h) => acc + h.par, 0) + (activeStrokes > 0 ? activePar : 0);
  const diff = totalStrokes - totalPar;

  if (diff === 0) return { diff: 0, formatted: "E (0)" };
  if (diff > 0) return { diff, formatted: `+${diff} (${totalStrokes})` };
  return { diff, formatted: `${diff} (${totalStrokes})` };
}

function getRelativeScoreSpeech(completed, activeStrokes = 0, activePar = 0) {
  const score = calculateRelativeScore(completed, activeStrokes, activePar);
  if (score.diff === 0) return "even par";
  if (score.diff > 0) return `${score.diff} over par`;
  return `${Math.abs(score.diff)} under par`;
}

function saveRoundToHistory() {
  if (completedHoles.length === 0) return;

  const totalStrokes = completedHoles.reduce((acc, h) => acc + h.strokes, 0);
  const totalPar = completedHoles.reduce((acc, h) => acc + h.par, 0);
  const diff = totalStrokes - totalPar;

  const roundEntry = {
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    holesCount: completedHoles.length,
    strokes: totalStrokes,
    par: totalPar,
    relativeScore: diff > 0 ? `+${diff}` : (diff === 0 ? "E" : `${diff}`)
  };

  roundHistory.unshift(roundEntry);
  roundHistory = roundHistory.slice(0, MAX_SAVED_ROUNDS);
  saveJSON("caddie_rounds", roundHistory);
  renderRoundHistory();
}

function renderRoundHistory() {
  const historyList = document.getElementById("historyList");
  if (!historyList) return;

  historyList.replaceChildren();

  if (roundHistory.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No saved rounds yet.";
    historyList.appendChild(empty);
    return;
  }

  roundHistory.slice(0, 5).forEach((round) => {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = `${round.date} (${round.holesCount} holes)`;
    const score = document.createElement("strong");
    score.textContent = `${round.relativeScore} (${round.strokes})`;
    item.append(label, score);
    historyList.appendChild(item);
  });
}

function updateProfileUI() {
  let biasText = "Neutral";
  if (playerProfile.lateralBias > 2) biasText = "Fade / Slice";
  if (playerProfile.lateralBias < -2) biasText = "Draw / Hook";

  const biasElem = document.getElementById("playerBias");
  if (biasElem) biasElem.innerText = biasText;

  const nameInput = document.getElementById("playerNameInput");
  if (nameInput && document.activeElement !== nameInput) {
    nameInput.value = golferName();
  }
  const hcpInput = document.getElementById("handicapInput");
  if (hcpInput && document.activeElement !== hcpInput) {
    hcpInput.value = String(playerHandicap());
  }
  const planStatus = document.getElementById("planStatus");
  if (planStatus) {
    planStatus.innerText = `Play style: ${playStyleLabel()} (hcp ${playerHandicap()})`;
  }
  const planEl = document.getElementById("playPlan");
  if (planEl && !targetPin) planEl.innerText = playStyleLabel();
  updateVoiceStatus();
  const keyInput = document.getElementById("golfApiKeyInput");
  if (keyInput && document.activeElement !== keyInput && !keyInput.value) {
    keyInput.value = golfApiKey();
  }
}

function setBagStatus(text, isError) {
  const el = document.getElementById("bagStatus");
  if (!el) return;
  el.textContent = text || "";
  el.classList.toggle("bag-status-error", Boolean(isError));
}

function persistClubBag(next, bench, message, isError) {
  clubDatabase = Bag.sortBag(next);
  clubBench = Bag.sortBag(bench || []);
  saveJSON("caddie_clubs", clubDatabase);
  saveJSON(CLUB_BENCH_KEY, clubBench);
  renderBagEditor();
  setBagStatus(message || "", Boolean(isError));
  if (currentPos && targetPin) refreshYardage();
}

function renderBagEditor() {
  const listEl = document.getElementById("bagList");
  if (!listEl) return;
  listEl.replaceChildren();
  clubDatabase.forEach((club, index) => {
    const row = document.createElement("div");
    row.className = "bag-row";

    const name = document.createElement("input");
    name.className = "bag-name";
    name.type = "text";
    name.maxLength = MAX_CLUB_NAME_LEN;
    name.value = club.name;
    name.spellcheck = false;
    name.autocomplete = "off";
    name.setAttribute("aria-label", `${club.name} name`);
    name.addEventListener("change", () => onBagNameChange(index, name.value));

    const yards = document.createElement("input");
    yards.className = "bag-yards";
    yards.type = "number";
    yards.min = String(MIN_CLUB_YARDS);
    yards.max = String(MAX_CLUB_YARDS);
    yards.step = "1";
    yards.inputMode = "numeric";
    yards.value = String(club.distance);
    yards.setAttribute("aria-label", `${club.name} yards`);
    yards.addEventListener("change", () => onBagYardsChange(index, yards.value));

    const unit = document.createElement("span");
    unit.className = "bag-yd";
    unit.textContent = "yd";

    const del = document.createElement("button");
    del.type = "button";
    del.className = "score-btn danger bag-delete";
    del.textContent = "Remove";
    del.setAttribute("aria-label", `Remove ${club.name} from bag`);
    del.addEventListener("click", () => onBagRemove(index));

    row.append(name, yards, unit, del);
    listEl.appendChild(row);
  });
  renderClubBench();
}

function renderClubBench() {
  const wrap = document.getElementById("bagBench");
  const listEl = document.getElementById("bagBenchList");
  if (!wrap || !listEl) return;
  listEl.replaceChildren();
  wrap.classList.toggle("hidden", clubBench.length === 0);
  clubBench.forEach((club) => {
    const row = document.createElement("div");
    row.className = "bag-row bag-bench-row";
    const label = document.createElement("span");
    label.className = "bag-bench-name";
    label.textContent = `${club.name} · ${club.distance} yd`;
    const addBack = document.createElement("button");
    addBack.type = "button";
    addBack.className = "score-btn bag-add-back";
    addBack.textContent = "Add back";
    addBack.setAttribute("aria-label", `Add ${club.name} back to bag`);
    addBack.addEventListener("click", () => onBagRestore(club.name));
    row.append(label, addBack);
    listEl.appendChild(row);
  });
}

function onBagNameChange(index, value) {
  const result = Bag.updateClubInBag(clubDatabase, index, { name: value }, clubBench);
  if (!result.ok) {
    setBagStatus(result.error, true);
    renderBagEditor();
    return;
  }
  persistClubBag(result.clubs, result.bench, `Updated ${Bag.normalizeClubName(value)}.`);
}

function onBagYardsChange(index, value) {
  const result = Bag.updateClubInBag(clubDatabase, index, { distance: value }, clubBench);
  if (!result.ok) {
    setBagStatus(result.error, true);
    renderBagEditor();
    return;
  }
  const club = result.clubs.find((item) => item.name === clubDatabase[index]?.name)
    || result.clubs[0];
  persistClubBag(result.clubs, result.bench, `${club?.name || "Club"} set to ${club?.distance} yd.`);
}

function onBagRemove(index) {
  const name = clubDatabase[index]?.name;
  const result = Bag.removeClubFromBag(clubDatabase, index, clubBench);
  if (!result.ok) {
    setBagStatus(result.error, true);
    return;
  }
  persistClubBag(result.clubs, result.bench, `Removed ${result.removed || name}. Yards kept if you add it back.`);
}

function onBagRestore(name) {
  const result = Bag.restoreClubFromBench(clubDatabase, clubBench, name);
  if (!result.ok) {
    setBagStatus(result.error, true);
    return;
  }
  persistClubBag(result.clubs, result.bench, `Added ${result.added} back at ${result.clubs.find((c) => c.name === result.added)?.distance} yd.`);
}

function onNewClubNameBlur() {
  const nameEl = document.getElementById("newClubName");
  const yardsEl = document.getElementById("newClubYards");
  if (!nameEl || !yardsEl || yardsEl.value) return;
  const remembered = Bag.findOnBench(clubBench, nameEl.value);
  if (remembered) yardsEl.value = String(remembered.distance);
}

function onAddClub() {
  const nameEl = document.getElementById("newClubName");
  const yardsEl = document.getElementById("newClubYards");
  const result = Bag.addClubToBag(clubDatabase, nameEl?.value, yardsEl?.value, clubBench);
  if (!result.ok) {
    setBagStatus(result.error, true);
    return;
  }
  if (nameEl) nameEl.value = "";
  if (yardsEl) yardsEl.value = "";
  persistClubBag(
    result.clubs,
    result.bench,
    result.restored ? `Added ${result.added} back with saved yards.` : `Added ${result.added}.`
  );
}

function onResetBag() {
  if (!window.confirm("Reset the bag to Driver through Lob Wedge with stock yards?")) return;
  const result = Bag.resetClubBag(clubBench);
  persistClubBag(result.clubs, result.bench, "Bag reset to stock clubs.");
}

function getBestClub(yards, options = {}) {
  if (!clubDatabase.length) return null;
  const preferLonger = Boolean(options.preferLonger);
  const ranked = [...clubDatabase].sort((a, b) => Math.abs(a.distance - yards) - Math.abs(b.distance - yards));
  const closest = ranked[0];
  if (!preferLonger || ranked.length < 2) return closest;
  const alternative = ranked[1];
  const longer = closest.distance >= alternative.distance ? closest : alternative;
  const shorter = closest.distance >= alternative.distance ? alternative : closest;
  if (Math.abs(longer.distance - yards) <= Math.abs(shorter.distance - yards) + 8) {
    return longer;
  }
  return closest;
}

function speakRecommendation() {
  if (locationMode === "home" && pinSource !== "practice") {
    speakFeedback(`${golferName()}, we're not on a course, so I've no green to aim at. I can still keep the card.`);
    return;
  }
  if (!targetPin) {
    speakFeedback(locationMode === "course"
      ? `${golferName()}, I've no green for this hole yet. Mark the pin from the green.`
      : `${golferName()}, I haven't a course yet. If you're playing, tap I'm on a course, then mark the pin.`);
    return;
  }
  if (!playsLikeDistYards || !recommendedClubObj) {
    speakFeedback(`Still working out the yardage, ${golferName()}. GPS needs to be on, and you want to be at the ball.`);
    return;
  }
  const speechText = `${golferName()}, that's playing ${playsLikeDistYards}. I'd be taking the ${recommendedClubObj.name}. ${currentStrategy}`;
  speakFeedback(speechText);
}

function golferName() {
  const raw = String(playerProfile?.name || "").trim();
  return raw || "Kerry";
}

function normalizeGolferName(raw) {
  const cleaned = String(raw || "")
    .replace(/[^a-zA-Z\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "Kerry";
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
    .slice(0, 24);
}

function setGolferName(raw, announce) {
  playerProfile.name = normalizeGolferName(raw);
  saveJSON("caddie_profile", playerProfile);
  updateProfileUI();
  if (announce) speakFeedback(`Grand. I'll call you ${golferName()}.`);
}

function setHandicap(value, announce) {
  const n = Number(value);
  playerProfile.handicap = Number.isFinite(n) ? Math.min(54, Math.max(0, Math.round(n))) : 14;
  saveJSON("caddie_profile", playerProfile);
  updateProfileUI();
  if (currentPos && targetPin) refreshYardage();
  if (announce) {
    speakFeedback(`Handicap set to ${playerHandicap()}, ${golferName()}. ${playStyleSpeech()}.`);
  }
}

function onHandicapInputChange(event) {
  setHandicap(event.target.value, false);
}

function onNameInputChange(event) {
  setGolferName(event.target.value, false);
}

function playStyleSpeech(style = playStyle()) {
  if (style === "attack") return "We'll attack it when the shot is on.";
  if (style === "safe") return "We'll protect the double.";
  return "We'll play it smart.";
}

function previewCaddieVoice() {
  speakFeedback(`How's it going, ${golferName()}. I'll caddie for you. When you've a number, tap Ask Caddie.`);
}

function refreshCaddieVoice() {
  const synth = window.speechSynthesis;
  if (!synth) return null;
  const voices = synth.getVoices() || [];
  if (!voices.length) {
    if (caddieVoice && !Voice.isEnglishVoice(caddieVoice)) caddieVoice = null;
    return caddieVoice;
  }
  caddieVoice = pickCaddieVoice(voices);
  if (caddieVoice && !Voice.isEnglishVoice(caddieVoice)) caddieVoice = null;
  return caddieVoice;
}

function initSpeechVoices() {
  if (!window.speechSynthesis) {
    updateVoiceStatus();
    return;
  }
  const select = () => {
    refreshCaddieVoice();
    updateVoiceStatus();
  };
  select();
  const synth = window.speechSynthesis;
  if (typeof synth.addEventListener === "function") {
    synth.addEventListener("voiceschanged", select);
  }
  synth.onvoiceschanged = select;
}

function updateVoiceStatus() {
  const el = document.getElementById("voiceStatus");
  if (!el) return;
  if (!window.speechSynthesis) {
    el.innerText = "This browser cannot speak. On-screen controls still work.";
    return;
  }
  el.innerText = Voice.describeCaddieVoice(caddieVoice);
}

function voiceGenderScore(voice) {
  return Voice.voiceGenderScore(voice);
}

function scoreCaddieVoice(voice) {
  return Voice.scoreCaddieVoice(voice);
}

function pickCaddieVoice(voices) {
  return Voice.pickCaddieVoice(voices);
}

let speakTimer = 0;

function speakFeedback(message) {
  const synth = window.speechSynthesis;
  if (!synth) return;
  const text = String(message || "").trim();
  if (!text) return;

  try { synth.resume(); } catch (err) { /* iPhone leaves the engine paused. */ }
  const voice = refreshCaddieVoice();
  updateVoiceStatus();
  const settings = Voice.speechSettings(voice);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice?.lang || settings.lang || "en-GB";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  if (voice) utterance.voice = voice;

  const start = () => {
    try { synth.resume(); } catch (err) { /* already resumed */ }
    synth.speak(utterance);
  };

  // cancel() in the same turn makes iPhone drop the new line.
  if (synth.speaking || synth.pending) {
    synth.cancel();
    window.clearTimeout(speakTimer);
    speakTimer = window.setTimeout(start, 80);
  } else {
    start();
  }
}

window.CaddieSpeech = {
  pickCaddieVoice,
  scoreCaddieVoice,
  golferName,
  normalizeGolferName
};

window.CaddieStrategy = {
  buildStrategy,
  playStyle,
  playStyleLabel,
  clubDownFromDriver,
  migrateClubBag,
  isOldFactoryBag,
  shouldForceCourseLookup,
  resumeLocation,
  restoreClubFromBench: Bag.restoreClubFromBench,
  addClubToBag: Bag.addClubToBag,
  updateClubInBag: Bag.updateClubInBag,
  removeClubFromBag: Bag.removeClubFromBag,
  resetClubBag: Bag.resetClubBag,
  layupWedgeFrom: Bag.layupWedgeFrom
};

function calculateHaversineDistanceYards(pos1, pos2) {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (pos2.lat - pos1.lat) * rad;
  const dLng = (pos2.lng - pos1.lng) * rad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(pos1.lat * rad) * Math.cos(pos2.lat * rad) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c) * 1.09361;
}

function calculateHeading(pos1, pos2) {
  const rad = Math.PI / 180;
  const dLng = (pos2.lng - pos1.lng) * rad;
  const lat1 = pos1.lat * rad;
  const lat2 = pos2.lat * rad;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function calculateWindAdjustment(pos1, pos2, wind, rawDistance) {
  const targetHeading = calculateHeading(pos1, pos2);
  const relativeAngle = ((wind.direction - targetHeading + 540) % 360) - 180;
  const headwindComponent = wind.speed * Math.cos(relativeAngle * Math.PI / 180);
  return rawDistance * (headwindComponent * 0.01);
}

async function getElevationDiffMeters(pos1, pos2) {
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${pos1.lat},${pos2.lat}&longitude=${pos1.lng},${pos2.lng}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Elevation HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.elevation) || data.elevation.length < 2) {
    throw new Error("Unexpected elevation payload");
  }
  return data.elevation[1] - data.elevation[0];
}

async function getWindData(pos) {
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.lat}&longitude=${pos.lng}&current_weather=true`);
  if (!res.ok) throw new Error(`Wind HTTP ${res.status}`);
  const data = await res.json();
  if (!data.current_weather) throw new Error("Unexpected wind payload");
  return {
    speed: data.current_weather.windspeed * 0.621371,
    direction: data.current_weather.winddirection
  };
}

function updateStatus(text, isActive, isError = false) {
  const badge = document.getElementById("status");
  if (!badge) return;
  badge.innerText = text;
  badge.classList.toggle("active", Boolean(isActive) && !isError);
  badge.classList.toggle("error", Boolean(isError));
}

function updateStartButton() {
  const btn = document.getElementById("startBtn");
  if (!btn) return;
  btn.classList.toggle("stop", caddieOn);
  btn.textContent = caddieOn ? "STOP CADDIE" : "START CADDIE";
  btn.setAttribute("aria-pressed", caddieOn ? "true" : "false");
}
