"""Upcoming events. Add new ones here; past events hide themselves on the site.

Each event:
  start, end   local San Angelo time, "YYYY-MM-DDTHH:MM" (end may be omitted)
  title        short name (HTML allowed, e.g. <i>...</i>)
  group        ensemble or role
  venue        place name
  map          optional search text for a map link
  note         optional one-line detail (HTML allowed)
  link         optional (label, href) for more information
"""

EVENTS = [
    {
        "start": "2026-10-31T16:00", "end": "2026-10-31T18:00",
        "title": "Halloween Concert and Jam Session",
        "group": "ASU Jazz Combos",
        "venue": "The House of FiFi DuBois",
        "map": "The House of FiFi DuBois, 123 S. Chadbourne St., San Angelo, TX",
        "note": "Concert at 4:00, open jam at 5:00. Every musician on stage is in costume. Bring your instrument and sit in.",
        "link": ("Program", "programs.html#jazz-combos-2026-10-31"),
    },
    {
        "start": "2026-11-03T19:00", "end": "2026-11-03T20:30",
        "title": "<i>In C</i>",
        "group": "ASU Percussion Ensemble",
        "venue": "Elta Joyce Murphey Auditorium",
        "map": "Elta Joyce Murphey Auditorium, Angelo State University, San Angelo, TX",
        "note": "Var&egrave;se, <i>Ionisation</i>; Mahler, <i>Adagietto</i> from Symphony No. 5, arranged by Grubbs; and Terry Riley, <i>In C</i>.",
        "link": ("Program", "programs.html#percussion-ensemble-2026-11-03"),
    },
    {
        "start": "2026-11-07T18:00", "end": "2026-11-07T21:30",
        "title": "Home football",
        "group": "Ram Band and Drumline",
        "venue": "LeGrand Stadium",
        "map": "LeGrand Stadium, Angelo State University, San Angelo, TX",
        "note": "Kickoff at 6:00 p.m.",
    },
    {
        "start": "2026-11-10T19:00", "end": "2026-11-10T20:30",
        "title": "Jazz Ensemble Concert",
        "group": "ASU Jazz Ensemble",
        "venue": "Brooks &amp; Bates Theatre",
        "map": "Brooks & Bates Theatre, 82 Gillis St., San Angelo, TX",
    },
    {
        "start": "2026-11-14T16:00", "end": "2026-11-14T18:00",
        "title": "Concert and Jam Session",
        "group": "ASU Jazz Combos",
        "venue": "The House of FiFi DuBois",
        "map": "The House of FiFi DuBois, 123 S. Chadbourne St., San Angelo, TX",
        "note": "Concert at 4:00, open jam at 5:00.",
    },
    {
        "start": "2026-12-05T09:00", "end": "2026-12-05T19:00",
        "title": "Christmas at Old Fort Concho",
        "group": "Official Drummer of Fort Concho",
        "venue": "Fort Concho",
        "map": "Fort Concho, San Angelo, TX",
        "note": "Dr. Shuey on the fort's original 1867 drum.",
        "link": ("About the drum", "fort-concho.html"),
    },
    {
        "start": "2027-04-17T09:00",
        "title": "ASU Drumline Clinic",
        "group": "Ram Band Drumline",
        "venue": "Angelo State University",
        "note": "Details to come.",
    },
]
