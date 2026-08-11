# Jin Yoshida — portfolio

A static site with a tiny build step. No framework, no dependencies, no CDN calls. Fonts
are self-hosted, so it works offline and makes zero third-party requests.

Double-click `index.html` and the whole site, including every link between pages, works
straight off your disk — with one caveat that is the browser's, not the site's. Chrome
applies CORS to `file://`, so the self-hosted fonts don't load there and everything falls
back to system faces. That comes right the moment it is served over http, including from
`python3 -m http.server` in this folder.

```
START HERE.md           the non-technical version — two files you double-click
Build.command           double-click to apply changes to the site
Preview.command         double-click to view the site on your machine
templates/              ten starter projects — not published, see below
404.html                the not-found page (GitHub Pages picks it up)
index.html              home — hero, 8 highlights, contact
about/index.html        about — intro, image band, capabilities, skills, experience, contact
work/index.html         the full archive (generated)
work/<project>/         one folder per project
  project.json          title, date, tags, copy — the file you edit
  images/               cover.jpg + gallery stills and video
  index.html            the project page (generated)
assets/css/style.css    all styling, sectioned and commented
assets/js/main.js       all animation, sectioned and commented
assets/fonts/           Sora, Inter, Space Mono, Instrument Serif
assets/img/about/       portrait, wide band, capabilities/01–08
assets/img/home/        the hero portrait
assets/img/site/        favicon, social preview card
tools/build.py          the builder
tools/templates/        the page templates it fills
tools/make_art.py       regenerates the placeholder artwork (optional)
```

## Starting from a template

`templates/` holds ten ready-made project folders — a full case study, a video-led page,
a showreel of loops, a page with nothing but a cover, and so on. Each is complete: real
structure, placeholder pictures at the right shapes, and placeholder writing you overwrite.

**Nothing in `templates/` is published.** It isn't part of the site; it's a drawer.

To start a project:

1. Copy a folder out of `templates/` into `work/`.
2. Rename it — that name becomes the web address, so lowercase and hyphens:
   `sunset-festival-posters`.
3. Swap the pictures in its `images/` folder for yours, keeping the filenames.
4. Rewrite `project.json`.
5. Double-click `Build.command`.

| Folder | What it's for |
| --- | --- |
| `01-one-image` | Cover plus a single image. The least you can publish. |
| `02-photo-story` | Cover plus six stills. The everyday case study. |
| `03-video-hero` | A clip at the top of the page instead of a still. |
| `04-video-first` | Still cover, clip as the first gallery item. |
| `05-motion-reel` | Several silent looping clips, like a showreel. |
| `06-mixed-media` | Stills and a clip interleaved, in filename order. |
| `07-wide-format` | Panoramas and spreads, running the full page width. |
| `08-portrait-set` | Tall images at their own height, never cropped. |
| `09-written-case` | Five passages of writing, two images. |
| `10-cover-only` | Cover and words, no gallery. For work under wraps. |

Every placeholder picture has its own dimensions printed on it, so you can see what shape
a slot wants before exporting anything. `templates/README.md` has the same list plus a
note on regenerating them.

## Adding a project

```
python3 tools/build.py new "Duress Wall Mount"
```

That creates `work/duress-wall-mount/` with a starter `project.json` and an empty
`images/` folder. Then:

1. **Drop your images into `images/`.** Name one of them `cover` — `cover.jpg`,
   `cover.png`, whatever. That becomes the card thumbnail and, unless you override it, the
   picture at the top of the page. Every other image in the folder becomes the gallery, in
   filename order, so name them `01-…`, `02-…` if you care about sequence. You don't list
   them anywhere; the builder finds them. **Video goes in the same folder** — see below.
2. **Edit `project.json`.** Title, date, tags, the copy.
3. **Run `python3 tools/build.py`.**

That's it. The project page, the archive, the homepage grid, the `03 / 10` counters and
the next-project links all update themselves. Nothing to renumber, no links to rewire.

To take a project down, delete its folder and rebuild. To reorder, change its `date`.

### The picture at the top of a project page

`cover.*` does double duty: the card in the grid, and the top of the project page. A card
is small and wants something that reads at a glance; the page runs the full width and can
carry detail. When one picture shouldn't do both, add a second named **`hero.*`**:

| In `images/` | Card in the grid | Top of the project page |
| --- | --- | --- |
| `cover.jpg` only | `cover.jpg` | `cover.jpg` |
| `cover.jpg` + `hero.jpg` | `cover.jpg` | `hero.jpg`, at its own shape |
| `cover.jpg` + `hero.mp4` | `cover.jpg` | the film, as a player |
| `cover.jpg` + `hero.mp4` + `hero.jpg` | `cover.jpg` | the film, with `hero.jpg` as its poster frame |

`hero.*` never appears in the gallery — as a still it *is* the hero, and alongside a clip
it's that clip's holding frame. So going back to a still after using a film is just moving
the `hero.mp4`/`hero.webm` out of the folder and rebuilding: the poster frame that was
already there becomes the hero.

The same convention covers every fixed picture on the site. Each is found by stem rather
than by a hard-coded `src`, with `.jpg` beating `.svg`, so the grey placeholders can stay
in place as size references and a real photo is a drop-in:

| File | Where it appears | With nothing there |
| --- | --- | --- |
| `assets/img/home/hero.*` | the wide band beside your name | placeholder, and the build says so each run |
| `assets/img/about/portrait.*` | beside the About introduction | placeholder, and the build says so each run |
| `assets/img/about/band.*` | the wide break on the About page | **the section isn't rendered at all** |
| `assets/img/site/signature.*` | under the home page pitch | nothing renders |

The band is the odd one out on purpose. A placeholder is worth showing while a page is
being built and worth hiding the moment it's being looked at, and switching between those
two states shouldn't mean commenting out HTML. `.svg` is deliberately excluded from the
formats it accepts, which is what lets `band.svg` sit in the folder as a reference without
ever putting itself back on the page.

### Video

Drop `.mp4` or `.webm` into a project's `images/` folder and it becomes a gallery item,
sorted in with the stills by filename. Nothing to declare.

**There are three names a clip can have**, and the name is what decides how it behaves.
Every project follows the same three, so a folder listing tells you what a page does
without your having to open it:

| Name it | It becomes |
| --- | --- |
| `hero.mp4` | a full-width player at the top of the project page, in place of the big still — not a gallery item at all |
| `01-loop.mp4` | a silent loop that plays itself: muted, repeating, no controls |
| `01-video.mp4` | a player with controls, which waits to be asked |

A hero clip is a **player**: controls, its poster frame showing until someone presses play,
and nothing downloaded before then. If you want a particular project's hero to go back to
playing itself silently on a loop — right for a short ambient clip, wrong for anything with
a beginning and an end — add one line to that project's `project.json`:

```jsonc
"hero_loop": true
```

The two-digit number is the running order, shared with the stills — `01-video.mp4`,
`02.jpg`, `03-loop.mp4` reads down the page in that order.

Anything else still works, and is treated as a controls clip, but the build will name it
and suggest the right form. A folder of `01-film`, `02-reel-loop`, `03-walkthrough` is a
folder whose behaviour nobody can predict from the outside.

Two more files can sit beside a clip:

| You add | You get |
| --- | --- |
| `01-video.jpg` | the poster frame, shown before the clip loads. It stops being a gallery item of its own |
| `01-video.webm` | both are offered as `<source>`s, webm first — one clip, not two |

A `-loop` clip only plays while it's on screen, and never plays at all under
`prefers-reduced-motion` — which is exactly why it's worth giving every loop a poster
frame, since that's what stands in.

**Shape is read from the film, not guessed.** `tools/build.py` opens each `.mp4` and reads
the real pixel dimensions out of its track header, then writes them onto the page, so an
ultrawide piece or a vertical one gets its own height and nothing is trimmed to force it
into 16:9. `main.js` confirms that against the browser's own metadata once the file is
open, which covers formats the builder can't parse and anything dropped in without a
rebuild. A poster frame is only a fallback for the shape now rather than the source of it,
so a poster that isn't actually a frame from the film no longer crops the film to match.

**Format.** H.264 `.mp4` plays everywhere and is the safe single choice. Adding a VP9
`.webm` alongside it gets you a smaller file on browsers that take it, at the cost of a
second export; the build prints a quiet note for any clip that hasn't got one. Keep clips
short and quiet — these are shown silently, in a grid.

**Weight.** Export masters don't belong on a web page. Aim for roughly 8–10 MB a minute at
1080p, and treat **100 MB as a hard ceiling** — that is GitHub's per-file limit, and a
repository containing a file over it cannot be pushed at all. GitHub starts warning at
50 MB. A 200 MB master isn't a slow page; it's a site that won't publish.

**Something hosted elsewhere?** Add a `"video"` key to `project.json` with a YouTube or
Vimeo URL and it renders as a player above the gallery:

```jsonc
"video": "https://www.youtube.com/watch?v=XXXXXXXXXXX"
```

That's the one place the site talks to a third party — everything else, fonts included, is
self-hosted and the page makes no outside requests. YouTube goes through
`youtube-nocookie.com` and the frame is lazy-loaded, but it's still their player on your
page. Host the file yourself if that matters to you; a path in the same key works too.

### project.json

```jsonc
{
  "title": "Duress Device Renders",
  "date": "2025-03",          // sort key — newest first. "2025" or "2025-03" both work
  "year": "2024/25",          // what's displayed, however you like to write it
  "highlight": true,          // show on the homepage
  "badge": "Duress",          // the pill on the card
  "short": "3D · Tooling",    // the small label on card hover
  "tags": ["3D rendering", "Plugin development", "Batch exports"],
  "summary": "One or two sentences. Shows on the card, the archive and the page.",
  "meta": {                   // the sidebar on the project page — any rows you want
    "Client": "Duress",
    "Industry": "Safety technology",
    "Year": "2024/25",
    "Software": "Photoshop, Illustrator, KeyShot, Blender",
    "Deliverables": "Full rendered asset library, custom Photoshop UXP plugin"
  },
  "blocks": [                 // the body — as many as you like
    {
      "label": "Overview",
      "heading": "One library, every device, every angle.",
      "paras": ["First paragraph.", "Second paragraph."]
    }
  ]
}
```

Only `title` is really required — everything else falls back to something sensible. You
can use `<strong>`, `<em>` and `<code>` inside paragraphs.

### Highlights

The homepage shows the **8 most recent projects with `"highlight": true`**, newest first.
The archive shows everything. Nine projects are in there now and eight are highlighted;
mark a ninth and the oldest highlight drops off the homepage automatically.

To change the cap, edit `HOME_MAX` at the top of `tools/build.py`.

### What the builder writes, and what it leaves alone

It writes `work/index.html` and every `work/<project>/index.html` from scratch — don't
hand-edit those, they're overwritten. In `index.html` it only touches what's between the
three `<!--BUILD:…-->` marker pairs (the card grid, the count, the archive link). The
rest of the homepage, and the whole of `about/index.html`, are yours to edit by hand and
never get rewritten.

One thing to keep in step: the nav appears in four places — `index.html`,
`about/index.html`, and the two files in `tools/templates/`. Change a nav item and it
needs changing in all four (the templates cover the archive and every project page).

If you want to change how project pages look, edit `tools/templates/case.html`. It's
plain HTML with `{{placeholders}}`.
## Your images

**All of it is in. There are no placeholders left.** Every project has its photographs and
every clip is the real film.

Everything was re-encoded on the way in, because the originals were export-masters rather
than web files:

| | before | after |
| --- | --- | --- |
| 49 stills | 35 MB | 9.3 MB |
| Adobe filters video (11s, 1080p) | 30 MB | 3.7 MB mp4 + 1.6 MB webm |
| Firefly reel (was an animated GIF) | 14 MB | 0.7 MB mp4 + 0.2 MB webm |
| Firefly film (46s, 1080p60) | 152 MB | 19.1 MB mp4 + 12.2 MB webm |
| Everything Black film (3m52s, 1080p60) | 209 MB | 44.2 MB mp4 + 30.3 MB webm |
| Square Reader film (79s, 1080p25) | 25 MB | picture untouched, + 4.9 MB webm |
| Product viewer film (12s, 1080p) | 11 MB | picture untouched, + 1.8 MB webm |
| The five Everything Black loops | webms were *larger* than their mp4s | re-exported, each now well under |

The stills are untouched at 1920px — same pixels, just encoded for the web instead of for
print. The Firefly GIF became a video because a 14 MB GIF is a video wearing the wrong
file extension, and the `-loop` in its name is what makes the build play it silently on
repeat exactly as the GIF did.

The two big films had to be re-encoded, not merely compressed for politeness. **GitHub
refuses any file over 100 MB**, so at 209 MB and 152 MB neither could have been published
at all. Both are now 1080p — the Everything Black film at 30fps, which is a clean halving
of its 60, and the Firefly film at its original frame rate. Your masters are untouched
where they were; these are web copies.

The Square Reader and product-viewer films were already sensible sizes, so their picture
is exactly as you exported it. All four gained a `.webm`, which is what most browsers will
now actually download.

**On weight.** The Everything Black film is 3m52s and is easily the heaviest thing on the
site. It no longer costs anything to arrive on the page, though: a hero clip is a player
now, so all a visitor downloads is the poster frame until they press play. Only the ones
who actually want to watch it pay for it.

## What came from your old site, and what didn't

**Verbatim from jinyoshida.me:** the bio, all nine project titles, years, disciplines and
descriptions, every project's overview and section copy, the eight capability
descriptions, the employment history, the software list, your education, and your email.

**Written to fit the template** — worth checking you're happy with:

- The rotating word under the headline (`data-rotate` on the `.rotator` span).
- "Open to new projects" in the hero. Your old site never claimed availability; delete
  the `<p class="hero__avail">` line if you'd rather not.
- Section headings, and the short heading above each project block.
- **The software icons.** They're inline 24×24 monoline glyphs describing what each tool
  is *for* — layers, a pen nib, a page spread, a film strip, a keyframe, develop sliders —
  deliberately not the Adobe/Webflow/Shopify marks. Those are registered trademarks with
  their own colour and clear-space rules, so redrawing them would be both a licensing
  problem and eleven competing visual languages in one grid. The glyphs are `currentColor`,
  so they warm to the accent on tile hover along with everything else. To swap one, replace
  the paths inside its `<span class="tool__i">` in `about/index.html`; anything drawn on a
  24-unit box with a 1.5 stroke will sit correctly.
- The `date` sort keys in each `project.json`. They reproduce the exact order your old
  works page used; adjust if any are wrong.

**Missing, because it isn't on your old site:** social links. There's a commented slot in
the footer marked `EDIT ▸ add LinkedIn / Instagram / Behance here`.

Two components sit unused because your projects don't currently carry the content:
`.pull` (a pull quote) and `.results` (a grid of outcome figures). Both are styled and
ready if you get a client quote or a real number worth showing.

## Skills, software and the tool icons

The About page's *Skills & software* section is generated from one file:
**`content/about.json`**. Nothing there lives in the markup any more, so adding a skill or
dropping a tool is a text edit followed by a build.

```jsonc
{
  "skillsets": [
    { "title": "Design", "items": ["Graphic design", "Branding", "…"] }
  ],
  "software": [
    { "name": "Photoshop", "note": "Retouch & batch", "icon": "photoshop" }
  ]
}
```

- **Add a skill** — put a string in the right `items` list.
- **Add a whole column** — add another object to `skillsets`. They number themselves.
- **Add software** — add an object to `software`, and put a matching SVG at
  `assets/img/tools/<icon>.svg`. If the file is missing the build tells you which one and
  falls back to an empty square rather than breaking the page.
- **Remove anything** — delete its line.

### Swapping a tool icon

Drop your own SVG over `assets/img/tools/<name>.svg`, keeping the filename, and rebuild.
That's the whole operation.

The icon file is **read and inlined into the page**, not linked. That's deliberate: an
`<img>` can't inherit the page's colour, so a linked icon would sit at whatever colour it
was drawn in and stay that colour when the palette changes.

**Outline or filled, either works.** The site tints an icon by setting `color` on the
tile and letting the drawing inherit it, which only happens if the drawing asks for
`currentColor`. Rather than expect that of an export, `inline_svg()` in `tools/build.py`
rewrites every literal colour in the file as it goes in — on `fill=` and `stroke=`
attributes, in inline `style=""`, and inside any `<style>` block, which is where
Illustrator hides them (`.cls-1 { fill: #231f20 }`). So a solid shape exported at
whatever colour it happened to be now goes bone at rest and ember on hover, exactly like
the outline ones.

Three things survive that pass, all deliberately. `fill="none"` stays, so outline icons
keep their hollow centres. `url(#…)` stays, so a real gradient isn't flattened — though a
gradient can't follow the hover colour, and the build says so on each run. And an icon
with no `fill` at all is given one on the root element, because SVG's initial fill is
black rather than inherited, so those shapes would otherwise render black no matter what
was done to everything else.

If you want yours to sit with the existing set, draw on a **24×24 grid with a single
1.5px stroke, no fill** — that consistency is doing more work than the individual shapes
are. A brand logo in full colour will work, but it will look like a sticker next to the
others. And any SVG at all will render, so if you'd rather have eighteen real logos,
that's a legitimate choice — just make it for all of them at once.

The same treatment is applied to `assets/img/site/signature.svg`, for the same reason.


## Brand marks

Four files in `assets/img/site/`, all generated rather than drawn:

| File | Where it's used |
| --- | --- |
| `favicon.svg` | the browser tab, on browsers that take an SVG icon |
| `favicon-32.png` | the same mark for the browsers that don't |
| `apple-touch-icon.png` | iOS home screen, 180×180 |
| `og.png` | the card that appears when a link to the site is pasted anywhere |

The mark is **"J." set in Sora Bold** — the site's own device, the ember full stop that
ends every heading on it, applied to a single initial. The outline isn't a drawing of a J;
`tools/make_brand.py` lifts it straight out of `assets/fonts/sora-latin-wght-normal.woff2`
at weight 700, the same instance the wordmark is set in, so the two can't drift apart. The
path data is baked into the SVG that comes out, so nothing downstream needs the font — which
matters, because a favicon has to render in a tab with no stylesheet and no network.

The Apple icon is square and set smaller than the others on purpose: iOS applies its own
rounded mask over the top, so a version with our corner radius already on it would be
rounded twice, and a mark filling the frame would be clipped.

To regenerate: `pip3 install fonttools brotli`, then `python3 tools/make_brand.py`. That
writes `favicon.svg` and two sources into `tools/spare/` — the square icon and a 1200×630
HTML card — which are screenshotted to make the PNGs. You never need to run any of this
for normal use.

### One thing that was quietly broken

The preview image used to be an `.svg`, and **no social platform renders SVG** — not
Facebook, LinkedIn, X, Slack or iMessage. Every link to this site was unfurling as a blank
box. It's a `.png` now, at the 1200×630 those platforms expect, with `og:image:width` and
`og:image:height` declared so the card reserves the right space before the image arrives.

Its URL is also **absolute**, built from `SITE_URL` at the top of `tools/build.py`. A
crawler fetching `og:image` has no page context to resolve a relative path against, so
`assets/img/site/og.png` is a coin flip depending on whose scraper it is. If the domain
ever changes, that constant is the only line to edit — everything else on the site uses
relative paths and doesn't care where it's hosted.

All of these tags come from `social()` in `tools/build.py` and are injected into every
page, because they sit in twelve `<head>`s, they're invisible when wrong, and the only
symptom of a mistake is a link that unfurls badly somewhere you'll never see it.


## Colour and type

Near-black ground, bone type, one red. The tokens are named for their **roles**, not their
values: `--paper` is the surface and `--ink` is what's marked on it. Here the paper is
near-black and the ink is bone — flip those eight values and the whole site flips with
them, which is exactly how it was taken to light and back.

```css
--paper    #08080a   the ground
--paper-2  #0e0e12   panels, recessed surfaces
--paper-3  #16161b   image wells
--paper-4  #1e1e24   the deepest step

--ink      #efebe3   text and marks
--ink-80   0.80
--ink-60   0.60
--ink-42   0.54      the floor — 4.5:1, don't lower it
--ink-16   0.16      hairlines

--ember    #fa3c3c   the accent
--go       #7ddba4   the availability dot
```

`--ink-42` at **0.54** is the lowest that still clears WCAG AA for the small mono labels
that use it. If you ever take the palette light again, that number changes — a light ground
needs about 0.64 — and the red has to come down with it: `#fa3c3c` reads at only 2.9:1 on
a warm off-white and fails for small accent text.

The placeholder art in `tools/make_art.py` is drawn from the same palette. If you change
`--paper` or `--ink`, change `INK` and `BONE` at the top of that script to match and re-run
it, or the generated stand-ins will be from the wrong scheme.

**Sora sets the headings, Inter sets the body.** Both are variable, so each is a single
file and the whole site loads two typefaces plus the mono. Space Mono sets the small
uppercase labels, the nav, the buttons and all the metadata; Instrument Serif is kept only
for italic accents inside prose and display headings, where a serif italic reads as
deliberate contrast rather than as the browser faking an oblique.

```css
--display: 'Sora var', …;    /* headings you look at   */
--display-weight: 700;
--display-track: -0.042em;

--title: 'Sora var', …;      /* headings you read      */
--title-weight: 700;
--title-track: -0.034em;
```

Sora sets noticeably wider than a grotesque at the same size, which is why the tracking is
pulled in harder than it looks like it should be. `--display` and `--title` both point at
it, but they stayed as two separate tokens on purpose: point `--display` at a display face
later and the big moments change without dragging project titles, capability titles, roles
and the sixteen software names with them. Those want to stay readable.

Space Mono is a static family, not a variable one — it ships 400 and 700 and nothing
between. The bold face is declared across `font-weight: 500 700` so the few rules asking
for 500 resolve to a real file rather than a synthesised one. It also sets wider and looser
than a normal mono, so the letter-spacing on the label styles was pulled back to
compensate; if you swap the mono, that tracking is the first thing to re-check.

The name is the one thing set in caps — `.hero__mark`, `.brand` and the loader all carry
`text-transform: uppercase`, and all open their tracking rather than tightening it, because
caps close up at small sizes. Everything else is sentence case. The markup says
`Jin Yoshida`, so screen readers, search results and copy-paste all get it properly cased.

**Descenders and overshoot.** The masked reveals (`.ln` for split lines, `.chw` for split
characters) clip to a box, and at display sizes the glyphs don't fit the box they're given.
Both pad on all four sides with a matching negative margin, so the clip region clears the
glyphs and nothing moves: bottom for descenders, top because a tight line-height puts the
box edge inside the round capitals, sides because at negative tracking a glyph's ink
overhangs its advance width. If you change the heading face, check a capital `O` and a
lowercase `g` before anything else.

## The hero

An instrument-panel layout: readouts pinned to the corners, the portrait floating in the
middle, and the name set across the bottom at the largest size that fits the viewport
whole. The wordmark sits *in front of* the portrait and crosses its lower edge — that
overlap is the whole composition, and if you change the sizes, keep it.

**Your photo** is the band running through the middle. It starts near the centre of the
page and runs clean off the right edge, so it reads as a slice of something larger rather
than a framed object — put the part that matters on the left of the frame. Save it over
`assets/img/home/hero.jpg` and point the `src` at it; the block is marked `EDIT ▸` in
`index.html`. Roughly 16:9 suits it, exported about 1800px wide, but the band has no fixed ratio so
anything landscape works. On a phone it spans the full width instead.

**The band has no fixed proportion.** It's bounded top *and* bottom, so its height is
simply whatever the layout leaves between the block above it and the name below — which
means it can never grow into either, at any viewport shape, and the picture inside crops
to fit.

Both bounds are measured rather than guessed, because neither is knowable in CSS.
`setupFitMark()` publishes three custom properties: `--mark-h`, the name's height, which
comes out of the fit; `--above-b`, where the block above the band ends; and `--pitch-h`,
the intro paragraph's height. That second one
matters on phones, where the intro and the availability line are in the normal flow — how
far down the band should start depends on how the pitch happens to wrap, not on any
fraction of the viewport. A `vh` offset collided with the text on a short screen and left
a hole on a tall one. Both have fallback values so the layout is sane before the script
runs.

**The order changes on a phone.** On desktop the pitch is positioned so its first line
sits exactly on the band's top edge — one `--band-top` variable drives the band, the pitch
and the availability line above it, rather than three copies of the same calc drifting
apart. On a phone the pitch moves *below* the picture instead, which means the picture has
to stop short of the name by the pitch's height as well — that's what `--pitch-h` is for.
Measuring the height is safe there because it's text-driven and doesn't depend on where
the block ends up, so there's no circularity with `--band-b`, which is read afterwards.

On a phone the band is capped as well as bounded, at `62vw`. Without the cap a tall phone
gives it a near-square shape and a landscape photo filling that loses more than half its
width to the crop. The cap is in `vw` rather than `vh` on purpose, so the band keeps the
same landscape shape on every phone instead of tracking how tall the device happens to be.

The band is positioned against the *section*, not the shell — which is why `right: 0`
lands on the page edge rather than the gutter. Insetting it from inside the shell would
mean a negative offset that has to track `--gutter`, and that only stays correct until
someone changes the padding.

**The header** is three slots: the Melbourne clock on the left, the mark in the middle,
the links on the right. Both outer columns are `flex: 1 1 0`, which is what puts the mark
on the page's true centre rather than the centre of whatever space is left over — without
it the mark drifts by half the difference between the clock's width and the links'. Below
620px the city label drops and only the time remains, because three items don't fit across
a narrow phone.

The mark, the loader's wordmark and the hero name are all set at the same tracking
(`-0.045em`). Small caps normally want tracking *opened*, not tightened; this ignores that
on purpose, so the header reads as the hero name shrunk rather than as a separate lockup.

**The signature** slot sits under the pitch in the left column. There's **no signature
file at the moment**, so nothing renders — `.sig:empty` collapses it, and the layout closes
up as though it were never there. Drop any file named
`assets/img/site/signature.{svg,png,jpg,webp}` in and rebuild to bring it back; the build
takes whichever it finds, `.svg` first. The placeholder is parked at
`tools/spare/signature-placeholder.svg`.

There are two paths through `signature()` in `build.py`, because two kinds of person will
replace this file.

An **SVG is inlined** into the page rather than linked. Drawn with `stroke="currentColor"`
it then follows the text colour, and would follow a palette change with it — an `<img>`
can't do that.

A **raster is linked** and carries a class that inverts it and screen-blends it onto the
page. Inverting makes dark ink light and white paper dark; screen can only lighten, so the
now-black paper contributes nothing and disappears. A phone photo of a signature becomes a
clean mark with no tracing, no background removal, no editing. If it's a PNG that already
has an alpha channel — read from the colour-type byte in the IHDR, so no decoding needed —
it skips that treatment and is used as-is.

One subtlety worth keeping: `.sig` paints the page colour behind the image. `mix-blend-mode`
only sees backdrops inside its own stacking context, and the hero's intro block makes one
(it's positioned with a z-index), so without that background the image would blend against
nothing and the paper would stay visible as a faint rectangle. It looked broken in exactly
the way that's hard to attribute.

**The name** fills the page's padded width exactly, at any viewport. That can't be done
with a `vw` font-size: `--gutter` is a `clamp()`, so the space to fill isn't a fixed
fraction of the viewport and no single `vw` value tracks it across every width. So
`setupFitMark()` measures instead — set a known size, read how wide the text actually comes
out, scale by the ratio. One reflow on load and one per resize.

Three details in there are load-bearing. It measures with a `Range` over the contents
rather than `scrollWidth`, because `scrollWidth` reports the *box* width whenever the text
doesn't overflow it — which made the ratio exactly 1 at wide viewports and the fit silently
do nothing. It re-runs on `document.fonts.ready`, or it fits to the fallback font's metrics
and jumps when Sora arrives. And `.hero__mark` carries a `translateX(-0.033em)` optical
correction, because the negative tracking is applied after the last character as well and
the `J` has a far larger left side bearing than the `A` has on the right — without it the
name sits about 9px right of centre.

The `vw` size in the CSS is the no-JS fallback and is deliberately a shade small.

**The readouts** are Melbourne local time and the live viewport size, both in
`setupReadouts()` in `main.js`. Both are decoration and both fail quietly — if the
timezone isn't available the clock removes itself rather than showing nonsense. The
rotating discipline sits on the wordmark's left shoulder, in flow above it rather than
positioned against the bottom, because the wordmark's leading changes with the viewport
and any fixed offset eventually collides with it.

On phones the portrait drops lower and shrinks, and the availability line moves
into the flow under the pitch.

### Two clipping traps, both already paid for

Masked reveals clip to a box, and at display sizes the glyphs don't fit the box they're
given. Both of these produced letters with slices missing, and both are fixed by padding
the clip region and taking the space straight back with a negative margin:

- `.ln` and `.chw` pad on all four sides. Bottom for descenders; **top because a tight
  line-height puts the box edge inside the round capitals**, which overshoot the cap
  height — that's why `O` and `S` shaved flat while `J` and `N` looked fine; sides because
  at negative tracking a glyph's ink overhangs its advance width.
- `.hero__markwrap` no longer clips at all. It used to, from when the name was sized to
  bleed past both edges — but the same clip was cutting the tops off those round capitals.

If you change the heading face or the display line-height, check a capital `O` and a
lowercase `g` before anything else.

One trap worth knowing about if you touch the backdrop. The glow used to be faded into the
next section with a CSS `mask-image` on the aura wrapper. It looked right and cost 11ms a
frame, because the browser re-masked the full viewport-width area on every frame of the
auras' 18-second drift. It is now a `linear-gradient` to the page colour laid over the
top, which is pixel-identical on a flat background and composites once.

## Images

**Nothing appears until you rebuild.** The gallery HTML is generated from what's in the
folder, so dropping files in doesn't change the pages that are already built. Either
double-click `Build.command` in the project root, or from a terminal:

```
python3 tools/build.py
```

Run it after adding, renaming or deleting anything in an `images/` folder. It prints what
it found for each project, so you can see straight away whether your file was picked up.

If a file is ignored, the build now says so and why. The usual cause is the format:
`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.avif` and `.svg` for stills, `.mp4`, `.webm`,
`.m4v` and `.mov` for video. **`.heic` is the one that catches people** — it's what an
iPhone shoots by default, and no browser but Safari will display it, so export as `.jpg`
first. Same for `.tif`, `.psd` and `.ai`.

Two other things that make a file "disappear" without it being a bug: a still whose name
matches a video's becomes that video's **poster frame** rather than its own gallery cell
(`02-walkthrough.mp4` + `02-walkthrough.jpg` is one entry, not two), and the file named
`cover.*` is the card and page hero rather than a gallery item.

For video, see *Adding a project ▸ Video* above — the same rules apply.

### Covers, including animated ones

`cover.jpg` is the card in the work grid and the big image at the top of the project page.
It can be a **`.gif`** instead — `cover.gif` works exactly the same way and will animate in
the grid, which is a good way to make one project catch the eye.

Two things to know before you do. An animated cover keeps animating even for visitors who
have asked their system for reduced motion, which nothing in CSS can stop — so use it
sparingly, and never for anything flashing. And GIFs are heavy: the build warns you if a
cover GIF is over 2 MB, because several of those would stall the work grid. If yours is
big, a short `-loop.mp4` in the gallery usually gives you the same effect for a tenth of
the weight.

If both `cover.jpg` and `cover.gif` are present the `.jpg` wins, and the build tells you
so rather than picking silently.

`hero.mp4` is the exception to "cover.* is the page hero". The card in the work grid still
uses `cover.jpg`, because a grid of autoplaying videos is a different and much worse page;
only the project page's top block becomes the clip. Give it a `hero.jpg` too and that
frame shows before the video loads, and instead of it for anyone browsing with reduced
motion.

Supply both `.mp4` and `.webm` where you can. Safari needs the mp4; Chrome and Firefox
prefer the webm and it's usually half the size. The build writes both as `<source>`s and
lets the browser choose.

Drop a picture into a project's `images/` folder and rebuild. There is nothing to resize
and no dimensions to type in — the build reads each file's real pixel size out of its
header and writes it onto the `<img>`, which is what lets the browser reserve exactly the
right space before the file arrives, and what decides how the picture is laid out:

| shape | where it lands |
| --- | --- |
| wider than 16:9-ish (ratio ≥ 1.7) | full width of the gallery |
| anything else | one column, at its own height |

The first image after the cover always runs full width regardless, as the lead. Nothing is
ever cropped or stretched — a panorama is short and wide, a portrait is tall and narrow, a
square is square. Cells are top-aligned so a short picture beside a tall one keeps its own
proportions instead of stretching to match.

The one place a shape is imposed is the project hero, which takes the cover's real ratio
inline but is capped at 82% of the viewport height — a very tall cover would otherwise
push the whole page down before anyone reads a word. Past that cap it crops from the
centre. Card covers in the grid are also cropped to 4:3 on purpose, so the work grid stays
a grid.

`.jpg`, `.png`, `.webp`, `.gif` and `.svg` are all measured. If a file's header can't be
read the build falls back to 4:3, which only affects the space reserved while it loads.


## Spacing and the footer

Two tokens control the page's rhythm, and they used to be one:

```css
--gutter   the page's side padding
--gap      the space grids leave between cells
```

They were the same variable, which meant tightening the page margins also squeezed every
grid on the site. Separate now — change `--gutter` and only the page edges move.

**One left edge, one right edge.** `.shell` has no max-width: every page runs to the
gutter and nothing else, so the nav, the hero name, the work grid, the project heros and
the footer all share the same two vertical lines the whole way down. Line length is held
where it belongs — `--measure` on `.prose` and `ch`-based caps on headings — rather than by
a container cap, which would only have made the margins disagree with the hero.

The project hero uses `.bleed`, which is the same thing under a different name; it stays
separate because it's conceptually a spread and would be the first thing to break out again
if `.shell` ever regains a cap. If you touch it, keep the `width: 100%` on `.plate--hero`: with only an aspect-ratio and a
max-height, the box shrinks its *width* to satisfy the ratio and the hero stops reaching
the page edges. Pinning the width makes the height cap crop the picture instead, which is
what a bounded full-width hero should do.

**The footer is one file** — `tools/templates/footer.html`. The build fills in each page's
path prefix and drops it into every page, including the two hand-written ones, which carry
`<!--BUILD:footer-->` markers for it. Edit the partial, run the build, and all eleven pages
change together. Don't edit the footer inside a page: the next build will overwrite it.


## Animation

The rest is in `main.js`, in numbered sections. The preloader counts up while the page
loads, with a hard 2.6-second failsafe. Headlines split into lines and mask upward
(`data-split`, re-splitting on resize). `data-reveal` fades and rises, `data-clip` wipes
images open, `data-draw` draws a rule from the left — all on scroll via
IntersectionObserver. `data-stagger` spaces a container's children. `data-chars` splits a
heading into letters. `data-rotate` cycles a word list. `data-parallax` drifts against the
scroll, `data-magnetic` pulls a button toward the cursor, and a lerped custom cursor
swells over anything clickable.

Two things worth knowing if you extend it. Elements that clip themselves to nothing report
as "not intersecting" in Chrome, so the observer watches an *unclipped ancestor* and maps
the reveal back — keep new clipped elements inside a wrapper. And everything is gated
behind `prefers-reduced-motion`: with that on, the preloader is removed, the cursor and
grain disappear, the word stops rotating, and all
content renders in its final state. Test it before you ship.

### Two galleries, on purpose

The home page and the work page show the projects differently, so arriving at the second
doesn't feel like re-reading the first.

**The work page uses alternating bands** — one project per row, picture and words trading
sides down the page, numbered `01 / 09`. Each band is a single link wrapping both halves
rather than two links to the same place, so a screen reader announces each project once
instead of twice. The sides alternate with `direction: rtl` on even rows, which flips the
column order without touching the source order — the markup stays in reading order for
anything that ignores CSS. On phones it becomes a single column and the summary drops.

**The home page uses a horizontal rail** — a single row that slides sideways as you scroll
past it.

**Nothing intercepts a scroll event.** The section is simply made taller than the screen
by exactly the distance the row has to travel; the row inside is `position: sticky`, so
while you scroll through that extra height it stays on screen and its horizontal offset is
read from how far you've come. The browser keeps doing the scrolling and the script only
maps one axis onto the other — which is what keeps the scrollbar truthful, anchor links
landing where they should, keyboard navigation working, and Lenis's easing carrying
straight through.

Below 861px, and under `prefers-reduced-motion`, none of it applies: the rail is an
ordinary vertical stack, both in the CSS and in `setupRail()`, which checks the same
breakpoint and does nothing. A pinned sideways scroll on a phone hides how much
work there is and fights the platform's own gesture.

The counter and the thin progress line above the row are driven from the same number.

### Smooth scrolling

Scrolling is eased by [Lenis](https://lenis.dev) — the wheel no longer moves the page in
the browser's discrete jumps. It's MIT-licensed and **vendored** into
`assets/js/vendor/lenis.min.js` (19 KB) rather than loaded from a CDN, so the site still
has no runtime dependencies and works offline. Its 500-byte stylesheet is folded into
`style.css` for the same reason.

It's off in two situations, both on purpose: under `prefers-reduced-motion`, and on touch
devices, where the platform's own inertia is better than anything a script can impose and
fighting it feels wrong.

Three things had to line up for it to coexist with everything else:

- **It advances inside the existing rAF loop**, before anything that reads scroll
  position. Otherwise parallax and the progress bar act on last frame's number and trail
  by a frame.
- **It moves the real document scroll**, so `IntersectionObserver` reveals, the sticky
  nav and the progress bar all carry on working untouched.
- **Anchor links are routed through it.** A browser's instant jump and Lenis's easing
  otherwise fight over the same scroll position; `#contact` now eases, offset by the nav
  height.

To change the feel, `setupSmoothScroll()` has `duration` at the top — higher is heavier.
To remove it entirely, delete the `<script>` tag for the vendor file; the function checks
for `window.Lenis` and does nothing if it isn't there.

## Putting it online

The build runs on your machine, so a host only ever sees plain HTML, CSS, JavaScript and
your pictures. There's no server, no database and nothing to install — which is why almost
any host will take it, GitHub Pages included, free.

### GitHub Pages, step by step

1. Build first: double-click **`Build.command`**.
2. Make a repository on github.com. Name it `yourname.github.io` if you want the site at
   that address; any name works if you'll point a domain at it later.
3. Upload the whole folder. Drag-and-drop works on github.com — *Add file ▸ Upload files* —
   and so does GitHub Desktop if you'd rather see what's happening.
4. In the repo: **Settings ▸ Pages ▸ Build and deployment**, source *Deploy from a branch*,
   branch `main`, folder `/ (root)`. Save.
5. Wait a minute or two. The address appears on that same page.

Every time you change something afterwards: build, then upload again. That's the whole
loop.

### What's already set up for it

- **`.nojekyll`** stops GitHub running the site through Jekyll, which would otherwise try
  to process the files and can quietly drop things.
- **Every link is relative**, so the site works at `yourname.github.io` *and* under a
  subpath like `yourname.github.io/portfolio/`. Nothing needs configuring. I tested it
  served from a subpath — fonts, images and video all resolve.
- **`404.html`** is a styled not-found page, which GitHub Pages picks up automatically.
  It's deliberately self-contained — its styling is inlined rather than linked — because a
  404 can be served for an address at any depth, where a linked stylesheet would break.
- **`.gitignore` excludes `templates/`**, so the starter folders stay on your machine and
  never reach the published site. Delete that line if you'd rather keep them in the repo.
- **`robots.txt`** keeps `templates/` out of search results as a second line of defence,
  in case the folder ever gets uploaded by hand, and points crawlers at the sitemap.
- **`CNAME`** and **`sitemap.xml`** are written by the build from `SITE_URL` — see
  *A custom domain* below. The sitemap earns its place here: nine project pages are only
  reachable through a horizontal rail and an archive page, so a crawler that gives up
  early would see very little of the work.

### Two things that will bite you

**Filename case.** GitHub Pages is case-sensitive; macOS isn't. `Cover.JPG` works
perfectly on your machine and 404s the moment it's published. Keep filenames lowercase and
this never comes up.

**The address in the `<head>`.** Each page carries a `canonical` link pointing at
`https://www.jinyoshida.me/`. If you publish somewhere else, update those — search engines
use them to decide which URL is the real one.

### A custom domain, through Cloudflare

The domain lives in **one place**: `SITE_URL` at the top of `tools/build.py`. From it the
build writes `CNAME` (which is what GitHub reads), the `og:image` URLs and `sitemap.xml`,
so they can't drift apart. Change the constant, rebuild, upload — that's the whole
domain-side change on this end.

The `CNAME` file being generated matters more than it looks. GitHub writes one for you the
first time you set a custom domain in Settings, and from then on it's an ordinary tracked
file — so the next upload that doesn't include it silently unsets the domain and the site
falls back to `<user>.github.io`. Generating it on every build removes that trap.

**In Cloudflare's DNS tab**, for `jinyoshida.me` — five records. Four A records at the
apex, all with name `@`:

```
185.199.108.153     185.199.109.153     185.199.110.153     185.199.111.153
```

and a CNAME with name `www` pointing at `<your-github-username>.github.io`. If you want
IPv6 as well, add four AAAA records at `@`:

```
2606:50c0:8000::153   2606:50c0:8001::153   2606:50c0:8002::153   2606:50c0:8003::153
```

**Set every one of them to DNS only — the grey cloud, not the orange one.** GitHub has to
see your real DNS to pass its check and get a certificate from Let's Encrypt, and it can't
do that through a proxy. This is the single most common reason the domain sits on "unable
to verify" for hours.

Then, in the repo: **Settings ▸ Pages ▸ Custom domain**, type `www.jinyoshida.me`, save,
and wait for the check to pass. When **Enforce HTTPS** stops being greyed out, tick it.
That can take anywhere from a few minutes to a few hours, and it is normal for it to look
broken in between.

**Only after HTTPS is working**, if you want Cloudflare's proxy and caching, go back and
switch the records to the orange cloud — and before you do, set **SSL/TLS ▸ Overview** to
**Full**. Not Flexible. Flexible means Cloudflare talks plain HTTP to GitHub, GitHub
redirects it to HTTPS, Cloudflare passes that redirect back to the browser, and the browser
asks again — a redirect loop, and the site is simply down. Leaving everything grey-clouded
is a perfectly good end state too; you still get Cloudflare's DNS, and GitHub's own CDN
serves the site.

Cloudflare will also want to send one of `jinyoshida.me` and `www.jinyoshida.me` to the
other so the site has a single address. A **Redirect Rule** does it: match hostname equals
`jinyoshida.me`, redirect to `https://www.jinyoshida.me` with the path preserved, 301.
Point it at whichever one you set as the custom domain in GitHub — currently `www`,
because that's what `SITE_URL` says.

### Other hosts

Netlify and Cloudflare Pages both take the same folder by drag-and-drop with no build
settings at all — there's nothing for them to build. Any plain web host works too: upload
by FTP into the public folder.

If you'd rather have clean URLs like `/work/duress-brochures/` once hosted, set
`CLEAN_URLS = True` at the top of `tools/build.py` and rebuild. All three of those hosts
serve them correctly — but local preview off your disk stops working, so it's a trade
rather than an upgrade.

## Browser support

Current Chrome, Safari, Firefox and Edge. Uses `clamp()`, `aspect-ratio`, custom
properties, `IntersectionObserver`, canvas and `backdrop-filter`. Nothing needs a polyfill
in anything from the last four years, and if the JavaScript fails entirely the site still
renders as a complete, readable, navigable page — the animation is an enhancement, not a
dependency.
