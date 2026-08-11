/* ==========================================================================
   Portfolio — animation & interaction layer
   assets/js/main.js

   No dependencies. Everything degrades gracefully:
   if this file fails to load the site is still fully readable and navigable.

   01  helpers
   01b smooth scroll (Lenis)
   02  preloader
   03  line splitting (masked text reveals)
   04  character splitting + magnetic letters
   05  rotating words
   06  hero name, fitted
   06b horizontal work rail
   07  scroll reveals + stagger
   08  counters
   09  navigation (sticky, auto-hide, mobile sheet)
   10  parallax + pointer drift
   11  custom cursor + magnetic buttons
   12  scroll progress
   13  page transitions
   14  looping project video
   14b video plates take the clip's own shape
   15  hero readouts (clock, viewport)
   16  misc (year, active link)
   ========================================================================== */
(function () {
  'use strict';

  /* 01 — helpers ----------------------------------------------------------*/
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine   = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp  = function (v, a, b) { return Math.min(Math.max(v, a), b); };
  var lerp   = function (a, b, n) { return a + (b - a) * n; };

  var raf = [];                                    // shared rAF subscribers
  function onFrame(fn) { raf.push(fn); }
  (function loop(now) {
    /* Lenis needs to be advanced once per frame, and it has to happen before
       anything that reads scroll position — otherwise parallax and the
       progress bar act on last frame's number and lag a frame behind. This is
       the site's only rAF loop, so ordering here is the whole story. */
    if (window.__lenis) window.__lenis.raf(now || 0);
    for (var i = 0; i < raf.length; i++) raf[i]();
    requestAnimationFrame(loop);
  })();

  /* 01b — smooth scroll ---------------------------------------------------*/
  /* Lenis (MIT, vendored in assets/js/vendor/) intercepts the wheel and eases
     the page to where it's going, instead of jumping in the browser's
     discrete steps. It still moves the real document scroll, which is what
     lets everything else here carry on working untouched: IntersectionObserver
     reveals, the sticky nav, the progress bar, anchor links.

     It is switched off entirely under prefers-reduced-motion, and on touch,
     where the platform's own inertia is better than anything a script can
     impose and fighting it feels wrong.

     duration  how long it takes to catch up — higher is heavier
     lerp      an alternative to duration; leave one or the other, not both */
  function setupSmoothScroll() {
    if (reduce || !window.Lenis) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    var lenis = new window.Lenis({
      duration: 1.05,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1.6
    });
    window.__lenis = lenis;

    /* in-page anchors have to go through Lenis, or the browser's instant jump
       and Lenis's easing fight over the same scroll position */
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      if (!id || id === '#') return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || -72 });
    });

    /* the mobile sheet scrolls itself; don't let Lenis eat its wheel events */
    var sheet = $('.sheet');
    if (sheet) sheet.setAttribute('data-lenis-prevent', '');
  }

  /* 02 — preloader --------------------------------------------------------*/
  function preloader(done) {
    var el = $('.loader');
    if (!el || reduce) {
      if (el) el.remove();
      document.body.classList.remove('is-loading');
      done();
      return;
    }

    var pct  = $('[data-loader-pct]', el);
    var bar  = $('.loader__bar i', el);
    var val  = 0;
    var ready = false;

    function markReady() { ready = true; }
    // whichever comes first: window load, or a failsafe so nobody is ever trapped here
    if (document.readyState === 'complete') markReady();
    window.addEventListener('load', markReady);
    setTimeout(markReady, 2600);

    // above-the-fold imagery counts towards the bar's creep, but never gates it
    var imgs = $$('img:not([loading="lazy"])');
    var doneImgs = 0;
    imgs.forEach(function (img) {
      if (img.complete) { doneImgs++; return; }
      var tick = function () { doneImgs++; };
      img.addEventListener('load', tick, { once: true });
      img.addEventListener('error', tick, { once: true });
    });

    var t0 = performance.now();
    var id = setInterval(function () {
      var elapsed = performance.now() - t0;
      var imgPct = imgs.length ? (doneImgs / imgs.length) * 100 : 100;
      // creep forward, never stall, never finish before 900ms
      var target = ready ? 100 : Math.max(clamp(elapsed / 14, 0, 88), imgPct * 0.88);
      val = lerp(val, target, ready && elapsed > 900 ? 0.24 : 0.14);
      if (val > 99.4) val = 100;

      if (pct) pct.textContent = String(Math.round(val)).padStart(3, '0');
      if (bar) bar.style.transform = 'scaleX(' + (val / 100).toFixed(4) + ')';

      if (val === 100) {
        clearInterval(id);
        el.classList.add('is-done');
        document.body.classList.remove('is-loading');
        setTimeout(function () { el.remove(); }, 700);
        done();
      }
    }, 1000 / 60);
  }

  /* 03 — line splitting ---------------------------------------------------*/
  /* Wraps each visual line of [data-split] in .ln > .ln__i so it can be
     masked and slid up. Re-runs on resize (debounced) because line breaks
     change with the viewport. */
  function splitLines(el) {
    if (!el.__origHTML) el.__origHTML = el.innerHTML;
    el.innerHTML = el.__origHTML;

    var units = [];
    var frag  = document.createDocumentFragment();
    /* Track whether whitespace actually preceded each unit in the source, so a
       span glued to a word — Work<span>.</span> — doesn't gain a space it never
       had when the line is rebuilt. */
    var pendingSpace = false;

    function addUnit(node) {
      node.__space = pendingSpace;
      pendingSpace = false;
      units.push(node);
      frag.appendChild(node);
    }

    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(function (chunk) {
          if (!chunk) return;
          if (/^\s+$/.test(chunk)) {
            pendingSpace = true;
            frag.appendChild(document.createTextNode(' '));
            return;
          }
          var s = document.createElement('span');
          s.className = 'wd';
          s.style.display = 'inline-block';
          s.textContent = chunk;
          addUnit(s);
        });
      } else if (node.nodeType === 1) {
        var clone = node.cloneNode(true);
        if (getComputedStyle(node).display === 'inline') clone.style.display = 'inline-block';
        addUnit(clone);
      }
    });

    el.innerHTML = '';
    el.appendChild(frag);

    // group units by vertical offset
    var lines = [];
    var last = null;
    units.forEach(function (u) {
      var top = u.offsetTop;
      if (last === null || Math.abs(top - last) > 4) { lines.push([]); last = top; }
      lines[lines.length - 1].push(u);
    });

    if (!lines.length) return;

    var out = document.createDocumentFragment();
    lines.forEach(function (line, i) {
      var wrap  = document.createElement('span');
      wrap.className = 'ln';
      var inner = document.createElement('span');
      inner.className = 'ln__i';
      inner.style.setProperty('--d', (i * 90) + 'ms');
      line.forEach(function (u, j) {
        if (j && u.__space !== false) inner.appendChild(document.createTextNode(' '));
        u.style.display = '';
        inner.appendChild(u);
      });
      wrap.appendChild(inner);
      out.appendChild(wrap);
    });

    el.innerHTML = '';
    el.appendChild(out);
  }

  function setupSplits() {
    var targets = $$('[data-split]');
    if (reduce) { targets.forEach(function (t) { t.classList.add('is-in'); }); return targets; }
    targets.forEach(splitLines);

    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        targets.forEach(function (el) {
          var wasIn = el.classList.contains('is-in');
          splitLines(el);
          if (wasIn) el.classList.add('is-in');
        });
      }, 220);
    });
    return targets;
  }

  /* 04 — character splitting + magnetic letters ---------------------------*/
  /* [data-chars] gets one .chw > .ch per letter: .ch runs the staggered
     entrance, .chw carries the magnetic hover. Two layers so the two
     transforms never fight over the same element. */
  function splitChars(el) {
    if (!el.__origHTML) el.__origHTML = el.innerHTML;
    el.innerHTML = el.__origHTML;

    // flatten to a list of [character, className] first, so leading and
    // trailing whitespace from the markup can be trimmed off cleanly
    var list = [];
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType !== 3 && n.nodeType !== 1) return;
      var cls = n.nodeType === 1 ? (n.className || '') : '';
      (n.textContent || '').replace(/\s+/g, ' ').split('').forEach(function (ch) {
        list.push([ch, cls]);
      });
    });
    while (list.length && list[0][0] === ' ') list.shift();
    while (list.length && list[list.length - 1][0] === ' ') list.pop();

    /* Letters go into per-word groups. Every .chw is an inline-block, so
       without a nowrap wrapper around each word the line can break between
       any two letters — which turned "JIN YOSHIDA" into "JIN YO / SHIDA"
       the moment the headline got big enough to wrap. */
    var frag = document.createDocumentFragment();
    var n = 0;
    var word = null;
    function newWord() {
      word = document.createElement('span');
      word.className = 'chwd';
      frag.appendChild(word);
    }
    newWord();

    list.forEach(function (pair) {
      if (pair[0] === ' ') {
        frag.appendChild(document.createTextNode(' '));
        newWord();
        return;
      }
      var wrap = document.createElement('span');
      wrap.className = 'chw' + (pair[1] ? ' ' + pair[1] : '');
      var inner = document.createElement('span');
      inner.className = 'ch';
      inner.style.setProperty('--d', (n * 42 + 60) + 'ms');
      inner.textContent = pair[0];
      wrap.appendChild(inner);
      word.appendChild(wrap);
      n++;
    });

    el.innerHTML = '';
    el.appendChild(frag);
    return $$('.chw', el);
  }

  function setupChars() {
    $$('[data-chars]').forEach(function (el) {
      if (reduce) { el.classList.add('is-in'); return; }
      var chars = splitChars(el);
      /* The magnetic hover is for the name on the home page only. On a page
         title like "About." it reads as a fidget rather than an invitation —
         there's nothing to click, so the letters shouldn't answer the cursor.
         Opt in with data-magnetic-chars; the entrance runs either way. */
      if (!fine || !chars.length || !el.hasAttribute('data-magnetic-chars')) return;

      var mx = 0, my = 0, queued = false;

      function apply() {
        queued = false;
        for (var i = 0; i < chars.length; i++) {
          var r = chars[i].getBoundingClientRect();
          var dx = mx - (r.left + r.width / 2);
          var dy = my - (r.top + r.height / 2);
          var d = Math.sqrt(dx * dx + dy * dy);
          var inf = d < 180 ? 1 - d / 180 : 0;
          inf *= inf;
          chars[i].style.transform =
            'translate3d(' + (dx * 0.09 * inf).toFixed(2) + 'px,' +
            (dy * 0.09 * inf - inf * 11).toFixed(2) + 'px,0) scale(' +
            (1 + inf * 0.11).toFixed(3) + ')';
        }
      }

      el.addEventListener('pointermove', function (e) {
        mx = e.clientX; my = e.clientY;
        if (!queued) { queued = true; requestAnimationFrame(apply); }
      });
      el.addEventListener('pointerleave', function () {
        chars.forEach(function (c) { c.style.transform = ''; });
      });
    });
  }

  /* 05 — rotating words ---------------------------------------------------*/
  function setupRotator() {
    $$('[data-rotate]').forEach(function (el) {
      var words = (el.getAttribute('data-rotate') || '').split(',')
        .map(function (s) { return s.trim(); })
        .filter(Boolean);
      if (words.length < 2 || reduce) return;

      var i = 0;
      setInterval(function () {
        if (document.hidden) return;                 // don't animate in a background tab
        el.classList.add('is-out');                  // lift and blur out
        setTimeout(function () {
          i = (i + 1) % words.length;
          el.textContent = words[i];
          el.classList.remove('is-out');
          el.classList.add('is-under');              // snap below, transition disabled
          requestAnimationFrame(function () {
            requestAnimationFrame(function () { el.classList.remove('is-under'); });
          });
        }, 380);
      }, 2900);
    });
  }

  /* 06 — hero name, fitted ------------------------------------------------ ---*/
  /* The name should span the page's padded width exactly, at any viewport.
     A vw font-size can only approximate that: --gutter is a clamp, so the
     space to fill isn't a fixed fraction of the viewport and no single vw
     value tracks it across every width.

     So measure instead. Set a known size, read how wide the text actually
     comes out, and scale by the ratio. One reflow on load and one per resize.

     Two things matter for correctness. It has to run after the webfont
     arrives, or it fits to the fallback's metrics and jumps when Sora lands.
     And the result is trimmed by a hair, because scrollWidth rounds up and a
     sub-pixel overshoot would show as a clipped edge. */
  function setupFitMark() {
    var el = $('.hero__mark');
    if (!el) return;

    /* A Range over the contents, not scrollWidth. scrollWidth reports the
       *box* width whenever the text doesn't overflow it, so at wide viewports
       the ratio came out as exactly 1 and the fit silently did nothing. A
       Range measures the inline boxes themselves, overflowing or not. */
    var range = document.createRange();

    function textWidth() {
      range.selectNodeContents(el);
      return range.getBoundingClientRect().width;
    }

    /* The name's height isn't knowable in CSS — it comes out of the fit above,
       which depends on the viewport width and the font's metrics. The hero
       band sits above it and has to stop short of it, so the measured height
       is published as a custom property for the CSS to subtract. */
    var stage = el.closest('.hero');

    /* Two measurements the CSS can't make for itself.

       --mark-h is the name's height, which comes out of the fit above.

       --above-b is where the block above the band ends. On a phone the intro
       and the availability line are in the normal flow, so how far down the
       band should start depends on how the pitch happens to wrap — not on any
       fraction of the viewport. A vh-based offset collides with the text on a
       short screen and leaves a hole on a tall one. */
    function publishHeight() {
      if (!stage) return;
      var wrap = el.parentElement;
      stage.style.setProperty('--mark-h', wrap.offsetHeight + 'px');

      var intro = stage.querySelector('.hero__intro');
      var avail = stage.querySelector('.hero__avail');
      var band = stage.querySelector('.hero__object');
      var top = stage.getBoundingClientRect().top;

      /* on desktop the availability line is positioned against the band, so
         measuring it here would be circular — use the intro alone */
      var last = (avail && getComputedStyle(avail).position === 'static') ? avail : intro;
      if (last) {
        stage.style.setProperty('--above-b',
          Math.round(last.getBoundingClientRect().bottom - top) + 'px');
      }

      /* On a phone the pitch sits under the picture, so the picture has to
         stop short of the name by the pitch's height as well. Measuring the
         height is safe — it's text-driven and doesn't depend on where the
         block ends up — so there's no circularity with --band-b below. */
      if (intro) {
        stage.style.setProperty('--pitch-h', intro.offsetHeight + 'px');
      }

      /* --band-b is where the picture ends, which is what the pitch sits under
         on a phone. It has to be read *after* --above-b lands, because that's
         what moved the band — hence the second getBoundingClientRect, which
         forces the layout the first property change invalidated. */
      if (band) {
        stage.style.setProperty('--band-b',
          Math.round(band.getBoundingClientRect().bottom - top) + 'px');
      }
    }

    function fit() {
      el.style.fontSize = '100px';
      var avail = el.clientWidth;
      var ink = textWidth();
      if (!avail || !ink) return;
      /* two passes: the first lands close, the second corrects for the
         rounding and hinting that shift slightly at the new size */
      var size = 100 * avail / ink;
      el.style.fontSize = size.toFixed(2) + 'px';
      ink = textWidth();
      if (ink) size *= avail / ink;
      el.style.fontSize = (size * 0.999).toFixed(2) + 'px';
      publishHeight();
    }

    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(fit, 120);
    });
  }

  /* 06b — horizontal rail --------------------------------------------------*/
  /* Maps vertical scroll onto horizontal travel. The section is given extra
     height equal to the distance the row has to move; the row is sticky inside
     it, so while you scroll through that height the row stays put on screen and
     slides sideways instead.

     Nothing here intercepts a scroll event. The browser scrolls normally and
     this only reads the resulting position — which is why the scrollbar stays
     truthful, anchor links still land, and Lenis's easing carries through
     untouched. Turning it off is just a matter of the media query below not
     matching; the script checks the same breakpoint and does nothing. */
  function setupRail() {
    var rails = $$('[data-rail]');
    if (!rails.length) return;

    var on = false;

    function measure(rail) {
      var track = rail.querySelector('[data-rail-track]');
      if (!track) return null;
      /* how far the row has to move for its last card to reach the right edge */
      var travel = Math.max(0, track.scrollWidth - window.innerWidth);
      rail.style.height = travel ? (window.innerHeight + travel) + 'px' : '';
      return { rail: rail, track: track, travel: travel,
               bar: rail.parentElement.querySelector('[data-rail-bar]'),
               idx: rail.parentElement.querySelector('[data-rail-i]'),
               cards: track.children.length };
    }

    var items = [];

    function build() {
      on = window.matchMedia('(min-width: 861px)').matches && !reduce;
      items = [];
      rails.forEach(function (r) {
        if (!on) {
          r.style.height = '';
          var t = r.querySelector('[data-rail-track]');
          if (t) t.style.transform = '';
          return;
        }
        var m = measure(r);
        if (m) items.push(m);
      });
    }

    build();

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(build, 150);
    });

    onFrame(function () {
      if (!on) return;
      for (var i = 0; i < items.length; i++) {
        var m = items[i];
        if (!m.travel) continue;
        var box = m.rail.getBoundingClientRect();
        /* 0 as the section's top reaches the top of the screen, 1 as its
           bottom does — clamped, so it holds still either side */
        var p = clamp(-box.top / m.travel, 0, 1);
        m.track.style.transform = 'translate3d(' + (-p * m.travel).toFixed(1) + 'px,0,0)';
        if (m.bar) m.bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
        if (m.idx) {
          var n = Math.min(m.cards, Math.floor(p * m.cards) + 1);
          var txt = (n < 10 ? '0' : '') + n;
          if (m.idx.textContent !== txt) m.idx.textContent = txt;
        }
      }
    });
  }

  /* 07 — scroll reveals ---------------------------------------------------*/
  function setupReveals() {
    var sel = '[data-reveal], [data-clip], [data-draw], [data-split], [data-chars], .step';
    var items = $$(sel);

    // stagger children of any [data-stagger] container
    $$('[data-stagger]').forEach(function (group) {
      var step = parseInt(group.getAttribute('data-stagger'), 10) || 90;
      $$(sel, group).forEach(function (child, i) {
        if (!child.style.getPropertyValue('--d')) child.style.setProperty('--d', (i * step) + 'ms');
      });
    });

    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    /* An element that clips itself to zero height (our [data-clip] curtain)
       reports as "not intersecting" in Chrome, which would deadlock the
       reveal. So we always watch an unclipped ancestor and map it back to
       the elements it should reveal. */
    var watched = [];                                  // [{ target, els: [] }]
    function watch(target, el) {
      for (var i = 0; i < watched.length; i++) {
        if (watched[i].target === target) { watched[i].els.push(el); return; }
      }
      watched.push({ target: target, els: [el] });
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        for (var i = 0; i < watched.length; i++) {
          if (watched[i].target !== e.target) continue;
          watched[i].els.forEach(function (el) { el.classList.add('is-in'); });
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    items.forEach(function (el) {
      // anything in the opening viewport reveals right after the preloader
      if (el.closest('.hero, .case-hero') && el.getBoundingClientRect().top < window.innerHeight) {
        setTimeout(function () { el.classList.add('is-in'); }, 60);
        return;
      }
      var target = el.hasAttribute('data-clip') ? (el.parentElement || el) : el;
      watch(target, el);
    });

    watched.forEach(function (w) { io.observe(w.target); });
  }

  /* 08 — counters ---------------------------------------------------------*/
  function setupCounters() {
    var els = $$('[data-count]');
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        io.unobserve(el);
        var raw = el.getAttribute('data-count');
        var to = parseFloat(raw);
        var suffix = raw.replace(/^[\d.]+/, '');
        var dur = 1400, t0 = performance.now();
        (function step(now) {
          var p = clamp((now - t0) / dur, 0, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          var v = to % 1 ? (to * eased).toFixed(1) : Math.round(to * eased);
          el.textContent = v + suffix;
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* 09 — navigation -------------------------------------------------------*/
  function setupNav() {
    var nav = $('.nav');
    if (nav) {
      var prev = window.scrollY;
      onFrame(function () {
        var y = window.scrollY;
        if (Math.abs(y - prev) < 2) return;
        nav.classList.toggle('is-stuck', y > 24);
        if (!$('.sheet.is-open')) {
          nav.classList.toggle('is-hidden', y > prev && y > 340);
        }
        prev = y;
      });
    }

    var burger = $('.burger');
    var sheet  = $('.sheet');
    if (!burger || !sheet) return;

    var open = false;
    function toggle(force) {
      open = typeof force === 'boolean' ? force : !open;
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      sheet.classList.toggle('is-open', open);
      sheet.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
      if (open && nav) nav.classList.remove('is-hidden');
    }
    burger.addEventListener('click', function () { toggle(); });
    $$('a', sheet).forEach(function (a) { a.addEventListener('click', function () { toggle(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) toggle(false); });
    window.addEventListener('resize', function () { if (open && window.innerWidth > 860) toggle(false); });
  }

  /* 10 — parallax + pointer drift -----------------------------------------*/
  function setupParallax() {
    if (reduce) return;

    var items = $$('[data-parallax]').map(function (el) {
      return { el: el, k: parseFloat(el.getAttribute('data-parallax')) || 0.12, y: 0, t: 0 };
    });

    if (items.length) {
      /* Element positions are measured once (and on resize) rather than every
         frame — reading a rect mid-frame forces a layout, and doing it per
         item per frame is what makes parallax feel heavy. */
      function measure() {
        var sy = window.scrollY;
        items.forEach(function (it) {
          it.el.style.transform = '';                 // measure untransformed
          var r = it.el.getBoundingClientRect();
          it.mid = r.top + sy + r.height / 2;
          it.el.style.transform = 'translate3d(0,' + it.y.toFixed(2) + 'px,0)';
        });
      }
      measure();
      var mt;
      window.addEventListener('resize', function () {
        clearTimeout(mt);
        mt = setTimeout(measure, 200);
      });
      window.addEventListener('load', measure);

      onFrame(function () {
        var vh = window.innerHeight;
        var sy = window.scrollY;
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          var rel = it.mid - sy;                      // centre, viewport-relative
          if (rel < -300 || rel > vh + 300) continue;
          it.t = -((rel - vh / 2) / vh) * it.k * 120;
          if (Math.abs(it.y - it.t) < 0.05) continue; // settled — skip the write
          it.y = lerp(it.y, it.t, 0.09);
          it.el.style.transform = 'translate3d(0,' + it.y.toFixed(2) + 'px,0)';
        }
      });
    }

    // hero aura follows the pointer a little
    if (!fine) return;
    var auras = $$('.hero__aura');
    if (!auras.length) return;
    var mx = 0, my = 0, cx = 0, cy = 0;
    window.addEventListener('pointermove', function (e) {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    });
    onFrame(function () {
      cx = lerp(cx, mx, 0.035);
      cy = lerp(cy, my, 0.035);
      auras.forEach(function (a, i) {
        var k = (i + 1) * 22;
        a.style.marginLeft = (cx * k).toFixed(2) + 'px';
        a.style.marginTop  = (cy * k).toFixed(2) + 'px';
      });
    });
  }

  /* 11 — cursor + magnetic ------------------------------------------------*/
  function setupCursor() {
    if (!fine || reduce) return;

    var ring = document.createElement('div'); ring.className = 'cursor';
    var dot  = document.createElement('div'); dot.className  = 'cursor-dot';
    document.body.appendChild(ring);
    document.body.appendChild(dot);

    var tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    var rx = tx, ry = ty;
    var shown = false;

    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!shown) { shown = true; ring.classList.add('is-on'); dot.classList.add('is-on'); rx = tx; ry = ty; }
    }, { passive: true });

    document.addEventListener('pointerleave', function () {
      shown = false; ring.classList.remove('is-on'); dot.classList.remove('is-on');
    });

    onFrame(function () {
      rx = lerp(rx, tx, 0.16); ry = lerp(ry, ty, 0.16);
      ring.style.transform = 'translate3d(' + rx.toFixed(2) + 'px,' + ry.toFixed(2) + 'px,0)';
      dot.style.transform  = 'translate3d(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px,0)';
    });

    var hot = 'a, button, .card, [data-cursor]';
    document.addEventListener('pointerover', function (e) {
      if (e.target.closest && e.target.closest(hot)) ring.classList.add('is-hot');
    });
    document.addEventListener('pointerout', function (e) {
      if (e.target.closest && e.target.closest(hot)) ring.classList.remove('is-hot');
    });

    // magnetic
    $$('[data-magnetic]').forEach(function (el) {
      var strength = parseFloat(el.getAttribute('data-magnetic')) || 0.28;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * strength;
        var dy = (e.clientY - (r.top + r.height / 2)) * strength;
        el.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0)';
      });
      el.addEventListener('pointerleave', function () {
        el.style.transition = 'transform 0.55s cubic-bezier(0.22,1,0.36,1)';
        el.style.transform = '';
        setTimeout(function () { el.style.transition = ''; }, 560);
      });
      el.addEventListener('pointerenter', function () { el.style.transition = ''; });
    });
  }

  /* 12 — scroll progress --------------------------------------------------*/
  function setupProgress() {
    var bar = $('.progress i');
    if (!bar) return;

    // scrollHeight forces a layout, so it's cached and only re-read when the
    // page could actually have changed height — not 60 times a second
    var max = 1, last = -1;
    function measure() { max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight); }
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);

    onFrame(function () {
      var p = clamp(window.scrollY / max, 0, 1);
      if (Math.abs(p - last) < 0.0004) return;      // nothing to repaint
      last = p;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    });
  }

  /* 13 — page transitions -------------------------------------------------*/
  function setupTransitions() {
    if (reduce) return;
    var veil = document.createElement('div');
    veil.setAttribute('aria-hidden', 'true');
    veil.style.cssText = 'position:fixed;inset:0;z-index:9700;background:#08080a;pointer-events:none;' +
                         'opacity:0;transition:opacity .38s cubic-bezier(0.65,0,0.35,1)';
    document.body.appendChild(veil);

    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a');
      if (!a) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      var href = a.getAttribute('href') || '';
      if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return;
      if (a.origin && a.origin !== window.location.origin) return;
      if (a.pathname === window.location.pathname && a.search === window.location.search) return;

      e.preventDefault();
      veil.style.opacity = '1';
      setTimeout(function () { window.location.href = a.href; }, 340);
    });

    // reset when arriving back via the cache
    window.addEventListener('pageshow', function (ev) { if (ev.persisted) veil.style.opacity = '0'; });
  }

  /* 14 — looping project video --------------------------------------------*/
  /* Clips named *-loop.mp4 autoplay silently. Two rules: they only run while
     they are on screen, and under prefers-reduced-motion they never run at
     all — the poster frame stands in, which is why the builder pairs a still
     with every clip it can. */
  function setupLoops() {
    var vids = $$('video[data-loop]');
    if (!vids.length) return;

    if (reduce || !('IntersectionObserver' in window)) {
      vids.forEach(function (v) {
        v.removeAttribute('autoplay');
        v.pause();
        /* no poster and no motion would leave an empty box, so give the
           reader the controls instead */
        if (!v.getAttribute('poster')) v.setAttribute('controls', '');
      });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          var play = v.play();
          if (play && play.catch) play.catch(function () {});   // autoplay blocked
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { rootMargin: '120px 0px' });

    vids.forEach(function (v) { io.observe(v); });
  }

  /* 14b — a clip is whatever shape it is -----------------------------------*/
  /* build.py reads each film's dimensions out of its own header and writes
     them onto the plate, which reserves the right height before a single byte
     of video has downloaded. This is the second half of that: the moment the
     browser has the metadata it knows the true size for certain — including
     for formats the builder can't parse, and for anything dropped in later
     without a rebuild — so the plate is corrected to match.

     Without both halves a film gets forced into a box that isn't its shape.
     A 1920x938 piece in a 16:9 plate loses a strip off the top and the
     bottom, which is exactly the sort of thing you only notice once someone
     points at their own work and asks where the rest of it went. */
  function setupClipShape() {
    $$('.plate--vid video').forEach(function (v) {
      function fit() {
        if (!v.videoWidth || !v.videoHeight) return;
        var plate = v.closest('.plate--vid');
        if (plate) plate.style.aspectRatio = v.videoWidth + ' / ' + v.videoHeight;
      }
      if (v.readyState >= 1) fit();                  // already known from cache
      v.addEventListener('loadedmetadata', fit);
    });
  }

  /* 15 — hero readouts ----------------------------------------------------*/
  /* The two live numbers in the hero: Melbourne local time, and the viewport
     size. Both are decoration, so both fail quietly — if the timezone isn't
     available the clock simply never starts. */
  function setupReadouts() {
    var clock = $('[data-clock]');
    if (clock) {
      var fmt;
      try {
        fmt = new Intl.DateTimeFormat('en-AU', {
          timeZone: 'Australia/Melbourne',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
      } catch (e) { fmt = null; }
      if (fmt) {
        var tick = function () { clock.textContent = fmt.format(new Date()); };
        tick();
        setInterval(tick, 1000);
      } else {
        clock.remove();
      }
    }

    var vp = $('[data-viewport]');
    if (vp) {
      var t;
      var show = function () {
        vp.textContent = window.innerWidth + ' x ' + window.innerHeight + ' px';
      };
      show();
      window.addEventListener('resize', function () {
        clearTimeout(t);
        t = setTimeout(show, 120);
      });
    }
  }

  /* 16 — misc -------------------------------------------------------------*/
  function setupMisc() {
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

    // mark the current page in the nav
    var here = window.location.pathname.replace(/index\.html$/, '').replace(/\/$/, '');
    $$('.nav__links a[href]').forEach(function (a) {
      var there = a.pathname ? a.pathname.replace(/index\.html$/, '').replace(/\/$/, '') : '';
      if (there && there === here && !a.getAttribute('href').startsWith('#')) {
        a.setAttribute('aria-current', 'page');
      }
    });

    // smooth anchor scroll with nav offset
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var t = document.getElementById(id.slice(1));
        if (!t) return;
        e.preventDefault();
        var nav = $('.nav');
        var off = nav ? nav.offsetHeight : 0;
        var y = t.getBoundingClientRect().top + window.scrollY - off - 8;
        window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
        history.replaceState(null, '', id);
      });
    });
  }

  /* boot ---------------------------------------------------------------- */
  function boot() {
    setupSplits();
    setupChars();
    setupSmoothScroll();
    setupRotator();
    setupRail();
    setupFitMark();
    setupNav();
    setupParallax();
    setupCursor();
    setupProgress();
    setupTransitions();
    setupMisc();
    setupLoops();
    setupClipShape();
    setupReadouts();
    preloader(function () {
      setupReveals();
      setupCounters();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
