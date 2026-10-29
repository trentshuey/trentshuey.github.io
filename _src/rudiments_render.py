"""Draws the 40 PAS rudiments as one-line percussion notation (inline SVG) for rudiments.html.

Data comes from _src/rudiments.json, checked note by note against the official
PAS International Drum Rudiments sheet (pas.org). site.js plays each rudiment
from the same data, which is embedded in the page as JSON.
"""
import html
import json
import math
import pathlib
import re

DATA = json.loads((pathlib.Path(__file__).resolve().parent / "rudiments.json").read_text(encoding="utf-8"))

# Length of each written value in quarter notes
DUR = {"h": 2.0, "q": 1.0, "8.": 0.75, "8": 0.5, "16": 0.25, "16t": 1 / 6}
BEAMS = {"8": 1, "8.": 1, "16": 2, "16t": 2}
# Rudiments beamed in dotted-quarter groups (compound feel) on the PAS sheet
COMPOUND = {17, 19, 21, 26, 30, 33, 36, 39}
SEXTUPLET = {3}

LINE_Y = 72          # the single staff line
STEM_TOP = 26        # where stems and primary beams end
BEAM_H = 4.6
BEAM_GAP = 7.4
ACCENT_Y = 15
TUPLET_Y = 8
STICK_Y = 101
HEIGHT = 110
SCALE = 1.3          # drawn size relative to the viewBox


def _advance(dur):
    return 16 + 44 * (DUR[dur] ** 0.75)


def _hand_letters(note):
    return note.get("hand", "")


def short_category(cat):
    return cat.split(": ")[-1] if ": " in cat else cat


def svg(r):
    notes = r["notes"]
    pulse = 1.5 if r["n"] in COMPOUND else 1.0
    # Layout pass: x position, beat position, group index
    x = 22.0
    t = 0.0
    lay = []
    for i, n in enumerate(notes):
        grace = n.get("grace", "")
        x += 15 * len(grace)
        lay.append({"x": x, "t": t, "group": int(math.floor(t / pulse + 1e-6))})
        x += _advance(n["dur"])
        t += DUR[n["dur"]]
    width = max(x + 8, 150)
    single = len(notes) == 1

    parts = [f'<line class="staff" x1="6" y1="{LINE_Y}" x2="{width - 6:.1f}" y2="{LINE_Y}"/>']

    # Beam runs: consecutive notes shorter than a quarter, in the same group, not rests
    runs, cur = [], []
    for i, n in enumerate(notes):
        beamable = n["dur"] in BEAMS and not n.get("rest")
        if beamable and cur and lay[cur[-1]]["group"] == lay[i]["group"] and cur[-1] == i - 1:
            cur.append(i)
        else:
            if cur:
                runs.append(cur)
            cur = [i] if beamable else []
    if cur:
        runs.append(cur)
    in_run = {i: run for run in runs for i in run}

    def stem_x(i):
        return lay[i]["x"] + 5.5

    beams_svg = []
    for run in runs:
        if len(run) < 2:
            continue
        x1, x2 = stem_x(run[0]) - 0.8, stem_x(run[-1]) + 0.8
        beams_svg.append(f'<rect class="beam" x="{x1:.1f}" y="{STEM_TOP}" width="{x2 - x1:.1f}" height="{BEAM_H}"/>')
        y2 = STEM_TOP + BEAM_GAP
        for k, i in enumerate(run):
            if BEAMS[notes[i]["dur"]] < 2:
                continue
            nxt = run[k + 1] if k + 1 < len(run) else None
            prv = run[k - 1] if k > 0 else None
            if nxt is not None and BEAMS[notes[nxt]["dur"]] >= 2:
                a, b = stem_x(i) - 0.8, stem_x(nxt) + 0.8
                beams_svg.append(f'<rect class="beam" x="{a:.1f}" y="{y2}" width="{b - a:.1f}" height="{BEAM_H}"/>')
            elif (prv is None or BEAMS[notes[prv]["dur"]] < 2):
                # a lone 16th inside an 8th-note beam gets a short stub
                if prv is not None:
                    a, b = stem_x(i) - 10, stem_x(i) + 0.8
                else:
                    a, b = stem_x(i) - 0.8, stem_x(i) + 10
                beams_svg.append(f'<rect class="beam" x="{a:.1f}" y="{y2}" width="{b - a:.1f}" height="{BEAM_H}"/>')
        # tuplet numbers
        trip = [i for i in run if notes[i]["dur"] == "16t"]
        size = 6 if r["n"] in SEXTUPLET else 3
        for c in range(0, len(trip), size):
            chunk = trip[c:c + size]
            if len(chunk) == size:
                cx = (stem_x(chunk[0]) + stem_x(chunk[-1])) / 2
                beams_svg.append(f'<text class="tuplet" x="{cx:.1f}" y="{TUPLET_Y}">{size}</text>')

    note_svg = []
    for i, n in enumerate(notes):
        nx = lay[i]["x"]
        g = [f'<g class="rn" data-i="{i}">']
        if n.get("rest"):
            # eighth rest
            g.append(
                f'<path class="rest" d="M{nx + 2:.1f} 64 a2.8 2.8 0 1 0 0.1 0 M{nx + 1:.1f} 66.5 '
                f'q4 2 7.2 -3.2 l-5.8 18.5" />'
            )
            g.append("</g>")
            note_svg.append("".join(g))
            continue
        # grace notes
        grace = n.get("grace", "")
        if grace:
            gxs = [nx - 15 * (len(grace) - k) for k in range(len(grace))]
            for gx in gxs:
                g.append(f'<ellipse class="head grace" cx="{gx:.1f}" cy="{LINE_Y}" rx="3.9" ry="2.9" transform="rotate(-20 {gx:.1f} {LINE_Y})"/>')
                g.append(f'<line class="stem" x1="{gx + 3.5:.1f}" y1="{LINE_Y - 1}" x2="{gx + 3.5:.1f}" y2="{LINE_Y - 22}"/>')
            if len(grace) == 1:
                sx = gxs[0] + 3.5
                g.append(f'<path class="flag" d="M{sx:.1f} {LINE_Y - 22} q5 4 4 10"/>')
                g.append(f'<line class="gslash" x1="{sx - 4:.1f}" y1="{LINE_Y - 8}" x2="{sx + 5:.1f}" y2="{LINE_Y - 17}"/>')
            else:
                a, b = gxs[0] + 3, gxs[-1] + 4.2
                g.append(f'<rect class="beam" x="{a:.1f}" y="{LINE_Y - 23}" width="{b - a:.1f}" height="2.6"/>')
                g.append(f'<rect class="beam" x="{a:.1f}" y="{LINE_Y - 18.6}" width="{b - a:.1f}" height="2.6"/>')
        # notehead
        open_head = n["dur"] == "h"
        g.append(
            f'<ellipse class="head{" open" if open_head else ""}" cx="{nx:.1f}" cy="{LINE_Y}" rx="6.2" ry="4.6" '
            f'transform="rotate(-20 {nx:.1f} {LINE_Y})"/>'
        )
        if n["dur"] == "8.":
            g.append(f'<circle class="dot" cx="{nx + 11:.1f}" cy="{LINE_Y - 3}" r="2"/>')
        # stem
        sx = stem_x(i)
        g.append(f'<line class="stem" x1="{sx:.1f}" y1="{LINE_Y - 1.5}" x2="{sx:.1f}" y2="{STEM_TOP + (0 if i in in_run and len(in_run[i]) > 1 else 0)}"/>')
        # flags on unbeamed short notes
        if n["dur"] in BEAMS and not (i in in_run and len(in_run[i]) > 1):
            for k in range(BEAMS[n["dur"]]):
                y = STEM_TOP + k * 7
                g.append(f'<path class="flag" d="M{sx:.1f} {y} q9 7 7 19"/>')
        # roll slashes or buzz
        if n.get("double"):
            count = int(n.get("slashes") or 0)
            beams_here = BEAMS.get(n["dur"], 0) if (i in in_run and len(in_run[i]) > 1) else 0
            top = STEM_TOP + BEAM_H + (beams_here - 1) * BEAM_GAP + 7 if beams_here else STEM_TOP + 8
            for k in range(count):
                y = top + 8 + k * 6
                g.append(f'<line class="slash" x1="{sx - 6:.1f}" y1="{y + 3:.1f}" x2="{sx + 6:.1f}" y2="{y - 3:.1f}"/>')
        if n.get("buzz"):
            g.append(f'<text class="buzz" x="{sx:.1f}" y="{LINE_Y - 16}">z</text>')
        if n.get("accent"):
            g.append(f'<path class="accent" d="M{nx - 5:.1f} {ACCENT_Y - 4} L{nx + 6:.1f} {ACCENT_Y} L{nx - 5:.1f} {ACCENT_Y + 4}"/>')
        # sticking
        if n.get("hand_printed") is not False and n.get("hand"):
            if grace:
                gx0 = nx - 15 * len(grace)
                g.append(f'<text class="st grace" x="{gx0 + 4:.1f}" y="{STICK_Y}">{grace.upper()}</text>')
            if single and r.get("pas_sticking_rows"):
                label = r["pas_sticking_rows"][0].replace(" ", "")
                g.append(f'<text class="st st-row" x="{nx - 6:.1f}" y="{STICK_Y}">{label}</text>')
            else:
                g.append(f'<text class="st" x="{nx:.1f}" y="{STICK_Y}">{n["hand"]}</text>')
        g.append("</g>")
        note_svg.append("".join(g))

    # ties: from a tied note to the next note, below the noteheads
    ties = []
    for i, n in enumerate(notes):
        if n.get("tie") and i + 1 < len(notes):
            x1, x2 = lay[i]["x"] + 4, lay[i + 1]["x"] - 4
            mid = (x1 + x2) / 2
            ties.append(
                f'<path class="tie" d="M{x1:.1f} {LINE_Y + 7} Q{mid:.1f} {LINE_Y + 17} {x2:.1f} {LINE_Y + 7} '
                f'Q{mid:.1f} {LINE_Y + 13.5} {x1:.1f} {LINE_Y + 7}Z"/>'
            )

    label = html.escape(f"{r['name']} in notation, with sticking", quote=True)
    return width * SCALE, (
        f'<svg class="notation" viewBox="0 0 {width:.0f} {HEIGHT}" width="{width * SCALE:.0f}" height="{HEIGHT * SCALE:.0f}" '
        f'role="img" aria-label="{label}">' + "".join(parts) + "".join(ties) + "".join(beams_svg)
        + "".join(note_svg) + "</svg>"
    )


def play_data():
    out = []
    for r in DATA:
        notes = []
        for n in r["notes"]:
            item = {"d": round(DUR[n["dur"]], 5), "h": n.get("hand", "")}
            if n.get("rest"):
                item = {"d": item["d"], "rest": 1}
            else:
                if n.get("accent"):
                    item["a"] = 1
                if n.get("grace"):
                    item["g"] = n["grace"]
                if n.get("buzz"):
                    item["z"] = 1
                if n.get("double") and n.get("strokes"):
                    item["s"] = n["strokes"]
            notes.append(item)
        out.append({"n": r["n"], "name": r["name"], "pulse": 1.5 if r["n"] in COMPOUND else 1.0, "notes": notes})
    return json.dumps(out, separators=(",", ":"))


def page():
    sections = []
    current = None
    cards = []

    def flush():
        if current is not None:
            sections.append((current, list(cards)))

    for r in DATA:
        top, _, sub = r["category"].partition(": ")
        if top != current:
            flush()
            cards.clear()
            current = top
        cards.append(r)
    flush()

    html_parts = []
    for top, rs in sections:
        heading = re.sub(r"^[IV]+\.\s*", "", top)
        slug = re.sub(r"[^a-z]+", "-", heading.lower()).strip("-")
        items = []
        lastsub = None
        for r in rs:
            sub = r["category"].partition(": ")[2]
            if sub and sub != lastsub:
                items.append(f'<h3 class="rud-sub">{html.escape(re.sub(r"^[A-Z]\.\s*", "", sub))}</h3>')
                lastsub = sub
            tags = '<span class="tag">Original 26</span>' if r.get("nard_26") else ""
            drawn_width, notation = svg(r)
            wide = " rud-wide" if drawn_width > 600 else ""
            items.append(
                f'<article class="rud{wide}" id="r{r["n"]}" data-n="{r["n"]}">'
                f'<div class="rud-head"><p class="rud-num">{r["n"]}</p>'
                f'<h3 class="rud-name">{html.escape(r["name"])}</h3>{tags}'
                f'<button class="rud-play" type="button" data-n="{r["n"]}" aria-pressed="false" hidden>'
                f'<svg viewBox="0 0 24 24" aria-hidden="true"><path class="i-play" d="M7 4.5v15l13-7.5z"/>'
                f'<path class="i-stop" d="M6 6h12v12H6z"/></svg><span>Play</span>'
                f'<span class="visually-hidden"> {html.escape(r["name"])}</span></button></div>'
                f'<div class="rud-score">{notation}</div></article>'
            )
        html_parts.append(
            f'<section class="rud-group" id="{slug}" aria-labelledby="{slug}-h">'
            f'<h2 id="{slug}-h">{html.escape(heading)}</h2><div class="rud-grid">{"".join(items)}</div></section>'
        )
    return (
        "\n".join(html_parts)
        + f'\n<script type="application/json" id="rudiment-data">{play_data()}</script>'
    )


def jump_links():
    seen = []
    for r in DATA:
        top = r["category"].partition(": ")[0]
        heading = re.sub(r"^[IV]+\.\s*", "", top)
        if heading not in seen:
            seen.append(heading)
    return "".join(
        f'<li><a href="#{re.sub(r"[^a-z]+", "-", h.lower()).strip("-")}">{html.escape(h)}</a></li>' for h in seen
    )
