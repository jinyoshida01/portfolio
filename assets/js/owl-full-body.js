import * as THREE from './vendor/three.module.min.js';
import {owlUnifiedGeometry as data} from './owl-unified-geometry.js?v=articulated-grab-10';

// Facial relief, native cranium, neck and talons share one welded surface.
export function createFullBodyOwl(){
 const owl=new THREE.Group();owl.name='FullBodyOwl';
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));
 geometry.setIndex(data.indices);
 const indices=Array.from({length:data.positions.length/3},()=>[0,1,2,3]).flat();
 geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));
 geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(data.skinWeights,4));
 geometry.computeVertexNormals();geometry.computeBoundingSphere();
 const material=new THREE.MeshStandardMaterial({color:0xc6c7c9,roughness:.55,metalness:0,flatShading:true});
 const sculpture=new THREE.SkinnedMesh(geometry,material);sculpture.name='OwlContinuousSurface';owl.add(sculpture);
 const root=new THREE.Bone();root.name='OwlRoot';sculpture.add(root);
 const joints=data.pivots.map((pivot,i)=>{
  const bone=new THREE.Bone();bone.name=['OwlGaze','LeftWingFlex','RightWingFlex'][i];bone.position.set(...pivot);root.add(bone);return bone;
 });
 const skeleton=new THREE.Skeleton([root,...joints]);sculpture.bind(skeleton);sculpture.normalizeSkinWeights();
 const [head,...wings]=joints;
 head.userData.restRotation={pitch:0,yaw:0,roll:0};wings.forEach(b=>b.userData.restRotation=0);
 owl.userData.restRotation={pitch:0,yaw:0,roll:0};owl.userData.design='integrated-face';
 return {owl,sculpture,head,material,wings,faceCenter:new THREE.Vector3().fromArray(data.faceCenter),faceQuaternion:new THREE.Quaternion().fromArray(data.faceQuaternion)};
}
