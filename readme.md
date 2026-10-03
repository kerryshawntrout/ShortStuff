# Virtual Golf Caddie PWA

A lightweight Progressive Web App that recommends clubs from GPS yardage, elevation, and wind. You tap the buttons. The caddie answers out loud.

## Features

* **Course-aware GPS:** Uses OpenStreetMap to tell home from a golf course. At home it keeps score and does not ask you to set a pin.
* **Mapped greens:** On a tagged course it reads holes/greens and aims at the current green automatically. If two nines share hole numbers (Norvelt and Luke’s Links), it keeps the set that matches the hole names under your GPS.
* **Teach missing holes:** If a hole isn't mapped, save the tee and mark the pin on the green. The phone keeps that for the next round.
* **Mark-the-pin override:** If a course isn't mapped, or the pin is tucked, stand on the green and mark it.
* **Elevation and wind adjustments:** Uses the Open-Meteo elevation and forecast APIs to compute plays-like yardage.
* **Tap in, voice out:** Score, club, pin, par, and misses are buttons. The caddie speaks each reply. The microphone stays off.
* **Australian male caddie voice:** Speaks with an `en-AU` male voice when the phone has one installed, and uses the golfer's name in conversation.
* **Editable bag:** Tap **Bag** for clubs and carry yards. The round stays on the first screen. Removed clubs keep their yards if you add them back. The caddie picks from the clubs still in the bag.
* **On-screen scorekeeping:** Tap controls work even when the microphone is unavailable.
* **Round memory:** In-progress rounds survive a refresh; finished rounds are stored locally.
* **Offline app shell:** Service worker caches the UI so the scorekeeper still loads without signal.

## Quick start

**At home:** Allow location. The app should say you are off-course. Keep score or review history; pin setup stays optional.

**On a mapped course:** Allow location. The course name and hole strip appear, and yardage aims at that hole's green. Walk to your ball and ask for a club.

**On an unmapped hole:** Tap the hole number (dashed chips are missing). Stand on the tee and tap **Save tee**. On the green tap **Mark Pin Here**. Next round that hole is already in the app.

**On an unmapped course:** Tap **I'm on a course**, then teach tees and greens the same way.

1. Open the app and allow location. The microphone is not used.
2. Confirm the location card shows the course (or tap **I'm on a course**).
3. Tap **Start Caddie** if you want the screen to stay awake. You should hear a greeting.
4. Walk to your ball. The GPS and plays-like numbers update automatically.
5. Tap **Ask Caddie** for the club and plan. Tap **Add Stroke**, then **Next Hole**.

For the Australian male voice, install **English (Australia)** in the phone's text-to-speech settings. On iPhone, Lee is the usual male Australian voice. The caddie uses the name in the Golfer field (default **Kerry**). Change that field and the caddie says the new name.

## User guide

A printable guide (what the app does, a full round workflow, the tap controls, and troubleshooting) is in [`docs/AI-Caddie-User-Guide.pdf`](docs/AI-Caddie-User-Guide.pdf). Rebuild it with `python3 docs/build_user_guide.py`.

## Project structure

```text
virtual-golf-caddie/
├── index.html        # App layout
├── styles.css        # High-contrast outdoor UI
├── script.js         # GPS, APIs, spoken replies, scoring
├── course-memory.js  # Holes taught on-round, stored on the phone
├── club-bag.js       # Add/remove/edit clubs and carry yards
├── sw.js             # Offline cache
├── manifest.json     # PWA install metadata
└── aii.png           # App icon
```
