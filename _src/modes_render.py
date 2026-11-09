"""Data for modes.html, the interactive version of William Moersch's "Modes (Version 3.0)".

The handout orders the eight modes by how far they bend from the major scale and gives the
practice plan; assets/modes.js spells, draws, and plays every stage from the data here. The twelve
tonics are the twelve major keys of the skills test (no enharmonic duplicates, the six-accidental
key spelled with flats). The notation symbols are shared with scales.html (_src/scales_glyphs.json,
from the Bravura font, SIL Open Font License, assets/fonts/bravura-OFL.txt).
"""
import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
GLYPHS = json.loads((HERE / "scales_glyphs.json").read_text(encoding="utf-8"))
SCALES = json.loads((HERE / "scales.json").read_text(encoding="utf-8"))

LETTERS = "CDEFGAB"
SHOW = {"b": "♭", "#": "♯"}

# The eight modes in Moersch's order of increasing alteration.
# steps: semitones above the tonic; alt: the scale degrees that differ from major.
MODES = [
    ("ionian", "Ionian", [0, 2, 4, 5, 7, 9, 11], []),
    ("lydian", "Lydian", [0, 2, 4, 6, 7, 9, 11], ["#4"]),
    ("lydian-b7", "Lydian ♭7", [0, 2, 4, 6, 7, 9, 10], ["#4", "b7"]),
    ("mixolydian", "Mixolydian", [0, 2, 4, 5, 7, 9, 10], ["b7"]),
    ("dorian", "Dorian", [0, 2, 3, 5, 7, 9, 10], ["b3", "b7"]),
    ("aeolian", "Aeolian", [0, 2, 3, 5, 7, 8, 10], ["b3", "b6", "b7"]),
    ("phrygian", "Phrygian", [0, 1, 3, 5, 7, 8, 10], ["b2", "b3", "b6", "b7"]),
    ("locrian", "Locrian", [0, 1, 3, 5, 6, 8, 10], ["b2", "b3", "b5", "b6", "b7"]),
]

# (name, key signature of the tonic's major key: + sharps / - flats), in chromatic order
TONICS = [("C", 0), ("Db", -5), ("D", 2), ("Eb", -3), ("E", 4), ("F", -1),
          ("Gb", -6), ("G", 1), ("Ab", -4), ("A", 3), ("Bb", -2), ("B", 5)]


def label(name):
    return name[0] + SHOW.get(name[1:], "")


def slug(name):
    return name[0].lower() + {"b": "-flat", "#": "-sharp"}.get(name[1:], "")


def tonics():
    out = []
    for pc, (name, sig) in enumerate(TONICS):
        acc = {"": 0, "b": -1, "#": 1}[name[1:]]
        out.append({
            "id": slug(name), "label": label(name), "pc": pc, "letter": LETTERS.index(name[0]),
            "acc": acc, "sig": sig,
            # the register the skills test uses for this key (MIDI note of the low tonic)
            "low": SCALES["register"][name],
        })
    return out


def modes():
    return [{"id": i, "name": n, "steps": s, "alt": a} for i, n, s, a in MODES]


def data_script():
    data = {"modes": modes(), "tonics": tonics(), "glyphs": GLYPHS}
    payload = json.dumps(data, separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/")
    return f'<script type="application/json" id="modes-data">{payload}</script>'


def tonic_buttons():
    return "".join(
        f'<a class="sc-key" href="#{t["id"]}" data-tonic="{t["id"]}">{t["label"]}</a>' for t in tonics()
    )


def degree_grid(alt):
    """Seven scale degrees; the altered ones are filled chips (gold for raised, blue for lowered)."""
    by_degree = {int(a[1]): a[0] for a in alt}
    cells = []
    for d in range(1, 8):
        if d in by_degree:
            kind = "sharp" if by_degree[d] == "#" else "flat"
            cells.append(f'<span class="mo-deg {kind}">{SHOW[by_degree[d]]}{d}</span>')
        else:
            cells.append(f'<span class="mo-deg">{d}</span>')
    return "".join(cells)


def mode_rows():
    """The reference table: mode, the degree grid, and the notes (filled in by modes.js for the tonic)."""
    rows = []
    for m in modes():
        n = len(m["alt"])
        count = "no alterations" if n == 0 else ("1 alteration" if n == 1 else f"{n} alterations")
        rows.append(
            f'<tr data-mode="{m["id"]}"><th scope="row">{m["name"]}<span class="mo-count">{count}</span></th>'
            f'<td class="mo-alt"><span class="mo-grid" aria-label="{count}">{degree_grid(m["alt"])}</span></td>'
            f'<td class="mo-notes"></td>'
            f'<td class="mo-hear"><button class="mo-hear-btn" type="button" data-mode="{m["id"]}" hidden>'
            f'<span class="visually-hidden">Play </span>Hear</button></td></tr>'
        )
    return "".join(rows)
