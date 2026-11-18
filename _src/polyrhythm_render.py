"""Reference tables for polyrhythm.html: the levels and rates inside one beat of Xenakis's Rebonds a
(measure 21, beat 1), and the spreadsheet that goes with them.

Everything is counted in marks: ninetieths of the dotted eighth that the five against three fills.
The page shows times at quarter note = 40 (12.5 ms a mark); assets/polyrhythm.js rewrites every
cell that carries data-po-ms when the tempo slider moves.

Run  python3 _src/polyrhythm_render.py  to rebuild the spreadsheet in assets/docs (needs openpyxl).
The site build itself does not need it.
"""
import html
import pathlib

MARK_MS = 12.5                      # one mark at quarter note = 40
UPPER = [0, 18, 36, 54, 72]         # the five
LOWER = [(0, "32nd 1"), (15, "32nd 2"), (30, "Triplet 1"), (40, "Triplet 2"), (50, "Triplet 3"),
         (60, "32nd 5"), (75, "32nd 6")]

# stream, written as, notes per dotted eighth, where it plays, swatch
STREAMS = [
    ("The five (upper voice)", "Five sixteenths in the time of three", 5, "The whole figure", "u"),
    ("Plain thirty-seconds (the six)", "Six thirty-seconds", 6, "First and third sixteenths", "l"),
    ("Triplet thirty-seconds", "Three thirty-seconds in the time of two", 9, "Middle sixteenth only", "l"),
    ("Counting five", "Five sixty-fourths in the time of four", 15, "Not in the score: a way to count each sixteenth", "g"),
]

NOTICE = {
    0: "Both voices together",
    18: "3 marks after the second thirty-second: a flam",
    30: "The triplet starts on the grid",
    36: "6 after triplet 1, 4 before triplet 2",
    40: "5 before where the fourth thirty-second would be",
    45: "Replaced by the triplet",
    50: "5 after where the fourth thirty-second would be",
    54: "4 after triplet 3, 6 before the six resumes",
    60: "The lower voice is back on the grid",
    72: "3 marks before the sixth thirty-second: a flam",
    90: "The downbeat of beat 2",
}


def _ms(marks):
    value = marks * MARK_MS
    return (f"{value:.1f}".rstrip("0").rstrip(".")) + " ms"


def _time(marks):
    return f'<td class="num" data-po-ms="{marks:g}">{_ms(marks)}</td>'


def _sw(kind):
    return f'<span class="po-swatch {kind}"></span>'


def timeline():
    """Every mark where something happens, or would have: (mark, upper, lower, grid)."""
    lower = dict(LOWER)
    grid = {15 * i: f"32nd {i + 1}" for i in range(6)}
    rows = []
    for mark in sorted(set(UPPER) | set(lower) | set(grid) | {90}):
        up = f"Note {UPPER.index(mark) + 1}" if mark in UPPER else ""
        rows.append((mark, up, lower.get(mark, ""), grid.get(mark, "")))
    return rows


def _table(caption, head, rows, cls=""):
    ths = "".join(f'<th scope="col"{" class=num" if num else ""}>{label}</th>' for label, num in head)
    return (
        f'<div class="table-wrap"><table class="table po-table po-ref-table{cls}">'
        f'<caption class="visually-hidden">{html.escape(caption)}</caption>'
        f"<thead><tr>{ths}</tr></thead><tbody>{''.join(rows)}</tbody></table></div>"
    )


def levels():
    # Four streams, one ruler
    rows = []
    for name, written, rate, where, sw in STREAMS:
        marks = 90 // rate
        rows.append(
            f'<tr><th scope="row">{_sw(sw)}{name}</th><td>{written}</td><td class="num">{rate}</td>'
            f'<td class="num">{marks}</td>{_time(marks)}<td>{where}</td></tr>'
        )
    streams = _table(
        "The four streams in the beat: how each is written, how many notes it fits in the dotted eighth, and how long one note lasts",
        [("Stream", 0), ("Written as", 0), ("Notes per dotted eighth", 1), ("Marks each", 1), ("Time", 1), ("Where it plays", 0)],
        rows,
    )

    # The triplet inside the six
    rows = []
    for mark, up, low, grid in timeline():
        if mark == 90:
            rows.append(f'<tr class="po-end"><th scope="row" class="num">90</th>{_time(90)}<td>Beat 2</td><td>Beat 2</td><td>{NOTICE[90]}</td></tr>')
            continue
        ghost = grid and not low
        up_cell = f"{_sw('u')}{up}" if up else ""
        low_cell = f"{_sw('l')}{low}" if low else ("Thirty-second 4, not played" if ghost else "")
        rows.append(
            f'<tr{" class=po-ghost" if ghost else ""}><th scope="row" class="num">{mark}</th>{_time(mark)}'
            f'<td>{up_cell}</td><td>{low_cell}</td><td>{NOTICE.get(mark, "")}</td></tr>'
        )
    triplet = _table(
        "Every mark in the five against six where a note falls, with the triplet in place of the third and fourth thirty-seconds",
        [("Mark", 1), ("Time", 1), ("Upper voice", 0), ("Lower voice", 0), ("What to notice", 0)],
        rows,
    )

    # The middle sixteenth in fifteen slices
    rows = []
    for s in range(15):
        trip = f"{_sw('l')}Note {s // 5 + 1}" if s % 5 == 0 else ""
        count = str(s // 3 + 1) if s % 3 == 0 else ""
        plays = s in (3, 12)
        rows.append(
            f'<tr{" class=po-hit" if plays else ""}><th scope="row" class="num">{s}</th>{_time(s * 2)}'
            f'<td>{trip}</td><td class="num">{count}</td><td>{_sw("u") + "Plays" if plays else ""}</td></tr>'
        )
    slices = _table(
        "The middle sixteenth cut into fifteen slices: where the triplet, the five counts, and the upper voice fall",
        [("Slice", 1), ("Time", 1), ("Triplet", 0), ("Count in five", 1), ("Upper voice", 0)],
        rows,
    )

    # The whole figure counted in fives
    rows = []
    for i in range(15):
        plays = i % 3 == 0
        rows.append(
            f'<tr{" class=po-hit" if plays else ""}><th scope="row" class="num">{i + 1}</th><td class="num">{i // 5 + 1}</td>'
            f'<td class="num">{i % 5 + 1}</td><td class="num">{i * 6}</td>{_time(i * 6)}<td>{_sw("u") + "Plays" if plays else ""}</td></tr>'
        )
    fives = _table(
        "All fifteen counts when every sixteenth is counted in five, and the five counts the upper voice plays",
        [("Count", 1), ("Sixteenth", 1), ("Within it", 1), ("Mark", 1), ("Time", 1), ("Upper voice", 0)],
        rows,
    )

    return f"""
        <div class="po-ref">
          <h3>Four streams, one ruler</h3>
          <p>The five moves at five notes to the dotted eighth, the plain thirty-seconds at six, and the triplet at nine. Counting each sixteenth in five adds a fourth stream at fifteen, which is in your head and not in the score. Ninety is the smallest number that all four divide, which is why this page counts everything in ninetieths.</p>
          {streams}
        </div>
        <div class="po-ref">
          <h3>The triplet inside the six</h3>
          <p>The triplet belongs to the lower voice. It takes the place of the third and fourth of the six thirty-seconds, three notes in the time of two, so for one sixteenth the lower voice runs at nine to the span instead of six. For that long, the five is against nine.</p>
          {triplet}
        </div>
        <div class="po-ref-pair">
          <div class="po-ref">
            <h3>The middle sixteenth in fifteen slices</h3>
            <p>Fifteen is the smallest ruler that holds a three and a five. The triplet takes slices 0, 5, and 10; the five counts take 0, 3, 6, 9, and 12; and the upper voice keeps only 3 and 12.</p>
            {slices}
          </div>
          <div class="po-ref">
            <h3>The whole figure counted in fives</h3>
            <p>Count every sixteenth in five and the printed five lands on every third count: 1 and 4, then 2 and 5, then 3.</p>
            {fives}
          </div>
        </div>"""


# ---------- The spreadsheet (assets/docs/rebonds-a-measure-21-levels.xlsx) ----------

def build_sheet(path):
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

    font = Font(name="Arial", size=10)
    bold = Font(name="Arial", size=10, bold=True)
    title = Font(name="Arial", size=14, bold=True)
    note = Font(name="Arial", size=10, italic=True, color="444444")
    head_fill = PatternFill("solid", start_color="D9D9D9")
    input_fill = PatternFill("solid", start_color="FFF2CC")
    hit_fill = PatternFill("solid", start_color="EFEFEF")
    line = Side(style="thin", color="999999")
    heavy = Side(style="medium", color="000000")
    tempo = "Levels!$B$4"
    mark = "Levels!$B$6"

    wb = Workbook()

    def sheet(ws, heading, sub, widths):
        ws["A1"] = heading
        ws["A1"].font = title
        ws["A2"] = sub
        ws["A2"].font = note
        for col, width in zip("ABCDEFGH", widths):
            ws.column_dimensions[col].width = width
        ws.sheet_view.showGridLines = False
        ws.page_setup.orientation = "landscape"
        ws.page_setup.fitToWidth = 1
        ws.page_setup.fitToHeight = 0
        ws.sheet_properties.pageSetUpPr.fitToPage = True

    def table(ws, top, head, rows, ms_cols=(), hits=()):
        for c, label in enumerate(head, 1):
            cell = ws.cell(row=top, column=c, value=label)
            cell.font = bold
            cell.fill = head_fill
            cell.border = Border(bottom=heavy)
            text_col = isinstance(rows[0][c - 1], str) and not rows[0][c - 1].startswith("=")
            cell.alignment = Alignment(wrap_text=True, vertical="bottom", horizontal="left" if text_col else "right", indent=1 if text_col and c > 1 else 0)
        for r, row in enumerate(rows, top + 1):
            for c, value in enumerate(row, 1):
                cell = ws.cell(row=r, column=c, value=value if value != "" else None)
                cell.font = bold if c == 1 else font
                cell.border = Border(bottom=line)
                cell.alignment = Alignment(vertical="top", wrap_text=True, indent=1 if c > 1 and isinstance(value, str) and not value.startswith("=") else 0)
                if c in ms_cols:
                    cell.number_format = "0.0"
                if (r - top - 1) in hits:
                    cell.fill = hit_fill
        ws.freeze_panes = ws.cell(row=top + 1, column=1)
        return top + len(rows)

    # Levels
    ws = wb.active
    ws.title = "Levels"
    sheet(ws, "Xenakis, Rebonds a, measure 21, beat 1: levels and rates",
          "Change the tempo in the shaded cell and every time in this workbook follows. One mark is one ninetieth of the dotted eighth.",
          [34, 40, 14, 12, 14, 12, 44])
    for r, (label, value) in enumerate([("Tempo (quarter note, bpm)", 40), ("One sixteenth (ms)", "=60000/B4/4"), ("One mark (ms)", "=B5/30")], 4):
        ws.cell(row=r, column=1, value=label).font = bold
        cell = ws.cell(row=r, column=2, value=value)
        cell.font = font
        cell.number_format = "0.0" if r > 4 else "0"
        cell.alignment = Alignment(horizontal="left")
    ws["B4"].fill = input_fill
    ws["B4"].border = Border(top=heavy, bottom=heavy, left=heavy, right=heavy)
    ws["C4"] = "Edit this cell. The score prints about 40."
    ws["C4"].font = note
    rows = [[name, written, rate, f"=90/C{9 + i}", f"=D{9 + i}*$B$6", "No" if sw == "g" else "Yes", where]
            for i, (name, written, rate, where, sw) in enumerate(STREAMS)]
    end = table(ws, 8, ["Stream", "Written as", "Notes per dotted eighth", "Marks each (of 90)", "Milliseconds", "In the score", "Where it plays"], rows, ms_cols=(5,))
    notes = [
        "Ninety is the smallest number that 5, 6, 9, and 15 all divide, so the whole figure is counted in ninetieths.",
        "Three triplet notes fill the same time as five counts of the counting five: one sixteenth.",
        "The printed five is the counting five with two of every three counts left out.",
        "Source: Iannis Xenakis, Rebonds (1987-89), part a, measure 21, beat 1. Editions Salabert. From trentshuey.com/polyrhythm.",
    ]
    for i, text in enumerate(notes, end + 2):
        ws.cell(row=i, column=1, value=text).font = note

    # The triplet inside the six
    ws = wb.create_sheet("Triplet in the six")
    sheet(ws, "The triplet inside the six",
          "The triplet takes the place of the third and fourth of the six thirty-seconds. Marks and times are counted from the start of the five.",
          [14, 14, 18, 28, 26, 48])
    rows = []
    for i, (m, up, low, grid) in enumerate(timeline()):
        r = 5 + i
        if m == 90:
            rows.append([90, f"=A{r}*{mark}", "Beat 2", "Beat 2", "", NOTICE[90]])
        else:
            rows.append([m, f"=A{r}*{mark}", up, low, grid + (" (not played)" if grid and not low else ""), NOTICE.get(m, "")])
    table(ws, 4, ["Mark (of 90)", "Milliseconds", "Upper voice (the five)", "Lower voice plays", "The six's thirty-second grid", "What to notice"], rows, ms_cols=(2,))

    # The middle sixteenth
    ws = wb.create_sheet("Middle sixteenth")
    sheet(ws, "The middle sixteenth in fifteen slices",
          "Fifteen is the smallest ruler that holds a three and a five. One slice is two marks.",
          [10, 22, 14, 22, 16, 18])
    rows = [[s, f"=A{5 + s}*2", f"=B{5 + s}*{mark}", f"Note {s // 5 + 1}" if s % 5 == 0 else "", s // 3 + 1 if s % 3 == 0 else "", "Plays" if s in (3, 12) else ""] for s in range(15)]
    end = table(ws, 4, ["Slice", "Marks into the sixteenth", "Milliseconds", "Triplet (lower voice)", "Count in five", "Upper voice"], rows, ms_cols=(3,), hits=(3, 12))
    ws.cell(row=end + 2, column=1, value="The upper voice keeps slices 3 and 12: two slices before the second triplet note and two slices after the third.").font = note

    # Counting in fives
    ws = wb.create_sheet("Counting in fives")
    sheet(ws, "The whole figure counted in fives",
          "Count every sixteenth in five. The printed five plays every third count.",
          [10, 12, 22, 30, 14, 18])
    rows = [[i + 1, i // 5 + 1, i % 5 + 1, f"=(A{5 + i}-1)*6", f"=D{5 + i}*{mark}", "Plays" if i % 3 == 0 else ""] for i in range(15)]
    end = table(ws, 4, ["Count", "Sixteenth", "Count within the sixteenth", "Marks from the start of the five", "Milliseconds", "Upper voice"], rows, ms_cols=(5,), hits=tuple(range(0, 15, 3)))
    ws.cell(row=end + 2, column=1, value="The upper voice plays counts 1 and 4, then 2 and 5, then 3.").font = note

    # Every stroke
    ws = wb.create_sheet("Every stroke")
    sheet(ws, "Every stroke in the beat, in order",
          "Marks count from the start of the five; the high bongo plays one sixteenth (30 marks) earlier. Times are from the start of the beat.",
          [12, 30, 14, 20, 18, 16])
    strokes = [("Alone", "High bongo", -30), ("Both", "Low bongo and low tom", 0), ("Lower", "Low tom", 15), ("Upper", "High tom", 18),
               ("Lower", "Low tom", 30), ("Upper", "Low bongo", 36), ("Lower", "High bass drum", 40), ("Lower", "Low tom", 50),
               ("Upper", "High tom", 54), ("Lower", "Middle tom", 60), ("Upper", "Low bongo", 72), ("Lower", "High bass drum", 75)]
    rows = [[voice, drum, m, f"=(C{5 + i}+30)*{mark}", f"=C{6 + i}-C{5 + i}", f"=E{5 + i}*{mark}"] for i, (voice, drum, m) in enumerate(strokes)]
    rows.append(["Beat 2", "The downbeat the last flam leads to", 90, f"=(C{5 + len(strokes)}+30)*{mark}", "", ""])
    table(ws, 4, ["Voice", "Drum", "Mark (of 90)", "Milliseconds from the beat", "Then wait (marks)", "Then wait (ms)"], rows, ms_cols=(4, 6))

    wb.save(path)


if __name__ == "__main__":
    out = pathlib.Path(__file__).resolve().parent.parent / "assets" / "docs" / "rebonds-a-measure-21-levels.xlsx"
    build_sheet(out)
    print("Wrote", out)
