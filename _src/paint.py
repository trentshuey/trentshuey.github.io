"""Painted brushstrokes after Paul Thomas Shuey's fish painting.

Everything here is generated at build time from a seed, so each page gets its
own composition and the same page always looks the same. Colors are taken from
the painting: cadmium yellow, vermilion, orange, leaf green, cobalt, ultramarine
and burnt sienna on white paper.
"""
import math
import random

PALETTE = {
    "yellow": "#F5C518",
    "red": "#E1261C",
    "orange": "#F08A1C",
    "green": "#5DAE34",
    "cobalt": "#6E95D9",
    "ultramarine": "#22359A",
    "sienna": "#8A4A22",
}
ORDER = ["yellow", "red", "ultramarine", "green", "orange", "cobalt", "sienna"]


def _mix(hex_color, other, t):
    a = [int(hex_color[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(other[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(x + (y - x) * t):02X}" for x, y in zip(a, b))


class Wobble:
    """Smooth 1-D noise from a few random sine waves."""

    def __init__(self, rng, amp, scale=1.0):
        self.waves = [(rng.uniform(0.004, 0.02) * scale, rng.uniform(0, 6.28), rng.uniform(0.3, 1)) for _ in range(3)]
        self.amp = amp

    def __call__(self, x):
        total = sum(w for _, _, w in self.waves)
        return self.amp * sum(w * math.sin(f * x + p) for f, p, w in self.waves) / total


def _smooth(points, closed=False):
    """Catmull-Rom spline through points, as SVG cubic segments."""
    if len(points) < 3:
        return "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in points)
    pts = points[:]
    out = [f"M{pts[0][0]:.1f} {pts[0][1]:.1f}"]
    n = len(pts)
    rng_end = n if closed else n - 1
    for i in range(rng_end):
        p0 = pts[(i - 1) % n] if (closed or i > 0) else pts[i]
        p1 = pts[i]
        p2 = pts[(i + 1) % n]
        p3 = pts[(i + 2) % n] if (closed or i + 2 < n) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        out.append(f"C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}")
    if closed:
        out.append("Z")
    return " ".join(out)


def ribbon(rng, x0, x1, y, thick, color, streaks=True, wave=10):
    """A long horizontal brushstroke with tapered, ragged ends and bristle streaks."""
    centre = Wobble(rng, wave, 0.7)
    edge_t = Wobble(rng, thick * 0.12, 2.5)
    edge_b = Wobble(rng, thick * 0.12, 2.5)
    step = 18
    xs = [x0 + i * step for i in range(int((x1 - x0) / step) + 1)] + [x1]
    def half(x):
        u = (x - x0) / max(1, x1 - x0)
        taper = min(1, u * 9) * min(1, (1 - u) * 7 + 0.15)
        return thick / 2 * (0.35 + 0.65 * taper)
    top = [(x, y + centre(x) - half(x) + edge_t(x)) for x in xs]
    bot = [(x, y + centre(x) + half(x) + edge_b(x)) for x in reversed(xs)]
    # dry-brush fingers at the trailing end
    tip = []
    fingers = rng.randint(2, 4)
    end_top, end_bot = top[-1][1], bot[0][1]
    for k in range(fingers):
        fy = end_top + (end_bot - end_top) * (k + 0.5) / fingers
        tip.append((x1 + rng.uniform(10, 34), fy))
        tip.append((x1 + rng.uniform(-6, 4), fy + (end_bot - end_top) / fingers * 0.45))
    body = _smooth(top) + " L" + " L".join(f"{x:.1f} {yy:.1f}" for x, yy in tip) + " " + _smooth(bot)[1:].replace("M", "L", 1) + " Z"
    parts = [f'<path d="{body}" fill="{color}"/>']
    if streaks:
        for _ in range(rng.randint(3, 5)):
            off = rng.uniform(-0.35, 0.35) * thick
            sx0 = x0 + rng.uniform(0, (x1 - x0) * 0.3)
            sx1 = x1 - rng.uniform(0, (x1 - x0) * 0.3)
            w = Wobble(rng, 2.5, 3)
            pts = [(x, y + centre(x) + off + w(x)) for x in range(int(sx0), int(sx1), 24)]
            if len(pts) < 3:
                continue
            tone = _mix(color, "#FFFFFF", 0.35) if rng.random() < 0.6 else _mix(color, "#000000", 0.18)
            parts.append(
                f'<path d="{_smooth(pts)}" fill="none" stroke="{tone}" stroke-width="{rng.uniform(1.2, 3.2):.1f}" '
                f'stroke-linecap="round" opacity="{rng.uniform(0.35, 0.6):.2f}"/>'
            )
    return "".join(parts)


def comb(rng, x0, x1, y, length, angle, color, gap=13, width=7):
    """A row of short feathered marks, like the fins and grasses in the painting."""
    out = []
    x = x0
    wob = Wobble(rng, 6, 1.5)
    while x < x1:
        L = length * rng.uniform(0.7, 1.15)
        a = math.radians(angle + rng.uniform(-8, 8))
        bx, by = x, y + wob(x)
        tx, ty = bx + L * math.cos(a), by - L * math.sin(a)
        w = min(width, L * 0.2) * rng.uniform(0.7, 1.15)
        nx, ny = math.sin(a) * w / 2, math.cos(a) * w / 2
        bend = rng.uniform(0.6, 1.6)
        cx, cy = (bx + tx) / 2 + nx * bend * 1.6, (by + ty) / 2 + ny * bend * 1.6
        out.append(
            f"M{bx - nx:.1f} {by - ny:.1f} Q{cx - nx:.1f} {cy - ny:.1f} {tx:.1f} {ty:.1f} "
            f"Q{cx + nx:.1f} {cy + ny:.1f} {bx + nx:.1f} {by + ny:.1f}Z"
        )
        x += gap * rng.uniform(0.8, 1.25)
    return f'<path d="{" ".join(out)}" fill="{color}"/>'


def dashes(rng, x0, x1, y, color, size=9, gap=22):
    """A dotted line of fat dabs, like the red and brown dashes near the bottom of the painting."""
    out = []
    x = x0
    wob = Wobble(rng, 5, 1.2)
    while x < x1:
        rx, ry = size * rng.uniform(0.8, 1.4), size * rng.uniform(0.45, 0.7)
        rot = rng.uniform(-14, 14)
        out.append(
            f'<ellipse cx="{x:.1f}" cy="{y + wob(x):.1f}" rx="{rx:.1f}" ry="{ry:.1f}" transform="rotate({rot:.0f} {x:.1f} {y + wob(x):.1f})"/>'
        )
        x += gap * rng.uniform(0.8, 1.2)
    return f'<g fill="{color}">{"".join(out)}</g>'


def fish(rng, cx, cy, length, color, fin, eye="#8A4A22", flip=False):
    """One of Paul's fish: a soft oval body, a tail, a dark eye and a feathered fin."""
    h = length * 0.42
    nose = (cx + length / 2, cy)
    tail = (cx - length / 2, cy)
    body = (
        f"M{nose[0]:.1f} {nose[1]:.1f} "
        f"C{nose[0] - length * 0.15:.1f} {cy - h:.1f} {tail[0] + length * 0.2:.1f} {cy - h * 0.95:.1f} {tail[0]:.1f} {cy - 2:.1f} "
        f"L{tail[0] - length * 0.18:.1f} {cy - h * 0.55:.1f} L{tail[0] - length * 0.12:.1f} {cy:.1f} L{tail[0] - length * 0.18:.1f} {cy + h * 0.55:.1f} "
        f"L{tail[0]:.1f} {cy + 2:.1f} "
        f"C{tail[0] + length * 0.2:.1f} {cy + h * 0.95:.1f} {nose[0] - length * 0.15:.1f} {cy + h:.1f} {nose[0]:.1f} {nose[1]:.1f}Z"
    )
    parts = [f'<path d="{body}" fill="{color}"/>']
    # lighter scales streak
    parts.append(
        f'<path d="M{cx - length * 0.28:.1f} {cy - h * 0.42:.1f} Q{cx:.1f} {cy - h * 0.62:.1f} {cx + length * 0.24:.1f} {cy - h * 0.44:.1f}" '
        f'fill="none" stroke="#FFFFFF" stroke-width="{max(2, length * 0.02):.1f}" opacity="0.5" stroke-linecap="round"/>'
    )
    parts.append(comb(rng, cx - length * 0.3, cx + length * 0.22, cy - h * 0.82, length * 0.16, 62, fin, gap=length * 0.07, width=length * 0.035))
    parts.append(f'<ellipse cx="{nose[0] - length * 0.17:.1f}" cy="{cy - h * 0.12:.1f}" rx="{length * 0.045:.1f}" ry="{length * 0.038:.1f}" fill="{eye}"/>')
    g = "".join(parts)
    if flip:
        return f'<g transform="translate({2 * cx:.1f} 0) scale(-1 1)">{g}</g>'
    return f"<g>{g}</g>"


def _filter(fid, seed, scale=7, freq="0.022 0.07"):
    """Ragged edges (displacement) plus dry-brush streaks (horizontal grain that thins the paint)."""
    return (
        f'<filter id="{fid}" x="-4%" y="-25%" width="108%" height="150%" color-interpolation-filters="sRGB">'
        f'<feTurbulence type="fractalNoise" baseFrequency="{freq}" numOctaves="3" seed="{seed % 997}" result="n"/>'
        f'<feDisplacementMap in="SourceGraphic" in2="n" scale="{scale}" xChannelSelector="R" yChannelSelector="G" result="d"/>'
        f'<feTurbulence type="fractalNoise" baseFrequency="0.005 0.3" numOctaves="2" seed="{(seed * 7) % 991}" result="g"/>'
        f'<feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.9 1.9" result="ga"/>'
        f'<feComposite in="d" in2="ga" operator="in"/></filter>'
    )


def _seed(text):
    return sum((i + 1) * ord(c) for i, c in enumerate(text)) or 1


def _colors(rng, n):
    cols = ORDER[:]
    rng.shuffle(cols)
    return [PALETTE[c] for c in cols[:n]]


def page_band(slug):
    """The painted strip under every inner page title: unique to the page, stable between builds."""
    seed = _seed(slug)
    rng = random.Random(seed)
    W, H = 1600, 190
    c = _colors(rng, 7)
    fid = f"rough-{slug}"
    parts = []
    a_end = rng.uniform(700, 1100)
    parts.append(ribbon(rng, -60, a_end, rng.uniform(48, 62), rng.uniform(46, 60), c[0], wave=14))
    b_start = rng.uniform(240, 560)
    parts.append(ribbon(rng, b_start, W + 60, rng.uniform(112, 128), rng.uniform(48, 62), c[1], wave=16))
    s0 = rng.uniform(0, 700)
    parts.append(ribbon(rng, s0, s0 + rng.uniform(320, 560), rng.uniform(84, 96), rng.uniform(16, 24), c[2], wave=12))
    k0 = rng.uniform(950, 1250)
    parts.append(comb(rng, k0, k0 + rng.uniform(220, 330), rng.uniform(52, 64), 48, rng.choice([56, 62, 116, 122]), c[3], gap=15, width=10))
    d0 = rng.uniform(40, 460)
    parts.append(dashes(rng, d0, d0 + rng.uniform(240, 400), rng.uniform(162, 172), c[4], size=11, gap=26))
    k1 = rng.uniform(1120, 1380)
    parts.append(comb(rng, k1, k1 + 210, 180, 34, 68, c[5], gap=13, width=8))
    k2 = rng.uniform(-20, 260)
    parts.append(comb(rng, k2, k2 + 160, 22, 30, 112, c[6], gap=12, width=7))
    if slug == "paul":
        # Dad's fish, swimming through his own colors
        parts.append(fish(rng, 1180, 70, 150, PALETTE["cobalt"], PALETTE["ultramarine"]))
        parts.append(fish(rng, 640, 150, 110, PALETTE["yellow"], PALETTE["sienna"], flip=True))
    return (
        f'<svg class="strokes" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">'
        f"<defs>{_filter(fid, seed)}</defs><g filter=\"url(#{fid})\">{''.join(parts)}</g></svg>"
    )


def hero_canvas():
    """The home page painting: a strip of strokes and a fish above the name, another below the marimba."""
    rng = random.Random(1947)
    P = PALETTE
    top = (
        f'<g class="paint paint-1">{ribbon(rng, -80, 760, 50, 46, P["yellow"])}{ribbon(rng, 520, 1700, 34, 38, P["red"])}</g>'
        f'<g class="paint paint-2">{ribbon(rng, 200, 1260, 98, 20, P["ultramarine"], wave=16)}'
        f'{comb(rng, 40, 300, 138, 26, 64, P["sienna"], gap=12, width=6)}{comb(rng, 980, 1180, 132, 36, 116, P["orange"], gap=13, width=8)}</g>'
        f'<g class="paint paint-5 fish">{fish(rng, 1385, 110, 170, P["cobalt"], P["ultramarine"])}</g>'
    )
    bottom = (
        f'<g class="paint paint-3">{comb(rng, -20, 420, 64, 42, 66, P["green"], gap=14, width=9)}'
        f'{ribbon(rng, 300, 1250, 96, 32, P["cobalt"])}{dashes(rng, 980, 1620, 54, P["red"], size=10)}</g>'
        f'<g class="paint paint-4">{ribbon(rng, -60, 620, 132, 26, P["yellow"])}{comb(rng, 1240, 1620, 140, 32, 116, P["ultramarine"], gap=12, width=7)}</g>'
    )
    return (
        '<svg class="hero-strip hero-strip-top" viewBox="0 0 1600 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">'
        f"<defs>{_filter('rough-hero', 1947, 9)}</defs><g filter=\"url(#rough-hero)\">{top}</g></svg>"
        '<svg class="hero-strip hero-strip-bottom" viewBox="0 0 1600 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">'
        f"<defs>{_filter('rough-hero-2', 1983, 9)}</defs><g filter=\"url(#rough-hero-2)\">{bottom}</g></svg>"
    )


def footer_band():
    rng = random.Random(1971)
    W, H = 1600, 120
    P = PALETTE
    parts = [
        ribbon(rng, -60, 900, 40, 34, P["yellow"]),
        ribbon(rng, 640, 1680, 70, 38, P["red"]),
        comb(rng, 60, 520, 102, 28, 64, P["green"], gap=12, width=7),
        dashes(rng, 1000, 1560, 108, P["sienna"], size=8),
        fish(rng, 330, 62, 120, P["orange"], P["red"], flip=True),
    ]
    return (
        f'<svg class="strokes strokes-footer" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">'
        f"<defs>{_filter('rough-footer', 1971)}</defs><g filter=\"url(#rough-footer)\">{''.join(parts)}</g></svg>"
    )


def marimba_bar_colors(n=24):
    """Rosewood tones: burnt sienna warmed toward vermilion and orange, bar by bar."""
    rng = random.Random(118)
    cols = []
    for _ in range(n):
        base = _mix(PALETTE["sienna"], rng.choice([PALETTE["red"], PALETTE["orange"]]), rng.uniform(0.05, 0.45))
        cols.append(_mix(base, "#000000", rng.uniform(0, 0.12)))
    return cols


if __name__ == "__main__":
    import sys
    print(page_band(sys.argv[1] if len(sys.argv) > 1 else "about")[:400])
