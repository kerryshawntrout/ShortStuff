// ==========================================
// 1. STATE MANAGEMENT & LOCAL STORAGE
// ==========================================
const DEFAULT_CLUBS = [
  { name: "Driver", distance: 250, hits: 0 },
  { name: "3-Wood", distance: 220, hits: 0 },
  { name: "4-Iron", distance: 190, hits: 0 },
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

const TELEMETRY_REFRESH_MS = 25000;
const DETECT_RADIUS_M = 220;
const COURSE_DATA_RADIUS_M = 1700;
const COURSE_REQUERY_YD = 350;
const COURSE_REQUERY_MS = 4 * 60 * 1000;
const NEARBY_PIN_YD = 2200;
const TEE_PROXIMITY_YD = 80;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter"
];

const DEMO_MODE = new URLSearchParams(window.location.search).get("demo");
const DEMO_POSITIONS = {
  home: { lat: 40.440624, lng: -79.995888 },
  course: { lat: 40.438009, lng: -79.934861 }
};
const DEMO_COURSE = {
  name: "Bob O'Connor Golf Course",
  holes: [
    { hole: 1, par: 4, name: "Fairfield", tee: { lat: 40.438009, lng: -79.934861 }, green: { lat: 40.438469, lng: -79.937753 } },
    { hole: 2, par: 4, name: "The Moor", tee: { lat: 40.438200, lng: -79.937582 }, green: { lat: 40.437009, lng: -79.934240 } },
    { hole: 3, par: 4, name: "Lowlands", tee: { lat: 40.436723, lng: -79.934063 }, green: { lat: 40.437892, lng: -79.938162 } },
    { hole: 4, par: 4, name: "Greenheath", tee: { lat: 40.437382, lng: -79.937890 }, green: { lat: 40.436464, lng: -79.934201 } },
    { hole: 5, par: 3, name: "Belle View", tee: { lat: 40.436229, lng: -79.934066 }, green: { lat: 40.435678, lng: -79.935129 } },
    { hole: 6, par: 4, name: "Midlothian", tee: { lat: 40.436241, lng: -79.934780 }, green: { lat: 40.436786, lng: -79.937455 } },
    { hole: 7, par: 3, name: "The Copse", tee: { lat: 40.436681, lng: -79.936571 }, green: { lat: 40.437339, lng: -79.938316 } },
    { hole: 8, par: 4, name: "Midway", tee: { lat: 40.437489, lng: -79.939156 }, green: { lat: 40.439579, lng: -79.939621 } },
    { hole: 9, par: 4, name: "The Ravine", tee: { lat: 40.439480, lng: -79.939963 }, green: { lat: 40.437309, lng: -79.939544 } },
    { hole: 10, par: 4, name: "Westward Ho", tee: { lat: 40.437519, lng: -79.939880 }, green: { lat: 40.438590, lng: -79.942002 } },
    { hole: 11, par: 4, name: "The Meadow", tee: { lat: 40.438927, lng: -79.942319 }, green: { lat: 40.437106, lng: -79.943515 } },
    { hole: 12, par: 3, name: "Long Acre", tee: { lat: 40.437017, lng: -79.942996 }, green: { lat: 40.438239, lng: -79.942052 } },
    { hole: 13, par: 4, name: "The Hillside", tee: { lat: 40.437853, lng: -79.942035 }, green: { lat: 40.437119, lng: -79.939772 } },
    { hole: 14, par: 3, name: "The Dell", tee: { lat: 40.437155, lng: -79.939493 }, green: { lat: 40.435674, lng: -79.938935 } },
    { hole: 15, par: 3, name: "San Juan", tee: { lat: 40.435563, lng: -79.938759 }, green: { lat: 40.436074, lng: -79.937051 } },
    { hole: 16, par: 4, name: "Fort Pitt", tee: { lat: 40.436190, lng: -79.936818 }, green: { lat: 40.437228, lng: -79.939272 } },
    { hole: 17, par: 4, name: "Home", tee: { lat: 40.437438, lng: -79.938874 }, green: { lat: 40.439493, lng: -79.939004 } },
    { hole: 18, par: 4, name: "The Reach", tee: { lat: 40.439484, lng: -79.938702 }, green: { lat: 40.438382, lng: -79.935149 } }
  ]
};

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

let clubDatabase = loadJSON("caddie_clubs", DEFAULT_CLUBS);
let playerProfile = loadJSON("caddie_profile", {
  handicap: 14,
  lateralBias: 0,
  distanceBias: 0
});
let roundHistory = loadJSON("caddie_rounds", []);
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
let recognizer = null;
let voiceEnabled = false;
let isSpeaking = false;
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
let lastCourseQueryAt = 0;
let lastCourseQueryPos = null;
let courseLookupInFlight = false;

// ==========================================
// 2. INITIALIZATION & LISTENERS
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js")
      .then((reg) => console.log("Service Worker registered:", reg.scope))
      .catch((err) => console.error("Service Worker registration failed:", err));
  }

  document.getElementById("startBtn").addEventListener("click", toggleVoiceCaddie);
  document.getElementById("markPinBtn").addEventListener("click", () => markPinHere(true));
  document.getElementById("addStrokeBtn").addEventListener("click", () => addStroke(true));
  document.getElementById("undoStrokeBtn").addEventListener("click", () => undoStroke(true));
  document.getElementById("nextHoleBtn").addEventListener("click", () => completeHole(false, true));
  document.getElementById("skipHoleBtn").addEventListener("click", () => completeHole(true, true));
  document.getElementById("finishRoundBtn").addEventListener("click", () => finishRound(true));
  document.getElementById("askCaddieBtn").addEventListener("click", speakRecommendation);
  document.getElementById("onCourseBtn").addEventListener("click", () => setLocationOverride("course", true));
  document.getElementById("offCourseBtn").addEventListener("click", () => setLocationOverride("home", true));

  updateProfileUI();
  updateScoreUI();
  updatePinUI();
  updateLocationUI();
  updateHeroForMode();
  renderRoundHistory();
  startGpsWatch();
});

async function toggleVoiceCaddie() {
  if (voiceEnabled) {
    stopVoiceEngine();
    return;
  }
  await initCaddie();
}

async function initCaddie() {
  updateStatus("Starting caddie...", true);
  await requestWakeLock();
  startGpsWatch();
  initVoiceEngine();
}

function startGpsWatch() {
  if (watchId !== null) return;

  const demoPos = DEMO_POSITIONS[DEMO_MODE];
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

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      lastGpsErrorCode = null;
      onPositionUpdate(position);
    },
    (err) => {
      lastGpsErrorCode = err.code;
      console.error("GPS Error:", err);
      const denied = err.code === err.PERMISSION_DENIED;
      updateStatus(denied ? "Location permission denied" : "Waiting for GPS fix", voiceEnabled, denied);
      if (denied) {
        locationMode = "unknown";
        updateLocationUI("Location permission denied. Scorekeeping still works. Enable GPS to detect a golf course.");
        updateHeroForMode();
        updatePinUI();
      }
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
  );
}

// ==========================================
// 3. VOICE ENGINE & COMMAND PARSER
// ==========================================
function initVoiceEngine() {
  if (!SpeechRecognition) {
    updateStatus("Voice not supported", false, true);
    alert("Web Speech API is not supported in this browser. Chrome on Android works best. Use the on-screen buttons instead.");
    return;
  }

  recognizer = new SpeechRecognition();
  recognizer.continuous = true;
  recognizer.interimResults = false;
  recognizer.lang = "en-US";

  recognizer.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
    console.log("Caddie Heard:", transcript);
    parseVoiceCommand(transcript);
  };

  recognizer.onerror = (event) => {
    if (event.error === "not-allowed") {
      voiceEnabled = false;
      updateStartButton();
      updateStatus("Mic permission denied", false, true);
      return;
    }
    if (event.error !== "no-speech" && event.error !== "aborted") {
      console.warn("Speech recognition error:", event.error);
    }
  };

  recognizer.onend = () => {
    if (voiceEnabled && !isSpeaking) {
      restartRecognition();
    }
  };

  voiceEnabled = true;
  updateStartButton();
  updateStatus("Voice listening active", true);
  restartRecognition();
}

function stopVoiceEngine() {
  voiceEnabled = false;
  isSpeaking = false;
  try {
    recognizer?.stop();
  } catch (err) {
    // Already stopped.
  }
  updateStartButton();
  updateStatus("Standby", false);
}

function restartRecognition() {
  if (!voiceEnabled || !recognizer || isSpeaking) return;
  try {
    recognizer.start();
  } catch (err) {
    // start() throws if a session is already running.
  }
}

function parseVoiceCommand(speech) {
  if (includesAny(speech, ["mark pin", "set pin", "mark the pin", "mark the green", "that's the pin", "thats the pin"])) {
    markPinHere(true);
    return;
  }
  if (includesAny(speech, ["i'm at home", "im at home", "at home", "off the course", "off course"])) {
    setLocationOverride("home", true);
    return;
  }
  if (includesAny(speech, ["i'm on a course", "im on a course", "on the course", "on a course"])) {
    setLocationOverride("course", true);
    return;
  }
  if (includesAny(speech, ["what course", "where am i", "what course am i on"])) {
    speakLocation();
    return;
  }
  const holeMatch = speech.match(/\bhole (\d{1,2})\b/);
  if (holeMatch && !includesAny(speech, ["next hole", "finish hole", "skip hole"])) {
    goToHole(Number(holeMatch[1]), true);
    return;
  }
  if (includesAny(speech, ["par 3", "par three"])) {
    setHolePar(3, true);
    return;
  }
  if (includesAny(speech, ["par 4", "par four"])) {
    setHolePar(4, true);
    return;
  }
  if (includesAny(speech, ["par 5", "par five"])) {
    setHolePar(5, true);
    return;
  }
  if (includesAny(speech, ["undo stroke", "remove stroke", "take away stroke"])) {
    undoStroke(true);
    return;
  }
  if (includesAny(speech, ["add stroke", "count shot", "add shot"])) {
    addStroke(true);
    return;
  }
  if (includesAny(speech, ["skip hole"])) {
    completeHole(true, true);
    return;
  }
  if (includesAny(speech, ["next hole", "finish hole", "hole complete"])) {
    completeHole(false, true);
    return;
  }
  if (includesAny(speech, ["what's my score", "whats my score", "current score", "total score"])) {
    const relText = getRelativeScoreSpeech(completedHoles, currentHoleStrokes, currentHolePar);
    speakFeedback(`You are on hole ${currentHole} with ${currentHoleStrokes} strokes. Overall you are ${relText}.`);
    return;
  }
  if (includesAny(speech, ["finish round", "end round", "save round"])) {
    finishRound(true);
    return;
  }
  if (includesAny(speech, ["okay caddie", "ok caddie", "hey caddie", "caddie", "what club", "how far", "distance"])) {
    speakRecommendation();
    return;
  }
  if (includesAny(speech, ["good shot", "in target", "hit green"])) {
    addStroke(false);
    logShot("hit");
    speakFeedback(`Target hit logged. Stroke ${currentHoleStrokes} counted.`);
    return;
  }
  if (includesAny(speech, ["came up short", "too short", "short miss"])) {
    logShot("short");
    speakFeedback("Logged short miss. Adjusting club yardages up.");
    return;
  }
  if (includesAny(speech, ["flew long", "too long", "went long", "long miss"])) {
    logShot("long");
    speakFeedback("Logged long miss. Adjusting club yardages down.");
    return;
  }
  if (includesAny(speech, ["missed left", "pulled it", "left miss"])) {
    logShot("left");
    speakFeedback("Logged left miss. Updating draw bias.");
    return;
  }
  if (includesAny(speech, ["missed right", "pushed it", "right miss"])) {
    logShot("right");
    speakFeedback("Logged right miss. Updating fade bias.");
  }
}

function includesAny(speech, phrases) {
  return phrases.some((phrase) => speech.includes(phrase));
}

// ==========================================
// 4. GPS & TELEMETRY ENGINE
// ==========================================
async function onPositionUpdate(position) {
  currentPos = {
    lat: position.coords.latitude,
    lng: position.coords.longitude
  };

  await maybeRefreshCourseContext(currentPos);

  if (voiceEnabled) {
    updateStatus("Voice listening active", true);
  } else if (locationMode === "course") {
    updateStatus("On course", false);
  } else if (locationMode === "home") {
    updateStatus("At home", false);
  } else if (targetPin) {
    updateStatus("GPS active", false);
  }

  await refreshYardage();
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
  recommendedClubObj = getBestClub(strategy.targetDistance);
  currentStrategy = strategy.advice;

  document.getElementById("playsLike").innerText = `${playsLikeDistYards} yd`;
  document.getElementById("recommendedClub").innerText = recommendedClubObj
    ? `Club: ${recommendedClubObj.name}`
    : "No club data";
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
    updateStatus(denied ? "Location permission denied" : "Waiting for GPS fix", voiceEnabled, denied);
    return;
  }

  targetPin = { lat: currentPos.lat, lng: currentPos.lng };
  savedPin = targetPin;
  pinSource = locationMode === "home" ? "practice" : "manual";
  lastTelemetryAt = 0;
  lastWindData = null;
  lastElevYards = null;
  saveJSON("caddie_pin", targetPin);
  updatePinUI(0);
  document.getElementById("rawDistance").innerText = "0 yd";
  document.getElementById("playsLike").innerText = "0 yd";
  document.getElementById("recommendedClub").innerText = pinSource === "practice" ? "Practice pin" : "Pin marked";
  document.getElementById("strategyAdvice").innerText = pinSource === "practice"
    ? "Practice pin dropped. This is for testing at home, not a course green."
    : "Walk to your ball, then ask for distance or tap Ask Caddie.";
  if (announce) {
    speakFeedback(pinSource === "practice"
      ? "Practice pin marked. This is only for testing off the course."
      : "Pin marked. Walk to your ball and ask for distance.");
  }
  refreshYardage();
}

function updatePinUI(rawYards) {
  const pinElem = document.getElementById("pinStatus");
  if (!pinElem) return;

  if (!targetPin) {
    pinElem.classList.remove("set");
    if (locationMode === "home") {
      pinElem.innerText = "No pin needed at home. Drop a practice pin only if you want to test GPS.";
    } else if (locationMode === "course" && !holeByNumber(currentHole)?.green) {
      pinElem.innerText = "No mapped green for this hole. Mark the pin from the green (or say \"mark pin\").";
    } else if (locationMode === "course") {
      pinElem.innerText = "Aiming at the mapped green once GPS settles.";
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
    ? "mapped green"
    : (pinSource === "practice" ? "practice pin" : "marked pin");
  if (Number.isFinite(rawYards)) {
    pinElem.innerText = `${sourceLabel.charAt(0).toUpperCase()}${sourceLabel.slice(1)} at ${coords} · ${Math.round(rawYards)} yd from here`;
  } else {
    pinElem.innerText = `${sourceLabel.charAt(0).toUpperCase()}${sourceLabel.slice(1)} at ${coords}`;
  }
}

// ==========================================
// 4b. COURSE AWARENESS (OSM / Overpass)
// ==========================================
function setLocationOverride(mode, announce) {
  locationOverride = mode;
  lastCourseQueryAt = 0;
  lastCourseQueryPos = null;
  pinSource = "none";

  if (mode === "home") {
    applyHomeMode("You're marked as at home. Pin setup stays optional.");
    if (announce) speakFeedback("At home. I will not ask you to set a pin.");
    return;
  }

  applyUnmappedCourse(currentPos);
  if (currentPos) {
    maybeRefreshCourseContext(currentPos).then(() => refreshYardage());
  }
  if (announce) speakFeedback("Treating this as a golf course. Mark the pin if I don't have a green.");
}

function speakLocation() {
  if (locationMode === "home") {
    speakFeedback("You are off the course. I am not asking for a pin.");
    return;
  }
  if (locationMode === "course") {
    const course = detectedCourse?.name || "a golf course";
    const mapped = holeByNumber(currentHole);
    const holeText = mapped?.name ? `Hole ${mapped.hole} ${mapped.name}` : `hole ${currentHole}`;
    speakFeedback(`You are on ${course}, ${holeText}, par ${currentHolePar}.`);
    return;
  }
  speakFeedback("I have not confirmed a golf course yet.");
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

  if (DEMO_MODE === "course" && locationOverride !== "home") {
    if (locationMode !== "course") applyCourseModel({ ...DEMO_COURSE }, pos);
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
    await lookupCourseFromOsm(pos);
  } finally {
    courseLookupInFlight = false;
  }
}

async function lookupCourseFromOsm(pos) {
  lastCourseQueryAt = Date.now();
  lastCourseQueryPos = { lat: pos.lat, lng: pos.lng };

  const forceCourse = locationOverride === "course";
  const detect = await queryOverpass(buildDetectQuery(pos));

  if (!detect) {
    if (forceCourse) {
      applyUnmappedCourse(pos);
      return;
    }
    locationMode = "unknown";
    updateLocationUI("Couldn't reach the course map. Scorekeeping works. If you're playing, tap I'm on a course.");
    updateHeroForMode();
    updatePinUI();
    return;
  }

  const golfHits = (detect.elements || []).filter(isGolfElement);
  if (!golfHits.length && !forceCourse) {
    applyHomeMode("No golf course mapped around this GPS point.");
    return;
  }

  const radius = forceCourse && !golfHits.length ? 2500 : COURSE_DATA_RADIUS_M;
  const data = await queryOverpass(buildCourseDataQuery(pos, radius));
  const model = buildCourseModel(data?.elements || [], pos);

  if (!model.course && !model.holes.length) {
    if (forceCourse || golfHits.length) applyUnmappedCourse(pos);
    else applyHomeMode("No golf course mapped around this GPS point.");
    return;
  }

  applyCourseModel(model, pos);
}

function applyHomeMode(detail) {
  locationMode = "home";
  detectedCourse = null;
  courseHoles = [];
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
  if (!voiceEnabled) updateStatus("At home", false);
  updateLocationUI(detail);
  renderHoleStrip();
  updateMarkPinButton();
  updatePinUI();
  updateHeroForMode();
}

function applyUnmappedCourse(pos) {
  locationMode = "course";
  detectedCourse = { name: "Unmapped course" };
  courseHoles = [];
  if (pinSource !== "manual") {
    if (pos && savedPin && calculateHaversineDistanceYards(pos, savedPin) < NEARBY_PIN_YD) {
      targetPin = savedPin;
      pinSource = "manual";
    } else {
      targetPin = null;
      pinSource = "none";
    }
  }
  updateLocationUI("Treating this as a course, but OpenStreetMap has no holes here. Mark the pin on each green.");
  renderHoleStrip();
  updateMarkPinButton();
  updatePinUI();
  updateHeroForMode();
  if (!targetPin) {
    const raw = document.getElementById("rawDistance");
    if (raw) raw.innerText = "No green yet";
  }
  if (!voiceEnabled) updateStatus("On course", false);
}

function applyCourseModel(model, pos) {
  locationMode = "course";
  detectedCourse = { name: model.name || model.course?.name || "Golf course" };
  courseHoles = (model.holes || []).map((hole) => ({ ...hole }));

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
  if (!aim) return false;

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
    const label = mapped?.name ? `${holeNum} ${mapped.name}` : String(holeNum);
    speakFeedback(`Hole ${label}, par ${currentHolePar}.`);
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

function updateLocationUI(detail) {
  const card = document.getElementById("locationCard");
  const nameEl = document.getElementById("courseName");
  const detailEl = document.getElementById("courseDetail");
  if (!card || !nameEl || !detailEl) return;

  card.classList.remove("searching", "home", "course");
  const demoNote = DEMO_MODE ? " Demo location is on." : "";

  if (locationMode === "home") {
    card.classList.add("home");
    nameEl.innerText = "At home / off course";
    detailEl.innerText = (detail || "No golf course around this GPS point. Keep score here; yardage starts when you arrive at a mapped course.") + demoNote;
  } else if (locationMode === "course") {
    card.classList.add("course");
    const mapped = holeByNumber(currentHole);
    const holeLabel = mapped
      ? `Hole ${mapped.hole}${mapped.name ? ` ${mapped.name}` : ""} · Par ${mapped.par}`
      : `Hole ${currentHole}`;
    nameEl.innerText = detectedCourse?.name || "On a golf course";
    detailEl.innerText = (detail || `${holeLabel}. ${mapped?.green ? "Targeting the mapped green." : "Mark the pin on the green."}`) + demoNote;
  } else {
    card.classList.add("searching");
    nameEl.innerText = locationMode === "unknown" ? "Location unclear" : "Locating you…";
    detailEl.innerText = (detail || "Checking GPS for a nearby golf course. At home you can keep score without setting a pin.") + demoNote;
  }

  updateMarkPinButton();
}

function updateHeroForMode() {
  if (targetPin && recommendedClubObj) return;

  const club = document.getElementById("recommendedClub");
  const advice = document.getElementById("strategyAdvice");
  if (!club || !advice) return;

  if (targetPin) return;

  if (locationMode === "home") {
    club.innerText = "At home";
    advice.innerText = "No golf course around this GPS point. Keep score, review clubs, or drop an optional practice pin. On a mapped course I pick up the greens automatically.";
  } else if (locationMode === "course") {
    club.innerText = detectedCourse?.name || "On course";
    advice.innerText = holeByNumber(currentHole)?.green
      ? "Targeting the mapped green for this hole. Walk to your ball for yardage, or override the pin if it's tucked."
      : "This course isn't mapped hole-by-hole. Stand on the green and mark the pin.";
  } else if (locationMode === "unknown") {
    club.innerText = "Scorekeeper ready";
    advice.innerText = "Couldn't confirm a nearby course. Scorekeeping works now. If you're playing, tap I'm on a course.";
  } else {
    club.innerText = "Locating you";
    advice.innerText = "Checking whether you are on a golf course. Pin setup is only needed on the course.";
  }
}

function updateMarkPinButton() {
  const btn = document.getElementById("markPinBtn");
  if (!btn) return;
  const needsPin = locationMode === "course" && !holeByNumber(currentHole)?.green && !targetPin;
  btn.classList.toggle("primary", needsPin);
  if (locationMode === "course") {
    btn.innerText = (pinSource === "course" || holeByNumber(currentHole)?.green)
      ? "Override pin here"
      : "Mark Pin Here";
  } else {
    btn.innerText = "Drop practice pin";
  }
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
    btn.className = "hole-chip" + (hole.hole === currentHole ? " active" : "");
    btn.textContent = String(hole.hole);
    btn.title = `${hole.name || `Hole ${hole.hole}`} · Par ${hole.par}`;
    btn.addEventListener("click", () => goToHole(hole.hole, true));
    strip.appendChild(btn);
  }
}

function buildDetectQuery(pos) {
  return `[out:json][timeout:20];
(
  nwr["leisure"="golf_course"](around:${DETECT_RADIUS_M},${pos.lat},${pos.lng});
  nwr["golf"](around:${DETECT_RADIUS_M},${pos.lat},${pos.lng});
);
out tags center 20;`;
}

function buildCourseDataQuery(pos, radius) {
  return `[out:json][timeout:25];
(
  way["leisure"="golf_course"](around:${radius},${pos.lat},${pos.lng});
  relation["leisure"="golf_course"](around:${radius},${pos.lat},${pos.lng});
  way["golf"="hole"](around:${radius},${pos.lat},${pos.lng});
  nwr["golf"="green"](around:${radius},${pos.lat},${pos.lng});
  node["golf"="pin"](around:${radius},${pos.lat},${pos.lng});
);
out tags center geom;`;
}

async function queryOverpass(ql) {
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: "data=" + encodeURIComponent(ql)
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data && Array.isArray(data.elements)) return data;
    } catch (err) {
      console.warn("Overpass error", url, err);
    }
  }
  return null;
}

function isGolfElement(el) {
  const tags = el.tags || {};
  return tags.leisure === "golf_course" || Boolean(tags.golf) || tags.sport === "golf";
}

function parseHoleRef(value) {
  if (value == null) return null;
  const match = String(value).match(/(\d{1,2})/);
  if (!match) return null;
  const n = Number(match[1]);
  return n >= 1 && n <= 27 ? n : null;
}

function parsePar(value) {
  const n = Number(value);
  return n === 3 || n === 4 || n === 5 ? n : 4;
}

function elementCenter(el) {
  if (Number.isFinite(el.lat) && Number.isFinite(el.lon)) {
    return { lat: el.lat, lng: el.lon };
  }
  if (el.center && Number.isFinite(el.center.lat)) {
    return { lat: el.center.lat, lng: el.center.lng ?? el.center.lon };
  }
  const geom = el.geometry;
  if (Array.isArray(geom) && geom.length) {
    const mid = geom[Math.floor(geom.length / 2)];
    return { lat: mid.lat, lng: mid.lon };
  }
  return null;
}

function buildCourseModel(elements, pos) {
  const courses = [];
  const holeMap = new Map();
  const pins = [];
  const greens = [];

  for (const el of elements || []) {
    const tags = el.tags || {};
    const center = elementCenter(el);
    if (tags.leisure === "golf_course" && center) {
      courses.push({
        name: tags.name || tags.short_name || "Golf course",
        lat: center.lat,
        lng: center.lng,
        id: el.id
      });
    }
    if (tags.golf === "hole") {
      const ref = parseHoleRef(tags.ref || tags.hole);
      const geom = el.geometry || [];
      const teePt = geom[0] ? { lat: geom[0].lat, lng: geom[0].lon } : center;
      const greenPt = geom.length
        ? { lat: geom[geom.length - 1].lat, lng: geom[geom.length - 1].lon }
        : center;
      if (!ref || !greenPt) continue;
      holeMap.set(ref, {
        hole: ref,
        par: parsePar(tags.par),
        name: tags.name || null,
        tee: teePt,
        green: greenPt,
        pin: null,
        center
      });
    }
    if (tags.golf === "pin" && center) {
      pins.push({ ref: parseHoleRef(tags.ref), lat: center.lat, lng: center.lng });
    }
    if (tags.golf === "green" && center) {
      greens.push({ ref: parseHoleRef(tags.ref), lat: center.lat, lng: center.lng });
    }
  }

  for (const pin of pins) {
    if (pin.ref && holeMap.has(pin.ref)) {
      holeMap.get(pin.ref).pin = { lat: pin.lat, lng: pin.lng };
      continue;
    }
    let best = null;
    let bestYd = 60;
    for (const hole of holeMap.values()) {
      if (!hole.green) continue;
      const yd = calculateHaversineDistanceYards(pin, hole.green);
      if (yd < bestYd) {
        bestYd = yd;
        best = hole;
      }
    }
    if (best) best.pin = { lat: pin.lat, lng: pin.lng };
  }

  for (const green of greens) {
    if (green.ref && holeMap.has(green.ref)) {
      const hole = holeMap.get(green.ref);
      if (!hole.green) hole.green = { lat: green.lat, lng: green.lng };
    }
  }

  const holes = [...holeMap.values()].sort((a, b) => a.hole - b.hole);
  courses.sort((a, b) => (
    calculateHaversineDistanceYards(pos, a) - calculateHaversineDistanceYards(pos, b)
  ));

  return {
    course: courses[0] || (holes.length ? { name: "Golf course" } : null),
    name: (courses[0] || {}).name || (holes.length ? "Golf course" : null),
    holes
  };
}

// ==========================================
// 5. SCREEN WAKE LOCK CONTROL
// ==========================================
async function requestWakeLock() {
  if (!("wakeLock" in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      if (voiceEnabled) console.log("Screen Wake Lock released");
    });
  } catch (err) {
    console.error(`Wake Lock Error: ${err.name}, ${err.message}`);
  }
}

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible" && voiceEnabled) {
    await requestWakeLock();
    restartRecognition();
  }
});

// ==========================================
// 6. STRATEGY & SHOT LOGGING
// ==========================================
function runCourseManagementEngine(playsLikeYards, rawYards) {
  let targetDistance = playsLikeYards;
  let advice = "";

  if (rawYards > 120) {
    advice = "Aim for center of green. Ignore tucked pin locations.";
  } else {
    advice = "In wedge range. Attack pin directly.";
  }

  if (playerProfile.lateralBias > 2) {
    advice += " Adjusting for stock fade: aim 8 yards left of target.";
  } else if (playerProfile.lateralBias < -2) {
    advice += " Adjusting for stock draw: aim 8 yards right of target.";
  }

  return { targetDistance, advice };
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
  updateScoreUI();
  if (announce) speakFeedback(`Hole ${currentHole} set to Par ${par}.`);
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
    if (announce) speakFeedback("No strokes logged for this hole. Say add stroke, or skip hole.");
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
    ? `Skipping hole ${currentHole}. Moving to hole ${nextHole}.`
    : `Hole ${currentHole} logged with ${currentHoleStrokes} strokes. You are currently ${relText}. Moving to hole ${nextHole}.`;

  currentHole = nextHole;
  currentHoleStrokes = 0;
  currentHolePar = holeByNumber(nextHole)?.par || 4;
  if (pinSource === "manual" || pinSource === "practice") pinSource = "none";
  persistRoundState();
  updateScoreUI();
  aimAtCurrentHoleGreen();
  renderHoleStrip();
  updateLocationUI();
  if (announce) speakFeedback(message);
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
    speakFeedback(`Round saved to history. You completed ${completedHoles.length} holes with ${totalStrokes} gross strokes, finishing ${finalRel}.`);
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
  const holeName = mapped?.name ? ` ${mapped.name}` : "";
  if (holeElem) holeElem.innerText = `Hole ${currentHole}${holeName} (Par ${currentHolePar})`;
  if (strokesElem) strokesElem.innerText = `${currentHoleStrokes} strokes`;

  if (totalElem) {
    const relScore = calculateRelativeScore(completedHoles, currentHoleStrokes, currentHolePar);
    totalElem.innerText = relScore.formatted;
  }
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
  roundHistory = roundHistory.slice(0, 20);
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
}

function getBestClub(yards) {
  if (!clubDatabase.length) return null;
  const sortedClubs = [...clubDatabase].sort((a, b) => Math.abs(a.distance - yards) - Math.abs(b.distance - yards));
  return sortedClubs[0];
}

function speakRecommendation() {
  if (locationMode === "home" && pinSource !== "practice") {
    speakFeedback("You're not on a golf course, so I don't have a green to aim at. I can still keep score.");
    return;
  }
  if (!targetPin) {
    speakFeedback(locationMode === "course"
      ? "I don't have a green for this hole yet. Mark the pin from the green."
      : "I haven't found a course yet. If you're playing, say I'm on a course, then mark the pin.");
    return;
  }
  if (!playsLikeDistYards || !recommendedClubObj) {
    speakFeedback("Still calculating distance. Make sure GPS is on and you have walked to your ball.");
    return;
  }
  const speechText = `Plays like ${playsLikeDistYards} yards. I recommend your ${recommendedClubObj.name}. ${currentStrategy}`;
  speakFeedback(speechText);
}

function speakFeedback(message) {
  if (!window.speechSynthesis) return;

  isSpeaking = true;
  try {
    recognizer?.stop();
  } catch (err) {
    // Recognition may already be idle.
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.onend = () => {
    isSpeaking = false;
    restartRecognition();
  };
  utterance.onerror = () => {
    isSpeaking = false;
    restartRecognition();
  };
  window.speechSynthesis.speak(utterance);
}

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
  btn.classList.toggle("stop", voiceEnabled);
  btn.innerText = voiceEnabled ? "STOP VOICE CADDIE" : "START VOICE CADDIE";
}
