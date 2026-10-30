import * as THREE from './vendor/three.module.min.js';

// Scale pattern cells with the projected sculpture, not the viewport or DPR
// alone. Whole drawing-buffer pixels keep the Bayer grid crisp on phones.
export function owlDitherPixelScale(projectedWidth, pixelRatio, baseScale) {
  const relativeSize = Math.max(0.3, Math.min(1, projectedWidth / 800));
  return Math.max(1, Math.round(pixelRatio * baseScale * relativeSize));
}

// Coarse dither is the selected homepage finish. Query parameters retain the other
// material options for comparison without changing the default.
export function applyOwlEffect(effect, head, scene, renderer) {
  const sculpture = head.children[0];
  if (effect === 'glass') {
    // A small studio environment supplies reflections without external HDRs.
    const studio = new THREE.Scene();
    studio.background = new THREE.Color(0x101014);
    const cards = [
      [[-4, 3, 2], [0.7, 7], 0xffffff],
      [[4, 1, 1], [0.5, 6], 0xc6c7c9],
      [[0, 5, -2], [7, 0.7], 0xefebe3],
      [[0, -3, 4], [5, 1], 0x55555b],
    ];
    for (const [position, dimensions, color] of cards) {
      const card = new THREE.Mesh(new THREE.PlaneGeometry(...dimensions),
        new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
      card.position.set(...position);
      card.lookAt(0, 0, 0);
      studio.add(card);
    }
    const generator = new THREE.PMREMGenerator(renderer);
    const environment = generator.fromScene(studio, 0.04);
    scene.environment = environment.texture;
    studio.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
    generator.dispose();
    sculpture.material.dispose();
    sculpture.material = new THREE.MeshPhysicalMaterial({
      color: 0xc6c7c9, metalness: 0, roughness: 0.035,
      transmission: 0.92, thickness: 0.65, ior: 1.5,
      attenuationColor: 0x8b8d93, attenuationDistance: 2.5,
      envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.06,
      flatShading: true,
    });
    sculpture.castShadow = sculpture.receiveShadow = false;
    return { resize() {}, dispose() { scene.environment = null; environment.dispose(); } };
  }
  if (effect.startsWith('dither')) {
    // Screen-space ordered dithering keeps the pattern stable as the head
    // turns. It shades the actual mesh, not a raster overlay of the owl.
    const scale = effect === 'dither-fine' ? 1 : effect === 'dither-coarse' ? 3.5 : 2;
    const pixelScale = { value: renderer.getPixelRatio() * scale };
    const pattern = { 'dither-noise': 1, 'dither-dots': 2, 'dither-lines': 3 }[effect] || 0;
    sculpture.material.toneMapped = false;
    sculpture.material.onBeforeCompile = shader => {
      shader.uniforms.owlPixelScale = pixelScale;
      shader.uniforms.toneMappingExposure = { value: renderer.toneMappingExposure };
      shader.fragmentShader = `uniform float owlPixelScale;\n${THREE.ShaderChunk.tonemapping_pars_fragment}\n${shader.fragmentShader}`;
      // Keep the selected black/white shading identical on screen and in the
      // offscreen chromatic pass (Three normally skips target tone mapping).
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb = ACESFilmicToneMapping(gl_FragColor.rgb);')
        .replace('#include <colorspace_fragment>', 'gl_FragColor.rgb = sRGBTransferOETF(gl_FragColor).rgb;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', `
        vec2 p = floor(gl_FragCoord.xy / owlPixelScale);
        vec2 a = mod(p, 2.0);
        vec2 b = mod(floor(p / 2.0), 2.0);
        float low = 2.0 * a.x + 3.0 * a.y - 4.0 * a.x * a.y;
        float high = 2.0 * b.x + 3.0 * b.y - 4.0 * b.x * b.y;
        float threshold = (4.0 * low + high + 0.5) / 16.0;
        if (${pattern} == 1) {
          threshold = fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        } else if (${pattern} == 2) {
          // Circular clustered dots grow with the lighting, like print halftones.
          vec2 cell = fract(gl_FragCoord.xy / (owlPixelScale * 3.0)) - 0.5;
          threshold = min(1.0, 3.14159265 * dot(cell, cell));
        } else if (${pattern} == 3) {
          threshold = abs(fract((gl_FragCoord.x + gl_FragCoord.y) / (owlPixelScale * 3.0)) - 0.5) * 2.0;
        }
        float brightness = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        // Sparse white highlights on a black surface, rather than a white
        // surface with dark holes. Preserve shading through dot density.
        float density = 0.42 * pow(smoothstep(0.28, 0.94, brightness), 2.0);
        float dotOn = step(threshold, density);
        gl_FragColor.rgb = mix(vec3(0.0), vec3(1.0), dotOn);
      `);
    };
    sculpture.material.customProgramCacheKey = () => `owl-dither-${effect}-3`;
    sculpture.material.needsUpdate = true;
    return {
      resize(projectedWidth) {
        pixelScale.value = owlDitherPixelScale(projectedWidth, renderer.getPixelRatio(), scale);
      },
      dispose() {},
    };
  }
  return { resize() {}, dispose() {} };
}

// Render only the owl into a transparent target. Separating the color channels
// here shifts both the shaded pattern and silhouette without affecting page text.
export function createOwlChromaticPass(renderer, strength = 0.85, silhouetteOnly = false, options = {}) {
  const target = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat, samples: options.samples ?? (renderer.capabilities.isWebGL2 ? 4 : 0),
  });
  target.texture.colorSpace = THREE.NoColorSpace;
  const material = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false, toneMapped: false,
    uniforms: {
      source: { value: target.texture },
      silhouetteOnly: { value: silhouetteOnly ? 1 : 0 },
      texel: { value: new THREE.Vector2(1, 1) },
      offset: { value: strength * renderer.getPixelRatio() },
    },
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `uniform sampler2D source;
      uniform vec2 texel;
      uniform float offset;
      uniform float silhouetteOnly;
      varying vec2 vUv;
      void main() {
        vec2 shift = vec2(texel.x * offset, texel.y * offset * 0.22);
        vec4 center = texture2D(source, vUv);
        vec4 red = texture2D(source, vUv + shift);
        vec4 blue = texture2D(source, vUv - shift);
        float alpha = max(center.a, max(red.a, blue.a));
        vec3 split = vec3(red.r, center.g, blue.b);
        float edge = min(1.0, abs(center.a-red.a) + abs(center.a-blue.a));
        float blend = 0.72 * mix(1.0, edge, silhouetteOnly);
        gl_FragColor = vec4(mix(center.rgb, split, blend), alpha);
        #include <colorspace_fragment>
      }`,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(geometry, material));
  const camera = new THREE.Camera();
  return {
    resize(projectedWidth) {
      material.uniforms.offset.value = strength * renderer.getPixelRatio() * Math.max(0.3, Math.min(1, projectedWidth / 800));
      const size = renderer.getDrawingBufferSize(new THREE.Vector2());
      target.setSize(size.x, size.y);
      material.uniforms.texel.value.set(1 / size.x, 1 / size.y);
    },
    render(owlScene, owlCamera) {
      renderer.setRenderTarget(target);
      renderer.render(owlScene, owlCamera);
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    },
    dispose() { target.dispose(); geometry.dispose(); material.dispose(); },
  };
}
