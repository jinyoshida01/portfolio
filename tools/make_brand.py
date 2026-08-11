#!/usr/bin/env python3
"""
Regenerates the site's brand marks: the favicon and the social preview image.

  python3 tools/make_brand.py

You never need to run this for normal use. It exists so the marks can be
changed in one place instead of being redrawn by hand, and so they stay tied to
the actual typeface rather than to an approximation of it.

What it makes
-------------
  assets/img/site/favicon.svg      the tab mark, "J." in Sora Bold
  assets/img/site/og-source.html   the 1200x630 social card, ready to screenshot

The mark is the site's own device: the ember full stop that ends every heading
on the site — "About.", "What I do.", "Get in touch." — applied to a single
initial. It is not a drawing of a J; the outline is lifted straight out of
assets/fonts/sora-latin-wght-normal.woff2 at weight 700, the same instance the
wordmark is set in, so the two can never drift apart.

The path data is baked into the SVG that comes out, so nothing downstream needs
the font or this script. That matters: the favicon has to render in a browser
tab with no stylesheet and no network.

Requirements (for running this, not for the site):
    pip3 install fonttools brotli

The PNG sizes and the og image are rasterised from these sources — see
README.md, "Brand marks".
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, "assets", "fonts", "sora-latin-wght-normal.woff2")
OUT = os.path.join(ROOT, "assets", "img", "site")

PAPER = "#08080A"
INK = "#EFEBE3"
EMBER = "#FA3C3C"

SIZE = 64          # favicon viewBox
RADIUS = 14        # matches the rounded square used across the site's chrome
CAP_FRACTION = 0.58  # cap height as a share of the canvas


def glyphs():
    """The outlines of J and . from Sora at weight 700, as SVG path data in
    font units, plus the metrics needed to place them."""
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.boundsPen import BoundsPen

    font = instancer.instantiateVariableFont(TTFont(FONT), {"wght": 700})
    gset = font.getGlyphSet()

    out = {}
    for char, name in (("J", "J"), (".", "period")):
        pen = SVGPathPen(gset)
        gset[name].draw(pen)
        bounds = BoundsPen(gset)
        gset[name].draw(bounds)
        out[char] = {
            "d": pen.getCommands(),
            "advance": gset[name].width,
            "bbox": bounds.bounds,          # xMin, yMin, xMax, yMax
        }
    out["_cap"] = font["OS/2"].sCapHeight
    return out


def favicon(radius=RADIUS, cap_fraction=CAP_FRACTION):
    """The mark. `radius` and `cap_fraction` vary because the same drawing has
    to serve two jobs: a browser tab, where the rounded square is ours to draw
    and the mark should fill it; and an iOS home screen, where the system
    applies its own corner mask over the top — so that version is squared off
    and set smaller, or the mask clips into the type."""
    g = glyphs()
    cap = g["_cap"]
    j, dot = g["J"], g["."]

    # the two glyphs set as one word, in font units
    dot_x = j["advance"]
    left = j["bbox"][0]
    right = dot_x + dot["bbox"][2]
    top = max(j["bbox"][3], dot["bbox"][3])
    bottom = min(j["bbox"][1], dot["bbox"][1])       # the J dips below baseline

    scale = (SIZE * cap_fraction) / cap
    ink_w = (right - left) * scale
    ink_h = (top - bottom) * scale

    # centre the inked area, not the advance width — otherwise the sidebearings
    # push the mark visibly left of centre at 16px, where two pixels show
    dx = (SIZE - ink_w) / 2.0 - left * scale
    baseline = (SIZE - ink_h) / 2.0 + top * scale

    def place(d, extra_x=0.0):
        # font units are y-up and SVG is y-down, hence the negative y scale
        return ('<path d="%s" transform="translate(%.3f %.3f) scale(%.5f %.5f)"/>'
                % (d, dx + extra_x * scale, baseline, scale, -scale))

    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" '
        'width="%d" height="%d" role="img" aria-label="Jin Yoshida">\n'
        '  <rect width="%d" height="%d" rx="%d" fill="%s"/>\n'
        '  <g fill="%s">%s</g>\n'
        '  <g fill="%s">%s</g>\n'
        '</svg>\n'
        % (SIZE, SIZE, SIZE, SIZE, SIZE, SIZE, radius, PAPER,
           INK, place(j["d"]),
           EMBER, place(dot["d"], dot_x))
    )


OG_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>og</title>
<style>
  /* The card is set in the site's own faces, loaded from the site's own files,
     so the preview and the page it links to are the same piece of design. */
  @font-face {
    font-family: 'Sora var'; font-style: normal; font-weight: 100 800;
    src: url('../../assets/fonts/sora-latin-wght-normal.woff2') format('woff2-variations');
    font-display: block;
  }
  @font-face {
    font-family: 'Space Mono'; font-style: normal; font-weight: 400;
    src: url('../../assets/fonts/space-mono-latin-400-normal.woff2') format('woff2');
    font-display: block;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; overflow: hidden; }
  .card {
    position: relative; width: 1200px; height: 630px;
    background: %(paper)s; color: %(ink)s;
    display: flex; flex-direction: column; justify-content: center;
    padding: 0 88px;
  }
  /* the same ember bloom the site's hero carries, kept well away from the type */
  .aura {
    position: absolute; top: -22%%; right: -12%%; width: 780px; height: 780px;
    background: radial-gradient(circle, rgba(250,60,60,0.38) 0%%, rgba(250,60,60,0) 68%%);
  }
  .mark {
    position: absolute; top: 64px; left: 88px;
    font-family: 'Sora var'; font-weight: 700; font-size: 40px;
    letter-spacing: -0.034em;
  }
  .mark i { color: %(ember)s; font-style: normal; }
  h1 {
    position: relative;
    font-family: 'Sora var'; font-weight: 700; font-size: 132px;
    letter-spacing: -0.034em; line-height: 1.0;
  }
  h1 i { color: %(ember)s; font-style: normal; }
  .rule { position: relative; width: 132px; height: 6px; background: %(ember)s; margin: 40px 0 34px; }
  p {
    position: relative;
    font-family: 'Space Mono', monospace; font-size: 25px; letter-spacing: 0.13em;
    text-transform: uppercase; color: rgba(239,235,227,0.62); line-height: 1.5;
  }
  .foot {
    position: absolute; left: 88px; right: 88px; bottom: 56px;
    display: flex; justify-content: space-between;
    font-family: 'Space Mono', monospace; font-size: 20px; letter-spacing: 0.13em;
    text-transform: uppercase; color: rgba(239,235,227,0.42);
  }
</style>
</head>
<body>
  <div class="card">
    <div class="aura"></div>
    <h1>Jin Yoshida<i>.</i></h1>
    <div class="rule"></div>
    <p>Multidisciplinary designer</p>
    <div class="foot"><span>Melbourne, Australia</span><span>jinyoshida.me</span></div>
  </div>
</body>
</html>
"""


def main():
    os.makedirs(OUT, exist_ok=True)

    path = os.path.join(OUT, "favicon.svg")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(favicon())
    print("  favicon.svg      %d bytes  (Sora Bold J + ember full stop)"
          % os.path.getsize(path))

    spare = os.path.join(ROOT, "tools", "spare")
    os.makedirs(spare, exist_ok=True)
    touch = os.path.join(spare, "apple-touch-source.svg")
    with open(touch, "w", encoding="utf-8") as fh:
        fh.write(favicon(radius=0, cap_fraction=0.44))
    print("  apple-touch-source.svg      (square; iOS rounds it itself)")

    src = os.path.join(ROOT, "tools", "spare", "og-source.html")
    os.makedirs(os.path.dirname(src), exist_ok=True)
    with open(src, "w", encoding="utf-8") as fh:
        fh.write(OG_HTML % {"paper": PAPER, "ink": INK, "ember": EMBER})
    print("  og-source.html   %d bytes  (screenshot at 1200x630 to make og.png)"
          % os.path.getsize(src))


if __name__ == "__main__":
    main()
