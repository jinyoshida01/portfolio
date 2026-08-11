# Jin Yoshida, portfolio

A static website. Plain HTML, CSS and JavaScript, with no framework, no build tooling to
install and nothing running on a server. The pages you publish are the pages that get
served.

There is one Python script, `tools/build.py`, and its only job is to assemble pages out of
the content you put in folders. Python is already on macOS, so there is nothing to set up.

This document explains how the files are arranged and why, so you can change things
confidently. If you only want the everyday routine, read `START HERE.md` instead. It is
two pages and covers the ninety percent.

---

## The one idea

**Your work lives in folders. The pages are generated from those folders.**

Every project is a folder in `work/`. Inside it are your pictures, your videos, and one
small text file with the writing in it. Nothing anywhere says "this project exists" or
"this image comes third". The build looks at what is in the folder and works it out.

That is the reason for almost every other decision here. It means:

* Adding a project never involves editing HTML, so it never involves breaking HTML.
* The running order of a gallery is the filename order, which you can see in the Finder.
* Removing a project is deleting its folder.
* The card on the home page, the row on the archive, the project page itself, the
  `03 / 09` counters and the next-project link at the bottom all come from the same
  source, so they can never disagree with each other.

The cost is that you have to run the build for changes to appear. That is the trade, and
it is the single rule worth remembering.

---

## Running it

Two files in this folder are meant to be double-clicked.

**`Preview.command`** builds the site and opens it in your browser. Leave the Terminal
window it opens running while you look, then close it.

**`Build.command`** just builds. Use it when you are about to upload and do not need to
look first.

Both run `python3 tools/build.py` underneath. If you prefer a terminal, run that directly.

**The rule: adding a file changes nothing until you build.** Dropping a photo into a
project folder does nothing visible until the build has run. When a picture "is not
showing up", this is almost always the reason.

The first time you double-click either file, macOS will say it is from an unidentified
developer. Right-click the file, choose Open, then Open again in the dialog. Once per
file, then never again.

---

## The map

```
index.html              home page, hand written
about/index.html        about page, hand written
404.html                the not-found page
work/
  index.html            the archive, generated
  <project>/
    project.json        title, date, tags, writing. The file you edit
    images/             cover, gallery stills, video
    index.html          the project page, generated
assets/
  css/style.css         all styling, in numbered sections
  js/main.js            all animation, in numbered sections
  js/vendor/            Lenis, the one third-party file
  fonts/                Sora, Inter, Space Mono, Instrument Serif
  img/home/             the wide picture beside your name
  img/about/            portrait, wide band, capability art
  img/site/             favicon and social card
  img/tools/            the software icons
content/about.json      skills and software lists
tools/build.py          the builder
tools/templates/        the page shells it fills
tools/make_*.py         optional generators, see below
tools/spare/            retired and source files, published but unused
templates/              ten starter project folders, not published
```

A few files exist for the web host rather than for you. `.nojekyll` stops GitHub running
the site through its own processor. `robots.txt` tells search engines what to index.
`sitemap.xml` and `CNAME` are written by the build from the `SITE_URL` line at the top of
`tools/build.py`, so the domain is configured in one place instead of four. `.gitignore`
keeps `templates/` out of the published site.

---

## Adding a project

### 1. Make the folder

Either copy one of the ten starters out of `templates/` into `work/`, or run:

```
python3 tools/build.py new "Sunset Festival Posters"
```

which creates `work/sunset-festival-posters/` with a starter `project.json` and an empty
`images/` folder.

**The folder name becomes the web address**, so keep it lowercase with hyphens.

### 2. Put the pictures in

Everything goes in that project's `images/` folder.

One picture named **`cover`** (`cover.jpg`, `cover.png`, whatever) becomes the card in the
grid and, unless you override it, the big picture at the top of the project page.

Everything else becomes the gallery **in filename order**, which is why naming them `01`,
`02`, `03` is worth the ten seconds. Stills and video sort together in the same sequence.

Sizes and shapes do not matter. The build reads the real dimensions of every file and
gives each picture its own height. Wide pictures take the full width of the page, the rest
sit in a column, and nothing is stretched or cropped to fit a box it was not made for.

### 3. Write the words

`project.json` is a plain text file. TextEdit opens it. Change what is inside the quote
marks and leave the punctuation alone.

```jsonc
{
  "title": "Duress Device Renders",
  "date": "2025-03",        // sort key, newest first. "2025" or "2025-03" both work
  "year": "2024/25",        // what gets displayed, written however you like
  "highlight": true,        // show this one on the home page
  "badge": "Duress",        // the small pill on the card
  "short": "3D · Tooling",  // the label that appears on card hover
  "tags": ["3D rendering", "Plugin development", "Batch exports"],
  "summary": "One or two sentences. Used on the card, the archive and the page.",
  "meta": {                 // the sidebar on the project page. Any rows you want
    "Client": "Duress",
    "Industry": "Safety technology",
    "Year": "2024/25",
    "Software": "KeyShot, Blender",
    "Deliverables": "Rendered asset library, Photoshop plugin"
  },
  "blocks": [               // the body. As many as you like
    {
      "label": "Overview",
      "heading": "One library, every device, every angle.",
      "paras": ["First paragraph.", "Second paragraph."]
    }
  ]
}
```

Only `title` really matters. Everything else falls back to something sensible if you leave
it out. Inside a paragraph you can use `<strong>`, `<em>` and `<code>`.

### 4. Build

Double-click `Build.command`. The project appears on the archive page, and on the home
page too if you set `"highlight": true`.

### Which projects reach the home page

The home page shows the **eight most recent projects with `"highlight": true`**, newest
first by `date`. The archive shows everything. Mark a ninth as a highlight and the oldest
one drops off the home page by itself. The cap is `HOME_MAX` at the top of
`tools/build.py`.

---

## Pictures

### The one at the top of a project page

`cover.*` does two jobs by default: the card in the grid, and the top of the project page.
A card is small and wants something that reads at a glance; the page runs the full width
and can carry detail. When one picture should not do both, add a second one named
**`hero.*`**:

| In `images/` | The card | The top of the page |
| --- | --- | --- |
| `cover.jpg` only | `cover.jpg` | `cover.jpg` |
| `cover.jpg` and `hero.jpg` | `cover.jpg` | `hero.jpg`, at its own shape |
| `cover.jpg` and `hero.mp4` | `cover.jpg` | the film, as a player |
| `cover.jpg`, `hero.mp4`, `hero.jpg` | `cover.jpg` | the film, with `hero.jpg` as its holding frame |

Anything called `hero.*` never appears in the gallery. On its own it is the hero; next to
a clip it is that clip's holding frame. So going back to a still after using a film means
moving the `hero.mp4` and `hero.webm` out of the folder and rebuilding, and the frame that
was already there takes over.

### Animated covers

A cover can be a **GIF**. Name it `cover.gif` and it animates in the grid, which is a good
way to make one project catch the eye.

Two things to know first. An animated cover keeps animating even for visitors who have
asked their system for reduced motion, and nothing in CSS can stop it, so use it sparingly
and never for anything flashing. And GIFs are heavy: the build warns above 2 MB, because
several of those make the grid sluggish. A short `-loop.mp4` in the gallery usually gets
the same effect for a tenth of the weight.

If both `cover.jpg` and `cover.gif` are present, the `.jpg` wins and the build says so
rather than choosing silently.

### The fixed pictures elsewhere

Four pictures are not part of any project. All four are found by name rather than by a
path written into the HTML, so replacing one means dropping a file in a folder and
rebuilding. A `.jpg` always beats a `.svg`, which is what lets the grey placeholders stay
where they are as size references.

| File | Where it appears | If it is missing |
| --- | --- | --- |
| `assets/img/home/hero.*` | the wide band beside your name | placeholder shows, and the build says so |
| `assets/img/about/portrait.*` | beside the About introduction | placeholder shows, and the build says so |
| `assets/img/about/band.*` | the wide break on the About page | **the section is not rendered at all** |
| `assets/img/site/signature.*` | under the home page pitch | nothing renders |

The band behaves differently on purpose. A placeholder earns its place while a page is
being built and stops earning it the moment the page is being looked at, and switching
between those two states should not mean commenting out HTML. Its list of accepted formats
deliberately leaves out `.svg`, so `band.svg` can sit in the folder as a size reference
without ever putting itself back on the page.

The signature has two paths, because two kinds of file turn up. An **SVG** is placed
directly into the page, so if it is drawn with `stroke="currentColor"` it follows the text
colour and would follow a palette change with it. A **photo** (`.jpg`, `.png`, `.webp`) is
linked as an image and carries a class that inverts it and blends it onto the page, which
turns a phone photo of a signature on white paper into a clean light mark on the dark
background with no tracing and no background removal.

---

## Video

Video goes in the same `images/` folder as the pictures and sorts in with them by
filename.

**There are three names a clip can have**, and the name is what decides its behaviour.
Every project uses the same three, so a folder listing tells you what a page does without
your having to open it.

| Name it | It becomes |
| --- | --- |
| `hero.mp4` | a full width player at the top of the page, in place of the big picture |
| `01-loop.mp4` | a silent loop that plays itself: muted, repeating, no controls |
| `01-video.mp4` | an ordinary player with a play button, which waits to be asked |

The two digit number is the running order, shared with the stills, so `01-video.mp4`,
`02.jpg`, `03-loop.mp4` reads down the page in that order.

Any other name still works and is treated as a controls clip, but the build will name it
and suggest the right form. A folder of `01-film`, `02-reel-loop`, `03-walkthrough` is a
folder whose behaviour nobody can predict from the outside.

Two optional files can sit beside a clip. `01-video.jpg` is the frame shown before it
loads. `01-video.webm` is a second copy of the same film that most browsers will download
instead, because it is smaller.

### What the build does with them

**Shape is read from the film, not guessed.** `build.py` opens each `.mp4` and reads the
real pixel dimensions out of its track header, then writes them onto the page, so the
right amount of space is reserved before a single byte of video has arrived. `main.js`
confirms that against the browser's own metadata once the file is open, which covers
formats the builder cannot parse and anything dropped in without a rebuild. A holding
frame is only a fallback for the shape, never the source of it, which matters because a
holding frame is often a nice still from the shoot rather than an actual frame of the
film.

**A hero clip is a player, not an autoplaying background.** It shows its holding frame and
downloads nothing until somebody presses play. If a particular project wants the old
behaviour, a silent loop, which suits a short ambient clip and does not suit anything with
a beginning and an end, add one line to that project's `project.json`:

```jsonc
"hero_loop": true
```

A `-loop` clip only plays while it is on screen, and never plays at all under
`prefers-reduced-motion`, where its holding frame stands in. That is why it is worth
giving every loop one.

### Formats and weight

H.264 `.mp4` plays everywhere and is the safe single choice. A VP9 `.webm` alongside it is
smaller on the browsers that take it, at the cost of a second export, and the build prints
a quiet note for any clip that has not got one.

It also checks the sizes against each other. The webm is offered to the browser first, so
a webm that came out *larger* than its own mp4 means most visitors download the bigger of
the two files and the pairing costs more than shipping the mp4 alone. That is easy to do
by accident, since a quality setting that is generous for VP9 quietly overshoots whatever
the H.264 was encoded at.

Export masters do not belong on a web page. Aim for roughly 8 to 10 MB a minute at 1080p,
and treat 100 MB as a hard ceiling for any single file.

---

## The About page

Everything in the **Skills and software** block comes from `content/about.json`, not from
the markup.

```jsonc
{
  "skillsets": [
    { "title": "Design", "items": ["Graphic design", "Publication design"] }
  ],
  "software": [
    { "name": "Photoshop", "note": "Retouch & batch", "icon": "photoshop" }
  ]
}
```

Add a skill by adding it to a list. Add a piece of software by copying an entry and
putting an icon at `assets/img/tools/<icon>.svg`. If an icon file is missing the build
names it rather than quietly breaking the row.

### The tool icons

Drop your own SVG over `assets/img/tools/<name>.svg`, keep the filename, and rebuild.

The file is **read and placed into the page**, not linked. That is deliberate: a linked
image cannot inherit the page's colour, so it would sit at whatever colour it was drawn in
and stay that colour on hover and through a palette change.

**Outline or filled, either works.** The site tints an icon by setting a colour on the
tile and letting the drawing inherit it, which only happens if the drawing asks for
`currentColor`. Rather than expect that of an export, the build rewrites every literal
colour as the file goes in: on `fill` and `stroke` attributes, in inline styles, and inside
any `<style>` block, which is where Illustrator hides them as `.cls-1 { fill: #231f20 }`.

Three things survive that pass on purpose. `fill="none"` stays, so outline icons keep
their hollow centres. A `url(#…)` reference stays, so a real gradient is not flattened,
although a gradient cannot follow the hover colour and the build says so. And an icon with
no fill at all is given one, because SVG's starting fill is black rather than inherited, so
those shapes would render black no matter what was done to the rest.

If you want yours to sit with the existing set, draw on a 24 by 24 grid with a single
1.5px stroke and no fill. That consistency is doing more work than the individual shapes
are. A full colour brand logo will render, but it will look like a sticker next to the
others, so if you would rather have eighteen real logos, make that choice for all of them
at once.

---

## Brand marks

Four files in `assets/img/site/`, all generated rather than drawn.

| File | Used for |
| --- | --- |
| `favicon.svg` | the browser tab |
| `favicon-32.png` | the same mark for browsers that will not take an SVG icon |
| `apple-touch-icon.png` | iOS home screen, 180 by 180 |
| `og.png` | the card that appears when a link to the site is pasted anywhere |

The mark is **"J." set in Sora Bold**: the site's own device, the red full stop that ends
every heading on it, applied to a single initial. The outline is not a drawing of a J.
`tools/make_brand.py` lifts it out of the Sora font file at weight 700, the same instance
the wordmark is set in, so the two cannot drift apart. The path data is baked into the SVG
that comes out, so nothing downstream needs the font, which matters because a favicon has
to render in a tab with no stylesheet and no network.

The Apple icon is square and set smaller than the others because iOS applies its own
rounded mask on top. A version with our corner radius already on it would be rounded
twice, and a mark filling the frame would be clipped.

The social card is a **PNG at 1200 by 630**, and its address is absolute. Social platforms
will not render an SVG preview, and a crawler fetching the image has no page context to
resolve a relative path against. Both come from `SITE_URL` at the top of `tools/build.py`,
which is the only line to change if the domain ever does.

---

## Colour and type

The tokens are named for their **roles**, not their values. `--paper` is the surface and
`--ink` is what gets marked on it. Here the paper is near black and the ink is bone. Flip
those eight values and the whole site flips with them.

```css
--paper    #08080a   the ground
--paper-2  #0e0e12   panels, recessed surfaces
--paper-3  #16161b   image wells
--paper-4  #1e1e24   the deepest step

--ink      #efebe3   text and marks
--ink-80   0.80
--ink-60   0.60
--ink-42   0.54      the floor. 4.5:1. Do not lower it
--ink-16   0.16      hairlines

--ember    #fa3c3c   the accent
--go       #7ddba4   the availability dot
```

`--ink-42` at 0.54 is the lowest value that still clears WCAG AA for the small mono labels
using it. If you ever take the palette light, that number has to change (a light ground
needs about 0.64) and the red has to come down with it, because `#fa3c3c` reads at only
2.9:1 on a warm off-white and fails for small text.

**Sora sets the headings, Inter sets the body.** Both are variable fonts, so each is a
single file. Space Mono sets the small uppercase labels, the navigation, the buttons and
all the metadata. Instrument Serif is kept only for italic accents inside prose, where a
real serif italic reads as deliberate rather than as the browser faking a slant.

```css
--display: 'Sora var';   /* headings you look at */
--title:   'Sora var';   /* headings you read    */
```

Both point at the same face today, but they stayed as two tokens on purpose: point
`--display` at something else later and the big moments change without dragging project
titles, capability titles and the software names along with them. Those need to stay
readable.

Sora sets wider than a typical grotesque at the same size, which is why the letter-spacing
is pulled in harder than looks reasonable. Space Mono sets wider and looser than a normal
mono, so the tracking on the label styles was pulled back to compensate. If you swap
either face, that tracking is the first thing to re-check.

**Descenders and overshoot.** The masked text reveals clip to a box, and at display sizes
the letters do not fit the box they are given. Both `.ln` and `.chw` pad on all four sides
with a matching negative margin, so the clip clears the glyphs and nothing shifts: bottom
for descenders, top because a tight line height puts the edge inside round capitals, and
the sides because at negative tracking the ink overhangs its own advance width. If you
change the heading face, look at a capital O and a lowercase g before anything else.

---

## How the code is arranged

Both `style.css` and `main.js` are single files in numbered sections, with the section
list at the top. One file each, because the site is small enough that jumping between
twenty partials costs more than scrolling does.

`style.css` runs from tokens and reset through to the responsive rules and, last, reduced
motion and print. `main.js` runs from helpers through the preloader, text splitting,
reveals, navigation, the rail and video, to the small live readouts.

Three things hold throughout.

**Nothing depends on the JavaScript.** If `main.js` fails to load, every page is still
readable and navigable. The reveals simply start visible.

**One animation loop.** Everything that runs per frame subscribes to a single
`requestAnimationFrame` loop rather than starting its own. Lenis, the smooth scrolling
library, is advanced first in that loop, before anything that reads the scroll position,
or parallax and the progress bar would act on last frame's number and lag behind.

**Reduced motion is honoured everywhere.** Under `prefers-reduced-motion` the preloader is
removed rather than animated, the rail becomes an ordinary stack, looping clips do not
play, and the custom cursor never appears.

### Two galleries, on purpose

The home page and the archive show the same projects differently, so arriving at the
second does not feel like re-reading the first.

**The archive uses alternating rows.** One project per row, picture and words trading
sides down the page. Each row is a single link wrapping both halves rather than two links
to the same place, so a screen reader announces each project once instead of twice. The
sides alternate using `direction: rtl` on even rows, which flips the column order without
touching the source order, so the markup stays in reading order for anything that ignores
CSS.

**The home page uses a horizontal rail**, a single row that slides sideways as you scroll
past it. Nothing intercepts a scroll event. The section is made taller than the screen by
exactly the distance the row has to travel, the row inside is sticky, and its sideways
offset is read from how far down you have come. The browser keeps doing the scrolling and
the script only maps one axis onto the other, which is what keeps the scrollbar honest,
anchor links landing correctly and keyboard navigation working.

Below 861px and under reduced motion the rail is an ordinary vertical stack. A pinned
sideways scroll on a phone hides how much work there is and fights the platform's own
gesture.

---

## What the build tells you

The build prints what it found for each project, so you can see at a glance whether your
file was picked up. It also warns rather than failing silently. Lines starting with `!`
are things to fix; lines starting with `·` are suggestions.

It will tell you when a file was ignored because of its format, when a project has two
covers or none, when a GIF cover is heavy enough to slow the grid, when a clip is named
off convention, when a clip has no webm or has one that is bigger than its mp4, when a
tool icon is missing or cannot scale, and when a fixed picture is still a placeholder.

**The format one catches people most often.** Stills can be `.jpg`, `.jpeg`, `.png`,
`.webp`, `.gif`, `.avif` or `.svg`; video can be `.mp4`, `.webm`, `.m4v` or `.mov`.
`.heic` is what an iPhone shoots by default and no browser except Safari will display it,
so export as JPEG first. The same goes for `.tif`, `.psd` and `.ai`.

Two things look like bugs and are not. A still whose name matches a video becomes that
video's holding frame rather than its own gallery cell, and the file named `cover.*` is
the card rather than a gallery item.

---

## Editing the pages themselves

`index.html` and `about/index.html` are **hand written and yours**. The build only touches
what sits between the `<!--BUILD:…-->` marker pairs, which is the card grid, the counts,
the footer, the social tags and the fixed pictures. Everything else on those pages you can
edit freely and it will never be rewritten. Places worth editing are marked with an
`EDIT ▸` comment.

`work/index.html` and every `work/<project>/index.html` are **generated from scratch every
build**, so do not hand-edit them. To change how project pages look, edit
`tools/templates/case.html`, which is plain HTML with `{{placeholders}}` in it.

The footer lives in `tools/templates/footer.html` and is filled into every page, so it is
edited once.

The navigation is the exception: it appears in four places, `index.html`,
`about/index.html` and the two files in `tools/templates/`. Change a nav item and it needs
changing in all four.

### Two settings at the top of `build.py`

`SITE_URL` is the published address. It drives the social card address, `CNAME` and
`sitemap.xml`, so the domain is written in one place.

`CLEAN_URLS` is `False`, which writes links like `work/index.html`. Those work both when
you open the files straight off your disk and on every host. Setting it to `True` writes
`work/` instead, which is prettier but stops local preview working, so it is a trade
rather than an upgrade.

---

## The optional generators

Three scripts in `tools/` exist so that things can be changed in one place instead of
many. You never need to run them for normal use, and nothing on the site depends on them
at runtime.

`make_templates.py` rebuilds the ten starter folders in `templates/`. It deletes and
recreates that whole folder, so do not keep anything of your own in there.

`make_art.py` regenerates the grey placeholder artwork. It refuses to write into any
project folder that already contains real pictures.

`make_brand.py` regenerates the favicon and the source file for the social card. It needs
two Python packages that the site itself does not (`pip3 install fonttools brotli`),
because it reads the outlines out of the font file.

---

## Browser support and accessibility

Current Chrome, Safari, Firefox and Edge. The layout leans on custom properties,
`clamp()`, `aspect-ratio`, `position: sticky`, `clip-path` and the `svh` viewport unit,
all of which have been widely supported for some time.

Text contrast holds at WCAG AA throughout, and `--ink-42` is set at the floor rather than
near it, so lowering it is the one change that would break that promise. Every interactive
element is reachable by keyboard and shows a visible focus ring. Images carry alt text
derived from the project title where you have not written one. The reduced motion rules
are not an afterthought; they are the last section of the stylesheet and turn the site
into a quiet, still document.
