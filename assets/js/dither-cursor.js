// Shared site cursor. Fine ordered highlights use the owl's 4x4 Bayer order
// and sparse density curve, rather than enlarging a low-resolution bitmap.
import {createCursorDistortion} from './cursor-distortion.js?v=3';
import {createFlow, advanceFlow, sampleFlow} from './cursor-flow.js?v=1';
const params = new URLSearchParams(location.search);
const mode = params.get('cursor') || 'edges-pressure';
if (['bloom', 'ripple', 'lens', 'surfaces'].includes(mode)) {
  import('./cursor-ideas.js?v=1').then(module => module.previewCursor(mode, params.get('cursorDemo') === '1'));
}
if (['edges-pressure','magnetic','edges','shear','lift','grain','scan','invert','contours','foil','pressure'].includes(mode)) {
  import('./cursor-more.js?v=5').then(module => module.previewMore(mode, params.get('cursorDemo') === '1'));
}
const modes = {
  wake: {life: 1350, radius: 38, density: 0.95},
  dust: {life: 1200, radius: 48, density: 0.82},
  echo: {life: 950, radius: 32, density: 0.62},
};
const fine = matchMedia('(pointer: fine)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
if (modes[mode]) startTrail(modes[mode]);

function startTrail(settings) {
  const distortion = createCursorDistortion();
  const canvas = document.createElement('canvas');
  canvas.className = 'dither-cursor';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9499';
  document.body.append(canvas);
  const context = canvas.getContext('2d');
  const field = document.createElement('canvas');
  const ink = field.getContext('2d', {willReadFrequently: true});
  const cell = 1.5;
  let pixelRatio = 1;
  const brand = getComputedStyle(document.documentElement).getPropertyValue('--ember').trim();
  const rgb = /^#[\da-f]{6}$/i.test(brand) ? brand.match(/[\da-f]{2}/gi).map(v => parseInt(v, 16)) : [250, 60, 60];
  let points = [], frame = 0, last = null, lastInput = -Infinity, lastFrame = 0;
  let flow = null, flowInput = -Infinity;
  const demo = params.get('cursorDemo') === '1';
  function resize() {
    pixelRatio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * pixelRatio);
    canvas.height = Math.round(innerHeight * pixelRatio);
    field.width = Math.ceil(innerWidth / cell);
    field.height = Math.ceil(innerHeight / cell);
    points = []; last = null; flow = null; distortion.clear();
  }
  resize();
  window.addEventListener('resize', resize);
  function wake() { if (!frame && !document.hidden && fine.matches && !reduced.matches) frame = requestAnimationFrame(draw); }
  function add(x, y, time) {
    if (mode === 'wake') {
      if (!flow || time - flowInput > settings.life) flow = createFlow(x, y);
      flow.target = {x, y}; flowInput = time;
      last = {x, y}; wake(); return;
    }
    const distance = last ? Math.hypot(x - last.x, y - last.y) : 0;
    const steps = Math.min(24, Math.max(1, Math.ceil(distance / 3)));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      points.push({x: last ? last.x + (x - last.x) * t : x, y: last ? last.y + (y - last.y) * t : y, born: time});
    }
    points = points.slice(-100);
    last = {x, y}; wake();
  }
  window.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !fine.matches || reduced.matches) return;
    const time = performance.now();
    if (time - lastInput > 100) last = null;
    lastInput = time; add(event.clientX, event.clientY, time);
  }, {passive: true});
  document.addEventListener('pointerleave', () => {last = null; distortion.clear();});
  document.addEventListener('visibilitychange', () => { points = []; last = null; distortion.clear(); context.clearRect(0, 0, canvas.width, canvas.height); if (demo) wake(); });
  function stop() {
    if (reduced.matches || !fine.matches) { cancelAnimationFrame(frame); frame = 0; points = []; distortion.clear(); context.clearRect(0, 0, canvas.width, canvas.height); }
    else if (demo) wake();
  }
  reduced.addEventListener('change', stop); fine.addEventListener('change', stop);
  function draw(now) {
    frame = 0;
    if (document.hidden || reduced.matches || !fine.matches) return;
    const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 1 / 60;
    lastFrame = now;
    if (demo && now - lastInput > 2200) {
      const t = now / 1100;
      add(innerWidth * (0.5 + 0.24 * Math.sin(t)), innerHeight * (0.46 + 0.13 * Math.sin(t * 2)), now);
    }
    if (mode === 'wake' && flow) {
      advanceFlow(flow, dt);
      points = now - flowInput < settings.life ? sampleFlow(flow, now, flowInput) : [];
    } else points = points.filter(point => now - point.born < settings.life);
    const newest = mode === 'wake' ? points[0] : points.at(-1);
    if (newest && last) distortion.update(newest.x, newest.y, (1 - (now - newest.born) / settings.life) ** 0.6);
    else distortion.clear();
    ink.clearRect(0, 0, field.width, field.height);
    // Max-blend overlapping stamps so fast moves never become solid blocks.
    ink.globalCompositeOperation = 'lighten';
    for (const point of points) {
      const age = (now - point.born) / settings.life;
      const radius = settings.radius * (point.radiusScale ?? 1) * (mode === 'wake' ? 1 - age * 0.3 : 0.5 + age) / cell;
      const x = point.x / cell, y = (point.y - (mode === 'dust' ? age * 24 : 0)) / cell;
      const gradient = ink.createRadialGradient(x, y, 0, x, y, radius);
      const alpha = settings.density * (point.strength ?? 1) * (1 - age) ** 0.6;
      if (mode === 'echo') {
        gradient.addColorStop(0, 'black'); gradient.addColorStop(0.65, 'black');
        gradient.addColorStop(0.8, `rgb(${255 * alpha},${255 * alpha},${255 * alpha})`);
      } else gradient.addColorStop(0, `rgb(${255 * alpha},${255 * alpha},${255 * alpha})`);
      gradient.addColorStop(1, 'black');
      ink.fillStyle = gradient; ink.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = `rgb(${rgb.join(',')})`;
    // Process only the trail's bounding box, not an entire high-DPI viewport.
    const margin = settings.radius * 1.6 + 28;
    const left = Math.max(0, Math.floor((Math.min(...points.map(p => p.x)) - margin) / cell));
    const top = Math.max(0, Math.floor((Math.min(...points.map(p => p.y)) - margin) / cell));
    const right = Math.min(field.width, Math.ceil((Math.max(...points.map(p => p.x)) + margin) / cell));
    const bottom = Math.min(field.height, Math.ceil((Math.max(...points.map(p => p.y)) + margin) / cell));
    const width = right - left, height = bottom - top;
    if (width <= 0 || height <= 0) { if (demo) wake(); return; }
    const data = ink.getImageData(left, top, width, height).data;
    for (let y = top; y < bottom; y++) {
      for (let x = left; x < right; x++) {
        const index = ((y - top) * width + x - left) * 4;
        const ax = x % 2, ay = y % 2, bx = Math.floor(x / 2) % 2, by = Math.floor(y / 2) % 2;
        const low = 2 * ax + 3 * ay - 4 * ax * ay;
        const high = 2 * bx + 3 * by - 4 * bx * by;
        const threshold = (4 * low + high + 0.5) / 16;
        const brightness = data[index] / 255;
        const t = Math.max(0, Math.min(1, (brightness - 0.28) / (0.94 - 0.28)));
        const density = 0.42 * (t * t * (3 - 2 * t)) ** 2;
        const coverage = Math.max(0, Math.min(1, (density - threshold) / 0.04 + 0.5));
        if (coverage > 0) {
          context.globalAlpha = coverage * coverage * (3 - 2 * coverage);
          const left = Math.round(x * cell * pixelRatio), top = Math.round(y * cell * pixelRatio);
          const dot = Math.max(1, Math.round(cell * pixelRatio * 0.8));
          context.fillRect(left, top, dot, dot);
        }
      }
    }
    context.globalAlpha = 1;
    if (points.length || demo) wake();
  }
  if (demo) wake();
}
