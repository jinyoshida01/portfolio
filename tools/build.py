#!/usr/bin/env python3
"""
Site builder.

  python3 tools/build.py                 rebuild the site
  python3 tools/build.py new "My Title"  scaffold a new project, then rebuild

Every project is one folder:

  work/<slug>/
    project.json        title, date, tags, copy — the only file you edit
    images/
      cover.jpg         the card + page hero (any image format)
      01.jpg 02.jpg …   everything else becomes the gallery, sorted by filename

From those folders this script writes:

  work/<slug>/index.html    the case study page
  work/index.html           the full work archive
  index.html                the highlights grid, injected between BUILD markers

Nothing else in index.html is touched, so the rest of the homepage stays yours
to edit by hand.
"""
import json
import os
import struct
import re
import shutil
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(ROOT, "work")
TPL = os.path.join(ROOT, "tools", "templates")

HOME_MAX = 8                       # highlights shown on the homepage

# Link style. False writes ".../work/index.html", which works both when you open
# the files straight off your disk (file://) and on every static host. True writes
# ".../work/" for prettier URLs — only do that if the site will always be served
# by a web server, because directory links don't resolve on file://.
CLEAN_URLS = False

# Where the site lives once it's published. Only used for the social preview:
# Facebook, LinkedIn, X, Slack and iMessage all want an absolute URL for
# og:image and quietly show nothing for a relative one. Change this if the
# domain changes; everything else on the site uses relative paths and doesn't
# care where it's hosted. Set it to "" to fall back to a relative og:image,
# which some scrapers still resolve.
SITE_URL = "https://www.jinyoshida.me"
IMG_EXT = (".jpg", ".jpeg", ".png", ".webp", ".svg", ".gif", ".avif")
VID_EXT = (".mp4", ".webm", ".m4v", ".mov")

# A video whose filename ends in this plays itself: muted, looping, no controls.
# Anything else gets a normal player with controls. See the README.
LOOP_SUFFIX = "-loop"

# shown when a project folder has no images yet — an empty src="" would make the
# browser re-request the page itself, which is worse than a visible gap
BLANK = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E"
         "%3Crect width='4' height='3' fill='%2316161b'/%3E%3C/svg%3E")


# ---------------------------------------------------------------- helpers
def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s or "project"


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def page(path):
    """A link to a page, honouring CLEAN_URLS. path is a folder like 'work/'."""
    return path if CLEAN_URLS else path + "index.html"


def fill(template, **kw):
    out = template
    for k, v in kw.items():
        out = out.replace("{{%s}}" % k, str(v))
    left = re.findall(r"\{\{(\w+)\}\}", out)
    if left:
        raise SystemExit("template placeholder never filled: %s" % sorted(set(left)))
    return out


def esc(s):
    """Text safe to put between tags. Unlike attr() this keeps typographic
    punctuation, because it's going into prose rather than an attribute."""
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def attr(s):
    """Plain text safe for an HTML attribute."""
    s = re.sub(r"<[^>]+>", "", str(s))
    return (s.replace("&", "&amp;").replace('"', "&quot;")
             .replace("<", "&lt;").replace(">", "&gt;")
             .replace("’", "'").replace("—", "-"))


def plain(s):
    """Human-readable text with entities resolved — for aria-labels."""
    return re.sub(r"<[^>]+>", "", str(s)).replace("&amp;", "and").replace("&", "and")


# ---------------------------------------------------------------- load
def load_projects():
    if not os.path.isdir(WORK):
        raise SystemExit("no work/ folder found")

    projects = []
    for slug in sorted(os.listdir(WORK)):
        folder = os.path.join(WORK, slug)
        meta = os.path.join(folder, "project.json")
        if not os.path.isdir(folder) or not os.path.exists(meta):
            continue
        try:
            data = json.loads(read(meta))
        except json.JSONDecodeError as e:
            raise SystemExit("%s/project.json is not valid JSON — %s" % (slug, e))

        data["slug"] = slug
        data.setdefault("title", slug.replace("-", " ").title())
        data.setdefault("date", "1970-01")
        data.setdefault("year", data["date"][:4])
        data.setdefault("highlight", False)
        data.setdefault("tags", [])
        data.setdefault("summary", "")
        data.setdefault("blocks", [])
        data.setdefault("meta", {})

        # images/ holds both stills and video. cover.* is the cover; everything
        # else becomes the gallery, in filename order, stills and clips mixed.
        imgdir = os.path.join(folder, "images")
        files, vids = [], []
        if os.path.isdir(imgdir):
            everything = sorted(f for f in os.listdir(imgdir) if not f.startswith("."))
            files = [f for f in everything if f.lower().endswith(IMG_EXT)]
            vids = [f for f in everything if f.lower().endswith(VID_EXT)]

        # Anything in images/ that isn't a format the build recognises is
        # silently dropped, which looks exactly like the build being broken.
        # .heic is the common one — it's what an iPhone shoots by default, and
        # no browser but Safari will display it.
        unknown = [f for f in everything if not f.lower().endswith(IMG_EXT + VID_EXT)]
        for f in unknown:
            ext = os.path.splitext(f)[1].lower() or "(no extension)"
            hint = " — export it as .jpg" if ext in (".heic", ".heif", ".tif", ".tiff", ".psd", ".ai") else ""
            print("  ! %s/images/%s ignored: %s isn't a web format%s" % (slug, f, ext, hint))

        # cover.* is the card in the work grid and the top of the project page.
        # An animated .gif works and will play in the card; it's listed last
        # here so a .jpg wins if both happen to be present, which is the
        # kinder default — a gif cover is usually much heavier.
        COVER_ORDER = (".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg", ".gif")
        covers = [f for f in files if os.path.splitext(f)[0].lower() == "cover"]
        covers.sort(key=lambda f: COVER_ORDER.index(os.path.splitext(f)[1].lower())
                    if os.path.splitext(f)[1].lower() in COVER_ORDER else 99)
        if len(covers) > 1:
            print("  ! %s has %d covers (%s) — using %s"
                  % (slug, len(covers), ", ".join(covers), covers[0]))
        cover = covers[0] if covers else None
        if not cover and files:
            cover = files[0]
        if cover and cover.lower().endswith(".gif"):
            mb = os.path.getsize(os.path.join(imgdir, cover)) / 1e6
            if mb > 2:
                print("  ! %s/images/%s is %.1f MB — a gif cover that big will "
                      "stall the work grid; consider a still" % (slug, cover, mb))

        # A clip named hero.* replaces the big still at the top of the project
        # page — the card in the work grid still uses cover.*, because a grid of
        # autoplaying videos is a different and much worse page. Its own poster
        # frame (hero.jpg) stands in before it loads and under reduced motion.
        hero_clips = sorted([v for v in vids if os.path.splitext(v)[0].lower() == "hero"],
                            key=lambda f: {".webm": 0, ".mp4": 1}.get(os.path.splitext(f)[1].lower(), 9))
        hero_poster = next((f for f in files if os.path.splitext(f)[0].lower() == "hero"), None)
        if hero_clips:
            vids = [v for v in vids if v not in hero_clips]
        # hero.* means "this goes at the top of the page" whichever it is. With
        # a clip present the still is that clip's poster frame; on its own it
        # *is* the hero, which is how you give a project a different picture at
        # the top from the one on its card. Either way it leaves the gallery —
        # before, a lone hero.jpg quietly became an ordinary gallery item and
        # the top of the page went on showing the cover.
        if hero_poster:
            files = [f for f in files if f != hero_poster]
        data["hero_clips"] = hero_clips
        data["hero_poster"] = hero_poster
        data["hero_still"] = hero_poster if not hero_clips else None

        # Videos sharing a name are the same clip in different formats, so they
        # become one entry with several <source>s — webm first, then mp4, which
        # is the order a browser should try them in.
        ORDER = {".webm": 0, ".mp4": 1, ".m4v": 2, ".mov": 3}
        sources = {}
        for v in vids:
            sources.setdefault(os.path.splitext(v)[0], []).append(v)
        for stem in sources:
            sources[stem].sort(key=lambda f: ORDER.get(os.path.splitext(f)[1].lower(), 9))
        clips = sorted(sources, key=lambda st: st.lower())

        # One naming scheme across every project, so a filename says what a
        # clip does: hero.* takes the top of the page, NN-loop.* plays itself
        # silently, NN-video.* gets controls and waits to be asked. Anything
        # else still works — the build treats an unrecognised stem as a
        # controls clip — but it drifts, and a folder of 01-film, 02-reel-loop,
        # 03-walkthrough is a folder nobody can predict the behaviour of.
        for stem in clips:
            if not re.match(r"^\d{2}-(loop|video)$", stem, re.I):
                m = re.match(r"^(\d{2})", stem)
                n = m.group(1) if m else "01"
                kind = "loop" if stem.lower().endswith(LOOP_SUFFIX) else "video"
                print("  ! %s/images/%s.* — off convention; %s-%s.* would be "
                      "clearer (it plays %s)"
                      % (slug, stem, n, kind,
                         "silently on a loop" if kind == "loop" else "with controls"))
        # A WebM alongside the MP4 is smaller on every browser that takes it,
        # and costs nothing on the ones that don't — but only if it really is
        # smaller. The webm is offered first, so a bloated one is downloaded in
        # preference to the mp4 and the pairing costs more than shipping the
        # mp4 alone would have. Easy to do by accident: a CRF that's generous
        # for VP9 quietly overshoots whatever the H.264 was encoded at.
        for stem in list(sources) + ([os.path.splitext(hero_clips[0])[0]] if hero_clips else []):
            have = sources.get(stem, hero_clips)
            webm = next((f for f in have if f.lower().endswith(".webm")), None)
            mp4 = next((f for f in have if f.lower().endswith((".mp4", ".m4v"))), None)
            if not webm:
                print("  · %s/images/%s — mp4 only; a .webm beside it would "
                      "load faster for most visitors" % (slug, stem))
            elif mp4:
                wb = os.path.getsize(os.path.join(imgdir, webm))
                mb = os.path.getsize(os.path.join(imgdir, mp4))
                if wb > mb:
                    print("  ! %s/images/%s.webm is %.1f MB against %.1f MB for the "
                          "mp4 — the webm is offered first, so re-export it smaller "
                          "or delete it" % (slug, stem, wb / 1e6, mb / 1e6))

        # A still sharing a video's name is its poster frame, not a gallery item:
        # 02-walkthrough.mp4 + 02-walkthrough.jpg = one entry, with a poster.
        posters = {}
        for stem in clips:
            match = next((f for f in files
                          if os.path.splitext(f)[0] == stem and f != cover), None)
            if match:
                posters[stem] = match

        used_as_poster = set(posters.values())
        gallery = data.get("gallery")
        if gallery is None:
            gallery = sorted([f for f in files if f != cover and f not in used_as_poster]
                             + clips, key=lambda f: f.lower())
        if not cover and not vids:
            print("  ! %s has no images — add work/%s/images/cover.jpg" % (slug, slug))
        data["cover_file"] = cover
        # the cover's real shape, so the card and the case hero reserve the
        # right space instead of assuming 4:3
        data["cover_size"] = (image_size(os.path.join(imgdir, cover))
                              if cover else None) or (1600, 1200)
        data["gallery_files"] = gallery
        data["posters"] = posters
        data["sources"] = sources
        projects.append(data)

    # newest first
    projects.sort(key=lambda p: (str(p["date"]), p["title"]), reverse=True)
    return projects


# ---------------------------------------------------------------- render
def render_card(p, href, cover, eager):
    tags = " · ".join(p["tags"][:3]) if p["tags"] else ""
    return fill(read(os.path.join(TPL, "card.html")),
                href=href,
                cover=cover or BLANK,
                alt=attr(p.get("cover_alt") or "%s — cover image" % plain(p["title"])),
                cover_w=str(p["cover_size"][0]),
                cover_h=str(p["cover_size"][1]),
                loading="eager" if eager else "lazy",
                badge=p.get("badge") or p.get("client") or "Project",
                short=p.get("short") or tags,
                title=p["title"],
                title_plain=attr(plain(p["title"])),
                tags_plain=attr(tags.lower() or "project"),
                tags=tags,
                year=p["year"])


EMBED_RX = re.compile(
    r"(?:youtube\.com/(?:watch\?v=|embed/)|youtu\.be/)([\w-]{6,})"
    r"|vimeo\.com/(?:video/)?(\d+)")


def render_embed(url, title):
    """A YouTube or Vimeo URL becomes a lazy 16:9 iframe. Anything else is
    treated as a path to a file and gets a normal player.

    Note this is the one place the site reaches a third party — everything
    else is self-hosted. Host the file yourself if you would rather it didn't."""
    m = EMBED_RX.search(url or "")
    if m:
        if m.group(1):
            src = "https://www.youtube-nocookie.com/embed/%s?rel=0" % m.group(1)
        else:
            src = "https://player.vimeo.com/video/%s" % m.group(2)
        return ('          <div class="case-block">\n'
                '            <div class="embed" data-reveal>\n'
                '              <iframe src="%s" title="%s" loading="lazy" allowfullscreen\n'
                '                      allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"\n'
                '                      referrerpolicy="strict-origin-when-cross-origin"></iframe>\n'
                '            </div>\n'
                '          </div>' % (src, attr(title)))
    return ('          <div class="case-block">\n'
            '            <div class="vid" data-reveal>\n'
            '              <video controls playsinline preload="metadata">\n'
            '                <source src="%s">\n'
            '              </video>\n'
            '            </div>\n'
            '          </div>' % attr(url))


def image_size(path):
    """(width, height) for an image, read from its header — no dependencies.

    The build needs real dimensions so every <img> can carry its true width
    and height. That's what lets the browser reserve the right space before
    the file arrives, and it's what decides whether a picture gets a wide
    cell or a narrow one. Unknown or unreadable returns None, and the caller
    falls back to a neutral shape rather than guessing wrong.
    """
    try:
        with open(path, "rb") as fh:
            head = fh.read(32)
            if head[:8] == b"\x89PNG\r\n\x1a\n":
                w, h = struct.unpack(">II", head[16:24])
                return int(w), int(h)
            if head[:6] in (b"GIF87a", b"GIF89a"):
                w, h = struct.unpack("<HH", head[6:10])
                return int(w), int(h)
            if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
                fh.seek(12)
                chunk = fh.read(30)
                if chunk[:4] == b"VP8X":
                    w = int.from_bytes(chunk[8:11], "little") + 1
                    h = int.from_bytes(chunk[11:14], "little") + 1
                    return w, h
                if chunk[:4] == b"VP8 ":
                    return (int.from_bytes(chunk[14:16], "little") & 0x3FFF,
                            int.from_bytes(chunk[16:18], "little") & 0x3FFF)
                if chunk[:4] == b"VP8L":
                    b0, b1, b2, b3 = chunk[9], chunk[10], chunk[11], chunk[12]
                    bits = b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)
                    return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
            if head[:2] == b"\xff\xd8":                      # JPEG
                fh.seek(2)
                while True:
                    marker = fh.read(2)
                    if len(marker) < 2 or marker[0] != 0xFF:
                        break
                    size = struct.unpack(">H", fh.read(2))[0]
                    # SOF0..SOF15, skipping the four that aren't frame headers
                    if 0xC0 <= marker[1] <= 0xCF and marker[1] not in (0xC4, 0xC8, 0xCC, 0xD8):
                        data = fh.read(5)
                        h, w = struct.unpack(">HH", data[1:5])
                        return int(w), int(h)
                    fh.seek(size - 2, 1)
    except Exception:
        return None

    # SVG is text, and may size itself with width/height or only a viewBox
    if path.lower().endswith(".svg"):
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                head = fh.read(2000)
            m = re.search(r'\bwidth="([\d.]+)[a-z%]*"[^>]*?\bheight="([\d.]+)', head)
            if m:
                return int(float(m.group(1))), int(float(m.group(2)))
            m = re.search(r'viewBox="[\d.\-]+ +[\d.\-]+ +([\d.]+) +([\d.]+)"', head)
            if m:
                return int(float(m.group(1))), int(float(m.group(2)))
        except Exception:
            pass
    return None


MIME = {".webm": "video/webm", ".mp4": "video/mp4",
        ".m4v": "video/mp4", ".mov": "video/quicktime"}

# Formats whose header we can read for dimensions. WebM is deliberately absent:
# every clip on this site ships an .mp4 alongside it, so there is always a
# readable sibling, and main.js corrects anything we get wrong once the browser
# has the file open.
PROBE_EXT = (".mp4", ".m4v", ".mov")


def video_size(path):
    """The real pixel dimensions of an MP4/MOV clip, or None.

    Reads the track header out of the ISO base media container by hand — same
    approach as image_size(), and for the same reason: this build has no
    third-party dependencies and shouldn't grow one just to learn how tall a
    video is.

    Knowing this matters. Before it existed, a clip's shape was inferred from
    its poster frame, and a poster is often a nice still from the shoot rather
    than an actual frame — a 1920x938 film sitting in a box built for a
    1920x1080 photo got cropped top and bottom.
    """
    try:
        size = os.path.getsize(path)
        with open(path, "rb") as fh:

            def boxes(end, want, depth=0):
                """Walk the box tree, yielding the payload of every box named
                in `want`. Containers are recursed into; everything else is
                skipped by its own declared length."""
                while fh.tell() + 8 <= end and depth < 6:
                    start = fh.tell()
                    head = fh.read(8)
                    if len(head) < 8:
                        return
                    length = struct.unpack(">I", head[:4])[0]
                    name = head[4:8]
                    body = start + 8
                    if length == 1:                       # 64-bit extended size
                        length = struct.unpack(">Q", fh.read(8))[0]
                        body = start + 16
                    elif length == 0:                     # runs to end of file
                        length = end - start
                    if length < 8 or start + length > end:
                        return
                    if name in want:
                        yield name, body, start + length
                    elif name in (b"moov", b"trak", b"mdia", b"minf", b"stbl"):
                        for hit in boxes(start + length, want, depth + 1):
                            yield hit
                    fh.seek(start + length)

            best = None
            for _name, body, _end in boxes(size, (b"tkhd",)):
                fh.seek(body)
                ver = fh.read(4)[0]                       # version, then 3 of flags
                # then creation, modification, track id, reserved, duration —
                # 8-byte times in version 1, 4-byte in version 0 — and 16 bytes
                # of reserved, layer, alternate group and volume before the
                # display matrix. Counting these out wrong reads the middle of
                # the matrix as the dimensions and quietly returns nothing.
                fh.seek(body + (52 if ver == 1 else 40))
                matrix = struct.unpack(">9i", fh.read(36))
                w, h = struct.unpack(">II", fh.read(8))
                w, h = w >> 16, h >> 16                   # 16.16 fixed point
                if not w or not h:
                    continue
                # a phone shoots landscape and stores a rotation in the matrix;
                # a 90 or 270 degree turn swaps what the viewer actually sees
                if matrix[0] == 0 and matrix[4] == 0 and matrix[1] and matrix[3]:
                    w, h = h, w
                # the largest track is the picture; audio tracks are 0x0 and
                # have already been skipped by the check above
                if best is None or w * h > best[0] * best[1]:
                    best = (int(w), int(h))
            return best
    except Exception:
        return None


def clip_size(dirpath, files, poster):
    """The shape of a clip: from the film itself where we can read it, from its
    poster frame otherwise, and nothing at all as a last resort — at which
    point main.js fills it in once the browser has the metadata."""
    for f in files:
        if f.lower().endswith(PROBE_EXT):
            got = video_size(os.path.join(dirpath, f))
            if got:
                return got
    if poster:
        return image_size(os.path.join(dirpath, poster))
    return None


def render_tile(item, poster, files, cls, size, title):
    """One gallery cell — a still, a self-playing loop, or a clip with controls.
    `item` is a filename for a still, or a bare stem for a clip; `files` is the
    list of formats that clip is available in; `size` is (w, h) or None.

    Stills carry their real pixel dimensions, which is what lets the CSS give
    every picture its own height instead of cropping it into a fixed box. When
    the size can't be read, 4:3 stands in — it only affects the space reserved
    before the file loads."""
    w, h = size or (1600, 1200)

    if not files:
        return ('              <div class="%s" data-clip>\n'
                '                <img src="images/%s" alt="%s" width="%d" height="%d" loading="lazy" decoding="async">\n'
                '              </div>' % (cls, item, attr("%s — detail" % title), w, h))

    pos = ' poster="images/%s"' % poster if poster else ""
    # the clip's own shape, read from its header — this is what stops a film
    # being cropped into a box built for something else. Falls back to 16:9 in
    # CSS, and main.js corrects it from the real metadata either way.
    ratio = ' style="aspect-ratio:%d/%d"' % (w, h) if size else ""
    if item.lower().endswith(LOOP_SUFFIX):
        # a silent showreel loop. main.js pauses it off-screen and under
        # prefers-reduced-motion, where the poster frame stands in for it.
        opening = ('<video data-loop muted loop playsinline preload="metadata"%s\n'
                   '                       aria-label="%s">' % (pos, attr("%s — motion detail" % title)))
    else:
        opening = '<video controls playsinline preload="metadata"%s>' % pos

    srcs = "\n".join(
        '                  <source src="images/%s" type="%s">'
        % (f, MIME.get(os.path.splitext(f)[1].lower(), ""))
        for f in files)

    return ('              <div class="%s plate--vid"%s data-clip>\n'
            '                %s\n%s\n'
            '                </video>\n'
            '              </div>' % (cls, ratio, opening, srcs))


def render_band(p, href, cover, i, total, eager):
    """A row on the work page: picture one side, words the other, sides
    alternating down the page. One <a> wrapping both halves rather than two
    links to the same place — a screen reader shouldn't hear every project
    twice."""
    tags = " · ".join(p["tags"][:3]) if p["tags"] else ""
    w, h = p["cover_size"]
    return (
        '        <a class="workrow" href="%s" aria-label="%s">\n'
        '          <div class="frame workrow__img" data-clip>\n'
        '            <img class="frame__media" src="%s" alt="%s" width="%d" height="%d" '
        'loading="%s" decoding="async">\n'
        '            <div class="frame__veil" aria-hidden="true"></div>\n'
        '          </div>\n'
        '          <div class="workrow__tx">\n'
        '            <span class="workrow__n">%02d <i>/ %02d</i></span>\n'
        '            <h3 class="workrow__t">%s</h3>\n'
        '            <p class="workrow__m">%s</p>\n'
        '            <p class="workrow__s">%s</p>\n'
        '            <span class="workrow__go">View project <span aria-hidden="true">&rarr;</span></span>\n'
        '          </div>\n'
        '        </a>' % (
            href, attr("%s — %s" % (plain(p["title"]), tags.lower() or "project")),
            cover or BLANK,
            attr(p.get("cover_alt") or "%s — cover image" % plain(p["title"])), w, h,
            "eager" if eager else "lazy",
            i, total, p["title"], esc(tags), esc(p.get("summary", ""))))


def render_case(p, i, total, nxt):
    root = "../../"
    base = ""                                   # page lives beside its images
    cover = "images/%s" % p["cover_file"] if p["cover_file"] else BLANK

    chips = []
    for j, t in enumerate(p["tags"]):
        cls = "chip chip--accent" if j == 0 else "chip"
        chips.append('        <span class="%s">%s</span>' % (cls, t))
    chips.append('        <span class="chip">%s</span>' % p["year"])

    meta_rows = []
    for label, value in p["meta"].items():
        meta_rows.append("            <div><dt>%s</dt><dd>%s</dd></div>" % (label, value))

    blocks = []
    for b in p["blocks"]:
        paras = "\n".join("              <p>%s</p>" % x for x in b.get("paras", []))
        blocks.append(
            '          <div class="case-block">\n'
            '            <p class="eyebrow" style="margin-bottom:1.2rem">%s</p>\n'
            '            <h2 class="display" data-split>%s</h2>\n'
            '            <div class="prose" data-reveal>\n%s\n            </div>\n'
            '          </div>\n' % (b.get("label", ""), b.get("heading", ""), paras))

    parts = []
    if p.get("video"):
        parts.append(render_embed(p["video"], plain(p["title"])))

    if p["gallery_files"]:
        tiles = []
        posters = p.get("posters") or {}
        sources = p.get("sources") or {}
        imgdir = os.path.join(ROOT, "work", p["slug"], "images")
        for k, f in enumerate(p["gallery_files"]):
            # A still is measured from the picture; a clip from the film.
            if f in sources:
                size = clip_size(imgdir, sources[f], posters.get(f))
            else:
                size = image_size(os.path.join(imgdir, f))

            # The lead image always runs full width. After that, only pictures
            # wide enough to earn it do — so a panorama gets the room it needs
            # and a portrait shot isn't stretched across the page.
            wide = k == 0 or (size and size[0] / float(size[1]) >= 1.7)
            cls = "plate plate--full" if wide else "plate"
            tiles.append(render_tile(f, posters.get(f), sources.get(f, []),
                                     cls, size, plain(p["title"])))
        has_vid = any(f in sources for f in p["gallery_files"])
        label = "Selected work" if has_vid else "Selected imagery"
        parts.append('          <div class="case-block">\n'
                     '            <p class="eyebrow" style="margin-bottom:1.2rem">%s</p>\n'
                     '            <div class="gallery" data-stagger="140">\n%s\n            </div>\n'
                     '          </div>' % (label, "\n".join(tiles)))

    gallery = "\n".join(parts) if parts else (
        '          <!-- Drop images or video into images/ and rebuild — they become\n'
        "               this project's gallery automatically. -->")

    # the block at the top of the page: a clip if there is one, else the cover
    if p.get("hero_clips"):
        poster = ' poster="images/%s"' % p["hero_poster"] if p.get("hero_poster") else ""
        srcs = "\n".join(
            '        <source src="images/%s" type="%s">'
            % (f, MIME.get(os.path.splitext(f)[1].lower(), ""))
            for f in p["hero_clips"])
        # the film's own shape, so the page reserves the right height for it and
        # nothing is trimmed off the top and bottom to force it into 16:9
        hsize = clip_size(os.path.join(ROOT, "work", p["slug"], "images"),
                          p["hero_clips"], p.get("hero_poster"))
        hratio = ' style="aspect-ratio:%d/%d"' % hsize if hsize else ""

        # A film at the top of a project page is a proper player: controls, a
        # poster frame, and nothing downloaded until someone asks for it. It
        # used to autoplay silently on a loop, which is the right behaviour for
        # a short ambient clip and the wrong one for anything with a beginning
        # and an end — you couldn't pause it, couldn't hear it, couldn't scrub,
        # and a four-minute film pulled thirty megabytes before the page had
        # finished settling.
        #
        # The old behaviour is still one line away, per project: put
        # "hero_loop": true in project.json and it goes back to a silent loop.
        # Gallery clips named NN-loop.* are unaffected, and remain the way to
        # get motion that starts by itself.
        # preload="none", not "metadata". A hero film is the biggest file on its
        # page, and "metadata" is only a hint — whether the browser can fetch
        # just the header depends on the server answering range requests, and
        # when it can't the browser takes the whole file. Measured on a server
        # without range support: 30.26 MB pulled for a film nobody had asked to
        # watch. "none" doesn't depend on the server at all. The cost is that
        # the duration doesn't appear in the controls until first play, which is
        # a fair price for thirty megabytes.
        #
        # A -loop clip keeps "metadata" — it's meant to start by itself, so it
        # has to be allowed to load.
        if p.get("hero_loop"):
            video = ('<video data-loop muted loop playsinline preload="metadata"%s\n'
                     '             aria-label="%s">' % (poster, attr("%s — film" % plain(p["title"]))))
        else:
            video = ('<video controls playsinline preload="none"%s\n'
                     '             aria-label="%s">' % (poster, attr("%s — film" % plain(p["title"]))))
        hero_block = (
            '    <div class="plate plate--hero plate--vid"%s data-clip>\n'
            '      %s\n%s\n      </video>\n'
            '    </div>' % (hratio, video, srcs))
    else:
        # hero.jpg if there is one, otherwise the cover. Two pictures rather
        # than one, because the card in the grid and the top of the page are
        # doing different jobs: the card is small and wants something that
        # reads at a glance, the page is full width and can carry detail.
        still = p.get("hero_still")
        if still:
            src = "images/%s" % still
            size = image_size(os.path.join(ROOT, "work", p["slug"], "images", still)) \
                or p["cover_size"]
            alt = "%s — hero image" % plain(p["title"])
        else:
            src, size = cover, p["cover_size"]
            alt = p.get("cover_alt") or "%s — cover image" % plain(p["title"])
        hero_block = (
            '    <div class="plate plate--hero" style="aspect-ratio:%d/%d" data-clip>\n'
            '      <img class="cover" src="%s" alt="%s" width="%d" height="%d" '
            'loading="eager" decoding="async">\n'
            '    </div>' % (size[0], size[1], src, attr(alt), size[0], size[1]))

    return fill(read(os.path.join(TPL, "case.html")),
                footer=footer(root, root + "index.html#contact"),
                social=social(root),
                hero_block=hero_block,
                cover_w=str(p["cover_size"][0]),
                cover_h=str(p["cover_size"][1]),
                root=root, base=base, work=page("../"),
                title=p["title"], title_plain=attr(plain(p["title"])),
                summary=p["summary"], summary_attr=attr(p["summary"]),
                index="%02d" % i, total="%02d" % total,
                chips="\n".join(chips),
                cover=cover,
                cover_alt=attr(p.get("cover_alt") or "%s — cover image" % plain(p["title"])),
                meta="\n".join(meta_rows),
                blocks="\n".join(blocks).rstrip(),
                gallery=gallery,
                next_href=page("../%s/" % nxt["slug"]),
                next_title=nxt["title"],
                next_cover=("../%s/images/%s" % (nxt["slug"], nxt["cover_file"])
                            if nxt["cover_file"] else BLANK))


# Values that already mean "leave me alone". Everything else in a fill= or
# stroke= is a literal colour, whether it's #hex, rgb(), hsl() or a name like
# "black" — and a literal colour is exactly what stops an icon following the
# page.
KEEP_PAINT = ("none", "currentcolor", "inherit", "transparent",
              "context-fill", "context-stroke")


def _paint(value):
    """currentColor, unless the value is one of the keywords above or a
    reference to a gradient or pattern."""
    v = value.strip()
    if v.lower() in KEEP_PAINT or v.lower().startswith("url("):
        return value
    return "currentColor"


def inline_svg(svg, label="icon"):
    """Prepare an SVG to be dropped straight into the page and take its colour
    from CSS.

    The site tints icons by setting `color` on a parent and letting the drawing
    inherit it, which only works if the drawing actually asks for
    `currentColor`. The icons shipped here are outlines that do, so for a long
    time swapping in your own worked — right up until yours happened to be a
    *filled* shape. Then the fill stayed whatever colour it was exported as and
    the icon sat there ignoring every hover on the page.

    Rather than ask anyone to hand-edit an export, every literal colour is
    rewritten here: on attributes, in inline style="", and inside any <style>
    block, which is where Illustrator puts them (.cls-1 { fill: #231f20 }).
    `none` survives, so outline icons keep their hollow centres, and so does
    url(#…) so a deliberate gradient isn't flattened — though a gradient can't
    follow the hover colour, and gets a note saying so.

    SVG's initial fill is black, not inherited, so a shape with no fill at all
    would render black no matter what we do to the rest. The root svg gets an
    explicit fill="currentColor" to catch those."""
    svg = re.sub(r"<\?xml.*?\?>", "", svg, flags=re.S)
    svg = re.sub(r"<!--.*?-->", "", svg, flags=re.S).strip()
    svg = svg.replace(' xmlns="http://www.w3.org/2000/svg"', "")

    # fill="#231f20" / stroke="red" → currentColor
    svg = re.sub(r'\b(fill|stroke)="([^"]*)"',
                 lambda m: '%s="%s"' % (m.group(1), _paint(m.group(2))), svg)
    # The same properties written as CSS, in style="" or in a <style> block.
    # The closing bracket has to stay inside the value or rgb(20,20,20) is
    # matched without its ")" and the replacement leaves the bracket stranded
    # in the output. Only ; } " ' end a value.
    svg = re.sub(r'\b(fill|stroke)\s*:\s*([^;"}\']+)',
                 lambda m: '%s:%s' % (m.group(1), _paint(m.group(2))), svg)

    m = re.match(r"<svg\b([^>]*)>", svg)
    if m:
        attrs = m.group(1)
        head = "<svg" + attrs
        if not re.search(r'\bfill\s*=', attrs):
            head += ' fill="currentColor"'
        if "viewBox" in attrs:
            # let the CSS own the size; a hard width/height fights it
            head = re.sub(r'\s\b(width|height)="[^"]*"', "", head)
        else:
            # without a viewBox the width and height are the only thing giving
            # the drawing a coordinate space, so they have to stay
            print("  ! %s has no viewBox, so it can't scale to the icon slot — "
                  "re-export it with one (Illustrator: 'Responsive')" % label)
        svg = head + ">" + svg[m.end():]

    if "url(#" in svg:
        print("  · %s uses a gradient or pattern, so it keeps its own colours "
              "and won't follow the hover" % label)
    return svg


def about_content():
    """Skills and software come from content/about.json, not from the markup.

    Each software entry names an icon file in assets/img/tools/. The file is
    read and dropped straight into the page rather than linked, so it keeps
    inheriting the page's colour — an <img> can't do that. Swap the .svg, run
    the build, and the new icon is in. Any drawing works; the ones here are a
    single 1.5px stroke on a 24x24 grid, which is what makes the row read as a
    set rather than sixteen logos."""
    path = os.path.join(ROOT, "content", "about.json")
    if not os.path.exists(path):
        return None, None
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)

    sets = []
    for i, group in enumerate(data.get("skillsets", []), 1):
        items = "\n".join("            <li>%s</li>" % esc(x) for x in group["items"])
        sets.append('        <section class="skillset" data-reveal>\n'
                    '          <h3>%s <span>%02d</span></h3>\n'
                    '          <ul>\n%s\n          </ul>\n'
                    '        </section>' % (esc(group["title"]), i, items))

    tiles = []
    for t in data.get("software", []):
        icon = os.path.join(ROOT, "assets", "img", "tools", t["icon"] + ".svg")
        if os.path.exists(icon):
            with open(icon, encoding="utf-8") as fh:
                svg = inline_svg(fh.read(), "assets/img/tools/%s.svg" % t["icon"])
        else:
            print("  ! assets/img/tools/%s.svg is missing — %s has no icon"
                  % (t["icon"], t["name"]))
            svg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="4" width="16" height="16"/></svg>'
        tiles.append('        <div class="tool" data-reveal>\n'
                     '          <span class="tool__i" aria-hidden="true">%s</span>\n'
                     '          <span class="tool__n">%s</span>\n'
                     '          <span class="tool__m">%s</span>\n'
                     '        </div>' % (svg, esc(t["name"]), esc(t.get("note", ""))))

    return "\n".join(sets), "\n\n".join(tiles)


SIG_DIR = ("assets", "img", "site")
SIG_ORDER = (".svg", ".png", ".webp", ".jpg", ".jpeg")


def signature():
    """Whatever `assets/img/site/signature.*` happens to be.

    Two paths, because two kinds of person will replace this file.

    An **.svg** is inlined into the page. Drawn with stroke="currentColor" it
    then follows the text colour, and would follow a palette change with it —
    an <img> can't do that.

    A **.png / .jpg / .webp** is linked as an ordinary image and carries a class
    that inverts it and blends it onto the page. That turns a plain phone
    photo of a signature on white paper into a clean light mark on the dark
    background, with no tracing, no background removal and no editing — which
    is the difference between "swap this file" being a five-minute job and a
    five-second one.

    Nothing there at all means no signature and no error."""
    found = None
    for ext in SIG_ORDER:
        cand = os.path.join(ROOT, *SIG_DIR, "signature" + ext)
        if os.path.exists(cand):
            found = (cand, ext)
            break
    if not found:
        return ""
    path, ext = found

    if ext == ".svg":
        with open(path, encoding="utf-8") as fh:
            return inline_svg(fh.read(), "assets/img/site/signature.svg")

    size = image_size(path) or (900, 300)
    # A PNG that already has transparency needs no treatment at all — the
    # colour-type byte in the IHDR says whether it has an alpha channel
    # (4 = grey+alpha, 6 = RGB+alpha), so we can tell without decoding it.
    alpha = False
    if ext == ".png":
        try:
            with open(path, "rb") as fh:
                alpha = fh.read(26)[25] in (4, 6)
        except Exception:
            alpha = False
    return ('<img class="sig__raster%s" src="assets/img/site/signature%s" alt="" '
            'width="%d" height="%d" loading="lazy" decoding="async">'
            % (" sig__raster--alpha" if alpha else "", ext, size[0], size[1]))


HOME_HERO_DIR = ("assets", "img", "home")
HOME_HERO_ORDER = (".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg")


def home_hero():
    """The picture in the band on the home page: whatever
    `assets/img/home/hero.*` happens to be.

    This used to be a hard-coded <img src> that had to be edited by hand, which
    meant dropping a hero.jpg next to the placeholder hero.svg did nothing at
    all — the page went on pointing at the placeholder, and the only clue was a
    comment in the HTML. Now the extension is discovered here, so replacing the
    picture is the same gesture as replacing any other picture on this site:
    put the file in the folder and rebuild.

    A .jpg wins over a .svg when both are present, so the placeholder can stay
    where it is as a reference without ever showing up on the page again."""
    found = None
    for ext in HOME_HERO_ORDER:
        cand = os.path.join(ROOT, *HOME_HERO_DIR, "hero" + ext)
        if os.path.exists(cand):
            found = (cand, ext)
            break
    if not found:
        print("  ! no assets/img/home/hero.* — the home page band will be empty")
        return ""
    path, ext = found
    w, h = image_size(path) or (1920, 1080)
    placeholder = ext == ".svg"
    if placeholder:
        print("  · assets/img/home/hero.svg is still the placeholder — drop a "
              "hero.jpg in beside it and rebuild to use your own photo")
    return ('<img class="hero__portrait" src="assets/img/home/hero%s"\n'
            '           alt="%s"\n'
            '           width="%d" height="%d" loading="eager" decoding="async">'
            % (ext,
               "Placeholder hero image. Replace with a photo" if placeholder
               else "Jin Yoshida",
               w, h))


BAND_DIR = ("assets", "img", "about")
BAND_ORDER = (".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif")


def about_band():
    """The wide picture that breaks up the About page — `assets/img/about/band.*`.

    Absent, it renders nothing at all rather than a grey 21:9 placeholder. A
    placeholder is worth showing while a page is being built and worth hiding
    the moment it's being looked at, and the difference between those two
    states shouldn't require editing HTML. Drop a real photo in and the section
    reappears on the next build.

    Note the deliberate omission of .svg from the accepted list: band.svg is the
    placeholder, so it can stay in the folder as a size reference without ever
    putting itself back on the page."""
    for ext in BAND_ORDER:
        path = os.path.join(ROOT, *BAND_DIR, "band" + ext)
        if os.path.exists(path):
            w, h = image_size(path) or (2400, 1000)
            return ('\n  <figure class="band">\n'
                    '    <div class="frame band__frame" data-clip>\n'
                    '      <img class="frame__media" src="../assets/img/about/band%s" alt="" '
                    'width="%d" height="%d" loading="lazy" decoding="async">\n'
                    '    </div>\n'
                    '  </figure>\n' % (ext, w, h))
    return ""


def about_portrait():
    """The portrait on the About page — `assets/img/about/portrait.*`.

    Unlike the band this one is structural: the About page is a two-column
    layout built around it, so it always renders something. What it doesn't do
    is hard-code the extension, which is what previously made dropping a
    portrait.jpg in beside the placeholder a no-op."""
    order = (".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg")
    for ext in order:
        path = os.path.join(ROOT, *BAND_DIR, "portrait" + ext)
        if not os.path.exists(path):
            continue
        w, h = image_size(path) or (1000, 1300)
        placeholder = ext == ".svg"
        if placeholder:
            print("  · assets/img/about/portrait.svg is still the placeholder — "
                  "drop a portrait.jpg in beside it and rebuild")
        return ('<img class="frame__media" src="../assets/img/about/portrait%s" '
                'alt="%s" width="%d" height="%d" loading="lazy" decoding="async">'
                % (ext,
                   "Placeholder portrait. Replace with a photo of yourself"
                   if placeholder else "Jin Yoshida",
                   w, h))
    print("  ! no assets/img/about/portrait.* — the About page portrait is empty")
    return ""


def publish_files(projects):
    """Two files GitHub Pages needs that nothing else on the site produces.

    **CNAME** is the custom domain, and it has to exist in the repository, not
    just in the repository's settings. GitHub writes it for you when you first
    set the domain — and then it is an ordinary tracked file, so the next time
    the folder is uploaded without it the custom domain silently unsets and the
    site drops back to <user>.github.io. Writing it from SITE_URL on every build
    means it can't go missing, and can't disagree with the og: tags either.

    **sitemap.xml** lists every page for search engines, which matters more than
    usual here: nine project pages are only reachable through a horizontal rail
    and an archive, so a crawler that gives up early sees very little of the
    work.

    Both are skipped when SITE_URL is blank, since neither means anything
    without a domain."""
    if not SITE_URL:
        return
    base = SITE_URL.rstrip("/")
    host = re.sub(r"^https?://", "", base)

    write(os.path.join(ROOT, "CNAME"), host + "\n")

    urls = ["", page("work/"), page("about/")] + \
           [page("work/%s/" % p["slug"]) for p in projects]
    body = "\n".join(
        '  <url><loc>%s/%s</loc></url>' % (base, u) for u in urls)
    write(os.path.join(ROOT, "sitemap.xml"),
          '<?xml version="1.0" encoding="UTF-8"?>\n'
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
          '%s\n</urlset>\n' % body)


def social(root):
    """The block of icon and social-preview tags every page carries.

    One source for all of it, because these are the tags nobody remembers to
    keep in step: they sit in the <head> of twelve pages, they're invisible
    when wrong, and the only symptom of a mistake is a link that unfurls as a
    grey box somewhere you can't see.

    Two things here are corrections rather than decoration.

    The preview image is a **.png**. It used to be an .svg, which no social
    platform will render — Facebook, LinkedIn, X, Slack and iMessage all
    ignore SVG — so every link to this site has been unfurling blank.

    And its URL is **absolute**. og:image is fetched by a crawler that has no
    page context to resolve a relative path against, so `assets/img/site/og.png`
    is a coin flip depending on the scraper. SITE_URL at the top of this file
    is the one place that changes."""
    og = "%s/assets/img/site/og.png" % SITE_URL.rstrip("/") if SITE_URL \
        else root + "assets/img/site/og.png"
    return "\n".join([
        '<meta property="og:image" content="%s">' % og,
        '<meta property="og:image:type" content="image/png">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta property="og:image:alt" content="Jin Yoshida - multidisciplinary designer, Melbourne">',
        '<meta name="twitter:image" content="%s">' % og,
        # svg first for the browsers that take it, png for the ones that don't
        '<link rel="icon" href="%sassets/img/site/favicon.svg" type="image/svg+xml">' % root,
        '<link rel="icon" href="%sassets/img/site/favicon-32.png" sizes="32x32" type="image/png">' % root,
        '<link rel="apple-touch-icon" href="%sassets/img/site/apple-touch-icon.png">' % root,
    ])


def footer(root, contact):
    """The site footer, from tools/templates/footer.html. One source; every
    page fills in its own path prefix and its own contact target."""
    return fill(read(os.path.join(TPL, "footer.html")),
                root=root, contact=contact).rstrip("\n")


def inject(html, name, content):
    """Replace whatever sits between <!--BUILD:name--> and <!--/BUILD:name-->."""
    pattern = re.compile(r"(<!--BUILD:%s-->).*?(<!--/BUILD:%s-->)" % (name, name), re.S)
    if not pattern.search(html):
        raise SystemExit("a page is missing its <!--BUILD:%s--> markers" % name)
    return pattern.sub(lambda m: m.group(1) + content + m.group(2), html)


# ---------------------------------------------------------------- commands
def scaffold(title):
    slug = slugify(title)
    folder = os.path.join(WORK, slug)
    if os.path.exists(folder):
        raise SystemExit("work/%s already exists" % slug)
    os.makedirs(os.path.join(folder, "images"))
    starter = {
        "title": title,
        "date": "2026-01",
        "year": "2026",
        "highlight": True,
        "badge": "Client",
        "tags": ["Discipline", "Discipline"],
        "summary": "One or two sentences describing the project. This shows on the card, "
                   "on the work page and at the top of the project page.",
        "meta": {
            "Client": "",
            "Industry": "",
            "Year": "2026",
            "Software": "",
            "Deliverables": ""
        },
        "blocks": [
            {"label": "Overview",
             "heading": "A short line that sums it up.",
             "paras": ["What the project was, what you did, and why it mattered."]}
        ]
    }
    write(os.path.join(folder, "project.json"),
          json.dumps(starter, indent=2, ensure_ascii=False) + "\n")
    print("created work/%s/" % slug)
    print("  1. put your images in work/%s/images/ (name one of them cover.jpg)" % slug)
    print("  2. edit work/%s/project.json" % slug)
    print("  3. run: python3 tools/build.py")
    return slug


def build():
    projects = load_projects()
    if not projects:
        raise SystemExit("no projects found in work/")
    total = len(projects)

    # case pages
    for i, p in enumerate(projects):
        nxt = projects[(i + 1) % total]
        write(os.path.join(WORK, p["slug"], "index.html"),
              render_case(p, i + 1, total, nxt))

    # work archive
    # the archive uses bands, not cards — one project per row, sides alternating
    cards = [render_band(p, page("%s/" % p["slug"]),
                         "%s/images/%s" % (p["slug"], p["cover_file"]) if p["cover_file"] else None,
                         i + 1, total, i < 2)
             for i, p in enumerate(projects)]
    write(os.path.join(WORK, "index.html"),
          fill(read(os.path.join(TPL, "work-index.html")),
               root="../", total=total, total_pad="%02d" % total,
               cards="\n".join(cards),
               social=social("../"),
               footer=footer("../", "../index.html#contact"),
               self_link=page("./")))

    # homepage highlights
    highlights = [p for p in projects if p.get("highlight")][:HOME_MAX]
    if not highlights:
        highlights = projects[:HOME_MAX]
    home_cards = [render_card(p, page("work/%s/" % p["slug"]),
                              "work/%s/images/%s" % (p["slug"], p["cover_file"]) if p["cover_file"] else None,
                              i < 2)
                  for i, p in enumerate(highlights)]

    index_path = os.path.join(ROOT, "index.html")
    html = read(index_path)
    # keep the homepage's hand-written links to the archive in the same style
    html = re.sub(r'href="work/(index\.html)?"', 'href="%s"' % page("work/"), html)
    html = inject(html, "work-grid", "\n" + "\n".join(home_cards) + "\n      ")
    html = inject(html, "count", "%02d" % len(highlights))
    html = inject(html, "count2", "%02d" % len(highlights))
    html = inject(html, "all-link", "See all %d projects" % total)
    html = inject(html, "footer", "\n" + footer("", "#contact") + "\n")
    html = inject(html, "signature", signature())
    html = inject(html, "social", "\n" + social("") + "\n")
    html = inject(html, "home-hero", "\n      " + home_hero() + "\n    ")
    write(index_path, html)

    # The About page is hand-written too, but its footer comes from the same
    # partial as everywhere else — edit tools/templates/footer.html once and
    # every page picks it up on the next build.
    about_path = os.path.join(ROOT, "about", "index.html")
    if os.path.exists(about_path):
        about = read(about_path)
        about = inject(about, "footer", "\n" + footer("../", "#contact") + "\n")
        about = inject(about, "social", "\n" + social("../") + "\n")
        about = inject(about, "about-band", about_band())
        about = inject(about, "about-portrait", about_portrait())
        sets, tiles = about_content()
        if sets is not None:
            about = inject(about, "skillsets", "\n" + sets + "\n        ")
            about = inject(about, "tools", "\n" + tiles + "\n        ")
        write(about_path, about)

    publish_files(projects)

    shown = len(highlights)
    print("built %d projects" % total)
    print("  homepage:  %d highlight%s (cap %d)" % (shown, "" if shown == 1 else "s", HOME_MAX))
    print("  work page: %d" % total)
    for p in projects:
        flag = "★" if p.get("highlight") else " "
        srcs = p.get("sources") or {}
        clips = sum(1 for f in p["gallery_files"] if f in srcs)
        imgs = len(p["gallery_files"]) - clips + (1 if p["cover_file"] else 0)
        note = "%2d image%s" % (imgs, "" if imgs == 1 else "s")
        if clips:
            note += ", %d clip%s" % (clips, "" if clips == 1 else "s")
        if p.get("video"):
            note += ", 1 embed"
        print("   %s %-34s %-8s %s" % (flag, p["slug"], p["date"], note))


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "new":
        if len(sys.argv) < 3:
            raise SystemExit('usage: python3 tools/build.py new "Project Title"')
        scaffold(" ".join(sys.argv[2:]))
        print()
    build()
