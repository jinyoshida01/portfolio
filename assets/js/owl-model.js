import * as THREE from './vendor/three.module.min.js';
import { owlPositions, owlIndices } from './owl-geometry.js?v=original-owl-4';

// The original angular owl: preserved authoring volumes fused by sculpt-owl.py.
// Both Home and About instantiate this exact geometry and material.
export function createOwl() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(owlPositions, 3));
  geometry.setIndex(owlIndices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const material = new THREE.MeshStandardMaterial({
    color: 0xc6c7c9,
    roughness: 0.55,
    metalness: 0,
    flatShading: true,
  });
  const sculpture = new THREE.Mesh(geometry, material);
  sculpture.name = 'OwlSolid';
  sculpture.castShadow = sculpture.receiveShadow = true;
  const head = new THREE.Group();
  head.name = 'OwlHead';
  head.add(sculpture);
  return { head };
}
