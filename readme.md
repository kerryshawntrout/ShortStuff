# Virtual Golf Caddie PWA

A lightweight, hands-free Progressive Web App that recommends clubs from GPS yardage, elevation, and wind, and keeps score by voice or tap.

## Features

* **Mark-the-pin GPS yardage:** Stand on the green, mark the pin, then walk to your ball for live distance.
* **Elevation and wind adjustments:** Uses the Open-Meteo elevation and forecast APIs to compute plays-like yardage.
* **Hands-free voice assistant:** Listens for commands like `"mark pin"`, `"okay caddie"`, `"add stroke"`, and `"next hole"`.
* **On-screen scorekeeping:** Tap controls work even when the microphone is unavailable.
* **Round memory:** In-progress rounds survive a refresh; finished rounds are stored locally.
* **Offline app shell:** Service worker caches the UI so the scorekeeper still loads without signal.

## Quick start on the course

1. Open the app and allow location (and microphone if you want voice).
2. Stand at the pin/green and tap **Mark Pin Here** (or say `"mark pin"`).
3. Walk to your ball. The GPS and plays-like numbers update automatically.
4. Say `"okay caddie"` / `"distance"` or tap **Ask Caddie**.
5. Log strokes with `"add stroke"` or the on-screen buttons, then `"next hole"`.

Voice recognition works best in **Chrome on Android**. Safari/iOS support for continuous listening is limited; use the buttons there.

## Project structure

```text
virtual-golf-caddie/
├── index.html    # App layout
├── styles.css    # High-contrast outdoor UI
├── script.js     # GPS, APIs, voice, scoring
├── sw.js         # Offline cache
├── manifest.json # PWA install metadata
└── aii.png       # App icon
```
