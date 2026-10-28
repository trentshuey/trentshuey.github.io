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

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from videos import ALL as VIDEOS, SECTIONS as VIDEO_SECTIONS  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ROOT / "_src" / "pages"
SITE_URL = "https://www.trentshuey.com"
NAME = "Dr. Trent W. Shuey"

LINKS = {
    "email": "trent.shuey@angelo.edu",
    "office_phone": "325-486-6036",
    "youtube": "https://www.youtube.com/@TrentShuey",
    "soundcloud": "https://soundcloud.com/trentshuey",
    "asu_profile": "https://www.angelo.edu/live/profiles/3140-trent-shuey",
    "music_form": "https://www.angelo.edu/departments/visual-performing-arts/music/prospective-music-student-form/",
    "dissertation": "https://hdl.handle.net/2142/106958",
}

NAV = [
    ("about", "About", "about.html"),
    ("percussion", "Percussion", "percussion.html"),
    ("jazz", "Jazz", "jazz.html"),
    ("performances", "Performances", "performances.html"),
    ("research", "Research", "research.html"),
    ("videos", "Videos", "videos.html"),
    ("press", "Press", "press.html"),
    ("contact", "Contact", "contact.html"),
]


def marimba_svg():
    """A marimba seen from above: 24 bars, cord holes, cords and frame rails."""
    n, x0, pitch, width, center = 24, 30, 47.5, 35, 128
    lengths = [222 * (0.976 ** i) for i in range(n)]
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
            f'height="{length:.1f}" rx="4"/><circle class="hole" cx="{cx:.1f}" cy="{y1:.1f}" r="3.2"/>'
            f'<circle class="hole" cx="{cx:.1f}" cy="{y2:.1f}" r="3.2"/></g>'
        )
    rails = "".join(
        f'<polyline class="rail" points="{" ".join(p)}" style="stroke:var(--navy-deep);stroke-width:16;fill:none;stroke-linecap:round"/>'
        for p in (upper, lower)
    )
    cords = "".join(f'<polyline class="cord" points="{" ".join(p)}"/>' for p in (upper, lower))
    return (
        '<svg class="marimba" viewBox="0 0 1200 256" aria-hidden="true" focusable="false">'
        + rails + cords + "".join(bars) + "</svg>"
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
  <meta name="theme-color" content="#0A1B33">
  <link rel="icon" href="{prefix}assets/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,100..900;1,62..125,100..900&display=swap">
  <link rel="stylesheet" href="{prefix}assets/site.css">
  <script>document.documentElement.classList.add('js');</script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="wrap">
      <a class="brand" href="{prefix}index.html">Trent W. Shuey</a>
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
    <div class="wrap">
      <div class="footer-grid">
        <div>
          <p class="footer-name">Trent W. Shuey, D.M.A.</p>
          <p>Assistant Director of Bands and Senior Instructor of Percussion<br>Angelo State University, San Angelo, Texas</p>
          <p><a href="mailto:{email}">{email}</a><br>Office {office_phone}</p>
        </div>
        <div>
          <h2>Elsewhere</h2>
          <ul>
            <li><a href="{youtube}">YouTube</a></li>
            <li><a href="{soundcloud}">SoundCloud</a></li>
            <li><a href="{asu_profile}">ASU faculty profile</a></li>
            <li><a href="{prefix}cv.html">CV and teaching philosophy</a></li>
          </ul>
        </div>
        <div>
          <h2>Family</h2>
          <ul>
            <li><a href="{prefix}paul.html">Paul Thomas Shuey</a></li>
            <li><a href="{prefix}christmas.html">Christmas recordings</a></li>
          </ul>
        </div>
      </div>
      <p class="footer-base">&copy; 2026 Trent W. Shuey</p>
    </div>
  </footer>
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


def build():
    written = []
    for path in sorted(PAGES.glob("*.html")):
        meta, body = parse(path)
        slug = path.stem
        prefix = meta.get("prefix", "")
        body = (
            body.replace("{{marimba}}", marimba_svg())
            .replace("{{keys}}", keys_svg())
            .replace("{{videolibrary}}", video_library() if "{{videolibrary}}" in body else "")
            .replace("{{videocount}}", str(video_count()))
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
