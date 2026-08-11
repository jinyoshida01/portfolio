#!/usr/bin/env python3
"""
Generates the placeholder artwork for the portfolio.
Deterministic (fixed seeds) so re-running produces identical files.

These are stand-ins keyed to each project's discipline. Replace them with real
exports — keep the filenames and nothing else needs touching.
"""
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

INK = "#08080A"     # the ground — matches --paper in the CSS
BONE = "#EFEBE3"    # the mark colour — matches --ink
EMBER = "#FA3C3C"
MOSS = "#8FA68E"
DUSK = "#5B6BA8"
CLAY = "#C9A227"


def grain(id_="grain", opacity=0.16, freq=0.9):
    return f'''
  <filter id="{id_}" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="{freq}" numOctaves="3" stitchTiles="stitch" result="n"/>
    <feColorMatrix in="n" type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="linear" slope="{opacity}"/></feComponentTransfer>
  </filter>'''


def wrap(w, h, body, defs=""):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img">
  <defs>{defs}{grain()}</defs>
  {body}
  <rect width="{w}" height="{h}" filter="url(#grain)" opacity="0.55"/>
</svg>
'''


def write(relpath, svg):
    """relpath is relative to the project root, e.g. work/firefly/images/cover.svg"""
    path = os.path.join(ROOT, relpath)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(svg)
    print("wrote", relpath, len(svg), "bytes")


REAL_EXT = (".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif",
            ".mp4", ".webm", ".mov", ".m4v")


def has_real_work(slug):
    d = os.path.join(ROOT, "work", slug, "images")
    if not os.path.isdir(d):
        return False
    return any(f.lower().endswith(REAL_EXT) for f in os.listdir(d))


def gallery_stub(slug, name, svg):
    """A placeholder gallery image, written only into an empty project."""
    if has_real_work(slug):
        return
    write("work/%s/images/%s" % (slug, name), svg)


def cover(slug, svg):
    """Write a placeholder cover — but never into a project that already has
    real work in it.

    This guard exists because it was missing once. Re-running this script put a
    placeholder cover.svg back into every project after the real photographs had
    landed. The build correctly preferred cover.jpg, so the covers looked fine —
    but the abandoned cover.svg was no longer the chosen cover, which meant it
    fell through into the gallery as a stray grey panel in the middle of real
    work. Nothing errored; it just quietly got worse."""
    if has_real_work(slug):
        print("skipped work/%s — real work already there" % slug)
        return
    write("work/%s/images/cover.svg" % slug, svg)


def label(w, h, text, y=0.93, size=26, op=0.5):
    return (f'<text x="{w*0.045:.0f}" y="{h*y:.0f}" font-family="ui-monospace,Menlo,monospace" '
            f'font-size="{size}" fill="{BONE}" opacity="{op}" letter-spacing="6">{text}</text>')


# ---------------------------------------------------------- publication design
def publication(w=1600, h=1200, tag="PUBLICATION"):
    """Stacked spreads with a column grid — brochures, catalogues."""
    p = [f'<rect width="{w}" height="{h}" fill="#0C0C0F"/>']
    for i, (sx, sy, sw, rot, op) in enumerate([
            (0.10, 0.16, 0.40, -6, 0.55), (0.30, 0.26, 0.42, 3, 0.75), (0.52, 0.14, 0.40, -2, 1.0)]):
        x, y, ww = w * sx, h * sy, w * sw
        hh = ww * 0.72
        p.append(f'<g transform="rotate({rot} {x+ww/2:.0f} {y+hh/2:.0f})" opacity="{op}">')
        p.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="{ww:.0f}" height="{hh:.0f}" fill="{BONE}"/>')
        p.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="{ww*0.5:.0f}" height="{hh:.0f}" '
                 f'fill="{INK}" opacity="0.06"/>')
        if i == 2:
            p.append(f'<rect x="{x+ww*0.06:.0f}" y="{y+hh*0.10:.0f}" width="{ww*0.36:.0f}" '
                     f'height="{hh*0.22:.0f}" fill="{EMBER}"/>')
        for c in range(2):
            for ln in range(11):
                lw = ww * 0.38 * (0.5 + 0.5 * abs(math.sin(ln * 1.3 + c)))
                p.append(f'<rect x="{x + ww*(0.06 + c*0.48):.0f}" y="{y + hh*(0.40 + ln*0.045):.0f}" '
                         f'width="{lw:.0f}" height="{hh*0.016:.0f}" fill="{INK}" opacity="0.55"/>')
        p.append('</g>')
    p.append(label(w, h, tag))
    return wrap(w, h, "\n  ".join(p))


# ---------------------------------------------------------- 3d render library
def renders(w=1600, h=1200, tag="3D RENDER LIBRARY"):
    """A contact sheet of devices at 45-degree increments."""
    defs = f'''<linearGradient id="dev" x1="0" y1="0" x2="0.6" y2="1">
    <stop offset="0" stop-color="#3A3A44"/><stop offset="1" stop-color="#15151A"/></linearGradient>
  <radialGradient id="spot" cx="0.5" cy="0.35" r="0.7">
    <stop offset="0" stop-color="{EMBER}" stop-opacity="0.28"/>
    <stop offset="1" stop-color="{EMBER}" stop-opacity="0"/></radialGradient>'''
    p = [f'<rect width="{w}" height="{h}" fill="#0A0A0D"/>',
         f'<rect width="{w}" height="{h}" fill="url(#spot)"/>']
    cols, rows = 4, 2
    cw, ch = w * 0.84 / cols, h * 0.62 / rows
    for r in range(rows):
        for c in range(cols):
            x = w * 0.08 + c * cw
            y = h * 0.14 + r * ch
            a = math.radians((r * cols + c) * 45)
            skew = math.cos(a) * 0.28
            bw, bh = cw * 0.42, ch * 0.62
            p.append(f'<g transform="translate({x + cw*0.5:.0f} {y + ch*0.5:.0f})">')
            p.append(f'<rect x="{-bw/2:.0f}" y="{-bh/2:.0f}" width="{bw:.0f}" height="{bh:.0f}" rx="{bw*0.14:.0f}" '
                     f'fill="url(#dev)" transform="skewX({skew*20:.1f})"/>')
            p.append(f'<rect x="{-bw*0.32:.0f}" y="{-bh*0.34:.0f}" width="{bw*0.64:.0f}" height="{bh*0.42:.0f}" '
                     f'fill="{EMBER}" opacity="{0.25 + 0.1*(c%2)}" transform="skewX({skew*20:.1f})"/>')
            p.append(f'<ellipse cx="0" cy="{bh*0.62:.0f}" rx="{bw*0.6:.0f}" ry="{bh*0.06:.0f}" '
                     f'fill="{INK}" opacity="0.5"/>')
            p.append('</g>')
            p.append(f'<text x="{x + cw*0.5:.0f}" y="{y + ch*0.94:.0f}" text-anchor="middle" '
                     f'font-family="ui-monospace,Menlo,monospace" font-size="17" fill="{BONE}" '
                     f'opacity="0.4">{(r*cols+c)*45:03d}°</text>')
    p.append(label(w, h, tag))
    return wrap(w, h, "\n  ".join(p), defs)


# ---------------------------------------------------------- esports brand mark
def brandmark(w=1600, h=1200, tag="BRAND MARK"):
    """A geometric insect-ish mark on a construction grid."""
    defs = f'''<radialGradient id="bg3" cx="0.5" cy="0.45" r="0.75">
    <stop offset="0" stop-color="#1B1B22"/><stop offset="1" stop-color="#08080B"/></radialGradient>'''
    p = [f'<rect width="{w}" height="{h}" fill="url(#bg3)"/>']
    cx, cy = w * 0.5, h * 0.46
    for r in (0.10, 0.20, 0.30):
        p.append(f'<circle cx="{cx}" cy="{cy}" r="{h*r:.0f}" fill="none" stroke="{BONE}" '
                 f'stroke-width="1" opacity="0.12"/>')
    p.append(f'<line x1="{cx}" y1="{h*0.10}" x2="{cx}" y2="{h*0.82}" stroke="{BONE}" stroke-width="1" opacity="0.12"/>')
    p.append(f'<line x1="{w*0.18}" y1="{cy}" x2="{w*0.82}" y2="{cy}" stroke="{BONE}" stroke-width="1" opacity="0.12"/>')
    # wings
    for s in (-1, 1):
        p.append(f'<path d="M {cx} {cy - h*0.20} '
                 f'L {cx + s*w*0.17} {cy - h*0.04} '
                 f'L {cx + s*w*0.09} {cy + h*0.22} '
                 f'L {cx} {cy + h*0.06} Z" fill="{BONE}" opacity="0.92"/>')
    p.append(f'<circle cx="{cx}" cy="{cy - h*0.055}" r="{h*0.055:.0f}" fill="{EMBER}"/>')
    p.append(f'<rect x="{w*0.5-1}" y="{cy + h*0.06}" width="2" height="{h*0.20}" fill="{EMBER}" opacity="0.6"/>')
    p.append(label(w, h, tag))
    return wrap(w, h, "\n  ".join(p), defs)


# ---------------------------------------------------------- web / 3d viewer
def viewer(w=1600, h=1200, tag="WEB 3D VIEWER"):
    """A browser frame holding a wireframe product."""
    p = [f'<rect width="{w}" height="{h}" fill="#0B0B0E"/>']
    bx, by, bw, bh = w * 0.09, h * 0.13, w * 0.82, h * 0.68
    p.append(f'<rect x="{bx:.0f}" y="{by:.0f}" width="{bw:.0f}" height="{bh:.0f}" fill="#111116" '
             f'stroke="{BONE}" stroke-opacity="0.16"/>')
    p.append(f'<rect x="{bx:.0f}" y="{by:.0f}" width="{bw:.0f}" height="{h*0.055:.0f}" fill="{BONE}" opacity="0.07"/>')
    for i in range(3):
        p.append(f'<circle cx="{bx + w*0.028 + i*w*0.022:.0f}" cy="{by + h*0.0275:.0f}" r="7" '
                 f'fill="{BONE}" opacity="0.28"/>')
    # wireframe cuboid
    ox, oy, s = bx + bw * 0.36, by + bh * 0.52, min(bw, bh) * 0.30
    pts = [(-1, -1.4), (1, -1.4), (1, 1.4), (-1, 1.4)]
    off = (s * 0.42, -s * 0.30)
    front = [(ox + x * s * 0.62, oy + y * s * 0.5) for x, y in pts]
    back = [(x + off[0], y + off[1]) for x, y in front]
    def poly(pp, op, fill="none"):
        d = " ".join(f"{x:.0f},{y:.0f}" for x, y in pp)
        return f'<polygon points="{d}" fill="{fill}" stroke="{EMBER}" stroke-width="2" opacity="{op}"/>'
    p.append(poly(back, 0.45))
    p.append(poly(front, 0.95, "rgba(232,93,61,0.10)"))
    for (x1, y1), (x2, y2) in zip(front, back):
        p.append(f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" '
                 f'stroke="{EMBER}" stroke-width="2" opacity="0.6"/>')
    # config panel
    for i in range(5):
        p.append(f'<rect x="{bx + bw*0.68:.0f}" y="{by + bh*(0.18 + i*0.12):.0f}" '
                 f'width="{bw*0.24:.0f}" height="{bh*0.07:.0f}" rx="4" fill="{BONE}" '
                 f'opacity="{0.05 + (0.16 if i == 1 else 0)}"/>')
    p.append(label(w, h, tag))
    return wrap(w, h, "\n  ".join(p))


# ---------------------------------------------------------- video / timeline
def timeline(w=1600, h=1200, tag="VIDEO EDIT"):
    """An edit timeline with keyframes."""
    p = [f'<rect width="{w}" height="{h}" fill="#0A0A0D"/>']
    p.append(f'<rect x="{w*0.08:.0f}" y="{h*0.12:.0f}" width="{w*0.84:.0f}" height="{h*0.34:.0f}" '
             f'fill="#15151A" stroke="{BONE}" stroke-opacity="0.14"/>')
    p.append(f'<polygon points="{w*0.44:.0f},{h*0.22:.0f} {w*0.56:.0f},{h*0.29:.0f} {w*0.44:.0f},{h*0.36:.0f}" '
             f'fill="{BONE}" opacity="0.75"/>')
    tracks = [(0.06, 0.62, EMBER), (0.24, 0.44, BONE), (0.10, 0.80, BONE), (0.40, 0.36, BONE)]
    for i, (st, ln, col) in enumerate(tracks):
        y = h * (0.54 + i * 0.085)
        p.append(f'<rect x="{w*0.08:.0f}" y="{y:.0f}" width="{w*0.84:.0f}" height="{h*0.055:.0f}" '
                 f'fill="{BONE}" opacity="0.05"/>')
        p.append(f'<rect x="{w*(0.08 + st*0.84):.0f}" y="{y:.0f}" width="{w*ln*0.84:.0f}" '
                 f'height="{h*0.055:.0f}" fill="{col}" opacity="{0.85 if col == EMBER else 0.22}"/>')
        for k in range(6):
            kx = w * (0.08 + st * 0.84) + w * ln * 0.84 * (k / 5)
            p.append(f'<rect x="{kx-4:.0f}" y="{y + h*0.0175:.0f}" width="8" height="8" '
                     f'fill="{BONE}" opacity="0.5" transform="rotate(45 {kx:.0f} {y + h*0.0275:.0f})"/>')
    p.append(f'<rect x="{w*0.36:.0f}" y="{h*0.50:.0f}" width="2" height="{h*0.42:.0f}" fill="{EMBER}"/>')
    p.append(label(w, h, tag, y=0.965, size=24))
    return wrap(w, h, "\n  ".join(p))


# ---------------------------------------------------------- photography
def photogrid(w=1600, h=1200, tag="PRODUCT PHOTOGRAPHY"):
    """A contact sheet with one frame lit."""
    defs = f'''<radialGradient id="lit" cx="0.5" cy="0.4" r="0.6">
    <stop offset="0" stop-color="{BONE}" stop-opacity="0.55"/>
    <stop offset="1" stop-color="{BONE}" stop-opacity="0.04"/></radialGradient>'''
    p = [f'<rect width="{w}" height="{h}" fill="#0B0B0E"/>']
    cols, rows = 3, 2
    cw, ch = w * 0.84 / cols, h * 0.66 / rows
    for r in range(rows):
        for c in range(cols):
            x = w * 0.08 + c * cw + cw * 0.03
            y = h * 0.13 + r * ch + ch * 0.03
            ww, hh = cw * 0.94, ch * 0.94
            hot = (r == 0 and c == 1)
            p.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="{ww:.0f}" height="{hh:.0f}" '
                     f'fill="{"#191920" if hot else "#131318"}" stroke="{BONE}" stroke-opacity="0.12"/>')
            if hot:
                p.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="{ww:.0f}" height="{hh:.0f}" fill="url(#lit)"/>')
            p.append(f'<rect x="{x + ww*0.30:.0f}" y="{y + hh*0.28:.0f}" width="{ww*0.40:.0f}" '
                     f'height="{hh*0.46:.0f}" rx="{ww*0.04:.0f}" fill="{BONE}" '
                     f'opacity="{0.72 if hot else 0.16}"/>')
            p.append(f'<ellipse cx="{x + ww*0.5:.0f}" cy="{y + hh*0.80:.0f}" rx="{ww*0.26:.0f}" '
                     f'ry="{hh*0.035:.0f}" fill="{INK}" opacity="0.55"/>')
            if hot:
                p.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="{ww:.0f}" height="{hh:.0f}" fill="none" '
                         f'stroke="{EMBER}" stroke-width="2"/>')
    p.append(label(w, h, tag))
    return wrap(w, h, "\n  ".join(p), defs)


# ---------------------------------------------------------- branding / illustration
def brandkit(w=1600, h=1200, tag="BRAND SYSTEM"):
    """Swatches, a mark and packaging silhouettes in a warmer palette."""
    p = [f'<rect width="{w}" height="{h}" fill="#0C0F0C"/>']
    for i, col in enumerate([MOSS, "#6E8B6C", CLAY, BONE, EMBER]):
        p.append(f'<rect x="{w*(0.08 + i*0.13):.0f}" y="{h*0.13:.0f}" width="{w*0.11:.0f}" '
                 f'height="{h*0.20:.0f}" fill="{col}" opacity="0.9"/>')
    p.append(f'<circle cx="{w*0.24:.0f}" cy="{h*0.60:.0f}" r="{h*0.15:.0f}" fill="{MOSS}"/>')
    p.append(f'<path d="M {w*0.17:.0f} {h*0.60:.0f} q {w*0.035:.0f} {-h*0.10:.0f} {w*0.07:.0f} 0 '
             f'q {w*0.035:.0f} {h*0.10:.0f} {w*0.07:.0f} 0" fill="none" stroke="{INK}" '
             f'stroke-width="7" stroke-linecap="round"/>')
    for i, (bw, bh) in enumerate([(0.13, 0.30), (0.10, 0.24), (0.16, 0.20)]):
        x = w * (0.46 + i * 0.16)
        y = h * 0.86 - h * bh
        p.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="{w*bw:.0f}" height="{h*bh:.0f}" '
                 f'rx="{w*0.008:.0f}" fill="{BONE}" opacity="0.92"/>')
        p.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="{w*bw:.0f}" height="{h*bh*0.30:.0f}" '
                 f'rx="{w*0.008:.0f}" fill="{MOSS}"/>')
    p.append(label(w, h, tag, op=0.42))
    return wrap(w, h, "\n  ".join(p))


# ---------------------------------------------------------- motion / kinetic type
def kinetic(w=1600, h=1200, tag="MOTION DESIGN"):
    """Offset repeated bars implying kinetic type."""
    p = [f'<rect width="{w}" height="{h}" fill="#08080B"/>']
    for i in range(9):
        t = i / 8
        y = h * (0.16 + t * 0.62)
        off = math.sin(t * 3.1) * w * 0.12
        ww = w * (0.30 + 0.34 * abs(math.cos(t * 2.4)))
        op = 0.10 + 0.75 * t
        col = EMBER if i in (3, 7) else BONE
        p.append(f'<rect x="{w*0.14 + off:.0f}" y="{y:.0f}" width="{ww:.0f}" height="{h*0.045:.0f}" '
                 f'fill="{col}" opacity="{op:.2f}"/>')
    for i in range(4):
        p.append(f'<rect x="{w*0.06:.0f}" y="{h*(0.14 + i*0.22):.0f}" width="{w*0.88:.0f}" height="1" '
                 f'fill="{BONE}" opacity="0.10"/>')
    p.append(label(w, h, tag))
    return wrap(w, h, "\n  ".join(p))


# ---------------------------------------------------------- AR filters
def arfilter(w=1600, h=1200, tag="AUGMENTED REALITY"):
    """A face-tracking mesh over a phone frame."""
    p = [f'<rect width="{w}" height="{h}" fill="#0B0B0E"/>']
    px, py, pw, ph = w * 0.36, h * 0.10, w * 0.28, h * 0.78
    p.append(f'<rect x="{px:.0f}" y="{py:.0f}" width="{pw:.0f}" height="{ph:.0f}" rx="{pw*0.09:.0f}" '
             f'fill="#131319" stroke="{BONE}" stroke-opacity="0.18"/>')
    cx, cy = px + pw / 2, py + ph * 0.42
    rx, ry = pw * 0.30, ph * 0.20
    for i in range(9):
        t = i / 8
        p.append(f'<ellipse cx="{cx:.0f}" cy="{cy:.0f}" rx="{rx*(0.2+0.8*t):.0f}" ry="{ry:.0f}" '
                 f'fill="none" stroke="{EMBER}" stroke-width="1.2" opacity="{0.55 - t*0.3:.2f}"/>')
    for i in range(9):
        t = i / 8
        p.append(f'<ellipse cx="{cx:.0f}" cy="{cy:.0f}" rx="{rx:.0f}" ry="{ry*(0.2+0.8*t):.0f}" '
                 f'fill="none" stroke="{BONE}" stroke-width="1.2" opacity="{0.35 - t*0.18:.2f}"/>')
    for i, col in enumerate([EMBER, DUSK, MOSS, CLAY]):
        p.append(f'<rect x="{px + pw*0.12 + i*pw*0.20:.0f}" y="{py + ph*0.80:.0f}" '
                 f'width="{pw*0.14:.0f}" height="{pw*0.14:.0f}" rx="{pw*0.03:.0f}" fill="{col}" opacity="0.85"/>')
    p.append(label(w, h, tag))
    return wrap(w, h, "\n  ".join(p))


# ---------------------------------------------------------------- hero portrait
def hero_band(w=1920, h=1080):
    """The hero's placeholder image. A wide band, deliberately plain, labelled
    so nobody mistakes it for a finished photograph. It runs off the right of
    the page, so the interest sits left of centre."""
    defs = f'''<linearGradient id="hb" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#1C1C23"/><stop offset="1" stop-color="#09090B"/></linearGradient>
  <radialGradient id="hbkey" cx="0.3" cy="0.34" r="0.7">
    <stop offset="0" stop-color="{BONE}" stop-opacity="0.16"/>
    <stop offset="1" stop-color="{BONE}" stop-opacity="0"/></radialGradient>
  <radialGradient id="hbrim" cx="0.74" cy="0.7" r="0.5">
    <stop offset="0" stop-color="{BONE}" stop-opacity="0.05"/>
    <stop offset="1" stop-color="{BONE}" stop-opacity="0"/></radialGradient>'''

    p = [f'<rect width="{w}" height="{h}" fill="url(#hb)"/>',
         f'<rect width="{w}" height="{h}" fill="url(#hbkey)"/>',
         f'<rect width="{w}" height="{h}" fill="url(#hbrim)"/>']

    # a light horizon and a few standing forms — enough to read as a photograph
    # at a glance without pretending to be one
    p.append(f'<rect x="0" y="{h*0.63:.0f}" width="{w}" height="1" fill="{BONE}" opacity="0.10"/>')
    for i, (fx, fw, fh, op) in enumerate([(0.22, 0.055, 0.30, 0.16), (0.31, 0.075, 0.42, 0.22),
                                          (0.42, 0.05, 0.24, 0.13), (0.52, 0.09, 0.36, 0.18),
                                          (0.67, 0.06, 0.20, 0.11)]):
        x = w * fx
        bh = h * fh
        p.append(f'<rect x="{x:.0f}" y="{h*0.63-bh:.0f}" width="{w*fw:.0f}" height="{bh:.0f}" '
                 f'fill="{BONE}" opacity="{op}"/>')
        p.append(f'<ellipse cx="{x + w*fw*0.5:.0f}" cy="{h*0.635:.0f}" rx="{w*fw*0.7:.0f}" '
                 f'ry="{h*0.012:.0f}" fill="{INK}" opacity="0.5"/>')

    p.append(f'<rect x="0" y="0" width="{w}" height="{h}" fill="none" stroke="{BONE}" '
             f'stroke-width="2" opacity="0.07"/>')
    # centred, not edge-set: this image is cropped to whatever shape the band
    # takes, and a label in the corner is the first thing to disappear
    p.append(f'<text x="{w*0.5:.0f}" y="{h*0.52:.0f}" text-anchor="middle" '
             f'font-family="ui-monospace,Menlo,monospace" font-size="34" fill="{BONE}" '
             f'opacity="0.34" letter-spacing="8">HERO IMAGE</text>')
    return wrap(w, h, "\n  ".join(p), defs)


def portrait_about(w=1000, h=1300):
    """Scan-line figure — the About photo."""
    defs = f'''<linearGradient id="pg" x1="0" y1="0" x2="0.6" y2="1">
    <stop offset="0" stop-color="#1B1B20"/><stop offset="1" stop-color="#0A0A0C"/></linearGradient>
  <radialGradient id="pglow" cx="0.5" cy="0.34" r="0.5">
    <stop offset="0" stop-color="{EMBER}" stop-opacity="0.40"/>
    <stop offset="1" stop-color="{EMBER}" stop-opacity="0"/></radialGradient>'''
    p = [f'<rect width="{w}" height="{h}" fill="url(#pg)"/>',
         f'<rect width="{w}" height="{h}" fill="url(#pglow)"/>']
    for i in range(56):
        yy = h * 0.06 + i * (h * 0.88 / 56)
        squeeze = math.sin(i / 56 * math.pi)
        ww = w * 0.16 + w * 0.44 * squeeze
        p.append(f'<rect x="{(w-ww)/2:.1f}" y="{yy:.1f}" width="{ww:.1f}" height="6" '
                 f'fill="{BONE}" opacity="{0.06 + 0.30*squeeze:.3f}"/>')
    p.append(f'<circle cx="{w*0.5}" cy="{h*0.34}" r="{w*0.22}" fill="none" stroke="{BONE}" '
             f'stroke-width="1.5" opacity="0.35"/>')
    p.append(f'<rect x="{w*0.5-1}" y="0" width="2" height="{h}" fill="{EMBER}" opacity="0.25"/>')
    return wrap(w, h, "\n  ".join(p), defs)


# ------------------------------------------------------------- detail plates
def plate_grid(w=2400, h=1350):
    p = [f'<rect width="{w}" height="{h}" fill="#0C0C0F"/>']
    palette = [EMBER, BONE, MOSS, DUSK, CLAY, "#2A2A31"]
    cols, rows = 6, 3
    for r in range(rows):
        for c in range(cols):
            col = palette[(r * cols + c) % len(palette)]
            x = w * 0.06 + c * (w * 0.88 / cols)
            y = h * 0.12 + r * (h * 0.76 / rows)
            p.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="{w*0.88/cols*0.88:.0f}" '
                     f'height="{h*0.76/rows*0.82:.0f}" fill="{col}" opacity="0.92" rx="2"/>')
    return wrap(w, h, "\n  ".join(p))


def plate_split(w=2400, h=1350):
    defs = f'''<linearGradient id="pa" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="{EMBER}"/><stop offset="1" stop-color="#7A2A18"/></linearGradient>'''
    p = [f'<rect width="{w}" height="{h}" fill="#0A0A0C"/>',
         f'<rect x="{w*0.08}" y="{h*0.12}" width="{w*0.40}" height="{h*0.76}" fill="url(#pa)"/>',
         f'<rect x="{w*0.54}" y="{h*0.12}" width="{w*0.38}" height="{h*0.76}" fill="{BONE}" opacity="0.10"/>']
    for i in range(18):
        p.append(f'<rect x="{w*0.57}" y="{h*0.18+i*36}" width="{w*0.32*(0.4+0.6*abs(math.sin(i)))}" '
                 f'height="8" fill="{BONE}" opacity="0.45"/>')
    return wrap(w, h, "\n  ".join(p), defs)


def plate_form(w=2400, h=1350):
    p = [f'<rect width="{w}" height="{h}" fill="{BONE}"/>']
    cols = 6
    for c in range(cols):
        x = w * 0.06 + c * (w * 0.88 / cols)
        p.append(f'<rect x="{x:.0f}" y="{h*0.10}" width="{w*0.88/cols*0.78:.0f}" height="{h*0.80}" '
                 f'fill="{INK}" opacity="{0.05 + c*0.03:.2f}"/>')
    p.append(f'<circle cx="{w*0.5}" cy="{h*0.5}" r="{h*0.28}" fill="{EMBER}"/>')
    p.append(f'<circle cx="{w*0.5}" cy="{h*0.5}" r="{h*0.28}" fill="none" stroke="{INK}" stroke-width="4"/>')
    return wrap(w, h, "\n  ".join(p))


# ------------------------------------------------------- about-page imagery
def band(w=2400, h=1000):
    """The wide image break that sits under the intro on the About page.
    A studio plane in perspective — replace with a real wide shot (21:9)."""
    defs = f'''<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#111116"/><stop offset="1" stop-color="#08080A"/></linearGradient>
  <radialGradient id="bglow" cx="0.72" cy="0.46" r="0.55">
    <stop offset="0" stop-color="{EMBER}" stop-opacity="0.34"/>
    <stop offset="1" stop-color="{EMBER}" stop-opacity="0"/></radialGradient>'''
    hz = h * 0.56                                    # horizon
    p = [f'<rect width="{w}" height="{h}" fill="url(#bg)"/>',
         f'<rect width="{w}" height="{h}" fill="url(#bglow)"/>']
    # receding floor grid
    for i in range(1, 15):
        t = i / 14
        y = hz + (h - hz) * (t ** 2.1)
        p.append(f'<rect x="0" y="{y:.1f}" width="{w}" height="1" fill="{BONE}" '
                 f'opacity="{0.05 + 0.16*t:.3f}"/>')
    for i in range(-9, 10):
        x = w * 0.5 + i * (w * 0.055)
        p.append(f'<path d="M{w*0.5 + i*w*0.028:.0f} {hz:.0f} L{x:.0f} {h}" stroke="{BONE}" '
                 f'stroke-width="1" opacity="0.09" fill="none"/>')
    p.append(f'<rect x="0" y="{hz:.0f}" width="{w}" height="1.5" fill="{BONE}" opacity="0.30"/>')
    # standing plates — the things on the bench
    for x, ww, hh, op in [(0.09, 0.13, 0.30, 0.14), (0.24, 0.09, 0.19, 0.10),
                          (0.60, 0.16, 0.36, 0.12), (0.80, 0.11, 0.24, 0.09)]:
        p.append(f'<rect x="{w*x:.0f}" y="{hz - h*hh:.0f}" width="{w*ww:.0f}" height="{h*hh:.0f}" '
                 f'fill="{BONE}" opacity="{op}"/>')
    p.append(f'<rect x="{w*0.365:.0f}" y="{hz - h*0.26:.0f}" width="{w*0.15:.0f}" '
             f'height="{h*0.26:.0f}" fill="{EMBER}" opacity="0.78"/>')
    return wrap(w, h, "\n  ".join(p), defs)


def cap_thumb(motif, w=600, h=400):
    """A small 3:2 tile for one capability row. Eight motifs, one per discipline."""
    p = [f'<rect width="{w}" height="{h}" fill="#101015"/>']
    A = f'fill="{EMBER}"'
    B = f'fill="{BONE}"'

    if motif == "grid":                              # graphic design
        for r in range(3):
            for c in range(4):
                on = (r * 4 + c) in (2, 5, 9)
                p.append(f'<rect x="{w*(0.08+c*0.215):.0f}" y="{h*(0.14+r*0.26):.0f}" '
                         f'width="{w*0.16:.0f}" height="{h*0.18:.0f}" '
                         f'{A if on else B} opacity="{1 if on else 0.28}"/>')
    elif motif == "cube":                            # 3D
        cx, cy, s = w * 0.5, h * 0.5, h * 0.30
        p.append(f'<path d="M{cx:.0f} {cy-s:.0f} L{cx+s:.0f} {cy-s*0.5:.0f} L{cx+s:.0f} {cy+s*0.5:.0f} '
                 f'L{cx:.0f} {cy+s:.0f} L{cx-s:.0f} {cy+s*0.5:.0f} L{cx-s:.0f} {cy-s*0.5:.0f} Z" '
                 f'fill="none" stroke="{BONE}" stroke-width="4" opacity="0.62"/>')
        p.append(f'<path d="M{cx:.0f} {cy-s:.0f} L{cx:.0f} {cy:.0f} L{cx+s:.0f} {cy-s*0.5:.0f} Z" {A} opacity="0.85"/>')
        p.append(f'<path d="M{cx:.0f} {cy:.0f} L{cx:.0f} {cy+s:.0f} L{cx-s:.0f} {cy+s*0.5:.0f} Z" {B} opacity="0.28"/>')
    elif motif == "wave":                            # motion
        for i in range(7):
            ph = i * 0.42
            pts = " ".join(f'{w*0.06 + j*(w*0.88/28):.0f},'
                           f'{h*0.5 + math.sin(j/28*6.3 + ph)*h*0.26:.0f}' for j in range(29))
            p.append(f'<polyline points="{pts}" fill="none" stroke="{EMBER if i == 3 else BONE}" '
                     f'stroke-width="4" opacity="{0.95 if i == 3 else 0.28}"/>')
    elif motif == "strip":                           # video editing
        for i, (x, ww, on) in enumerate([(0.06, 0.20, 0), (0.28, 0.30, 1), (0.60, 0.14, 0), (0.76, 0.18, 0)]):
            p.append(f'<rect x="{w*x:.0f}" y="{h*0.34:.0f}" width="{w*ww:.0f}" height="{h*0.20:.0f}" '
                     f'{A if on else B} opacity="{0.95 if on else 0.30}"/>')
        for i in range(16):
            p.append(f'<rect x="{w*(0.06 + i*0.058):.0f}" y="{h*0.66:.0f}" width="{w*0.028:.0f}" '
                     f'height="{h*0.10:.0f}" {B} opacity="0.20"/>')
        p.append(f'<rect x="{w*0.42:.0f}" y="{h*0.18:.0f}" width="2" height="{h*0.64:.0f}" {A}/>')
    elif motif == "spread":                          # publication
        for s in (0, 1):
            x = w * (0.09 + s * 0.44)
            p.append(f'<rect x="{x:.0f}" y="{h*0.16:.0f}" width="{w*0.38:.0f}" height="{h*0.68:.0f}" '
                     f'{B} opacity="0.20"/>')
            for ln in range(9):
                lw = w * 0.30 * (0.45 + 0.55 * abs(math.sin(ln * 1.4 + s)))
                p.append(f'<rect x="{x + w*0.04:.0f}" y="{h*(0.28 + ln*0.06):.0f}" width="{lw:.0f}" '
                         f'height="{h*0.026:.0f}" {B} opacity="0.46"/>')
        p.append(f'<rect x="{w*0.13:.0f}" y="{h*0.22:.0f}" width="{w*0.16:.0f}" height="{h*0.10:.0f}" {A}/>')
    elif motif == "lens":                            # photography
        p.append(f'<circle cx="{w*0.5}" cy="{h*0.5}" r="{h*0.30}" fill="none" stroke="{BONE}" '
                 f'stroke-width="4" opacity="0.55"/>')
        for i in range(6):
            a = i * math.pi / 3
            p.append(f'<path d="M{w*0.5 + math.cos(a)*h*0.30:.0f} {h*0.5 + math.sin(a)*h*0.30:.0f} '
                     f'L{w*0.5 + math.cos(a+1.05)*h*0.30:.0f} {h*0.5 + math.sin(a+1.05)*h*0.30:.0f} '
                     f'L{w*0.5:.0f} {h*0.5:.0f} Z" {B} opacity="{0.10 + i*0.038:.3f}"/>')
        p.append(f'<circle cx="{w*0.5}" cy="{h*0.5}" r="{h*0.09}" {A}/>')
    elif motif == "browser":                         # web
        p.append(f'<rect x="{w*0.10:.0f}" y="{h*0.16:.0f}" width="{w*0.80:.0f}" height="{h*0.68:.0f}" '
                 f'fill="none" stroke="{BONE}" stroke-width="4" opacity="0.48"/>')
        p.append(f'<rect x="{w*0.10:.0f}" y="{h*0.16:.0f}" width="{w*0.80:.0f}" height="{h*0.11:.0f}" '
                 f'{B} opacity="0.18"/>')
        p.append(f'<rect x="{w*0.15:.0f}" y="{h*0.34:.0f}" width="{w*0.30:.0f}" height="{h*0.42:.0f}" {A} opacity="0.8"/>')
        for ln in range(5):
            p.append(f'<rect x="{w*0.50:.0f}" y="{h*(0.36 + ln*0.085):.0f}" '
                     f'width="{w*0.34*(0.5+0.5*abs(math.sin(ln*1.7))):.0f}" height="{h*0.035:.0f}" '
                     f'{B} opacity="0.36"/>')
    elif motif == "nodes":                           # AI workflows
        pts = [(0.14, 0.30), (0.14, 0.70), (0.44, 0.50), (0.72, 0.28), (0.72, 0.72), (0.88, 0.50)]
        for a, b in [(0, 2), (1, 2), (2, 3), (2, 4), (3, 5), (4, 5)]:
            p.append(f'<path d="M{w*pts[a][0]:.0f} {h*pts[a][1]:.0f} '
                     f'C{w*(pts[a][0]+0.10):.0f} {h*pts[a][1]:.0f} '
                     f'{w*(pts[b][0]-0.10):.0f} {h*pts[b][1]:.0f} '
                     f'{w*pts[b][0]:.0f} {h*pts[b][1]:.0f}" fill="none" stroke="{BONE}" '
                     f'stroke-width="3" opacity="0.34"/>')
        for i, (x, y) in enumerate(pts):
            p.append(f'<circle cx="{w*x:.0f}" cy="{h*y:.0f}" r="{h*0.055:.0f}" '
                     f'{A if i == 2 else B} opacity="{1 if i == 2 else 0.44}"/>')
    return wrap(w, h, "\n  ".join(p))


# ---------------------------------------------------------------- identity
def favicon():
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="14" fill="{INK}"/>
  <path d="M40 14 V40 a10 10 0 0 1 -20 0" fill="none" stroke="{BONE}" stroke-width="7" stroke-linecap="square"/>
  <circle cx="46" cy="46" r="4.5" fill="{EMBER}"/>
</svg>
'''


def og(w=1200, h=630):
    defs = f'''<radialGradient id="ogg" cx="0.75" cy="0.2" r="0.8">
    <stop offset="0" stop-color="{EMBER}" stop-opacity="0.45"/>
    <stop offset="1" stop-color="{EMBER}" stop-opacity="0"/></radialGradient>'''
    p = [f'<rect width="{w}" height="{h}" fill="#08080A"/>',
         f'<rect width="{w}" height="{h}" fill="url(#ogg)"/>',
         f'<text x="72" y="330" font-family="Helvetica,Arial,sans-serif" font-weight="500" '
         f'font-size="96" fill="{BONE}">Jin Yoshida</text>',
         f'<text x="76" y="392" font-family="ui-monospace,Menlo,monospace" font-size="24" fill="{BONE}" '
         f'opacity="0.6" letter-spacing="5">MULTIDISCIPLINARY DESIGNER — MELBOURNE</text>',
         f'<rect x="72" y="430" width="120" height="5" fill="{EMBER}"/>']
    return wrap(w, h, "\n  ".join(p), defs)


# ---------------------------------------------------------------- write them
# one cover per project, keyed to its discipline
cover("duress-brochures", publication(tag="PUBLICATION DESIGN"))
cover("duress-device-renders", renders())
cover("firefly", brandmark(tag="ESPORTS BRAND"))
cover("bosstab-product-viewer", viewer())
cover("dock-for-square-reader-guide", timeline(tag="GETTING STARTED GUIDE"))
cover("bosstab-sabel-photography", photogrid())
cover("woofpack", brandkit())
cover("everything-black-mv", kinetic())
cover("adobe-instagram-filters", arfilter())

# a couple of gallery stand-ins so the detail layout is visible on two pages —
# delete these as soon as you have real detail images
# Same guard as cover(): these are gallery stand-ins for two projects, and
# they must not reappear once real pictures are in those folders.
gallery_stub("duress-device-renders", "01-angles.svg", plate_split())
gallery_stub("duress-device-renders", "02-swatches.svg", plate_grid())
gallery_stub("duress-brochures", "01-spread.svg", plate_form())
gallery_stub("duress-brochures", "02-stock.svg", plate_grid())

# site-wide imagery, nested by where it appears
write("assets/img/home/hero.svg", hero_band())
write("assets/img/about/portrait.svg", portrait_about())
write("assets/img/about/band.svg", band())

# one small tile per capability row, in the order they appear on the About page
for n, motif in enumerate(["grid", "cube", "wave", "strip",
                           "spread", "lens", "browser", "nodes"], start=1):
    write("assets/img/about/capabilities/%02d.svg" % n, cap_thumb(motif))

write("assets/img/site/og.svg", og())
write("assets/img/site/favicon.svg", favicon())
print("done")
