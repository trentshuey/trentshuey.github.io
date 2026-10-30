"""Afro-Cuban grooves for latin.html: each part as a step grid that site visitors can hear and mute.

Four-four grooves are two bars of eighth notes (16 steps), written in 3-2 clave; assets/latin.js
turns them around for 2-3 by swapping the bars. The 6/8 groove is one bar of 12/8 (12 steps).
Each pattern character is a stroke ("." is a rest); STROKES names the sound and the symbol shown.

Patterns are the basic forms most method books teach. Clave, cascara, mambo bell, and the 6/8 bell
match the grids at bobmiller.yolasite.com/bell_patterns.php; the conga, bongo, bongo bell, and
guiro parts follow the descriptions at scphillips.com/dance/salsarhythm.html and
danceintime.com/crc-the-clave.
"""
import html

PARTS = {
    "clave": {"name": "Clave", "on": "Claves",
              "about": "The key to the whole groove. Every other part lines up with it.",
              "pattern": "X..X..X...X.X...", "rumba": "X..X...X..X.X..."},
    "cascara": {"name": "Cascara", "on": "Timbales, on the shell",
                "about": "Played with a stick on the side of the timbales in the verses.",
                "pattern": "X.XX.X.XX.X.XX.X"},
    "mambo": {"name": "Mambo bell", "on": "Timbale bell",
              "about": "The bell for the mambo and the montuno: the mouth (M) on 1 and 3, the neck (N) in between.",
              "pattern": "M.NNM.NNM.N.M.NN"},
    "campana": {"name": "Bongo bell", "on": "Campana",
                "about": "The bongo player moves to the hand bell for the montuno. This is its basic form, on 1 and 3.",
                "pattern": "M...M...M...M..."},
    "conga": {"name": "Conga tumbao", "on": "Conga",
              "about": "Heel (H), toe (T), slap (S), toe, heel, toe, then two open tones (O) on 4 and the &amp; of 4.",
              "pattern": "HTSTHTOOHTSTHTOO"},
    "martillo": {"name": "Bongo martillo", "on": "Bongos",
                 "about": "Steady eighth notes: fingers (F) and thumb (t) on the small drum, an open tone (O) on the large drum on 4.",
                 "pattern": "FtFtFtOtFtFtFtOt"},
    "guiro": {"name": "G&uuml;iro", "on": "G&uuml;iro",
              "about": "A long scrape (L) on 1 and 3, with two short strokes (s) between.",
              "pattern": "L.ssL.ssL.ssL.ss"},
    "bass": {"name": "Bass tumbao", "on": "Bass",
             "about": "The anticipated bass: notes on the &amp; of 2 and on 4, held over the bar line, on a C vamp.",
             "pattern": "...G..C....G..C."},
    "bell68": {"name": "6/8 bell", "on": "Bell",
               "about": "The standard bell pattern: seven strokes across the twelve pulses.",
               "pattern": "X.X.XX.X.X.X"},
    "pulse": {"name": "Pulse", "on": "Shaker or foot",
              "about": "The four dotted-quarter beats the bell floats over.",
              "pattern": "X..X..X..X.."},
}

STYLES = [
    {"id": "son", "name": "Son montuno", "steps": 16, "per_beat": 2, "clave": True, "tempo": 168,
     "about": "The verse groove of son and salsa: cascara on the timbales, martillo on the bongos.",
     "parts": ["clave", "cascara", "conga", "martillo", "guiro", "bass"]},
    {"id": "mambo", "name": "Mambo", "steps": 16, "per_beat": 2, "clave": True, "tempo": 184,
     "about": "The band opens up for the montuno and mambo: both bells come in.",
     "parts": ["clave", "mambo", "campana", "conga", "guiro", "bass"]},
    {"id": "six8", "name": "Afro-Cuban 6/8", "steps": 12, "per_beat": 3, "clave": False, "tempo": 100,
     "about": "Twelve pulses felt in four. The bell pattern is the clave of 6/8.",
     "parts": ["bell68", "pulse"]},
]

SYMBOL = {"X": "&#9679;"}
COUNT_44 = ["1", "&amp;", "2", "&amp;", "3", "&amp;", "4", "&amp;"]
COUNT_68 = ["1", "", "", "2", "", "", "3", "", "", "4", "", ""]
SPOKEN_44 = ["1", "the &amp; of 1", "2", "the &amp; of 2", "3", "the &amp; of 3", "4", "the &amp; of 4"]


def _spoken(pattern, steps):
    """A screen-reader description, bar by bar: '1, the & of 2, 4 | 2, 3'."""
    if steps == 12:
        hits = [str(i + 1) for i, c in enumerate(pattern) if c != "."]
        return "Pulses " + ", ".join(hits) + " of 12"
    bars = []
    for b in range(0, steps, 8):
        hits = [SPOKEN_44[i] for i, c in enumerate(pattern[b:b + 8]) if c != "."]
        bars.append(", ".join(hits) or "rest")
    return "; ".join(f"bar {n + 1}: {h}" for n, h in enumerate(bars))


def _row(key, style):
    part = PARTS[key]
    steps = style["steps"]
    cells = []
    for i, c in enumerate(part["pattern"]):
        sym = "" if c == "." else SYMBOL.get(c, c)
        cls = "st" + (" hit" if c != "." else "") + (" bar" if steps == 16 and i == 8 else "") + \
              (" beat" if i % style["per_beat"] == 0 else "")
        cells.append(f'<span class="{cls}" data-i="{i}">{sym}</span>')
    rumba = f' data-rumba="{part["rumba"]}"' if part.get("rumba") else ""
    return (
        f'<div class="lp-row" data-part="{key}" data-pattern="{part["pattern"]}"{rumba}>'
        f'<div class="lp-name"><button class="lp-mute" type="button" aria-pressed="true" '
        f'aria-label="{html.unescape(part["name"])} on">{part["name"]}</button>'
        f'<span class="lp-on">{part["on"]}</span></div>'
        f'<div class="lp-grid" role="img" aria-label="{html.escape(html.unescape(part["name"]))}: '
        f'{html.escape(html.unescape(_spoken(part["pattern"], steps)))}">{"".join(cells)}</div>'
        f'<p class="lp-about">{part["about"]}</p>'
        "</div>"
    )


def _counts(style):
    labels = COUNT_44 * 2 if style["steps"] == 16 else COUNT_68
    cells = "".join(
        f'<span class="st{" bar" if style["steps"] == 16 and i == 8 else ""}">{c}</span>'
        for i, c in enumerate(labels)
    )
    sides = ""
    if style["clave"]:
        sides = ('<div class="lp-sides" aria-hidden="true"><span class="lp-side-a">3 side</span>'
                 '<span class="lp-side-b">2 side</span></div>')
    return f'<div class="lp-row lp-counts" aria-hidden="true"><div class="lp-name"></div><div><div class="lp-grid">{cells}</div>{sides}</div></div>'


def page():
    out = []
    for n, style in enumerate(STYLES):
        rows = "".join(_row(k, style) for k in style["parts"])
        out.append(
            f'<section class="lp-style" id="{style["id"]}" data-steps="{style["steps"]}" '
            f'data-per-beat="{style["per_beat"]}" data-tempo="{style["tempo"]}" '
            f'data-clave="{"yes" if style["clave"] else "no"}"{"" if n == 0 else " hidden"} '
            f'aria-labelledby="lp-h-{style["id"]}">'
            f'<h2 class="visually-hidden" id="lp-h-{style["id"]}">{style["name"]}</h2>'
            f'<p class="lp-style-about">{style["about"]}</p>'
            f'{_counts(style)}{rows}</section>'
        )
    return "".join(out)


def tabs():
    return "".join(
        f'<button type="button" data-style="{s["id"]}" aria-pressed="{"true" if i == 0 else "false"}">{s["name"]}</button>'
        for i, s in enumerate(STYLES)
    )
