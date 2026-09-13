# Virtual Golf Caddie PWA

A lightweight, hands-free Progressive Web App that recommends clubs from GPS yardage, elevation, and wind, and keeps score by voice or tap.

## Features

* **Course-aware GPS:** Uses OpenStreetMap to tell home from a golf course. At home it keeps score and does not ask you to set a pin.
* **Mapped greens:** On a tagged course it reads holes/greens and aims at the current green automatically.
* **Mark-the-pin override:** If a course isn't mapped, or the pin is tucked, stand on the green and mark it.
* **Elevation and wind adjustments:** Uses the Open-Meteo elevation and forecast APIs to compute plays-like yardage.
* **Hands-free voice assistant:** Listens for commands like `"okay caddie"`, `"add stroke"`, `"next hole"`, and `"hole 7"`.
* **Australian male caddie voice:** Speaks with an `en-AU` male voice when the phone has one installed, and uses the golfer's name in conversation.
* **On-screen scorekeeping:** Tap controls work even when the microphone is unavailable.
* **Round memory:** In-progress rounds survive a refresh; finished rounds are stored locally.
* **Offline app shell:** Service worker caches the UI so the scorekeeper still loads without signal.

## Quick start

**At home:** Allow location. The app should say you are off-course. Keep score or review history; pin setup stays optional.

**On a mapped course:** Allow location. The course name and hole strip appear, and yardage aims at that hole's green. Walk to your ball and ask for a club.

**On an unmapped course:** Tap **I'm on a course**, stand on the green, then **Mark Pin Here** (or say `"mark pin"`).

1. Open the app and allow location (and microphone if you want voice).
2. Confirm the location card shows the course (or tap **I'm on a course**).
3. Walk to your ball. The GPS and plays-like numbers update automatically.
4. Say `"okay caddie"` / `"distance"` or tap **Ask Caddie**.
5. Log strokes with `"add stroke"` or the on-screen buttons, then `"next hole"`.

Voice recognition works best in **Chrome on Android**. Safari/iOS support for continuous listening is limited; use the buttons there.

For the Australian male voice, install **English (Australia)** in the phone's text-to-speech settings. On iPhone, Lee is the usual male Australian voice. The caddie uses the name in the Golfer field (default **Kerry**); you can also say `"call me Kerry"`.

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
