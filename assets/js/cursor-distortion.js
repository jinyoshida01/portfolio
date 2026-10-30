// Distort the live image/text itself, only within a small patch under the wake.
// Each target keeps its existing CSS filters; no page screenshots or duplicate DOM.
export function createCursorDistortion() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:fixed;width:0;height:0;pointer-events:none;overflow:hidden';
  const defs = document.createElementNS(ns, 'defs');
  svg.append(defs); document.body.append(svg);
  const map = document.createElement('canvas');
  map.width = map.height = 64;
  const context = map.getContext('2d');
  const pixels = context.createImageData(64, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const dx = (x - 31.5) / 31.5, dy = (y - 31.5) / 31.5;
    const falloff = Math.max(0, 1 - dx * dx - dy * dy) ** 2;
    const index = (y * 64 + x) * 4;
    pixels.data[index] = Math.round(128 + dx * falloff * 127);
    pixels.data[index + 1] = Math.round(128 + dy * falloff * 127);
    pixels.data[index + 2] = 128; pixels.data[index + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  const mapUrl = map.toDataURL();
  const active = new Map();
  let sequence = 0;
  function restore(element, entry) {
    if (entry.original) element.style.setProperty('filter', entry.original, entry.priority);
    else element.style.removeProperty('filter');
    entry.filter.remove(); active.delete(element);
  }
  function clear() { for (const [element, entry] of active) restore(element, entry); }
  function attach(element) {
    const id = `cursor-warp-${++sequence}`;
    const filter = document.createElementNS(ns, 'filter');
    filter.id = id;
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    filter.setAttribute('primitiveUnits', 'userSpaceOnUse');
    filter.setAttribute('x', '-5%'); filter.setAttribute('y', '-5%');
    filter.setAttribute('width', '110%'); filter.setAttribute('height', '110%');
    const flood = document.createElementNS(ns, 'feFlood');
    flood.setAttribute('flood-color', '#808080'); flood.setAttribute('result', 'neutral');
    const image = document.createElementNS(ns, 'feImage');
    image.setAttribute('href', mapUrl); image.setAttribute('result', 'patch');
    image.setAttribute('preserveAspectRatio', 'none');
    const merge = document.createElementNS(ns, 'feMerge');
    for (const name of ['neutral', 'patch']) {
      const node = document.createElementNS(ns, 'feMergeNode'); node.setAttribute('in', name); merge.append(node);
    }
    merge.setAttribute('result', 'displacement');
    const displace = document.createElementNS(ns, 'feDisplacementMap');
    displace.setAttribute('in', 'SourceGraphic'); displace.setAttribute('in2', 'displacement');
    displace.setAttribute('xChannelSelector', 'R'); displace.setAttribute('yChannelSelector', 'G');
    filter.append(flood, image, merge, displace); defs.append(filter);
    const entry = {filter, image, displace, original: element.style.getPropertyValue('filter'), priority: element.style.getPropertyPriority('filter')};
    const existing = getComputedStyle(element).filter;
    element.style.filter = `${existing === 'none' ? '' : existing} url("#${id}")`;
    active.set(element, entry);
    return entry;
  }
  return {
    clear,
    update(x, y, strength) {
      if (strength < 0.02) { clear(); return; }
      const candidates = new Set();
      for (const element of document.elementsFromPoint(x, y)) {
        const target = element.closest('h1,h2,h3,p,.brand,.card__tags,.card__year');
        if (target) candidates.add(target);
      }
      // WebGL layers ignore pointer events, so include their visible rectangles.
      for (const element of document.querySelectorAll('main img, main canvas, main .frame__badge, main .frame__cta')) {
        if(element.closest('[data-about-owl]'))continue;
        const rect = element.getBoundingClientRect();
        if (rect.width && rect.height && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom && getComputedStyle(element).opacity !== '0' && getComputedStyle(element).visibility !== 'hidden') candidates.add(element);
      }
      const selected = new Set([...candidates].slice(0, 3));
      for (const [element, entry] of active) if (!selected.has(element)) restore(element, entry);
      for (const element of selected) {
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const entry = active.get(element) || attach(element);
        const scaleX = (element.offsetWidth || rect.width) / rect.width;
        const scaleY = (element.offsetHeight || rect.height) / rect.height;
        const radius = 36;
        entry.image.setAttribute('x', ((x - rect.left - radius) * scaleX).toFixed(2));
        entry.image.setAttribute('y', ((y - rect.top - radius) * scaleY).toFixed(2));
        entry.image.setAttribute('width', (radius * 2 * scaleX).toFixed(2));
        entry.image.setAttribute('height', (radius * 2 * scaleY).toFixed(2));
        entry.displace.setAttribute('scale', (8 * strength).toFixed(2));
      }
    },
  };
}
