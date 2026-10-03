#!/usr/bin/env python3
"""Build the AI Caddie user-guide PDF."""

from pathlib import Path

from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    CondPageBreak,
    Image,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "guide-assets"
OUTPUT = ROOT / "AI-Caddie-User-Guide.pdf"

INK = HexColor("#1b2428")
MUTED = HexColor("#5c6b73")
FOREST = HexColor("#1f6b4a")
GREEN = HexColor("#2ecc71")
GOLD = HexColor("#c9a227")
CREAM = HexColor("#f6f1e6")
CARD = HexColor("#ece5d4")
RULE = HexColor("#d7cfc0")
DARK = HexColor("#12181b")


def rgb(hex_color):
    return HexColor(hex_color)


def make_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        "CoverKicker", fontName="Times-Italic", fontSize=12, textColor=GOLD,
        alignment=TA_CENTER, spaceAfter=8
    ))
    styles.add(ParagraphStyle(
        "CoverTitle", fontName="Times-Bold", fontSize=34, leading=38,
        textColor=white, alignment=TA_CENTER, spaceAfter=10
    ))
    styles.add(ParagraphStyle(
        "CoverSub", fontName="Times-Roman", fontSize=13, leading=18,
        textColor=HexColor("#c5d0d4"), alignment=TA_CENTER, spaceAfter=6
    ))
    styles.add(ParagraphStyle(
        "H1", fontName="Times-Bold", fontSize=18, leading=22, textColor=FOREST,
        spaceBefore=4, spaceAfter=8
    ))
    styles.add(ParagraphStyle(
        "H2", fontName="Times-Bold", fontSize=13, leading=17, textColor=INK,
        spaceBefore=10, spaceAfter=5
    ))
    styles.add(ParagraphStyle(
        "Body", fontName="Times-Roman", fontSize=10.5, leading=15,
        textColor=INK, alignment=TA_JUSTIFY, spaceAfter=7
    ))
    styles.add(ParagraphStyle(
        "Callout", fontName="Times-Roman", fontSize=10.5, leading=15,
        textColor=INK, alignment=TA_LEFT, spaceAfter=0
    ))
    styles.add(ParagraphStyle(
        "Caption", fontName="Times-Italic", fontSize=8.5, leading=11,
        textColor=MUTED, alignment=TA_CENTER, spaceBefore=3, spaceAfter=10
    ))
    styles.add(ParagraphStyle(
        "GuideBullet", fontName="Times-Roman", fontSize=10.5, leading=14.5,
        textColor=INK, leftIndent=8, spaceAfter=2
    ))
    styles.add(ParagraphStyle(
        "Cmd", fontName="Times-Bold", fontSize=9.5, leading=12, textColor=FOREST
    ))
    styles.add(ParagraphStyle(
        "CmdHelp", fontName="Times-Roman", fontSize=9.5, leading=12, textColor=INK
    ))
    styles.add(ParagraphStyle(
        "Th", fontName="Times-Bold", fontSize=9, leading=12, textColor=white
    ))
    styles.add(ParagraphStyle(
        "Footer", fontName="Times-Roman", fontSize=8, textColor=MUTED, alignment=TA_CENTER
    ))
    styles.add(ParagraphStyle(
        "StepNum", fontName="Times-Bold", fontSize=10.5, leading=15, textColor=FOREST
    ))
    return styles


def bullets(items, styles):
    return ListFlowable(
        [ListItem(Paragraph(item, styles["GuideBullet"]), leftIndent=12, bulletColor=FOREST) for item in items],
        bulletType="bullet",
        start="•",
        leftIndent=16,
        bulletFontName="Times-Bold",
        bulletFontSize=10,
        bulletColor=FOREST,
        spaceAfter=8,
    )


def callout(text, styles):
    inner = Paragraph(text, styles["Callout"])
    table = Table([[inner]], colWidths=[170 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CARD),
        ("BOX", (0, 0), (-1, -1), 0.6, GOLD),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return table


def command_table(rows, styles, headers=("Say this", "What happens")):
    data = [[Paragraph(headers[0], styles["Th"]), Paragraph(headers[1], styles["Th"])]]
    for cmd, help_text in rows:
        data.append([Paragraph(cmd, styles["Cmd"]), Paragraph(help_text, styles["CmdHelp"])])
    table = Table(data, colWidths=[62 * mm, 108 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), FOREST),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("BACKGROUND", (0, 1), (-1, -1), white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, CARD]),
        ("GRID", (0, 0), (-1, -1), 0.3, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def screenshot(path, width_mm=72):
    from PIL import Image as PILImage
    with PILImage.open(path) as raw:
        w, h = raw.size
    height_mm = width_mm * (h / float(w))
    img = Image(str(path), width=width_mm * mm, height=height_mm * mm)
    img.hAlign = "CENTER"
    return img


def screenshot_block(path, caption, styles, width_mm=72):
    if not Path(path).exists():
        return []
    return [KeepTogether([
        screenshot(path, width_mm),
        Paragraph(caption, styles["Caption"]),
    ])]


def draw_cover(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(DARK)
    canvas.rect(0, 0, w, h, fill=1, stroke=0)
    canvas.setFillColor(FOREST)
    canvas.rect(0, 0, 8 * mm, h, fill=1, stroke=0)
    canvas.setFillColor(GOLD)
    canvas.rect(8 * mm, 0, 1.6 * mm, h, fill=1, stroke=0)
    canvas.setStrokeColor(HexColor("#2d3748"))
    canvas.setLineWidth(0.6)
    canvas.roundRect(22 * mm, 28 * mm, w - 44 * mm, h - 56 * mm, 8, fill=0, stroke=1)
    canvas.restoreState()


def draw_body(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(CREAM)
    canvas.rect(0, 0, w, h, fill=1, stroke=0)
    canvas.setFillColor(FOREST)
    canvas.rect(0, h - 12 * mm, w, 12 * mm, fill=1, stroke=0)
    canvas.setFillColor(GOLD)
    canvas.rect(0, h - 13.2 * mm, w, 1.2 * mm, fill=1, stroke=0)
    canvas.setFillColor(white)
    canvas.setFont("Times-Bold", 9)
    canvas.drawString(18 * mm, h - 8.2 * mm, "AI Caddie & Scorekeeper")
    canvas.setFont("Times-Italic", 9)
    canvas.drawRightString(w - 18 * mm, h - 8.2 * mm, "User Guide")
    canvas.setFillColor(FOREST)
    canvas.rect(0, 0, w, 12 * mm, fill=1, stroke=0)
    canvas.setFillColor(GOLD)
    canvas.rect(0, 12 * mm, w, 1.0 * mm, fill=1, stroke=0)
    canvas.setFillColor(white)
    canvas.setFont("Times-Roman", 8)
    canvas.drawCentredString(w / 2, 5 * mm, f"Tap in, spoken caddie  ·  Page {canvas.getPageNumber() - 1}")
    canvas.restoreState()


def build():
    styles = make_styles()
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=20 * mm,
        bottomMargin=18 * mm,
        title="AI Caddie & Scorekeeper User Guide",
        author="AI Caddie",
        subject="Complete summary and instructions for the tap-controlled golf caddie PWA",
    )

    story = []

    # ---- COVER (drawn on first page) ----
    story.append(Spacer(1, 52 * mm))
    story.append(Paragraph("TAP IN, SPOKEN CADDIE", styles["CoverKicker"]))
    story.append(Paragraph("AI Caddie &amp; Scorekeeper", styles["CoverTitle"]))
    story.append(Paragraph(
        "A complete summary of what the app does, and how to use every part of it<br/>on the course and at home.",
        styles["CoverSub"]
    ))
    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph("User Guide", styles["CoverSub"]))
    story.append(Paragraph("September 2026", styles["CoverSub"]))
    story.append(PageBreak())

    # ---- 1 WHAT IT IS ----
    story.append(Paragraph("1. What the app is", styles["H1"]))
    story.append(Paragraph(
        "AI Caddie &amp; Scorekeeper is a phone-based golf caddie. It lives in the browser "
        "(best in Chrome on Android) and can be saved to the Home Screen like an app. "
        "It watches GPS, looks up wind and elevation, picks a club, talks you through a "
        "sensible plan for the hole, and keeps score when you tap. It talks back. It does not listen.",
        styles["Body"]
    ))
    story.append(Paragraph(
        "It is built for a real round: big buttons, Bluetooth earbuds, and a caddie that "
        "talks. You tap. It speaks. It knows the difference between being at home and being "
        "on a golf course, so it will not nag you to mark a pin in the kitchen.",
        styles["Body"]
    ))
    story.append(Paragraph("What it does well", styles["H2"]))
    story.append(bullets([
        "<b>Finds you.</b> GPS decides whether you are off-course or on a mapped golf course.",
        "<b>Aims at the green.</b> On a mapped course it reads holes and greens from OpenStreetMap and targets the current green automatically.",
        "<b>Gives a plays-like number.</b> Raw GPS yards are adjusted for elevation, wind, and your recent distance misses.",
        "<b>Recommends a club</b> from your bag, then a strategy for that shot.",
        "<b>Manages the hole like a caddie.</b> Handicap, par, and mapped bunkers or water change the advice: club down on short par 4s, lay up on long par 5s, extra club over trouble, miss to the fat of the green.",
        "<b>Talks like a caddie.</b> Australian male voice when the phone has one, and it uses your name (default Kerry).",
        "<b>Keeps score</b> hole by hole, including undo, skip, and finish round. Rounds survive a refresh and finished cards sit in Round History.",
        "<b>Learns your miss.</b> Tap Came up short, Flew long, Missed left, or Missed right and it nudges yardages and aim.",
    ], styles))
    story.append(Paragraph("What it is not", styles["H2"]))
    story.append(Paragraph(
        "It is not a laser rangefinder, a full course CAD package, or a Tour caddie with "
        "every bunker book. Greens are mapped as the middle of the putting surface unless "
        "you override the pin. Hazards only appear when OpenStreetMap has them. Club "
        "distances start as a generic bag until you train them. Use it as a smart yardage "
        "and strategy partner, then trust your eyes on anything it cannot see.",
        styles["Body"]
    ))

    # ---- 2 SETUP ----
    story.append(Paragraph("2. First-time setup", styles["H1"]))
    story.append(Paragraph(
        "Do this once at home, with a few minutes and a decent signal. It pays off on the first tee.",
        styles["Body"]
    ))
    story.append(Paragraph("Install it on the phone", styles["H2"]))
    story.append(bullets([
        "Open the app in <b>Chrome on Android</b> or Safari on iPhone. Both can speak. Neither needs the microphone.",
        "Allow <b>Location</b> when asked. High-accuracy GPS is how yardage and course detection work.",
        "Turn the phone volume up, or use earbuds, so you can hear the caddie.",
        "Add to Home Screen (Chrome menu → Add to Home screen / Install app) so it opens full screen like a native app.",
        "After an update, force-close and reopen, or pull to refresh, so you are not stuck on an old cached copy.",
    ], styles))
    story.append(Paragraph("Australian male voice", styles["H2"]))
    story.append(Paragraph(
        "The caddie asks the phone for an English (Australia) male voice. If the phone only "
        "has a US or UK voice, you will still hear Australian English phrasing, but the accent "
        "will be whatever is installed.",
        styles["Body"]
    ))
    story.append(bullets([
        "<b>Android:</b> Settings → System → Languages → Text-to-speech. Install <b>English (Australia)</b> and pick a male voice if the engine offers one.",
        "<b>iPhone:</b> Settings → Accessibility → Spoken Content → Voices → English. Download <b>Lee</b> (male, Australia). Karen is Australian but female.",
        "Back in the app, tap <b>Hear caddie voice</b>. You should hear “G'day Kerry…” (or your name).",
    ], styles))
    story.extend(screenshot_block(
        ASSETS / "voice_crop.jpg",
        "Your caddie card: name, handicap, play style, and a voice preview.",
        styles,
        72,
    ))
    story.append(Paragraph("Tell it who you are", styles["H2"]))
    story.append(bullets([
        "<b>Golfer name</b> defaults to Kerry. Change the field. When you leave it, the caddie says the new name.",
        "<b>Handicap</b> defaults to 14. Set your real number. This is not vanity — it changes strategy.",
        "Handicap 0–8: more aggressive when the shot is on. 9–18: play smart (club down, lay up, fat of the green). 19+: protect the double.",
        "Changing the handicap field makes the caddie say the new play style.",
        "<b>Bag</b> is its own screen, opened from the Bag button. Add, remove, or change carry yards there. The caddie only recommends clubs from that list. Remove takes a club out of play but keeps its yards; add the same name back (or tap Add back) to restore it. Reset bag restores Driver through Lob Wedge. Round brings you back to yardage and score.",
    ], styles))
    story.append(callout(
        "<b>Why handicap matters.</b> A 14-handicap on a 273-yard par 4 should hear “5-wood, leave a wedge,” not “hit driver at the flag.” A 5-handicap can take more risk. Put in the number you actually play to.",
        styles
    ))

    # ---- 3 HOME VS COURSE ----
    story.append(Paragraph("3. Home versus the course", styles["H1"]))
    story.append(Paragraph(
        "After GPS settles, the Where you are card is the truth. Read it before you start hunting for a pin.",
        styles["Body"]
    ))
    story.append(Paragraph("At home / off course", styles["H2"]))
    story.append(Paragraph(
        "If OpenStreetMap does not see a golf course around you, the app stays in scorekeeper mode. "
        "The big number stays blank, Laser GPS says Off course, and the pin button is "
        "<b>Drop practice pin</b> — optional, for backyard testing only. You can still add strokes, "
        "preview the voice, and review history. It will not demand a pin.",
        styles["Body"]
    ))
    story.extend(screenshot_block(
        ASSETS / "home_crop.jpg",
        "Off-course view. Scorekeeping works; pin setup stays out of the way.",
        styles,
        72,
    ))
    story.append(Paragraph("On a mapped course", styles["H2"]))
    story.append(Paragraph(
        "When GPS is on a tagged golf course, the card shows the course name, a hole strip (1–18 if mapped), "
        "and the app aims at that hole’s green. Walk to your ball; the plays-like number and club update. "
        "Tap a hole number if it guessed the wrong one. "
        "If two nines share 1–9, as at Norvelt and Luke’s Links, it uses the hole names to keep the nine you are standing on.",
        styles["Body"]
    ))
    story.append(Paragraph("On an unmapped course", styles["H2"]))
    story.append(Paragraph(
        "Some courses are not in OpenStreetMap hole-by-hole. Tap <b>I’m on a course</b>. "
        "Then stand on the green and tap <b>Mark Pin Here</b>. Walk back to the ball "
        "for yardage. Repeat on each green. If the app thinks you are on a course when you are in the "
        "driveway, tap <b>I’m at home</b>.",
        styles["Body"]
    ))
    story.append(Paragraph("Teaching a missing hole", styles["H2"]))
    story.append(Paragraph(
        "Totteridge and other local tracks may be missing a few holes on the public map. Dashed hole "
        "numbers are the gaps. On that tee, tap <b>Save tee here</b>. On the green, "
        "<b>Mark Pin Here</b>. The phone keeps those points. Next round the caddie aims from the tee "
        "without waiting on OpenStreetMap. This stays on the device; it is not uploaded.",
        styles["Body"]
    ))

    # ---- 4 ROUND WORKFLOW ----
    story.append(Paragraph("4. How to play a round", styles["H1"]))
    story.append(Paragraph(
        "This is the full loop. Do it in this order and the rest of the app falls into place.",
        styles["Body"]
    ))
    steps = [
        ("1. First tee.", "Open the app, confirm the course name, check hole 1 and par. Allow GPS to settle for a few seconds while you stand still."),
        ("2. Start the caddie.", "Tap <b>Start Caddie</b>. You should hear a greeting with your name, and the screen stays awake. The microphone is not used."),
        ("3. Tee shot.", "If you are on the tee of a mapped hole, you will already have a number and a plan (for example club down on a short par 4). Tap <b>Ask Caddie</b> and listen."),
        ("4. Hit, then log.", "After the swing, tap <b>Add Stroke</b>. Do this for every swing including penalties you want on the card. <b>Undo Stroke</b> if you double-tapped. <b>Good shot</b> counts the stroke and remembers a solid strike."),
        ("5. Walk to the ball.", "Stand still over the ball. The GPS and plays-like figures update. Ask again. The plan changes from tee-shot advice to approach or lay-up advice."),
        ("6. Green and pin.", "Mapped greens are the centre. If the pin is tucked or the map is off, walk to the flag and <b>Mark Pin Here</b>. Then walk back."),
        ("7. Finish the hole.", "When the ball is in, tap <b>Next Hole</b>. It stores par and strokes, then aims at the next green, and says the score. Use <b>Skip Hole</b> only if you did not play it."),
        ("8. Finish the round.", "Tap <b>Finish Round</b>. The current hole is included if it has strokes. A card is written to Round History and the scorecard resets."),
    ]
    for title, body in steps:
        story.append(Paragraph(f"<b>{title}</b> {body}", styles["Body"]))
    story.append(callout(
        "<b>Golden rule.</b> Count the stroke after you hit, then walk, then ask. If you ask from the tee after you have already played, the advice will still sound like a tee shot. Keep the scorecard honest and the strategy stays honest.",
        styles
    ))

    # ---- 5 NUMBERS ----
    story.append(Paragraph("5. Reading the numbers", styles["H1"]))
    story.append(bullets([
        "<b>Adjusted distance (plays-like)</b> is the number to club. It is GPS yards plus elevation, wind along your line, and a small personal distance bias.",
        "<b>Laser GPS</b> is the raw map distance to the current target (green or marked pin).",
        "<b>Elevation impact</b> — uphill plays longer, downhill shorter.",
        "<b>Wind velocity</b> is speed and direction. Headwind/tailwind is already folded into plays-like.",
        "<b>Club</b> is the bag club whose stock distance best matches the <i>intended shot</i>, not always the remaining yards to the flag (a 400-yard par 5 does not mean “hit driver at the green”).",
        "<b>Play plan</b> is the strategy label: Play smart, Club down, Lay up, Attack when it’s on, Protect the double.",
        "<b>Shot shape bias</b> moves from Neutral toward Fade/Slice or Draw/Hook as you log left and right misses.",
    ], styles))
    story.extend(screenshot_block(
        ASSETS / "strategy_crop.jpg",
        "On a short par 4 at handicap 14: 5-wood, club down, leave a full wedge.",
        styles,
        78,
    ))

    # ---- 6 STRATEGY ----
    story.append(Paragraph("6. Course strategy, used properly", styles["H1"]))
    story.append(Paragraph(
        "The caddie is trying to save doubles, not paint flags. It uses your handicap, the hole’s par, "
        "whether you are on the tee, remaining yards, and any bunkers or water mapped near that hole.",
        styles["Body"]
    ))
    story.append(Paragraph("How it thinks", styles["H2"]))
    story.append(bullets([
        "<b>Short par 4s (typical 14-handicap):</b> 5-wood or 7-wood off the tee, wedge in. Driver can run through.",
        "<b>Par 3s:</b> fat of the green is a good 3. Extra club if trouble is short.",
        "<b>Par 5s:</b> fairway first. If the green is not on in two for your bag, it lays up to about a full wedge (~110 yards) instead of recommending driver at a 280-yard green.",
        "<b>Approaches:</b> extra club for mid- and high-handicaps (amateurs miss short). Aim the middle. If a bunker or water sits short, take more club and miss long or centre.",
        "<b>Low handicaps (0–8):</b> more licence to attack when the number is in scoring range, still missing on the fat side.",
        "<b>Your miss:</b> a stored fade starts you left of the safe line; a draw starts you right.",
    ], styles))
    story.append(Paragraph(
        "Mapped hazards come from OpenStreetMap (bunkers, water hazards, ponds). If a hole is not mapped, "
        "you still get par- and handicap-based advice, but not “water is short.” If you can see trouble the "
        "map missed, play the trouble you can see.",
        styles["Body"]
    ))

    # ---- 7 SCORE ----
    story.append(Paragraph("7. Scorekeeping", styles["H1"]))
    story.append(Paragraph(
        "Every hole needs a par and a stroke count. Default par is 4 until you set it. On mapped holes, par comes from the course data when you land on that hole.",
        styles["Body"]
    ))
    story.append(bullets([
        "Set par with the <b>Par 3 / 4 / 5</b> buttons, or leave the par that arrived with a mapped hole. The selected par is highlighted.",
        "<b>Add Stroke</b> after every shot you want on the card.",
        "<b>Next Hole</b> refuses to advance if there are zero strokes (use Skip Hole if you walked it).",
        "<b>Finish Round</b> saves a history card with date, holes played, and score to par. In-progress rounds survive closing the tab.",
        "Relative score (E, +3, −1) includes the current hole only after you have started it.",
    ], styles))

    # ---- 8 TRAIN THE BAG ----
    story.append(Paragraph("8. Training your bag", styles["H1"]))
    story.append(Paragraph(
        "The stock bag is Kerry’s: driver 220, 5-wood 210, 7-wood 200, 3-hybrid 190, then irons and wedges. "
        "Remove a club if you are not carrying it; the yards stay on the phone so adding it back restores the number. "
        "The miss buttons still tune those numbers after real shots.",
        styles["Body"]
    ))
    story.append(bullets([
        "After a shot with the recommended club, tap <b>Came up short</b> or <b>Flew long</b>. That club’s number moves two yards and a small distance bias is stored. Tap <b>Ask Caddie</b> first so it knows which club.",
        "<b>Missed left</b> and <b>Missed right</b> build a fade or draw bias used in aim advice.",
        "<b>Good shot</b> logs a hit and adds a stroke.",
        "Be honest and consistent. A handful of real misses is more useful than tapping at random on the couch.",
    ], styles))

    # ---- 9 VOICE ----
    story.append(Paragraph("9. Tap reference", styles["H1"]))
    story.append(Paragraph(
        "You do not talk to the app. Tap the button, then listen. The caddie uses an Australian voice when the phone has one. Tap <b>Stop Caddie</b> in the car if you want the screen to sleep and the current sentence to stop. The buttons still speak if you tap them.",
        styles["Body"]
    ))
    story.append(command_table([
        ("Ask Caddie", "Plays-like number, club, and strategy."),
        ("Mark pin / Override pin", "Saves GPS as the target. On a missing green, this is remembered for next round."),
        ("Save tee here", "Saves this tee for the current hole on this phone."),
        ("Hole number on the strip", "Jumps to that hole and its green."),
        ("Where am I?", "Home versus course name and hole."),
        ("I’m at home / I’m on a course", "Overrides GPS if the map is wrong."),
        ("Golfer name field", "Sets the name used when the caddie speaks."),
        ("Handicap field", "Sets handicap and play style, then says it."),
        ("Par 3 / 4 / 5", "Sets the current hole’s par and highlights that button."),
        ("Add Stroke", "Adds one stroke and says the count."),
        ("Undo Stroke", "Removes the last stroke on this hole."),
        ("Next Hole", "Stores the hole and advances."),
        ("Skip Hole", "Advances without storing strokes."),
        ("My score", "Hole, strokes, and score to par."),
        ("Finish Round", "Writes Round History and resets."),
        ("Good shot", "Hit logged and a stroke added."),
        ("Came up short / Flew long", "Tunes that club’s yardage."),
        ("Missed left / Missed right", "Updates fade/draw bias."),
    ], styles, headers=("Tap this", "What you hear")))

    # ---- 10 GET THE MOST ----
    story.append(Paragraph("10. How to get everything out of it", styles["H1"]))
    story.append(bullets([
        "Stand still for two seconds before you ask. GPS jumps while you walk.",
        "Ask from the ball, not from the bag cart twenty metres away.",
        "Set the real handicap before the round, not after the 7th hole.",
        "On mapped courses, glance at the hole strip. If you are on 12 and it still says 1, tap 12.",
        "Override the pin when the flag is tucked or the green map is clearly the wrong blob.",
        "Log every stroke, including the duffed chip. Strategy assumes the count is true.",
        "Use earbuds so you can hear the plan without staring at the screen in sunlight.",
        "After we ship an update, reopen the installed app so the new service worker loads.",
        "Practice pin at home is only for testing GPS. Leave it unused unless you are debugging.",
    ], styles))

    # ---- 11 TROUBLE ----
    story.append(Paragraph("11. If something looks wrong", styles["H1"]))
    story.append(command_table([
        ("Still asking to mark a pin at home", "Force-refresh or reopen the Home Screen app so you are not on an old version. Confirm Location is on. Tap I’m at home if you live next to a course."),
        ("US or female voice", "Install English (Australia) TTS. On iPhone download Lee. Tap Hear caddie voice again."),
        ("No course name on the first tee", "Wait for GPS. If the course is unmapped, tap I’m on a course. Teach missing holes with Save tee and Mark pin."),
        ("Yardage is hundreds of yards off", "Wrong hole is selected, or an old pin is still stored. Tap the correct hole, or mark pin from the green you are actually playing."),
        ("The caddie stays silent", "Turn the volume up. Tap Hear caddie voice. On iPhone, speech starts from a tap, which these buttons already are. Install an English voice in Spoken Content."),
        ("I expected it to hear me", "It does not use the microphone. Tap the button for what you want, then listen."),
        ("Wind or elevation shows dashes", "No signal to Open-Meteo. Raw GPS yards still work; club from Laser GPS until data returns."),
    ], styles, headers=("If you see this", "Try this")))

    # ---- 12 PRIVACY / COST ----
    story.append(Paragraph("12. Data, cost, and honesty", styles["H1"]))
    story.append(Paragraph(
        "There is no subscription and no API key in the app. Location, voice, and score live on the phone. "
        "Course maps come from public OpenStreetMap Overpass servers. Wind and elevation come from Open-Meteo "
        "(free for personal use). The only cost is ordinary mobile data if you are not on Wi-Fi.",
        styles["Body"]
    ))
    story.append(Paragraph(
        "OpenStreetMap is volunteer cartography. A municipal course may have perfect greens; a private track "
        "may only have an outline. Teach the gaps on the round: Save tee, then Mark pin. Those points stay on "
        "the phone for next time. The caddie will still keep score either way.",
        styles["Body"]
    ))
    story.append(Spacer(1, 6 * mm))
    story.append(callout(
        "<b>On the first tee, in one line.</b> Confirm the course and hole, set handicap, tap Start Caddie, tap Ask Caddie, hit, tap Add Stroke, walk, ask again, tap Next Hole. Do that eighteen times. That is the whole app.",
        styles
    ))

    def first_page(canvas, doc_):
        draw_cover(canvas, doc_)

    def later_pages(canvas, doc_):
        draw_body(canvas, doc_)

    doc.build(story, onFirstPage=first_page, onLaterPages=later_pages)
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size} bytes)")


if __name__ == "__main__":
    build()
