"""Tunes for jam.html: what the ASU jazz combos have played at the House of FiFi DuBois.

Keys are concert keys as most fake books print them. site.js rewrites them for B-flat, E-flat,
and F instruments when a visitor picks an instrument. Each key is (letter, accidental, mode),
with accidental "", "b", or "#", and mode "major", "minor", "dorian", "blues", or "" (no mode word).
"""
TUNES = [
    {"title": "Blue Monk", "by": "Thelonious Monk", "key": ("B", "b", "blues"),
     "form": [("12-bar blues", 12)], "feel": "Medium swing", "set": "sept"},
    {"title": "Four", "by": "Miles Davis", "key": ("E", "b", "major"),
     "form": [("32 bars", 32)], "feel": "Medium-up swing", "set": "sept"},
    {"title": "Blue Bossa", "by": "Kenny Dorham", "key": ("C", "", "minor"),
     "form": [("16 bars", 16)], "feel": "Bossa nova", "set": "sept"},
    {"title": "Autumn Leaves", "by": "Joseph Kosma", "key": ("G", "", "minor"),
     "form": [("A", 8), ("A", 8), ("B", 8), ("C", 8)], "feel": "Medium swing", "set": "sept"},
    {"title": "Summer Samba", "by": "Marcos and Paulo S&eacute;rgio Valle", "key": ("F", "", "major"),
     "form": [], "feel": "Bossa nova", "set": "sept"},
    {"title": "Stolen Moments", "by": "Oliver Nelson", "key": ("C", "", "minor"),
     "form": [("16 bars", 16)], "feel": "Medium swing", "set": "sept"},
    {"title": "A Night in Tunisia", "by": "Dizzy Gillespie", "key": ("D", "", "minor"),
     "form": [("A", 8), ("A", 8), ("B", 8), ("A", 8)], "note": "Plus the interlude and the break",
     "feel": "Afro-Cuban, swing on the bridge", "set": "sept"},
    {"title": "Watermelon Man", "by": "Herbie Hancock", "key": ("F", "", ""),
     "form": [("16-bar blues", 16)], "feel": "Funk", "set": "oct"},
    {"title": "Afro Blue", "by": "Mongo Santamar&iacute;a", "key": ("F", "", "minor"),
     "form": [("Modal, in 3", 0)], "feel": "Afro-Cuban 6/8", "set": "oct"},
    {"title": "Manteca", "by": "Dizzy Gillespie, Chano Pozo and Gil Fuller", "key": ("B", "b", ""),
     "form": [("A", 0), ("A", 0), ("B", 0), ("A", 0)], "note": "With the opening vamp",
     "feel": "Afro-Cuban, swing on the bridge", "set": "oct"},
    {"title": "So What", "by": "Miles Davis", "key": ("D", "", "dorian"), "bridge": ("E", "b", "dorian"),
     "form": [("A", 8), ("A", 8), ("B", 8), ("A", 8)], "feel": "Modal swing", "set": "oct"},
    {"title": "Misty", "by": "Erroll Garner", "key": ("E", "b", "major"),
     "form": [("A", 8), ("A", 8), ("B", 8), ("A", 8)], "feel": "Ballad", "set": "oct"},
]

SETS = {"sept": ("Sept. 26, 2026", "programs.html#jazz-combos-2026-09-26"),
        "oct": ("Oct. 31, 2026", "programs.html#jazz-combos-2026-10-31")}
SHOW = {"b": "&#9837;", "#": "&#9839;", "": ""}
MODE = {"major": " major", "minor": " minor", "dorian": " Dorian", "blues": " blues", "": ""}


def key_html(key):
    letter, acc, mode = key
    return (f'<span class="tk" data-l="{letter}" data-a="{acc}" data-m="{mode}">'
            f'{letter}{SHOW[acc]}{MODE[mode]}</span>')


def form_html(tune):
    chips = []
    for label, bars in tune["form"]:
        cls = "fc" if len(label) == 1 else "fc fc-wide"
        size = f"<small>{bars}</small>" if (len(label) == 1 and bars) else ""
        chips.append(f'<span class="{cls}">{label}{size}</span>')
    note = f'<span class="form-note">{tune["note"]}</span>' if tune.get("note") else ""
    return f'<span class="form">{"".join(chips)}</span>{note}'


def tunes_table():
    rows = []
    for t in TUNES:
        key = key_html(t["key"])
        if t.get("bridge"):
            key += f'<span class="tk-bridge">bridge {key_html(t["bridge"])}</span>'
        rows.append(
            "<tr>"
            f'<th scope="row"><span class="tune">{t["title"]}</span><span class="by">{t["by"]}</span></th>'
            f'<td class="key-cell">{key}</td>'
            f"<td>{form_html(t)}</td>"
            f'<td>{t["feel"]}</td>'
            f'<td class="set"><a href="{SETS[t["set"]][1]}">{SETS[t["set"]][0]}</a></td>'
            "</tr>"
        )
    return (
        '<div class="table-wrap"><table class="table tunes">'
        '<caption class="visually-hidden">Tunes from recent ASU jazz combo sets, with key, form, and feel</caption>'
        '<thead><tr><th scope="col">Tune</th><th scope="col"><span class="key-head">Concert key</span></th>'
        '<th scope="col">Form</th><th scope="col">Feel</th><th scope="col">Combo set</th></tr></thead>'
        "<tbody>" + "".join(rows) + "</tbody></table></div>"
    )

