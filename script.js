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
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

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
let targetPin = loadJSON("caddie_pin", null);

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

  updateProfileUI();
  updateScoreUI();
  updatePinUI();
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

  if (!("geolocation" in navigator)) {
    updateStatus("GPS not supported", false, true);
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

  if (voiceEnabled) {
    updateStatus("Voice listening active", true);
  } else if (targetPin) {
    updateStatus("GPS active", false);
  }

  if (!targetPin) {
    document.getElementById("rawDistance").innerText = "Pin not set";
    updatePinUI();
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
  lastTelemetryAt = 0;
  lastWindData = null;
  lastElevYards = null;
  saveJSON("caddie_pin", targetPin);
  updatePinUI(0);
  document.getElementById("rawDistance").innerText = "0 yd";
  document.getElementById("playsLike").innerText = "0 yd";
  document.getElementById("recommendedClub").innerText = "Pin marked";
  document.getElementById("strategyAdvice").innerText = "Walk to your ball, then ask for distance or tap Ask Caddie.";
  if (announce) speakFeedback("Pin marked. Walk to your ball and ask for distance.");
}

function updatePinUI(rawYards) {
  const pinElem = document.getElementById("pinStatus");
  if (!pinElem) return;

  if (!targetPin) {
    pinElem.classList.remove("set");
    pinElem.innerText = "Pin not set. Mark it from the green (or say \"mark pin\").";
    return;
  }

  pinElem.classList.add("set");
  const coords = `${targetPin.lat.toFixed(5)}, ${targetPin.lng.toFixed(5)}`;
  if (Number.isFinite(rawYards)) {
    pinElem.innerText = `Pin set at ${coords} · ${Math.round(rawYards)} yd from here`;
  } else {
    pinElem.innerText = `Pin set at ${coords}`;
  }
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
  currentHolePar = 4;
  persistRoundState();
  updateScoreUI();
  if (announce) speakFeedback(message);
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

  if (holeElem) holeElem.innerText = `Hole ${currentHole} (Par ${currentHolePar})`;
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
  if (!targetPin) {
    speakFeedback("Mark the pin first so I can give you a number.");
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
