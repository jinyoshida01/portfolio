import * as THREE from './vendor/three.module.min.js';
import { createOwl } from './owl-model.js?v=original-owl-4';
import { pointerTarget, follow, idlePose } from './owl-motion.js?v=idle-3';
import { applyOwlEffect, createOwlChromaticPass } from './owl-effects.js?v=responsive-coarse-6';

import { setOwlLighting } from './owl-lighting.js?v=1';

const mount = document.querySelector('[data-owl]');
if (mount) initOwl(mount);

function initOwl(mount) {
  const hero = mount.closest('.hero');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(any-pointer: fine)');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (error) {
    // Keep the decorative fallback when WebGL is unavailable.
    console.warn('Owl 3D renderer unavailable.', error);
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'hero__owl-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  mount.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  const { head } = createOwl();
  scene.add(head);
  const params = new URLSearchParams(location.search);
  const previewEffect = params.get('owl');
  const effect = ['matte', 'glass', 'dither', 'dither-fine', 'dither-coarse', 'dither-noise', 'dither-dots', 'dither-lines'].includes(previewEffect) ? previewEffect : 'dither-coarse';
  const owlEffect = applyOwlEffect(effect, head, scene, renderer);
  const chromatic = params.get('chroma') !== 'off' && effect.startsWith('dither')
    ? createOwlChromaticPass(renderer) : null;
  mount.dataset.effect = effect;
  mount.dataset.chromatic = chromatic ? 'on' : 'off';
  const ambient = new THREE.HemisphereLight(0xefebe3, 0x26262c, 1.3);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xfff9ed, 2.5);
  key.position.set(-3, 4, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 0.1, far: 16 });
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.015;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe3e4ef, 0.65);
  fill.position.set(4, 1, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xefebe3, 2.4);
  rim.position.set(1, 3, -4);
  scene.add(rim);
  const lighting = setOwlLighting(params.get('light'), ambient, key, fill, rim);
  mount.dataset.lighting = lighting.name;

  const size = new THREE.Box3().setFromObject(head, true).getSize(new THREE.Vector3());
  const state = { yaw: 0, pitch: 0 };
  let target = { ...state };
  let frame = 0;
  let last = 0;
  let idleTime = 0;
  let idleWeight = 1;
  let lastPointer = -Infinity;
  let visible = true;
  let contextLost = false;
  let disposed = false;

  function schedule() {
    if (!frame && visible && !document.hidden && !contextLost && !disposed) {
      frame = requestAnimationFrame(render);
    }
  }
  function render(now) {
    frame = 0;
    // Idle motion renders at 30fps; active cursor tracking remains at the
    // display's refresh rate. Hidden/offscreen heroes stop scheduling frames.
    if (!reduced.matches && now - lastPointer > 1000 && last && now - last < 1000 / 30) {
      schedule();
      return;
    }
    const delta = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    follow(state, target, delta);
    last = now;
    idleTime += reduced.matches ? 0 : delta;
    lighting.update(idleTime);
    const idleGoal = now - lastPointer > 1000 ? 1 : 0;
    idleWeight = reduced.matches ? 0 : idleWeight + (idleGoal - idleWeight) * (1 - Math.exp(-2 * delta));
    const idle = idlePose(idleTime);
    const yaw = state.yaw + idle.yaw * idleWeight;
    head.rotation.set(state.pitch + idle.pitch * idleWeight, yaw, -yaw * 0.055, 'YXZ');
    head.position.y = idle.bob * idleWeight;
    if (chromatic) chromatic.render(scene, camera);
    else renderer.render(scene, camera);
    mount.classList.add('is-3d-ready');
    if (!reduced.matches) schedule();
    else last = 0;
  }
  function resize() {
    const { width, height } = mount.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(0, 0, Math.max(size.y / (2 * tan), size.x / (2 * tan * camera.aspect)) * 1.03 + size.z / 2);
    camera.updateProjectionMatrix();
    const projectedWidth = size.x * height / (2 * tan * camera.position.z);
    owlEffect.resize(projectedWidth);
    chromatic?.resize(projectedWidth);
    schedule();
  }
  function move(event) {
    if (!visible || event.pointerType === 'touch' || reduced.matches || !finePointer.matches) return;
    lastPointer = performance.now();
    target = pointerTarget(event.clientX, event.clientY, mount.getBoundingClientRect());
    schedule();
  }
  function reset() {
    target = { yaw: 0, pitch: 0 };
    lastPointer = -Infinity;
    if (reduced.matches) Object.assign(state, target);
    last = 0;
    schedule();
  }
  function visibility() {
    if (document.hidden) {
      cancelAnimationFrame(frame); frame = 0; last = 0;
    } else reset();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(mount);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) { last = 0; schedule(); }
    else { cancelAnimationFrame(frame); frame = 0; }
  });
  intersectionObserver.observe(hero);
  window.addEventListener('pointermove', move, { passive: true });
  document.documentElement.addEventListener('pointerleave', reset, { passive: true });
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', visibility);
  reduced.addEventListener('change', reset);
  finePointer.addEventListener('change', reset);
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault(); contextLost = true;
    cancelAnimationFrame(frame); frame = 0;
    mount.classList.remove('is-3d-ready');
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    contextLost = false; resize();
  });
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    disposed = true;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect(); intersectionObserver.disconnect();
    window.removeEventListener('pointermove', move);
    document.documentElement.removeEventListener('pointerleave', reset);
    window.removeEventListener('blur', reset);
    document.removeEventListener('visibilitychange', visibility);
    reduced.removeEventListener('change', reset);
    finePointer.removeEventListener('change', reset);
    const geometries = new Set(), materials = new Set();
    head.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) materials.add(object.material);
    });
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
    owlEffect.dispose();
    chromatic?.dispose();
    renderer.dispose();
  });
  resize();
}
