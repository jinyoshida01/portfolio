import * as THREE from './vendor/three.module.min.js';
import {createFullBodyOwl} from './owl-full-body.js?v=articulated-grab-10';
import {applyOwlEffect,createOwlChromaticPass} from './owl-effects.js?v=bounded-target-1';

import {frameAboutOwlCamera} from './about-owl-camera.js?v=soft-low-11';
import {setAboutOwlLighting} from './about-owl-lighting.js?v=soft-low-11';
import {owlPixelRatio,owlFrameInterval} from './about-owl-budget.js';

const mount=document.querySelector('[data-about-owl]');
if(mount&&new URLSearchParams(location.search).get('owl')!=='static'){
 if(new URLSearchParams(location.search).get('lighting-preview')==='1')requestAnimationFrame(()=>mount.scrollIntoView({block:'center'}));
 const start=new IntersectionObserver(([entry])=>{
  if(!entry.isIntersecting)return;start.disconnect();
  initOwl(mount).catch(error=>console.warn('Owl using its static fallback.',error));
 });start.observe(mount);
}

async function initOwl(mount){
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'});
  renderer.setPixelRatio(1);renderer.setClearColor(0,0);
  renderer.shadowMap.enabled=false;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  renderer.domElement.className='about-owl-canvas';renderer.domElement.setAttribute('aria-hidden','true');
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,40);
  const {owl,head,material,wings}=createFullBodyOwl();scene.add(owl);
  const appearance=new URLSearchParams(location.search).get('owl')==='matte'?'matte':'dither-coarse';
  const effect=applyOwlEffect(appearance,owl,scene,renderer);
  const chromatic=createOwlChromaticPass(renderer,.65,true,{samples:0});
  const ambient=new THREE.HemisphereLight(0xefebe3,0x55545a,1.3);scene.add(ambient);
  const key=new THREE.DirectionalLight(0xfff9ed,2.6);key.position.set(-3,4,5);scene.add(key);
  const fill=new THREE.DirectionalLight(0xe3e4ef,1.25);fill.position.set(2,-1,6);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xefebe3,2.1);rim.position.set(1,3,-4);scene.add(rim);
  let cameraName=new URLSearchParams(location.search).get('owl-camera')||'low';
  let lighting=setAboutOwlLighting(new URLSearchParams(location.search).get('owl-light'),ambient,key,fill,rim);
  const bounds=new THREE.Box3().setFromObject(owl),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  owl.position.sub(center);owl.updateMatrixWorld(true);
  const framingPoints=[];
  owl.traverse(mesh=>{if(mesh.isMesh)for(let i=0;i<mesh.geometry.attributes.position.count;i++)framingPoints.push(mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));});
  const reduced=matchMedia('(prefers-reduced-motion:reduce)'),fine=matchMedia('(any-pointer:fine)');
  let frame=0,visible=true,last=0,time=0,lost=false,disposed=false,lastPointer=-Infinity;
  let yaw=0,pitch=0,targetYaw=0,targetPitch=0;
  mount.append(renderer.domElement);
  function wake(){if(!frame&&visible&&!document.hidden&&!lost&&!disposed)frame=requestAnimationFrame(draw);}
  function draw(now){
    frame=0;
    if(last&&now-last<owlFrameInterval){wake();return;}
    const dt=last?Math.min(.05,(now-last)/1000):1/60;last=now;
    const ease=1-Math.exp(-4.5*dt);yaw+=(targetYaw-yaw)*ease;pitch+=(targetPitch-pitch)*ease;
    if(!reduced.matches)time+=dt;
    lighting.update(time);
    const idle=now-lastPointer>1500&&!reduced.matches?Math.sin(time*.4)*.015:0;
    owl.rotation.y=owl.userData.restRotation.yaw+(yaw+idle)*.3;
    const rest=head.userData.restRotation;
    head.rotation.set(rest.pitch+pitch,rest.yaw+(yaw+idle)*.7,rest.roll-idle*.3,'YXZ');
    wings.forEach((wing,i)=>{wing.rotation.z=wing.userData.restRotation+(i?1:-1)*(reduced.matches?0:Math.sin(time*.7)*.014);});
    owl.position.y=-center.y+(reduced.matches?0:Math.sin(time*.7)*.035);
    try{chromatic.render(scene,camera);mount.classList.add('is-3d-ready');}
    catch(error){lost=true;mount.classList.remove('is-3d-ready');console.warn('Owl rendering stopped; static preview retained.',error);return;}
    if(!reduced.matches)wake();
  }
  function resize(){
    const {width,height}=mount.getBoundingClientRect();if(!width||!height)return;
    const displayScale=parseFloat(getComputedStyle(mount).getPropertyValue('--owl-display-scale'))||1;
    const renderWidth=width*displayScale,renderHeight=height*displayScale;
    renderer.setPixelRatio(owlPixelRatio(renderWidth,renderHeight,devicePixelRatio||1));
    renderer.setSize(renderWidth,renderHeight,false);camera.aspect=width/height;
    const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
    const framing=frameAboutOwlCamera(camera,size,cameraName,{points:framingPoints,margin:1.08});
    const projectedWidth=framing.width*renderHeight/(2*tan*framing.distance);
    effect.resize(projectedWidth*.63);chromatic.resize(projectedWidth);wake();
  }
  function move(event){
    if(!visible||reduced.matches||!fine.matches||event.pointerType!=='mouse')return;
    const r=mount.getBoundingClientRect();
    targetYaw=THREE.MathUtils.clamp((event.clientX-r.left-r.width/2)/(r.width/2),-1,1)*.17;
    targetPitch=THREE.MathUtils.clamp((event.clientY-r.top-r.height/2)/(r.height/2),-1,1)*.075;
    lastPointer=performance.now();wake();
  }
  function reset(){targetYaw=targetPitch=0;if(reduced.matches)yaw=pitch=0;lastPointer=-Infinity;wake();}
  // The studies page reuses this scene, avoiding extra WebGL contexts on selection.
  function changeLighting(event){
    if(event.origin!==location.origin||event.source!==window.parent||new URLSearchParams(location.search).get('lighting-preview')!=='1')return;
    if(event.data?.type==='about-owl-lighting'){lighting=setAboutOwlLighting(event.data.name,ambient,key,fill,rim);wake();}
    if(event.data?.type==='about-owl-camera'){cameraName=event.data.name;resize();}
  }
  window.addEventListener('message',changeLighting);
  if(new URLSearchParams(location.search).get('lighting-preview')==='1')window.parent.postMessage({type:'about-owl-lighting-ready'},location.origin);
  const ro=new ResizeObserver(resize);ro.observe(mount);
  const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible){last=0;wake();}else{cancelAnimationFrame(frame);frame=0;}});io.observe(mount);
  function visibility(){cancelAnimationFrame(frame);frame=0;last=0;if(!document.hidden)reset();}
  window.addEventListener('pointermove',move,{passive:true});window.addEventListener('blur',reset);
  document.documentElement.addEventListener('pointerleave',reset);document.addEventListener('visibilitychange',visibility);
  reduced.addEventListener('change',reset);fine.addEventListener('change',reset);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;mount.classList.remove('is-3d-ready');});
  // Keep the static fallback after context loss; do not retry a failing GPU automatically.
  window.addEventListener('pagehide',event=>{if(event.persisted)return;disposed=true;window.removeEventListener('message',changeLighting);cancelAnimationFrame(frame);ro.disconnect();io.disconnect();window.removeEventListener('pointermove',move);window.removeEventListener('blur',reset);document.documentElement.removeEventListener('pointerleave',reset);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',reset);fine.removeEventListener('change',reset);effect.dispose();chromatic.dispose();const materials=new Set();owl.traverse(node=>{if(node.isMesh){node.geometry.dispose();node.skeleton?.dispose();materials.add(node.material);}});materials.forEach(m=>m.dispose());renderer.dispose();});
  resize();
}
