import {createCursorDistortion} from './cursor-distortion.js?v=1';

const threshold = (x, y) => {
  const ax = x % 2, ay = y % 2, bx = Math.floor(x / 2) % 2, by = Math.floor(y / 2) % 2;
  return (4 * (2 * ax + 3 * ay - 4 * ax * ay) + 2 * bx + 3 * by - 4 * bx * by + 0.5) / 16;
};

// Mask the actual surface pixels, including the owl's transparent silhouette.
function surfaceShimmer() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:fixed;width:0;height:0;pointer-events:none';
  const defs = document.createElementNS(ns, 'defs'); svg.append(defs); document.body.append(svg);
  const mask = document.createElement('canvas'); mask.width = mask.height = 128;
  const ctx = mask.getContext('2d'); ctx.fillStyle = 'white';
  for (let y = 0; y < 128; y += 2) for (let x = 0; x < 128; x += 2) {
    const r = Math.hypot(x - 64, y - 64) / 64;
    if (threshold(x / 2, y / 2) < Math.max(0, 1 - r * r) ** 2 * 0.85) ctx.fillRect(x, y, 1.7, 1.7);
  }
  const url = mask.toDataURL();
  const active = new Map(); let serial = 0;
  function remove(element, entry) {
    if (entry.original) element.style.setProperty('filter', entry.original, entry.priority);
    else element.style.removeProperty('filter');
    entry.filter.remove(); active.delete(element);
  }
  return {
    clear() { for (const [element, entry] of active) remove(element, entry); },
    update(x, y, time) {
      const targets = [...document.querySelectorAll('main img,main canvas')].filter(element => {
        const box = element.getBoundingClientRect();
        return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom && box.width > 0 && getComputedStyle(element).opacity !== '0';
      });
      for (const [element, entry] of active) if (!targets.includes(element)) remove(element, entry);
      for (const element of targets) {
        let entry = active.get(element);
        if (!entry) {
          const filter = document.createElementNS(ns, 'filter');
          filter.id = `surface-shimmer-${++serial}`;
          filter.setAttribute('primitiveUnits', 'userSpaceOnUse');
          filter.setAttribute('color-interpolation-filters', 'sRGB');
          filter.innerHTML = '<feColorMatrix in="SourceGraphic" type="matrix" values=".2126 .7152 .0722 0 0  .05 .17 .017 0 0  .05 .17 .017 0 0  0 0 0 1 0" result="red"/><feImage result="patch" preserveAspectRatio="none"/><feComposite in="red" in2="patch" operator="in" result="tint"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="tint"/></feMerge>';
          const image = filter.querySelector('feImage'); image.setAttribute('href', url);
          defs.append(filter);
          entry = {filter, image, original: element.style.getPropertyValue('filter'), priority: element.style.getPropertyPriority('filter')};
          const base = getComputedStyle(element).filter;
          element.style.filter = `${base === 'none' ? '' : base} url("#${filter.id}")`;
          active.set(element, entry);
        }
        const box = element.getBoundingClientRect();
        const sx = (element.offsetWidth || box.width) / box.width, sy = (element.offsetHeight || box.height) / box.height;
        const radius = 85 + 5 * Math.sin(time / 500);
        entry.image.setAttribute('x', ((x - box.left - radius) * sx).toFixed(2));
        entry.image.setAttribute('y', ((y - box.top - radius) * sy).toFixed(2));
        entry.image.setAttribute('width', (radius * 2 * sx).toFixed(2));
        entry.image.setAttribute('height', (radius * 2 * sy).toFixed(2));
      }
    },
  };
}

export function previewCursor(mode, demo) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(pointer: fine)');
  const canvas = document.createElement('canvas'); canvas.className = 'cursor-idea';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:9499;pointer-events:none';
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  const warp = ['lens', 'ripple'].includes(mode) ? createCursorDistortion() : null;
  const surface = mode === 'surfaces' ? surfaceShimmer() : null;
  let ratio = 1, frame = 0, lastTime = 0, lastInput = -Infinity, lastRing = 0;
  let target = {x: innerWidth / 2, y: innerHeight / 2}, position = {...target};
  let inside = false, rings = [], motion = 0;
  function resize() { ratio = Math.min(devicePixelRatio, 2); canvas.width = innerWidth * ratio; canvas.height = innerHeight * ratio; }
  resize(); window.addEventListener('resize', resize);
  function wake() { if (!frame && !document.hidden && fine.matches && !reduced.matches) frame = requestAnimationFrame(draw); }
  function clear() { ctx.clearRect(0, 0, canvas.width, canvas.height); warp?.clear(); surface?.clear(); rings = []; }
  window.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    if (!inside) position = {x: event.clientX, y: event.clientY};
    motion = Math.min(1, motion + Math.hypot(event.clientX - target.x, event.clientY - target.y) / 70);
    target = {x: event.clientX, y: event.clientY}; lastInput = performance.now(); inside = true; wake();
  }, {passive: true});
  document.addEventListener('pointerleave', () => {inside = false; clear();});
  document.addEventListener('visibilitychange', () => {clear(); lastTime = 0; if (demo) wake();});
  for (const query of [fine, reduced]) query.addEventListener('change', () => {clear(); wake();});
  function draw(now) {
    frame = 0;
    if (document.hidden || !fine.matches || reduced.matches) {clear(); return;}
    const dt = Math.min(0.05, (now - lastTime) / 1000 || 1 / 60); lastTime = now;
    const auto = demo && now - lastInput > 2000;
    if (auto) {
      target = {x: innerWidth * (0.5 + 0.22 * Math.sin(now / 1600)), y: innerHeight * (0.48 + 0.13 * Math.sin(now / 800))};
      motion = 0.65;
    }
    const follow = 1 - Math.exp(-18 * dt);
    position.x += (target.x - position.x) * follow; position.y += (target.y - position.y) * follow;
    motion *= Math.exp(-3 * dt);
    const intensity = auto ? 1 : inside ? Math.max(0, 1 - (now - lastInput) / 1100) : 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (mode === 'surfaces') {
      if (inside || auto) surface.update(position.x, position.y, now); else surface.clear();
    } else if (mode === 'lens') {
      if (inside || auto) {
        warp.update(position.x, position.y, 1.6);
        const link = document.elementFromPoint(target.x, target.y)?.closest('a,button');
        if (link) {ctx.fillStyle = '#fa3c3c'; ctx.beginPath(); ctx.arc(position.x, position.y, 4, 0, Math.PI * 2); ctx.fill();}
      } else warp.clear();
    } else {
      if (mode === 'ripple' && intensity > 0.1 && motion > 0.03 && now - lastRing > 210) {
        rings.push({x: position.x, y: position.y, born: now}); lastRing = now;
      }
      rings = rings.filter(ring => now - ring.born < 1500).slice(-7);
      if (mode === 'ripple') warp.update(position.x, position.y, intensity * 0.8);
      const radius = 57 + motion * 22;
      const sources = mode === 'bloom' ? [{x: position.x, y: position.y}] : rings;
      const extent = mode === 'bloom' ? radius : 125;
      if (sources.length) {
        const left = Math.max(0, Math.floor((Math.min(...sources.map(p=>p.x)) - extent) / 2));
        const right = Math.min(Math.ceil(innerWidth / 2), Math.ceil((Math.max(...sources.map(p=>p.x)) + extent) / 2));
        const top = Math.max(0, Math.floor((Math.min(...sources.map(p=>p.y)) - extent) / 2));
        const bottom = Math.min(Math.ceil(innerHeight / 2), Math.ceil((Math.max(...sources.map(p=>p.y)) + extent) / 2));
        ctx.fillStyle = '#fa3c3c';
        for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
          let density = 0;
          for (const point of sources) {
            const distance = Math.hypot(x * 2 - point.x, y * 2 - point.y);
            if (mode === 'bloom') density = Math.max(0, 1 - (distance / radius) ** 2) ** 2 * 0.5 * intensity;
            else {
              const age = (now - point.born) / 1500;
              density = Math.max(density, Math.exp(-(((distance - (10 + age * 100)) / 5) ** 2)) * 0.52 * (1 - age));
            }
          }
          if (density > threshold(x, y)) ctx.fillRect(x * 2, y * 2, 1.3, 1.3);
        }
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (demo || intensity > 0 || rings.length || (inside && mode === 'surfaces')) wake();
  }
  if (demo) wake();
}
