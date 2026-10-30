import * as THREE from './vendor/three.module.min.js';

const track = document.querySelector('[data-curved-gallery]');
if (track) enhanceGallery(track);

async function enhanceGallery(track) {
  const items = [...track.querySelectorAll('.work__item')];
  if (items.length < 2) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const wrapper = document.createElement('div');
  wrapper.className = 'ribbon';
  track.before(wrapper);
  wrapper.append(track);
  track.classList.add('work--ribbon');
  const controls = document.createElement('div');
  controls.className = 'ribbon__controls';
  controls.innerHTML = '<button type="button" aria-label="Previous project">←</button><button type="button" aria-label="Next project">→</button><span class="ribbon__count" aria-live="polite"></span><div class="ribbon__progress" aria-hidden="true"><span></span></div>';
  wrapper.append(controls);
  const [previous, next] = controls.querySelectorAll('button');
  const count = controls.querySelector('.ribbon__count');
  const progress = controls.querySelector('.ribbon__progress span');
  const step = () => items[1].offsetLeft - items[0].offsetLeft;
  const maxScroll = () => track.scrollWidth - track.clientWidth;
  function updateControls() {
    const index = Math.min(items.length - 1, Math.round(track.scrollLeft / step()));
    previous.disabled = track.scrollLeft < 2;
    next.disabled = track.scrollLeft >= maxScroll() - 2;
    count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    progress.style.transform = `scaleX(${Math.max(0, Math.min(1, track.scrollLeft / Math.max(1, maxScroll())))})`;
  }
  const advance = direction => track.scrollBy({left: direction * step(), behavior: reduced.matches ? 'instant' : 'smooth'});
  previous.addEventListener('click', () => advance(-1));
  next.addEventListener('click', () => advance(1));
  track.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); advance(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  let drag = null, dragged = false;
  track.addEventListener('dragstart', event => event.preventDefault());
  track.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.pointerType !== 'mouse') return;
    drag = {x: event.clientX, y: event.clientY, scroll: track.scrollLeft}; dragged = false;
  });
  track.addEventListener('pointermove', event => {
    if (!drag) return;
    const distance = event.clientX - drag.x;
    if (Math.abs(distance) > 5 && Math.abs(distance) > Math.abs(event.clientY - drag.y) && !dragged) {
      dragged = true; track.setPointerCapture(event.pointerId); wrapper.classList.add('is-dragging');
    }
    if (dragged) track.scrollLeft = drag.scroll - distance;
  });
  function endDrag() { drag = null; wrapper.classList.remove('is-dragging'); }
  window.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('click', event => {
    if (dragged) { event.preventDefault(); event.stopPropagation(); dragged = false; }
  }, true);
  track.addEventListener('scroll', updateControls, {passive: true});
  new ResizeObserver(updateControls).observe(track);
  updateControls();

  // Keep the real links and native scrolling underneath the optional WebGL layer.
  // If rendering or image loading fails, the ordinary image strip remains usable.
  if (reduced.matches) return;
  let renderer;
  const meshes = [];
  let frame = 0, visible = false, previousScroll = track.scrollLeft, velocity = 0;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -10, 10);
  try {
    renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = 'ribbon__canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    wrapper.prepend(renderer.domElement);
    await document.fonts.ready;
    const loader = new THREE.TextureLoader();
    for (const item of items) {
      const img = item.querySelector('img');
      const texture = await loader.loadAsync(img.currentSrc || img.src);
      texture.colorSpace = THREE.SRGBColorSpace;
      const uniforms = {center: {value: 0}, viewport: {value: 1}, velocity: {value: 0}};
      const material = new THREE.MeshBasicMaterial({map: texture});
      material.onBeforeCompile = shader => {
        shader.uniforms.ribbonCenter = uniforms.center;
        shader.uniforms.ribbonViewport = uniforms.viewport;
        shader.uniforms.ribbonVelocity = uniforms.velocity;
        shader.vertexShader = 'uniform float ribbonCenter; uniform float ribbonViewport; uniform float ribbonVelocity;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
          vec3 transformed = vec3(position);
          float across = clamp((position.x + ribbonCenter - ribbonViewport * 0.5) / (ribbonViewport * 0.5), -1.5, 1.5);
          transformed.y *= 1.0 + 0.22 * across * across;
          transformed.x += sin(uv.y * 3.14159265) * ribbonVelocity * 0.35;
        `);
      };
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 32, 8), material);
      scene.add(mesh);
      // Labels share the image geometry, so bending and cursor filters affect
      // the whole card surface and the viewport clips them together.
      const labelCanvas = document.createElement('canvas');
      const labelTexture = new THREE.CanvasTexture(labelCanvas);
      labelTexture.colorSpace = THREE.SRGBColorSpace;
      const labelMaterial = new THREE.MeshBasicMaterial({map: labelTexture, transparent: true, depthWrite: false});
      labelMaterial.onBeforeCompile = material.onBeforeCompile;
      const labels = new THREE.Mesh(mesh.geometry, labelMaterial);
      labels.position.z = 0.1; scene.add(labels);
      const entry = {mesh, texture, uniforms, labels, labelCanvas, labelTexture, item, hover: 0, element: item.querySelector('.frame')};
      meshes.push(entry);
      for (const type of ['pointerenter','pointerleave','focusin','focusout']) item.addEventListener(type, wake);
    }
    const resize = () => {
      const width = track.clientWidth;
      const height = items[0].querySelector('.frame').clientHeight;
      renderer.setSize(width, height, false);
      camera.right = width; camera.top = height; camera.updateProjectionMatrix();
      for (const entry of meshes) {
        const w = entry.element.clientWidth, h = height * 0.76;
        entry.mesh.geometry.dispose();
        entry.mesh.geometry = new THREE.PlaneGeometry(w, h, 32, 8);
        entry.labels.geometry = entry.mesh.geometry;
        entry.labelCanvas.width = Math.ceil(w * 2); entry.labelCanvas.height = Math.ceil(h * 2);
        paintLabels(entry);
        const imageRatio = entry.texture.image.width / entry.texture.image.height;
        const boxRatio = w / h;
        entry.texture.repeat.set(Math.min(1, boxRatio / imageRatio), Math.min(1, imageRatio / boxRatio));
        entry.texture.offset.set((1 - entry.texture.repeat.x) / 2, (1 - entry.texture.repeat.y) / 2);
        entry.uniforms.viewport.value = width;
        entry.mesh.position.y = entry.labels.position.y = height / 2;
      }
      wake();
    };
    function paintLabels(entry) {
      const c = entry.labelCanvas.getContext('2d'), w = entry.labelCanvas.width / 2, h = entry.labelCanvas.height / 2;
      c.setTransform(2,0,0,2,0,0); c.clearRect(0,0,w,h);
      const badge = entry.item.querySelector('.frame__badge'), css = getComputedStyle(badge);
      c.font = `${css.fontSize} ${css.fontFamily}`; c.letterSpacing = css.letterSpacing;
      const text = badge.textContent.trim().toUpperCase(), width = c.measureText(text).width + 24;
      c.fillStyle = 'rgba(8,8,10,.65)'; c.strokeStyle = 'rgba(239,235,227,.16)'; c.lineWidth = 1;
      c.beginPath(); c.roundRect(16,16,width,30,15); c.fill(); c.stroke();
      c.fillStyle = css.color; c.textBaseline = 'middle'; c.fillText(text,28,31);
      if (entry.hover > .002) {
        c.globalAlpha = entry.hover;
        const shade = c.createLinearGradient(0,h-100,0,h); shade.addColorStop(0,'transparent'); shade.addColorStop(1,'rgba(8,8,10,.8)');
        c.fillStyle = shade; c.fillRect(0,h-100,w,100);
        c.font = `11px ${css.fontFamily}`; c.letterSpacing = '1px';
        c.fillStyle = '#efebe3'; c.fillText(entry.item.querySelector('.frame__cta b').textContent.trim().toUpperCase(),20,h-48);
        c.fillStyle = '#fa3c3c'; c.fillText(entry.item.querySelector('.frame__cta span').textContent.trim().toUpperCase(),20,h-25);
        c.globalAlpha = 1;
      }
      entry.labelTexture.needsUpdate = true;
    }
    let lastRender = 0;
    function render(now) {
      frame = 0;
      if (!visible || document.hidden || reduced.matches) return;
      const dt = Math.min(.05, (now - lastRender) / 1000 || 1/60); lastRender = now;
      let animatingLabels = false;
      const scroll = track.scrollLeft;
      const delta = scroll - previousScroll;
      velocity += (delta - velocity) * 0.15;
      previousScroll = scroll;
      const bounds = track.getBoundingClientRect();
      for (const entry of meshes) {
        const rect = entry.element.getBoundingClientRect();
        const center = rect.left - bounds.left + rect.width / 2;
        const target = entry.item.matches(':hover,:focus-within') ? 1 : 0;
        if (Math.abs(target - entry.hover) > .002) {
          entry.hover += (target - entry.hover) * (1 - Math.exp(-10 * dt));
          paintLabels(entry); animatingLabels = true;
        }
        entry.mesh.position.x = entry.labels.position.x = center;
        entry.uniforms.center.value = center;
        entry.uniforms.velocity.value = Math.max(-32, Math.min(32, velocity));
        entry.labels.visible = entry.mesh.visible = rect.right >= bounds.left - 40 && rect.left <= bounds.right + 40;
      }
      renderer.render(scene, camera);
      if (animatingLabels || Math.abs(velocity) > 0.05 || Math.abs(delta) > 0.05) wake();
    }
    function wake() { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(render); }
    track.addEventListener('scroll', wake, {passive: true});
    track.addEventListener('focusin', wake);
    new ResizeObserver(resize).observe(track);
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; wake(); }).observe(wrapper);
    document.addEventListener('visibilitychange', wake);
    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault(); wrapper.classList.remove('is-webgl');
    });
    reduced.addEventListener('change', () => { wrapper.classList.toggle('is-webgl', !reduced.matches); wake(); });
    wrapper.classList.add('is-webgl');
    resize();
  } catch (error) {
    wrapper.classList.remove('is-webgl');
    renderer?.domElement.remove(); renderer?.dispose();
    for (const {mesh, texture, labels, labelTexture} of meshes) { mesh.geometry.dispose(); mesh.material.dispose(); texture.dispose(); labels.material.dispose(); labelTexture.dispose(); }
    console.warn('Gallery using its image fallback.', error);
  }
}
