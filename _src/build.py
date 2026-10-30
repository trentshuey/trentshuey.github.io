#!/usr/bin/env python3
"""Builds trentshuey.com from the page files in _src/pages.

Each page file starts with a comment block of settings, then the page body:

    <!--
    title: About
    description: One sentence for search results.
    nav: about
    -->
    ...body html...

Run:  python3 _src/build.py   (writes the finished .html files to the site root)
"""
import html
import pathlib
import re
import sys
import urllib.parse
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from videos import ALL as VIDEOS, SECTIONS as VIDEO_SECTIONS  # noqa: E402
from events import EVENTS  # noqa: E402
from programs import PROGRAMS  # noqa: E402
import rudiments_render  # noqa: E402
import scales_render  # noqa: E402
import jam  # noqa: E402
import latin  # noqa: E402
import paint  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ROOT / "_src" / "pages"
SITE_URL = "https://www.trentshuey.com"
NAME = "Dr. Trent W. Shuey"

LINKS = {
    "email": "trent.shuey@angelo.edu",
    "office_phone": "325-486-6036",
    "youtube": "https://www.youtube.com/@TrentShuey",
    "instagram": "https://www.instagram.com/drtrentshuey/",
    "hikes_youtube": "https://www.youtube.com/@ShueyHikes",
    "soundcloud": "https://soundcloud.com/trentshuey",
    "asu_profile": "https://www.angelo.edu/live/profiles/3140-trent-shuey",
    "music_form": "https://www.angelo.edu/departments/visual-performing-arts/music/prospective-music-student-form/",
    "dissertation": "https://hdl.handle.net/2142/106958",
}

# Visitor count: set to the GoatCounter site code (the "xyz" in xyz.goatcounter.com)
# once that account exists. Left empty, no counting script is added.
GOATCOUNTER_CODE = ""
# Instagram posts to show on the home page (full post links, e.g. https://www.instagram.com/p/XXXX/).
# Left empty, the section shows the account cards only.
INSTAGRAM_POSTS = []
# Google Search Console HTML-tag verification token, if that method is used.
SITE_VERIFICATION = ""

NAV = [
    ("about", "About", "about.html"),
    ("percussion", "Percussion", "percussion.html"),
    ("jazz", "Jazz", "jazz.html"),
    ("performances", "Performances", "performances.html"),
    ("events", "Events", "events.html"),
    ("videos", "Videos", "videos.html"),
    ("students", "Students", "resources.html"),
    ("contact", "Contact", "contact.html"),
]


def marimba_svg():
    """A marimba seen from above, its 24 bars painted in the colors of Paul Shuey's fish painting."""
    n, x0, pitch, width, center = 24, 30, 47.5, 35, 128
    lengths = [222 * (0.976 ** i) for i in range(n)]
    colors = paint.marimba_bar_colors(n)
    upper, lower, bars = [], [], []
    for i, length in enumerate(lengths):
        x = x0 + i * pitch
        top = center - length / 2
        cx = x + width / 2
        y1, y2 = top + 0.224 * length, top + 0.776 * length
        upper.append(f"{cx:.1f},{y1:.1f}")
        lower.append(f"{cx:.1f},{y2:.1f}")
        bars.append(
            f'<g class="bar-group"><rect class="bar" x="{x:.1f}" y="{top:.1f}" width="{width}" '
            f'height="{length:.1f}" rx="6" style="fill:{colors[i]}"/><circle class="hole" cx="{cx:.1f}" cy="{y1:.1f}" r="3.2"/>'
            f'<circle class="hole" cx="{cx:.1f}" cy="{y2:.1f}" r="3.2"/></g>'
        )
    rails = "".join(
        f'<polyline class="rail" points="{" ".join(p)}" style="fill:none;stroke-width:16;stroke-linecap:round"/>'
        for p in (upper, lower)
    )
    cords = "".join(f'<polyline class="cord" points="{" ".join(p)}"/>' for p in (upper, lower))
    rough = paint._filter("rough-marimba", 24, 4, "0.03 0.05")
    return (
        '<svg class="marimba" viewBox="0 0 1200 256" aria-hidden="true" focusable="false">'
        f'<defs>{rough}</defs><g filter="url(#rough-marimba)">' + rails + "</g>" + "".join(bars) + cords + "</svg>"
    )


def keys_svg():
    """Short run of bars used under inner page titles."""
    rects = []
    for i in range(12):
        h = 30 - i * 1.1
        rects.append(f'<rect x="{i * 13}" y="{(30 - h) / 2:.1f}" width="8" height="{h:.1f}" rx="2"/>')
    return f'<svg class="keys" viewBox="0 0 152 30" aria-hidden="true" focusable="false">{"".join(rects)}</svg>'


PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>'


def video_figure(vid, thumb="hqdefault"):
    """One video: a thumbnail link that turns into the YouTube player when pressed."""
    title, detail = VIDEOS[vid]
    plain = html.escape(html.unescape(re.sub(r"<[^>]+>", "", title)), quote=True)
    size = 'width="320" height="180"' if thumb == "mqdefault" else 'width="480" height="360"'
    detail_html = f'<span class="detail">{detail}</span>' if detail else ""
    return (
        f'<figure class="video-item">'
        f'<a class="video" href="https://www.youtube.com/watch?v={vid}" data-video="{vid}" data-title="{plain}">'
        f'<img src="https://i.ytimg.com/vi/{vid}/{thumb}.jpg" alt="" loading="lazy" {size}>'
        f'<span class="play">{PLAY_ICON}Play<span class="visually-hidden"> {plain}</span></span></a>'
        f"<figcaption>{title}{detail_html}</figcaption></figure>"
    )


def video_library():
    jump = "".join(
        f'<li><a href="#{key}">{name}</a> <span class="count">{len(items)}</span></li>'
        for key, name, items in VIDEO_SECTIONS
    )
    parts = [f'<nav class="jump" aria-label="Video sections"><ul>{jump}</ul></nav>']
    for i, (key, name, items) in enumerate(VIDEO_SECTIONS):
        band = "band band-white" if i % 2 == 0 else "band"
        figures = "\n".join(video_figure(vid, "mqdefault") for vid, _, _ in items)
        parts.append(
            f'<section class="{band}" id="{key}" aria-labelledby="{key}-h">'
            f'<div class="wrap"><div class="section-head"><h2 id="{key}-h">{name}</h2></div>'
            f'<div class="library">\n{figures}\n</div></div></section>'
        )
    return "\n".join(parts)


IMAGES = __import__("json").loads((ROOT / "_src" / "images.json").read_text(encoding="utf-8"))


def img_tag(name, prefix="", eager=False, cls=""):
    m = IMAGES[name]
    load = 'fetchpriority="high"' if eager else 'loading="lazy" decoding="async"'
    c = f' class="{cls}"' if cls else ""
    return (
        f'<img{c} src="{prefix}assets/img/{m["file"]}" alt="{html.escape(m["alt"], quote=True)}" '
        f'width="{m["w"]}" height="{m["h"]}" {load}>'
    )


def gallery(names, prefix=""):
    """Photos in columns; each opens full size (site.js shows it in a viewer)."""
    items = "".join(
        f'<a class="gallery-item" href="{prefix}assets/img/{IMAGES[n]["file"]}">{img_tag(n, prefix)}</a>'
        for n in names
    )
    return f'<div class="gallery">{items}</div>'


def video_count():
    return sum(len(items) for _, _, items in VIDEO_SECTIONS)


TZ = ZoneInfo("America/Chicago")
MONTHS = ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."]
DAYS = ["Mon.", "Tue.", "Wed.", "Thu.", "Fri.", "Sat.", "Sun."]


def _local(value):
    return datetime.strptime(value, "%Y-%m-%dT%H:%M").replace(tzinfo=TZ)


def _clock(d):
    hour = d.hour % 12 or 12
    return f"{hour}:{d.minute:02d} {'a.m.' if d.hour < 12 else 'p.m.'}"


def _plain(text):
    return html.unescape(re.sub(r"<[^>]+>", "", text))


def _slug(text):
    return re.sub(r"[^a-z0-9]+", "-", _plain(text).lower()).strip("-")


def upcoming_events(now=None):
    """Events that have not ended yet, soonest first, with display fields filled in."""
    now = now or datetime.now(TZ)
    out = []
    for e in EVENTS:
        start = _local(e["start"])
        end = _local(e["end"]) if e.get("end") else start + timedelta(hours=2)
        if end < now:
            continue
        item = dict(e, start_dt=start, end_dt=end)
        item["id"] = f"{_slug(e['group'])}-{start:%Y-%m-%d}"
        out.append(item)
    return sorted(out, key=lambda x: x["start_dt"])


def _ics_text(value):
    return value.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def write_ics(events):
    """One small calendar file per event, for the "Add to calendar" links."""
    folder = ROOT / "assets" / "ics"
    folder.mkdir(parents=True, exist_ok=True)
    for old in folder.glob("*.ics"):
        old.unlink()
    for e in events:
        utc = lambda d: d.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")  # noqa: E731
        lines = [
            "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//trentshuey.com//events//EN",
            "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
            f"UID:{e['id']}@trentshuey.com",
            f"DTSTAMP:{utc(e['start_dt'])}",
            f"DTSTART:{utc(e['start_dt'])}",
            f"DTEND:{utc(e['end_dt'])}",
            f"SUMMARY:{_ics_text(e['group'] + ': ' + _plain(e['title']))}",
            f"LOCATION:{_ics_text(e.get('map') or _plain(e['venue']))}",
            f"DESCRIPTION:{_ics_text(_plain(e.get('note', '')))}",
            f"URL:{SITE_URL}/events#{e['id']}",
            "END:VEVENT", "END:VCALENDAR",
        ]
        (folder / f"{e['id']}.ics").write_text("\r\n".join(lines) + "\r\n", encoding="utf-8")


def event_item(e, prefix="", hidden=False):
    s = e["start_dt"]
    full_date = f"{s:%A}, {s:%B} {s.day}, {s.year}"
    venue = e["venue"]
    if e.get("map"):
        q = urllib.parse.quote_plus(e["map"])
        venue = f'<a href="https://www.google.com/maps/search/?api=1&amp;query={q}">{venue}</a>'
    note = f'<p class="event-note">{e["note"]}</p>' if e.get("note") else ""
    links = []
    if e.get("link"):
        label, href = e["link"]
        if not href.startswith("http"):
            href = prefix + href
        links.append(f'<a href="{href}">{label}</a>')
    links.append(f'<a href="{prefix}assets/ics/{e["id"]}.ics" download>Add to calendar</a>')
    end_utc = e["end_dt"].astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    hide = " hidden" if hidden else ""
    group = e["group"].lower()
    tone = ("tone-red" if "percussion" in group else "tone-blue" if "jazz" in group
            else "tone-yellow" if ("ram band" in group or "drumline" in group) else "tone-sienna")
    poster, cls = "", f"event {tone}"
    if e.get("image"):
        cls = f"event has-poster {tone}"
        poster = (f'<a class="event-poster gallery-item" href="{prefix}assets/img/{IMAGES[e["image"]]["file"]}">'
                  f'{img_tag(e["image"], prefix)}</a>')
    return (
        f'<li class="{cls}" id="{e["id"]}" data-end="{end_utc}"{hide}>'
        f'<time class="event-date" datetime="{s.isoformat(timespec="minutes")}">'
        f'<span class="visually-hidden">{full_date}</span>'
        f'<span class="m" aria-hidden="true">{s:%b}</span><span class="d" aria-hidden="true">{s.day}</span>'
        f'<span class="w" aria-hidden="true">{DAYS[s.weekday()]}</span></time>'
        f'<div class="event-body"><p class="event-group">{html.escape(e["group"])}</p>'
        f'<h3>{e["title"]}</h3>'
        f'<p class="event-meta">{_clock(s)} at {venue}</p>{note}'
        f'<p class="event-links">{"".join(links)}</p></div>{poster}</li>'
    )


def events_page(events, prefix=""):
    if not events:
        return '<p class="events-empty">New dates are posted here as soon as they are set.</p>'
    groups = {}
    for e in events:
        groups.setdefault((e["start_dt"].year, e["start_dt"].month), []).append(e)
    parts = []
    for (year, month), items in groups.items():
        lis = "\n".join(event_item(e, prefix) for e in items)
        parts.append(
            f'<section class="event-month"><h2>{datetime(year, month, 1):%B} {year}</h2>'
            f'<ol class="events">\n{lis}\n</ol></section>'
        )
    parts.append('<p class="events-empty" hidden>New dates are posted here as soon as they are set.</p>')
    return "\n".join(parts)


def events_next(events, prefix="", limit=3):
    # A few extra items are included (hidden) so the list stays full after site.js removes past ones.
    lis = "\n".join(event_item(e, prefix, hidden=i >= limit) for i, e in enumerate(events[: limit + 4]))
    return (
        f'<ol class="events events-compact" data-limit="{limit}">\n{lis}\n</ol>'
        '<p class="events-empty" hidden>New dates are posted on the events page as soon as they are set.</p>'
    )


PROGRAM_GROUPS = [("all", "All"), ("percussion", "Percussion Ensemble"), ("jazz", "Jazz"), ("other", "Other")]


def _program_date(value):
    parts = [int(x) for x in value.split("-")]
    if len(parts) == 2:
        return f"{MONTHS[parts[1] - 1]} {parts[0]}", datetime(parts[0], parts[1], 28, tzinfo=TZ)
    d = datetime(*parts, tzinfo=TZ)
    return f"{MONTHS[d.month - 1]} {d.day}, {d.year}", d


def _pieces(items):
    lis = []
    for composer, title, detail in items:
        by = f' <span class="by">{composer}</span>' if composer else ""
        sep = "," if composer else ""
        extra = f'<span class="with">{detail}</span>' if detail else ""
        lis.append(f"<li>{title}{sep}{by}{extra}</li>")
    return '<ul class="rep">' + "".join(lis) + "</ul>"


def program_archive(prefix=""):
    today = datetime.now(TZ).replace(hour=0, minute=0, second=0, microsecond=0)
    buttons = "".join(
        f'<button type="button" data-filter="{key}" aria-pressed="{"true" if key == "all" else "false"}">{label}</button>'
        for key, label in PROGRAM_GROUPS
    )
    items = []
    for prog in PROGRAMS:
        shown, when = _program_date(prog["date"])
        shown = prog.get("date_label", shown)
        venue = f'<span class="where">{prog["venue"]}</span>' if prog.get("venue") else ""
        badge = ""
        if when >= today:
            until = (when + timedelta(days=1)).strftime("%Y-%m-%d")
            badge = f' <span class="badge" data-until="{until}">Coming up</span>'
        title = prog.get("title") or prog["ensemble"]
        body = [f'<p class="kicker">{prog["ensemble"]}</p>', f"<h3>{title}{badge}</h3>"]
        if prog.get("intro"):
            body.append(f'<p class="intro">{prog["intro"]}</p>')
        if prog.get("pieces"):
            body.append(_pieces(prog["pieces"]))
        for heading, pieces in prog.get("sets", []):
            body.append(f'<p class="rep-head">{heading}</p>' + _pieces(pieces))
        if prog.get("personnel"):
            body.append(f'<p class="personnel">{prog["personnel"]}</p>')
        if prog.get("links"):
            links = "".join(
                f'<a href="{href if href.startswith("http") else prefix + href}">{label}</a>'
                for label, href in prog["links"]
            )
            body.append(f'<p class="program-links">{links}</p>')
        image = ""
        if prog.get("image"):
            image = (f'<a class="program-image gallery-item" href="{prefix}assets/img/{IMAGES[prog["image"]]["file"]}">'
                     f'{img_tag(prog["image"], prefix)}</a>')
        items.append(
            f'<li class="program" id="{prog["id"]}" data-group="{prog["group"]}">'
            f'<div><p class="program-date">{shown}{venue}</p>{image}</div><div>{"".join(body)}</div></li>'
        )
    return (
        f'<div class="filters" role="group" aria-label="Show programs by ensemble" data-target="#program-list" hidden>{buttons}</div>'
        f'<ol class="programs" id="program-list">\n' + "\n".join(items) + "\n</ol>"
    )


def recent_sessions(group, prefix="", limit=8):
    """The latest concerts from the program archive for one group, newest first.

    Concerts that have not happened yet are written out hidden, with data-after, so site.js
    can add them to the list once they are over, without waiting for a rebuild.
    """
    today = datetime.now(TZ).replace(hour=0, minute=0, second=0, microsecond=0)
    rows, shown_count = [], 0
    for prog in PROGRAMS:
        if prog["group"] != group:
            continue
        shown, when = _program_date(prog["date"])
        shown = prog.get("date_short", prog.get("date_label", shown))
        title = prog.get("title") or prog["ensemble"]
        venue = prog.get("venue", "")
        bare_venue = venue[4:] if venue.startswith("The ") else venue
        if venue and bare_venue not in title:
            needs_the = venue.startswith("The ") or re.search(r"College of|Center$|Gallery$", venue)
            detail = f'{prog["ensemble"]} at {"the " + bare_venue if needs_the else venue}'
        else:
            detail = prog["ensemble"]
        links = "".join(
            f'<a href="{href if href.startswith("http") else prefix + href}">{label}</a>'
            for label, href in prog.get("links", []) if "events.html" not in href
        )
        links = f'<span class="session-links">{links}</span>' if links else ""
        attrs = ""
        if when >= today:
            after = (when + timedelta(hours=18)).astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            attrs = f' data-after="{after}" hidden'
        else:
            shown_count += 1
        rows.append(
            f'<div{attrs}><dt>{shown}</dt><dd><a href="{prefix}programs.html#{prog["id"]}">{title}</a>'
            f'<span class="detail">{detail}</span>{links}</dd></div>'
        )
        if shown_count >= limit:
            break
    return f'<dl class="timeline sessions" data-limit="{limit}">\n' + "\n".join(rows) + "\n</dl>"


SOCIAL_ICONS = {
    "instagram": '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.2" cy="6.8" r="1.3" fill="currentColor"/></svg>',
    "youtube": '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/></svg>',
    "hikes": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 19.5 9 8l3.6 6.2 2.2-3.6 6.7 8.9z" fill="currentColor"/><circle cx="17.5" cy="5.5" r="2" fill="currentColor"/></svg>',
    "soundcloud": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17h9.2a3.3 3.3 0 0 0 .4-6.6A5 5 0 0 0 9 8.6z" fill="currentColor"/><path d="M3 13v4M5.2 11.5V17M7.2 10v7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
}


def social_section():
    cards = [
        ("instagram", "Instagram", "@drtrentshuey", "Photos and short videos, from the stage to the trail.", LINKS["instagram"]),
        ("youtube", "YouTube", "@TrentShuey", "Concerts, solos, and the ensembles in action.", LINKS["youtube"]),
        ("soundcloud", "SoundCloud", "trentshuey", "Recordings to listen to anywhere.", LINKS["soundcloud"]),
        ("hikes", "Shuey Hikes", "@ShueyHikes", "Camping, backpacking, and national park road trips.", LINKS["hikes_youtube"]),
    ]
    items = "".join(
        f'<li><a class="social-card social-{key}" href="{href}" rel="me noopener">'
        f'<span class="social-icon">{SOCIAL_ICONS[key]}</span>'
        f'<span class="social-text"><strong>{name}</strong><span class="social-handle">{handle}</span>'
        f'<span class="social-note">{note}</span></span></a></li>'
        for key, name, handle, note, href in cards
    )
    out = f'<ul class="social-cards">{items}</ul>'
    if INSTAGRAM_POSTS:
        posts = "".join(
            f'<blockquote class="instagram-media" data-instgrm-permalink="{html.escape(u, quote=True)}" data-instgrm-version="14">'
            f'<a href="{html.escape(u, quote=True)}">View this post on Instagram</a></blockquote>'
            for u in INSTAGRAM_POSTS[:3]
        )
        out += f'<div class="insta-posts" data-embed="https://www.instagram.com/embed.js">{posts}</div>'
    return out


def nav_html(current, prefix):
    items = []
    for key, label, href in NAV:
        cur = ' aria-current="page"' if key == current else ""
        items.append(f'<li><a href="{prefix}{href}"{cur}>{label}</a></li>')
    return "\n          ".join(items)


LAYOUT = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title_full}</title>
  <meta name="description" content="{description}">
  <link rel="canonical" href="{canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="{title_full}">
  <meta property="og:description" content="{description}">
  <meta property="og:url" content="{canonical}">
  <meta name="theme-color" content="#22359A">
  <link rel="icon" href="{prefix}assets/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="{prefix}assets/fonts/bricolage-grotesque.woff" as="font" type="font/woff" crossorigin>
  <link rel="stylesheet" href="{prefix}assets/site.css">{verification}
  <script>document.documentElement.classList.add('js');</script>
</head>
<body id="top">
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="wrap">
      <a class="brand" href="{prefix}index.html"><svg class="brand-fish" viewBox="0 0 48 28" aria-hidden="true" focusable="false"><path d="M46 14C40 3 22 2 12 12L3 5l3 9-3 9 9-7c10 10 28 9 34-2Z" fill="#6E95D9"/><path d="M16 9q9-5 20 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/><circle cx="37" cy="12" r="2.6" fill="#8A4A22"/></svg>Trent W. Shuey</a>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        Menu
      </button>
      <nav class="nav" id="site-nav" aria-label="Main">
        <ul>
          {nav}
        </ul>
      </nav>
    </div>
  </header>

  <main id="main">
{body}
  </main>

  <footer class="site-footer">
    {footerband}
    <div class="wrap">
      <div class="footer-grid">
        <div>
          <p class="footer-name">Trent W. Shuey, D.M.A.</p>
          <p>Assistant Director of Bands and Senior Instructor of Percussion<br>Angelo State University, San Angelo, Texas</p>
          <p><a href="mailto:{email}">{email}</a><br>Office {office_phone}</p>
        </div>
        <div>
          <h2>Students</h2>
          <ul>
            <li><a href="{prefix}resources.html">Studio resources</a></li>
            <li><a href="{prefix}handbook.html">Studio handbook</a></li>
            <li><a href="{prefix}rudiments.html">Rudiments</a></li>
            <li><a href="{prefix}scales.html">Scales and arpeggios</a></li>
            <li><a href="{prefix}latin.html">Latin grooves</a></li>
            <li><a href="{prefix}studio.html">Studio info</a></li>
            <li><a href="{prefix}auditions.html">Auditions</a></li>
            <li><a href="{prefix}alumni.html">Alumni</a></li>
          </ul>
        </div>
        <div>
          <h2>More</h2>
          <ul>
            <li><a href="{prefix}events.html">Events</a></li>
            <li><a href="{prefix}jam.html">Jam sessions</a></li>
            <li><a href="{prefix}programs.html">Concert programs</a></li>
            <li><a href="{prefix}research.html">Research</a></li>
            <li><a href="{prefix}press.html">Press</a></li>
            <li><a href="{prefix}composers.html">Writing for percussion</a></li>
            <li><a href="{prefix}recital.html">Book a marimba recital</a></li>
            <li><a href="{prefix}shuey-hikes.html">Shuey Hikes</a></li>
          </ul>
        </div>
        <div>
          <h2>Elsewhere</h2>
          <ul>
            <li><a href="{instagram}">Instagram</a></li>
            <li><a href="{youtube}">YouTube</a></li>
            <li><a href="{soundcloud}">SoundCloud</a></li>
            <li><a href="{asu_profile}">ASU faculty profile</a></li>
            <li><a href="{prefix}cv.html">CV and teaching philosophy</a></li>
          </ul>
          <h2 class="footer-sub">Family</h2>
          <ul>
            <li><a href="{prefix}paul.html">Paul Thomas Shuey</a></li>
            <li><a href="{prefix}christmas.html">Christmas recordings</a></li>
          </ul>
        </div>
      </div>
      <p class="footer-base"><span>&copy; 2026 Trent W. Shuey</span><span>Colors and brushwork after a painting by <a href="{prefix}paul.html">Paul Thomas Shuey</a></span>{visits}<a class="footer-top" href="#top">Back to top</a></p>
    </div>
  </footer>
{analytics}  <a class="to-top" href="#top" aria-label="Back to top"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5l-7 7m7-7l7 7M12 5v14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Top</span></a>
  <script src="{prefix}assets/site.js" defer></script>
</body>
</html>
"""


def parse(path):
    text = path.read_text(encoding="utf-8")
    m = re.match(r"\s*<!--(.*?)-->\s*", text, re.S)
    meta = {}
    for line in m.group(1).strip().splitlines():
        key, _, value = line.partition(":")
        meta[key.strip()] = value.strip()
    return meta, text[m.end():]


FOOTER_BAND = paint.footer_band()


def build():
    written = []
    events = upcoming_events()
    write_ics(events)
    if GOATCOUNTER_CODE:
        base = f"https://{GOATCOUNTER_CODE}.goatcounter.com"
        analytics = f'  <script data-goatcounter="{base}/count" async src="https://gc.zgo.at/count.js"></script>\n'
        visits = f'<span class="visits" data-total="{base}/counter/TOTAL.json" hidden></span>'
    else:
        analytics = visits = ""
    verification = (
        f'\n  <meta name="google-site-verification" content="{SITE_VERIFICATION}">' if SITE_VERIFICATION else ""
    )
    for path in sorted(PAGES.glob("*.html")):
        meta, body = parse(path)
        slug = path.stem
        prefix = meta.get("prefix", "")
        body = (
            body.replace("{{marimba}}", marimba_svg())
            .replace("{{keys}}", paint.page_band(slug))
            .replace("{{herocanvas}}", paint.hero_canvas())
            .replace("{{videolibrary}}", video_library() if "{{videolibrary}}" in body else "")
            .replace("{{videocount}}", str(video_count()))
            .replace("{{events}}", events_page(events, prefix) if "{{events}}" in body else "")
            .replace("{{events_next}}", events_next(events, prefix) if "{{events_next}}" in body else "")
            .replace("{{events_jam}}",
                     events_next([e for e in events if "FiFi" in e["venue"]], prefix, limit=2)
                     if "{{events_jam}}" in body else "")
            .replace("{{jam_tunes}}", jam.tunes_table() if "{{jam_tunes}}" in body else "")
            .replace("{{latin_grooves}}", latin.page() if "{{latin_grooves}}" in body else "")
            .replace("{{latin_tabs}}", latin.tabs() if "{{latin_tabs}}" in body else "")
            .replace("{{events_jazz}}",
                     events_next([e for e in events if "jazz" in e["group"].lower()], prefix)
                     if "{{events_jazz}}" in body else "")
            .replace("{{sessions_jazz}}", recent_sessions("jazz", prefix) if "{{sessions_jazz}}" in body else "")
            .replace("{{programs}}", program_archive(prefix) if "{{programs}}" in body else "")
            .replace("{{rudiments}}", rudiments_render.page() if "{{rudiments}}" in body else "")
            .replace("{{social}}", social_section() if "{{social}}" in body else "")
            .replace("{{rudiment_jump}}", rudiments_render.jump_links() if "{{rudiment_jump}}" in body else "")
            .replace("{{scales_data}}", scales_render.data_script() if "{{scales_data}}" in body else "")
            .replace("{{scale_keys_major}}", scales_render.key_buttons("major") if "{{scale_keys_major}}" in body else "")
            .replace("{{scale_keys_minor}}", scales_render.key_buttons("minor") if "{{scale_keys_minor}}" in body else "")
        )
        body = re.sub(r"\{\{video:([\w-]{11})\}\}", lambda m: video_figure(m.group(1)), body)
        body = re.sub(r"\{\{img:([\w-]+)(?:\|(\w+))?\}\}",
                      lambda m: img_tag(m.group(1), prefix, eager=(m.group(2) == "eager")), body)
        body = re.sub(r"\{\{gallery:([\w,-]+)\}\}",
                      lambda m: gallery(m.group(1).split(","), prefix), body)
        for key, value in LINKS.items():
            body = body.replace("{{" + key + "}}", value)
        title = meta["title"]
        title_full = title if meta.get("full_title") == "yes" else f"{title} | {NAME}"
        page_url = SITE_URL + ("/" if slug == "index" else f"/{slug}")
        out = LAYOUT.format(
            title_full=html.escape(title_full),
            description=html.escape(meta["description"]),
            canonical=page_url,
            prefix=prefix,
            nav=nav_html(meta.get("nav", ""), prefix),
            body=body.rstrip(),
            analytics=analytics,
            visits=visits,
            verification=verification,
            footerband=FOOTER_BAND,
            **LINKS,
        )
        if "—" in out:
            raise SystemExit(f"Em dash found in {path.name}; replace it before publishing.")
        (ROOT / f"{slug}.html").write_text(out, encoding="utf-8")
        if slug != "404":
            written.append(page_url)
    sitemap = "\n".join(f"  <url><loc>{u}</loc></url>" for u in written)
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{sitemap}\n</urlset>\n",
        encoding="utf-8",
    )
    print(f"Built {len(written) + 1} pages.")


if __name__ == "__main__":
    build()
