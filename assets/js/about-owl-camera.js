import * as THREE from './vendor/three.module.min.js';

export const aboutOwlCameras={
 front:{yaw:0,elevation:0},
 right:{yaw:30,elevation:3},
 left:{yaw:-30,elevation:3},
 low:{yaw:20,elevation:-14},
 high:{yaw:20,elevation:22},
 profile:{yaw:65,elevation:0},
};
export function frameAboutOwlCamera(camera,size,name,{points=null,margin=1.09}={}){
 const selected=Object.hasOwn(aboutOwlCameras,name)?name:'low';
 const {yaw,elevation}=aboutOwlCameras[selected],a=THREE.MathUtils.degToRad(yaw),b=THREE.MathUtils.degToRad(elevation);
 const direction=new THREE.Vector3(Math.sin(a)*Math.cos(b),Math.sin(b),Math.cos(a)*Math.cos(b));
 const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize();
 const up=new THREE.Vector3().crossVectors(direction,right);
 const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
 let distance=0;
 // Fit the actual silhouette when supplied, avoiding empty bounding-box corners.
 const fitPoints=points||[];
 if(!points)for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])fitPoints.push(new THREE.Vector3(x*size.x/2,y*size.y/2,z*size.z/2));
 for(const p of fitPoints)distance=Math.max(distance,p.dot(direction)+margin*Math.max(Math.abs(p.dot(right))/(tan*camera.aspect),Math.abs(p.dot(up))/tan));
 camera.position.copy(direction).multiplyScalar(distance);camera.lookAt(0,0,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 const width=Math.abs(right.x)*size.x+Math.abs(right.y)*size.y+Math.abs(right.z)*size.z;
 return {name:selected,distance,width};
}
