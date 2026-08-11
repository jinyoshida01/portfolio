#!/usr/bin/env python3
"""
Builds the ten starter templates in templates/.

Each one is a complete, copy-paste-ready project folder: a project.json full of
placeholder writing, and an images/ folder of placeholder art at the right
shapes. Copy a folder into work/, rename it, swap the pictures, edit the words.

Run this only if you want to regenerate them — you never need to for normal use.
Nothing here touches the live site.
"""
import json
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "templates")

INK = "#08080A"
BONE = "#EFEBE3"
EMBER = "#FA3C3C"


def panel(w, h, label, sub="", accent=False):
    """A placeholder image: its own dimensions printed on it, so you can see at
    a glance which slot you're looking at and what shape it wants."""
    bar = EMBER if accent else BONE
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img">
  <rect width="{w}" height="{h}" fill="#101015"/>
  <rect x="1" y="1" width="{w-2}" height="{h-2}" fill="none" stroke="{BONE}" stroke-opacity="0.14"/>
  <rect x="{w*0.06:.0f}" y="{h*0.5-2:.0f}" width="{w*0.10:.0f}" height="3" fill="{bar}" opacity="0.85"/>
  <text x="{w*0.06:.0f}" y="{h*0.5-28:.0f}" font-family="ui-monospace,Menlo,monospace"
        font-size="{max(13, int(h*0.052))}" fill="{BONE}" opacity="0.82" letter-spacing="4">{label}</text>
  <text x="{w*0.06:.0f}" y="{h*0.5+42:.0f}" font-family="ui-monospace,Menlo,monospace"
        font-size="{max(11, int(h*0.036))}" fill="{BONE}" opacity="0.42" letter-spacing="3">{sub or f'{w} x {h}'}</text>
</svg>
'''


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def clip(dst_dir, stem):
    """Drop the shared placeholder clip in, under a given name.

    It lives in tools/spare/ and not in any real project. It used to be copied
    out of work/everything-black-mv/, which was fine only for as long as that
    folder happened to hold a placeholder — the moment the real film landed
    there, regenerating the templates would have quietly copied a 45 MB music
    video into three of them."""
    src = os.path.join(ROOT, "tools", "spare")
    for ext in ("mp4", "webm", "jpg"):
        s = os.path.join(src, "placeholder-clip." + ext)
        if os.path.exists(s):
            shutil.copy(s, os.path.join(dst_dir, "%s.%s" % (stem, ext)))


def project(title, note, tags, summary, blocks, meta=None):
    return {
        "_template": note,
        "title": title,
        "date": "2026-01",
        "year": "2026",
        "highlight": False,
        "badge": "Client name",
        "short": " · ".join(tags[:2]),
        "tags": tags,
        "summary": summary,
        "meta": meta or {
            "Client": "Who it was for",
            "Industry": "Their field",
            "Year": "2026",
            "Software": "What you used",
            "Deliverables": "What you handed over",
        },
        "blocks": blocks,
    }


def block(label, heading, *paras):
    return {"label": label, "heading": heading, "paras": list(paras)}


LOREM_1 = ("Two or three sentences on what the job actually was and what you were "
           "asked to solve. Keep it concrete — what existed before, what was "
           "missing, and what you were brought in to make.")
LOREM_2 = ("What you did about it. The decision that shaped the outcome, and why "
           "you made it. This is the part people read to work out how you think, "
           "so it's worth more than a list of deliverables.")
LOREM_3 = ("How it landed. A number, a launch, a reaction, or simply what shipped. "
           "One short paragraph is plenty.")

TEMPLATES = []


def add(folder, note, title, tags, summary, blocks, images, clips=(), hero=False):
    TEMPLATES.append((folder, note, title, tags, summary, blocks, images, clips, hero))


# 01 ── the simplest possible project
add("01-one-image", "Cover plus a single image. The least you can publish.",
    "One Image Project", ["Discipline", "Second discipline"],
    "A one-line description of the project. This is what shows under the title, "
    "and in the card on the work grid.",
    [block("Overview", "A single heading that says what it was.", LOREM_1)],
    [("cover", 1600, 1200, "COVER"), ("01", 1600, 1200, "IMAGE 01")])

# 02 ── the standard photo essay
add("02-photo-story", "Cover plus six stills. The everyday case study.",
    "Photo Story Project", ["Photography", "Art direction"],
    "A project told mostly in pictures, with short passages of writing between "
    "them to carry the reader through.",
    [block("Overview", "What the brief was.", LOREM_1),
     block("Approach", "How you went about it.", LOREM_2),
     block("Outcome", "Where it ended up.", LOREM_3)],
    [("cover", 1600, 1200, "COVER")] + [("%02d" % i, 1600, 1067, "IMAGE %02d" % i) for i in range(1, 7)])

# 03 ── video at the top of the page
add("03-video-hero", "A clip at the top of the page instead of a still. hero.mp4 does that.",
    "Video Hero Project", ["Motion design", "Video editing"],
    "A project that leads with moving image — the film runs at the top of the "
    "page, with stills underneath it.",
    [block("Overview", "What you were making.", LOREM_1),
     block("Process", "How it was put together.", LOREM_2)],
    [("cover", 1600, 1200, "COVER (card only)"), ("01", 1600, 900, "IMAGE 01"),
     ("02", 1600, 900, "IMAGE 02"), ("03", 1600, 900, "IMAGE 03")],
    hero=True)

# 04 ── video as the first thing in the gallery
add("04-video-first", "Still cover, clip as the first gallery item.",
    "Video First Project", ["Video editing", "Direction"],
    "A project where the film is the main event but the card still needs a "
    "strong still to pull people in.",
    [block("Overview", "The brief.", LOREM_1),
     block("Edit", "The thinking behind the cut.", LOREM_2)],
    [("cover", 1600, 1200, "COVER"), ("02", 1600, 900, "IMAGE 02"),
     ("03", 1600, 900, "IMAGE 03")],
    clips=[("01-video", "VIDEO — first item")])

# 05 ── a reel of silent looping clips
add("05-motion-reel", "Several silent looping clips. The -loop suffix is what makes them autoplay.",
    "Motion Reel Project", ["Motion design", "Animation"],
    "A set of short motion pieces, each looping silently, the way a showreel "
    "page should behave.",
    [block("Overview", "What the set is.", LOREM_1),
     block("Craft", "What holds it together.", LOREM_2)],
    [("cover", 1600, 1200, "COVER")],
    clips=[("01-loop", "LOOP 01"), ("02-loop", "LOOP 02"),
           ("03-loop", "LOOP 03"), ("04-loop", "LOOP 04")])

# 06 ── stills and motion interleaved
add("06-mixed-media", "Stills and a clip mixed together, in filename order.",
    "Mixed Media Project", ["Design", "Motion", "Photography"],
    "A project with several kinds of output in it, ordered so the page reads "
    "as one sequence rather than three separate sets.",
    [block("Overview", "The scope.", LOREM_1),
     block("Making", "How the pieces relate.", LOREM_2),
     block("Result", "What shipped.", LOREM_3)],
    [("cover", 1600, 1200, "COVER"), ("01", 1600, 1067, "IMAGE 01"),
     ("02", 1600, 1067, "IMAGE 02"), ("04", 1600, 1067, "IMAGE 04"),
     ("05", 1600, 1067, "IMAGE 05")],
    clips=[("03-loop", "LOOP — third item")])

# 07 ── wide pictures
add("07-wide-format", "Panoramic pictures. Anything wider than 16:9 takes the full page width.",
    "Wide Format Project", ["Publication design", "Print"],
    "A project whose images want room — spreads, panoramas, long horizontal "
    "compositions.",
    [block("Overview", "The format and why.", LOREM_1),
     block("Detail", "What repays a closer look.", LOREM_2)],
    [("cover", 1600, 1200, "COVER")] + [("%02d" % i, 2400, 1000, "WIDE %02d" % i) for i in range(1, 4)])

# 08 ── tall pictures
add("08-portrait-set", "Tall pictures. They sit in one column at their own height, never cropped.",
    "Portrait Set Project", ["Photography", "Portraiture"],
    "A project of upright images — portraits, posters, packaging shot straight "
    "on.",
    [block("Overview", "Who and what.", LOREM_1),
     block("Approach", "How they were made.", LOREM_2)],
    [("cover", 1600, 1200, "COVER")] + [("%02d" % i, 900, 1200, "TALL %02d" % i) for i in range(1, 7)])

# 09 ── writing-led
add("09-written-case", "Five passages of writing, two images. For work that needs explaining.",
    "Written Case Study", ["Strategy", "Design"],
    "A project where the thinking matters more than the pictures — research, "
    "systems work, anything that needs an argument made for it.",
    [block("Background", "The situation you walked into.", LOREM_1),
     block("Problem", "What was actually wrong.", LOREM_2),
     block("Approach", "The route you took, and the ones you didn't.", LOREM_2, LOREM_1),
     block("Detail", "One decision, examined properly.", LOREM_2),
     block("Outcome", "What changed as a result.", LOREM_3)],
    [("cover", 1600, 1200, "COVER"), ("01", 1600, 1067, "IMAGE 01"),
     ("02", 1600, 1067, "IMAGE 02")])

# 10 ── cover only
add("10-cover-only", "Cover and words, no gallery at all. Good for work you can't show much of.",
    "Cover Only Project", ["Discipline"],
    "A project you can name but not show — under embargo, under NDA, or simply "
    "not photogenic.",
    [block("Overview", "What it was.", LOREM_1),
     block("Note", "Why there's nothing to show.",
           "Say plainly that the work is under wraps. People understand it, and "
           "an honest line reads better than a thin gallery.")],
    [("cover", 1600, 1200, "COVER")])


def readme():
    """The guide that sits in templates/.

    It's written here rather than kept as a loose file because main() deletes
    and recreates the whole folder — a hand-maintained README in there survives
    exactly until someone regenerates, and then it's gone without a trace. The
    table is built from the same TEMPLATES list the folders come from, so it
    can't drift out of step with what's actually on disk either."""
    rows = "\n".join("| `%s` | %s |" % (t[0], t[1].split(".")[0] + ".")
                     for t in TEMPLATES)
    return """# Templates

Ten ready-made project folders. Nothing in here is published — this folder is not part
of the site, it's a drawer you take things out of.

## How to use one

1. Copy a folder from here into `work/`.
2. Rename it. That name becomes the web address, so use lowercase and hyphens:
   `sunset-festival-posters`, not `Sunset Festival Posters`.
3. Swap the placeholder pictures in its `images/` folder for yours, keeping the filenames.
4. Open `project.json` and replace the placeholder writing.
5. Double-click `Build.command`.

That's it. The project appears on the work page, and on the home page too if you set
`"highlight": true`.

## The ten

| Folder | What it's for |
| --- | --- |
%s

Every placeholder picture has its own dimensions printed on it, so you can see what shape
each slot wants before you export anything. The cover placeholder is marked with a red
rule; the rest are white.

## The clips

The placeholder clips are named the way every clip on the site is named, and the name is
what decides the behaviour:

| Name | What it does |
| --- | --- |
| `hero.mp4` | a full-width player at the top of the project page, in place of the big picture |
| `NN-loop.mp4` | plays itself, silently, on repeat |
| `NN-video.mp4` | an ordinary player with a play button |

Keep the name when you swap your own film in and the page behaves the same way. The shape
doesn't have to match the placeholder — the build reads the real dimensions out of your
file, so nothing is cropped to fit. The `.jpg` beside a clip is the still shown before it
loads, and the `.webm` is a smaller second copy most browsers will take instead.

## The `_template` line

Each `project.json` starts with a `"_template"` line describing what that template is for.
The build ignores it. Delete it once you've made the project your own, or leave it — it
does no harm either way.

## Regenerating these

`python3 tools/make_templates.py` rebuilds this folder from scratch. You never need to run
it for normal use; it exists so the templates can be changed in one place rather than ten.
Running it **deletes and recreates** `templates/`, this README included, so don't keep
anything of your own in here.
""" % rows


def main():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    for folder, note, title, tags, summary, blocks, images, clips, hero in TEMPLATES:
        d = os.path.join(OUT, folder)
        imgs = os.path.join(d, "images")
        os.makedirs(imgs, exist_ok=True)
        for name, w, h, label in images:
            write(os.path.join(imgs, name + ".svg"),
                  panel(w, h, label, accent=(name == "cover")))
        for stem, label in clips:
            clip(imgs, stem)
        if hero:
            clip(imgs, "hero")
        write(os.path.join(d, "project.json"),
              json.dumps(project(title, note, tags, summary, blocks), indent=2, ensure_ascii=False) + "\n")
        print("  %-18s %s" % (folder, note))
    write(os.path.join(OUT, "README.md"), readme())


if __name__ == "__main__":
    main()
    print("\n  %d templates in templates/" % len(TEMPLATES))
