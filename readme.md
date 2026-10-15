# Virtual Golf Caddie PWA

A lightweight Progressive Web App that recommends clubs from GPS yardage, elevation, and wind. You tap the buttons. The caddie answers out loud.

## Features

* **Course-aware GPS:** Uses GolfCourseAPI to find a course within 2 miles, or a course you search by name. At home it keeps score and does not ask you to set a pin.
* **Scorecard:** Loads par and yardage for each hole. GolfCourseAPI does not publish green coordinates, so the first time on a hole you mark the pin. The phone keeps that pin for the next round.
* **Teach missing holes:** If a hole isn't mapped, save the tee and mark the pin on the green. The phone keeps that for the next round.
* **Mark-the-pin override:** If a course isn't mapped, or the pin is tucked, stand on the green and mark it.
* **Elevation and wind adjustments:** Uses the Open-Meteo elevation and forecast APIs to compute plays-like yardage.
* **Tap in, voice out:** Score, club, pin, par, and misses are buttons. The caddie speaks each reply. The microphone stays off.
* **Irish male caddie voice:** Speaks with an Irish male voice when the phone has one (Connor on English (Ireland)). Otherwise it uses an English male voice, preferring UK English, and the lines are written in Irish English. Other languages on the phone, such as Assamese, are ignored. A woman's voice is not chosen while any male English voice is installed. The caddie uses the golfer's name.
* **Editable bag:** Tap **Bag** for clubs and carry yards. The round stays on the first screen. Removed clubs keep their yards if you add them back. The caddie picks from the clubs still in the bag.
* **On-screen scorekeeping:** Tap controls work even when the microphone is unavailable.
* **Round memory:** In-progress rounds survive a refresh; finished rounds are stored locally.
* **Offline app shell:** Service worker caches the UI so the scorekeeper still loads without signal.

## Quick start

**At home:** Allow location. The app should say you are off-course. Keep score or review history; pin setup stays optional.

**On a course:** Allow location, and save a GolfCourseAPI key in the app. Within 2 miles, a Pro key loads the nearest course. A free key can search by course name. The hole strip shows par and scorecard yardage. On the green, tap **Mark Pin Here**. Walk to your ball and ask for a club.

**On a hole with no saved pin:** Dashed chips still need a green. Stand on the tee and tap **Save tee**. On the green tap **Mark Pin Here**. Next round that hole is already in the app.

**If the course is not in GolfCourseAPI:** Tap **I'm on a course**, then teach tees and greens the same way.

1. Open the app, allow location, and paste a GolfCourseAPI key under Your caddie. Tap Find to use it. You do not have to leave the key box first. The microphone is not used. The key stays on the phone.
2. Confirm the location card shows the course (or tap **I'm on a course**).
3. Tap **Start Caddie** if you want the screen to stay awake. You should hear a greeting.
4. Walk to your ball. The GPS and plays-like numbers update automatically.
5. Tap **Ask Caddie** for the club and plan. Tap **Add Stroke**, then **Next Hole**.

For the Irish male voice, install **English (Ireland)** and choose **Connor** if the phone lists him. iPhone has no male Irish voice, so download **Daniel** (English, UK, male) and skip Moira. The wording stays Irish either way. The caddie uses the name in the Golfer field (default **Kerry**). Change that field and the caddie says the new name.

## User guide

A printable guide (what the app does, a full round workflow, the tap controls, and troubleshooting) is in [`docs/AI-Caddie-User-Guide.pdf`](docs/AI-Caddie-User-Guide.pdf). Rebuild it with `python3 docs/build_user_guide.py`.

## Project structure

```text
virtual-golf-caddie/
├── index.html        # App layout
├── styles.css        # High-contrast outdoor UI
├── caddie-voice.js   # Male voice picker, Irish English preferred
├── golf-course-api.js # GolfCourseAPI scorecard mapping
├── script.js         # GPS, APIs, spoken replies, scoring
├── course-memory.js  # Holes taught on-round, stored on the phone
├── club-bag.js       # Add/remove/edit clubs and carry yards
├── sw.js             # Offline cache
├── manifest.json     # PWA install metadata
└── aii.png           # App icon
```
