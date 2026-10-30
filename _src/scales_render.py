"""Data for scales.html, the interactive version of the ASU marimba skills test packet.

_src/scales.json holds the packet's pattern, read from the PDF (ASU Skills Test: Major Keys):
every note as a scale degree above the tonic, its rhythm, and Dr. Shuey's sticking. The pattern
and stickings are the same in every key; only the register changes, and that is in "register".

Harmonic minor keys use the same pattern in the register of the parallel major, with the third
and sixth lowered, as the packet asks students to do. assets/scales.js spells, draws, and plays
every key from this data. _src/scales_glyphs.json holds the notation symbols, taken from the
Bravura music font (SIL Open Font License, assets/fonts/bravura-OFL.txt).
"""
import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
PATTERN = json.loads((HERE / "scales.json").read_text(encoding="utf-8"))
GLYPHS = json.loads((HERE / "scales_glyphs.json").read_text(encoding="utf-8"))

LETTERS = "CDEFGAB"
SHOW = {"b": "♭", "#": "♯"}

# (name, key signature: + sharps / - flats, packet page whose register it uses)
MAJOR = [("C", 0, "C"), ("F", -1, "F"), ("Bb", -2, "Bb"), ("Eb", -3, "Eb"), ("Ab", -4, "Ab"),
         ("Db", -5, "Db"), ("Gb", -6, "Gb"), ("F#", 6, "F#"), ("B", 5, "B"), ("E", 4, "E"),
         ("A", 3, "A"), ("D", 2, "D"), ("G", 1, "G")]
MINOR = [("C", -3, "C"), ("F", -4, "F"), ("Bb", -5, "Bb"), ("Eb", -6, "Eb"), ("D#", 6, "Eb"),
         ("G#", 5, "Ab"), ("C#", 4, "Db"), ("F#", 3, "F#"), ("B", 2, "B"), ("E", 1, "E"),
         ("A", 0, "A"), ("D", -1, "D"), ("G", -2, "G")]
MODE_NAME = {"major": "major", "minor": "harmonic minor"}


def label(name):
    return name[0] + SHOW.get(name[1:], "")


def slug(name, mode):
    acc = {"b": "-flat", "#": "-sharp"}.get(name[1:], "")
    return f"{name[0].lower()}{acc}-{mode}"


def keys():
    out = []
    for mode, table in (("major", MAJOR), ("minor", MINOR)):
        for name, sig, page in table:
            acc = {"": 0, "b": -1, "#": 1}[name[1:]]
            midi = PATTERN["register"][page]
            # Octave of the written tonic (B# and C flat do not occur in these keys)
            octave = (midi - acc) // 12 - 1
            out.append({
                "id": slug(name, mode), "mode": mode, "label": label(name),
                "title": f"{label(name)} {MODE_NAME[mode]}",
                "letter": LETTERS.index(name[0]), "acc": acc, "midi": midi,
                "step": octave * 7 + LETTERS.index(name[0]), "sig": sig,
            })
    return out


def data_script():
    data = {"sections": PATTERN["sections"], "keys": keys(), "glyphs": GLYPHS}
    payload = json.dumps(data, separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/")
    return f'<script type="application/json" id="scales-data">{payload}</script>'


def key_buttons(mode):
    return "".join(
        f'<a class="sc-key" href="#{k["id"]}" data-key="{k["id"]}">{k["label"]}</a>'
        for k in keys() if k["mode"] == mode
    )
