# Start here

You don't need to write any code to run this site. There are two files in this folder you
double-click, and that's the whole workflow.

## The two files

**`Preview.command`** — look at the site on your own machine.
Double-click it. A Terminal window opens and your browser opens the site. Leave the
Terminal window open while you're looking; close it when you're done.

**`Build.command`** — apply your changes.
Double-click it whenever you've added, replaced or renamed a picture, a video, or edited
a project's text. It updates the site and tells you what it found. Then close the window.

That's it. `Preview.command` builds first anyway, so most of the time you only need that
one.

## The one rule

**Adding a file doesn't change the site until you build.** The pages are assembled from
what's in your folders, so dropping a photo into a project folder does nothing visible
until `Build.command` (or `Preview.command`) has run. If a picture "isn't showing up",
this is almost always why.

## Starting a new project

There's a `templates` folder with ten ready-made project layouts — a photo story, a
video-led page, a showreel, one with no pictures at all, and so on. Nothing in that folder
is published; it's a drawer you take things out of.

1. Copy one of the ten folders into `work/`.
2. Rename it. That name becomes the web address, so lowercase with hyphens:
   `sunset-festival-posters`.
3. Replace the placeholder pictures in its `images/` folder with yours, keeping the
   filenames.
4. Open `project.json` in that folder and replace the placeholder writing. It's a plain
   text file — TextEdit opens it. Change what's inside the quote marks and leave the rest
   of the punctuation alone.
5. Double-click `Build.command`.

Each placeholder picture has its own dimensions printed on it, so you can see what shape
to export before you start. `templates/README.md` lists what all ten are for.

## Adding pictures to a project

Every project lives in `work/` — one folder each, named after the project. Inside is an
`images/` folder. Put your pictures there:

- The one named **`cover`** (`cover.jpg`) is the card in the grid and the big image at the
  top of the project page.
- Everything else becomes the gallery below it, **in filename order** — so `01-…`,
  `02-…`, `03-…` is the easiest way to control the sequence.
- Any size, any shape. Wide pictures get the full width of the page; the rest sit in a
  column. Nothing is stretched or cropped to fit a fixed box.

Then double-click `Build.command`.

## The big picture at the top of a page

There are two of these and they work the same way: drop the file in, rebuild, done.

**The home page band** — the wide picture beside your name. Put your photo in
`assets/img/home/` named **`hero.jpg`** and double-click `Build.command`. It takes
precedence over the grey `hero.svg` placeholder that's in there now, so you don't have to
delete anything. `.png`, `.webp` and `.avif` work too. The band is horizontal, so a 16:9
crop fits exactly — export it around 1800px wide, and remember it runs off the right edge
of the page, so keep what matters on the left of the frame.

**The top of a project page** — by default this is that project's `cover.jpg`, the same
picture as its card in the grid. To give the page a *different* picture from the card, put
a second one in the project's `images/` folder named **`hero.jpg`** and rebuild. It takes
the top of the page at whatever shape it is, the card keeps using `cover.jpg`, and it
won't also turn up in the gallery below.

That's also how you go back to a still after using a film. A project with a `hero.mp4` in
it shows the film at the top; drag the `hero.mp4` and `hero.webm` out to the desktop,
leave `hero.jpg` behind, and rebuild — the same picture that was the film's holding frame
becomes the hero. Put the files back and rebuild to have the film again.

## The two pictures on the About page

Both live in `assets/img/about/` and both work the same way — drop the file in, rebuild.

**`portrait.jpg`** — the photo of you beside the introduction. A 4:5 crop fits the frame.
It's showing a grey placeholder at the moment, and the build reminds you of that on every
run until you replace it.

**`band.jpg`** — the wide photo that breaks up the page between the introduction and
*What I do*. Something like a desk, a studio, work in progress; 21:9 crops best.

The difference between them is what happens when there's no photo. The portrait always
shows something, because the page is built around it. The band **shows nothing at all** —
the section disappears rather than displaying a grey rectangle, which is where it stands
right now. Add a `band.jpg` and the section appears on the next build; take it away and it
goes again. Nothing to comment out either way.

The grey `band.svg` and `portrait.svg` already in that folder are only there as size
references. A `.jpg` always wins over them, so you never need to delete anything.

## Adding a video

Videos go in the same `images/` folder as the pictures. **The filename decides what the
video does**, and there are only three names to remember:

- **`hero.mp4`** — a full-width player at the top of the project page, in place of the big
  picture. It shows its still until someone presses play.
- **`01-loop.mp4`** — plays itself, silently, on repeat. For showreel-type pieces.
- **`01-video.mp4`** — an ordinary player with a play button, which waits to be asked.

The number is just the running order, counted along with the pictures. If you name one
something else it still works, but the build will tell you what it would have called it —
that's how every project stays consistent with every other.

Two optional extras, both named after the clip. `01-video.jpg` is the still shown before
the video loads, and `01-video.webm` is a second copy of the same film that most browsers
will download instead because it's smaller. Neither is required.

**You don't need to worry about the shape.** The build reads the real dimensions out of
the file, so a widescreen piece, a square one and a vertical one each get their own
height. Nothing is cropped to fit.

**Keep them under 100 MB, and ideally far under.** That's not a style preference: GitHub
refuses to accept any single file over 100 MB, so one oversized video stops the whole site
publishing. Around 8–10 MB per minute at 1080p looks good and behaves. Your two big films
have already been converted down — the originals are untouched wherever you keep them.

## If a picture doesn't appear

Build again first — that's usually all it is. If it still doesn't, the build window will
now name the file and tell you why it was skipped. The usual answer is the format:

**`.heic` doesn't work on the web.** It's what an iPhone shoots by default, and no browser
except Safari will display it. Export as JPEG first. Same for `.tif`, `.psd` and `.ai`.

Formats that do work: `.jpg`, `.png`, `.webp`, `.gif`, `.svg` for pictures, and `.mp4`,
`.webm`, `.mov` for video.

Two things that look like a bug but aren't. A picture named the same as a video becomes
that video's **cover frame** rather than its own gallery item — `02-walkthrough.mp4` plus
`02-walkthrough.jpg` is one entry, not two. And `cover.jpg` is the project's hero, so it
won't also show up in the gallery.

## The first time you run one of these

macOS may say *"Build.command can't be opened because it is from an unidentified
developer."* That's the standard warning for any script that didn't come from the App
Store. Right-click the file, choose **Open**, then click **Open** in the dialog. You only
have to do this once per file.

If it says Python isn't installed, macOS will offer to install it — click Install, wait,
then double-click the file again.

## Changing your skills, software and tool icons

Everything in the *Skills & software* block on the About page comes from one file:
**`content/about.json`**. Open it in TextEdit.

- To add a skill, add it to the list inside the right group.
- To remove one, delete its line.
- To add a piece of software, copy one of the existing three-line entries, change the
  name, and put an icon file at `assets/img/tools/` with a matching name.
- To change an icon, save your own SVG over the existing file, keeping the filename.
  **Any SVG works** — an outline or a solid filled shape, whatever colour it was exported
  in. The build strips the colour out and lets the icon take the page's instead, so it
  goes bone at rest and red on hover like all the others. The one exception is a gradient,
  which keeps its own colours and can't respond to hover; the build tells you if you use
  one.

Then double-click `Build.command`. If an icon file is missing, the build tells you which
one rather than silently breaking the page.

The icons are all drawn the same way — one thin line on a small square — which is what
makes the row read as a set. Your own will fit in best drawn the same way.

## Your signature

**There isn't one on the site at the moment.** To add one, put your file in
`assets/img/site/` named **`signature`** — the extension can be `.svg`, `.png`, `.jpg` or
`.webp`, whichever you happen to have — and double-click `Build.command`. To take it away
again, delete that file and rebuild. Nothing else to change either way.

(The placeholder I drew is parked at `tools/spare/signature-placeholder.svg` if you want
it back for testing.)

**The easy way.** Sign a piece of white page, photograph it with your phone, crop it, and
save it as `signature.jpg`. That's it — the site inverts it and drops the paper away
automatically, so a plain photo comes out as a clean white signature on the dark
background. No tracing, no removing the background, no Photoshop.

**The sharp way.** Trace it to an SVG (Illustrator's Image Trace does it in one step) and
save it as `signature.svg`. Vector stays crisp at any size and any screen, and it picks up
the site's colour by itself. Draw it as lines rather than a filled shape.

A PNG with a transparent background works too, and is used exactly as-is.

To change the size, open `assets/css/style.css`, search for `.sig {`, and change the
`width` on the line below it.

## Using an animated cover

The cover picture can be a GIF. Name it `cover.gif` instead of `cover.jpg` and it will
animate in the work grid — a good way to make one project stand out. Keep it under about
2 MB; the build warns you if it's bigger, because a few heavy GIFs will make the grid
sluggish.

## Putting it online

The README has a step-by-step for GitHub Pages, which hosts this kind of site free. The
short version: double-click `Build.command`, upload the whole folder to a repository, and
turn Pages on in the repository's settings. Everything needed for that is already in
place.

One rule that matters once it's online: **keep filenames lowercase**. Your Mac treats
`Cover.JPG` and `cover.jpg` as the same file; web servers don't, and a capital letter in a
filename is the most common reason a picture works locally and breaks after publishing.

## Everything else

`README.md` in this folder is the full documentation: how to add a whole new project,
how the writing and layout work, what every setting does, and why things are built the
way they are. It's written for someone comfortable editing files, but the *Adding a
project* section at the top is worth a read either way.
