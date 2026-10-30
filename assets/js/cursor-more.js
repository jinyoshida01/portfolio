import {createCursorDistortion} from './cursor-distortion.js?v=3';

const surfaceModes = ['edges','shear','lift','scan','invert','foil'];
const redMatrix = '.2126 .7152 .0722 0 0 .05 .17 .017 0 0 .05 .17 .017 0 0 0 0 0 1 0';
const bayer = (x,y) => {
  const a=x%2,b=y%2,c=Math.floor(x/2)%2,d=Math.floor(y/2)%2;
  return (4*(2*a+3*b-4*a*b)+2*c+3*d-4*c*d+.5)/16;
};

function createSurface(mode) {
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');
  svg.setAttribute('aria-hidden','true');svg.style.cssText='position:fixed;width:0;height:0;pointer-events:none';
  document.body.append(svg);
  const mask=document.createElement('canvas');mask.width=mask.height=192;
  const c=mask.getContext('2d');
  const pixels=c.createImageData(192,192);
  for(let y=0;y<192;y++)for(let x=0;x<192;x++){
    const dx=(x-96)/96,dy=(y-96)/96,r=Math.hypot(dx,dy);
    let alpha=Math.max(0,1-r*r)**2;
    if(mode==='scan')alpha=Math.exp(-((dx/.1)**2))*Math.max(0,1-Math.abs(dy));
    if(mode==='foil')alpha=Math.exp(-(((dx+dy*.65)/.18)**2))*Math.max(0,1-r*r);
    if(mode==='invert')alpha=bayer(Math.floor(x/2),Math.floor(y/2))<alpha*.85?.9:0;
    const i=(y*192+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;pixels.data[i+3]=alpha*255;
  }
  c.putImageData(pixels,0,0);const maskURL=mask.toDataURL();
  c.fillStyle='#808080';c.fillRect(0,0,192,192);
  for(let y=12;y<180;y+=24)for(let x=12;x<180;x+=24){
    c.fillStyle=`rgb(${128+Math.round(Math.sin(x+y)*28)},${65+Math.round(Math.cos(x-y)*30)},128)`;c.fillRect(x,y,20,20);
  }
  const tileURL=mask.toDataURL(),active=new Map();let serial=0;
  const foilFrames=mode==='foil'?Array.from({length:9},(_,i)=>{
    c.clearRect(0,0,192,192);c.save();c.translate(96,96);c.rotate(-.85+i*.12);
    const band=c.createLinearGradient(-25,0,25,0);band.addColorStop(0,'transparent');band.addColorStop(.5,'white');band.addColorStop(1,'transparent');
    c.fillStyle=band;c.fillRect(-25,-160,50,320);c.restore();c.globalCompositeOperation='destination-in';
    const fade=c.createRadialGradient(96,96,12,96,96,96);fade.addColorStop(0,'white');fade.addColorStop(1,'transparent');c.fillStyle=fade;c.fillRect(0,0,192,192);c.globalCompositeOperation='source-over';return mask.toDataURL();
  }):[];
  function remove(element,entry){if(entry.original)element.style.setProperty('filter',entry.original,entry.priority);else element.style.removeProperty('filter');entry.filter.remove();active.delete(element);}
  return {
    clear(){for(const [e,v]of active)remove(e,v);},
    update(x,y,time,vx){
      const targets=[...document.querySelectorAll('main img,main canvas,main .frame__badge,main .frame__cta')].filter(e=>{if(e.closest('[data-about-owl]'))return false;const b=e.getBoundingClientRect();return b.width&&x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom&&getComputedStyle(e).opacity!=='0'&&getComputedStyle(e).visibility!=='hidden';});
      for(const [e,v]of active)if(!targets.includes(e))remove(e,v);
      for(const e of targets){
        let entry=active.get(e);
        if(!entry){
          const filter=document.createElementNS(ns,'filter');filter.id=`cursor-${mode}-${++serial}`;
          filter.setAttribute('primitiveUnits','userSpaceOnUse');filter.setAttribute('color-interpolation-filters','sRGB');
          let effect='';
          if(mode==='edges')effect='<feColorMatrix in="SourceGraphic" type="saturate" values="0" result="gray"/><feConvolveMatrix in="gray" order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" preserveAlpha="true" result="edges"/><feColorMatrix in="edges" values="0 0 0 0 .98 0 0 0 0 .235 0 0 0 0 .235 3 0 0 0 0" result="effect"/>';
          if(mode==='shear')effect='<feColorMatrix in="SourceGraphic" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="red"/><feOffset in="red" dx="5" dy="0" result="split"/><feColorMatrix in="SourceGraphic" values="0 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0" result="rest"/><feBlend in="split" in2="rest" mode="screen" result="effect"/>';
          if(mode==='lift')effect='<feFlood flood-color="#808080" result="neutral"/><feImage class="tile" preserveAspectRatio="none" result="tiles"/><feMerge result="map"><feMergeNode in="neutral"/><feMergeNode in="tiles"/></feMerge><feDisplacementMap in="SourceGraphic" in2="map" scale="28" xChannelSelector="R" yChannelSelector="G" result="effect"/>';
          if(mode==='invert')effect='<feComponentTransfer in="SourceGraphic" result="effect"><feFuncR type="table" tableValues="1 0"/><feFuncG type="table" tableValues=".9 .08"/><feFuncB type="table" tableValues=".9 .08"/></feComponentTransfer>';
          if(mode==='scan')effect=`<feColorMatrix in="SourceGraphic" values="${redMatrix}" result="effect"/>`;
          if(mode==='foil')effect='<feColorMatrix in="SourceGraphic" values=".8 0 0 0 .35 0 .8 0 0 .04 0 0 .8 0 .04 0 0 0 1 0" result="effect"/>';
          filter.innerHTML=effect+'<feImage class="mask" preserveAspectRatio="none" result="mask"/><feComposite in="effect" in2="mask" operator="in" result="patch"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="patch"/></feMerge>';
          filter.querySelector('.mask').setAttribute('href',maskURL);
          filter.querySelector('.tile')?.setAttribute('href',tileURL);svg.append(filter);
          entry={filter,original:e.style.getPropertyValue('filter'),priority:e.style.getPropertyPriority('filter')};
          const base=getComputedStyle(e).filter;e.style.filter=`${base==='none'?'':base} url("#${filter.id}")`;active.set(e,entry);
        }
        const b=e.getBoundingClientRect(),sx=(e.offsetWidth||b.width)/b.width,sy=(e.offsetHeight||b.height)/b.height;
        const r=mode==='scan'?155:110;
        for(const image of entry.filter.querySelectorAll('feImage')){
          image.setAttribute('x',((x-b.left-r)*sx).toFixed(2));image.setAttribute('y',((y-b.top-r)*sy).toFixed(2));
          image.setAttribute('width',(r*2*sx).toFixed(2));image.setAttribute('height',(r*2*sy).toFixed(2));
        }
        const offset=entry.filter.querySelector('feOffset');if(offset)offset.setAttribute('dx',(3+Math.min(5,Math.abs(vx)*.25)).toFixed(2));
        if(mode==='foil')entry.filter.querySelector('.mask').setAttribute('href',foilFrames[Math.max(0,Math.min(8,Math.round(4+vx*.3)))]);
      }
    }
  };
}

export function previewMore(mode,demo){
  const combined=mode==='edges-pressure',pressure=combined||mode==='pressure';
  const fine=matchMedia('(pointer: fine)'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const canvas=document.createElement('canvas');canvas.className='cursor-more';canvas.setAttribute('aria-hidden','true');
  canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:9499;pointer-events:none';document.body.append(canvas);
  const ctx=canvas.getContext('2d'),surface=combined?createSurface('edges'):surfaceModes.includes(mode)?createSurface(mode):null;
  const warp=pressure?createCursorDistortion():null;
  const outline=combined?createOutlineCursor(fine):null;
  let dpr=1,raf=0,lastTime=0,lastInput=-Infinity,inside=false,lastPulse=0,pulses=[];
  let target={x:innerWidth/2,y:innerHeight/2},p={...target},dust=new Map();
  function resize(){dpr=Math.min(2,devicePixelRatio);canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;dust.clear();}
  resize();addEventListener('resize',resize);
  function clear(){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);warp?.clear();surface?.clear();}
  function wake(){if(!raf&&!document.hidden&&fine.matches&&!reduced.matches)raf=requestAnimationFrame(draw);}
  addEventListener('pointermove',event=>{if(event.pointerType!=='mouse')return;if(!inside)p={x:event.clientX,y:event.clientY};target={x:event.clientX,y:event.clientY};inside=true;lastInput=performance.now();wake();},{passive:true});
  addEventListener('pointerdown',event=>{if(!pressure||event.pointerType!=='mouse'||event.button!==0||!fine.matches||reduced.matches)return;pulses.push({...outline?.snapshot(event.clientX,event.clientY)??{x:event.clientX,y:event.clientY,radius:12},born:performance.now()});pulses=pulses.slice(-4);lastInput=performance.now();wake();},{passive:true});
  document.addEventListener('pointerleave',()=>{inside=false;pulses=[];clear();});
  document.addEventListener('visibilitychange',()=>{inside=false;pulses=[];clear();if(demo)wake();});
  for(const query of [fine,reduced])query.addEventListener('change',()=>{pulses=[];clear();wake();});
  function draw(now){
    raf=0;if(document.hidden||!fine.matches||reduced.matches){clear();return;}
    const dt=Math.min(.05,(now-lastTime)/1000||1/60);lastTime=now;
    const auto=demo&&now-lastInput>2200;
    if(auto)target={x:innerWidth*(.5+.22*Math.sin(now/1700)),y:innerHeight*(.48+.12*Math.sin(now/850))};
    const oldX=p.x,k=1-Math.exp(-16*dt);p.x+=(target.x-p.x)*k;p.y+=(target.y-p.y)*k;
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(dpr,0,0,dpr,0,0);
    const live=inside||auto;
    // Unwind the pulse filter before updating the edge filter it wraps.
    // This preserves original filters when either effect leaves a target.
    warp?.clear();
    if(auto)outline?.show(p.x,p.y);
    if(surface){if(live)surface.update(p.x,p.y,now,p.x-oldX);else surface.clear();}
    if(mode==='magnetic'&&live){
      const touched=new Set();
      for(let y=Math.floor((p.y-175)/20)*20;y<p.y+175;y+=20)for(let x=Math.floor((p.x-175)/20)*20;x<p.x+175;x+=20){
        const distance=Math.hypot(x-p.x,y-p.y),influence=Math.max(0,1-distance/175)**2,key=`${x},${y}`;
        let node=dust.get(key);if(!node){node={x,y};dust.set(key,node);}touched.add(key);
        const spring=1-Math.exp(-5*dt);node.x+=(x+(p.x-x)*influence*.8-node.x)*spring;node.y+=(y+(p.y-y)*influence*.8-node.y)*spring;
        ctx.fillStyle=`rgba(250,60,60,${.15+influence*.7})`;ctx.fillRect(node.x,node.y,1.6,1.6);
      }
      for(const key of dust.keys())if(!touched.has(key))dust.delete(key);
    }
    if(mode==='grain'&&live){
      ctx.lineWidth=1;
      for(let y=Math.floor((p.y-150)/13)*13;y<p.y+150;y+=13)for(let x=Math.floor((p.x-150)/13)*13;x<p.x+150;x+=13){
        const dx=p.x-x,dy=p.y-y,d=Math.hypot(dx,dy),a=Math.max(0,1-d/150)**1.4;if(!a)continue;
        const angle=Math.atan2(dy,dx),length=3+7*a;ctx.strokeStyle=`rgba(250,60,60,${a*.7})`;ctx.beginPath();ctx.moveTo(x-Math.cos(angle)*length/2,y-Math.sin(angle)*length/2);ctx.lineTo(x+Math.cos(angle)*length/2,y+Math.sin(angle)*length/2);ctx.stroke();
      }
    }
    if(mode==='contours'&&live){
      ctx.lineWidth=1;ctx.setLineDash([1,3]);
      for(let line=-5;line<=5;line++){
        const x0=Math.round(p.x/25)*25+line*25;ctx.strokeStyle=`rgba(250,60,60,${.5*(1-Math.abs(line)/7)})`;ctx.beginPath();
        for(let y=p.y-140;y<=p.y+140;y+=4){const force=Math.exp(-(((y-p.y)/65)**2))*Math.exp(-(((x0-p.x)/100)**2));const x=x0+(x0<p.x?-1:1)*force*36+Math.sin(y/45+now/1000)*force*4;if(y===p.y-140)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
      }ctx.setLineDash([]);
    }
    if(pressure){
      if(auto&&now-lastPulse>1600){pulses.push({...outline?.snapshot(p.x,p.y)??{x:p.x,y:p.y,radius:12},born:now});lastPulse=now;}
      pulses=pulses.filter(pulse=>now-pulse.born<950).slice(-4);
      for(const pulse of pulses){const age=(now-pulse.born)/950,radius=pulse.radius+85*age;ctx.strokeStyle=`rgba(250,60,60,${(1-age)**2})`;ctx.lineWidth=2;ctx.setLineDash([1.5,4]);ctx.beginPath();ctx.arc(pulse.x,pulse.y,radius,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);if(age<.65)warp.update(pulse.x,pulse.y,Math.sin(age/.65*Math.PI)*3);}
    }
    ctx.setTransform(1,0,0,1,0,0);
    if(demo||live||pulses.length)wake();
  }
  if(demo)wake();
}


// A softly eased ring inspired by the reference; no dot or filled hover state.
function createOutlineCursor(fine) {
  const ring=document.createElement('div');
  ring.className='cursor-outline';ring.setAttribute('aria-hidden','true');
  ring.style.cssText='position:fixed;left:0;top:0;width:40px;height:40px;margin:-20px 0 0 -20px;border:1px solid rgba(239,235,227,.8);border-radius:50%;pointer-events:none;z-index:10000;display:none;box-sizing:border-box;mix-blend-mode:difference';
  const style=document.createElement('style');
  style.textContent='@media print{.cursor-outline{display:none!important}}';
  document.head.append(style);document.body.append(ring);
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  let raf=0,last=0,shown=false,x=0,y=0,tx=0,ty=0,size=.85,speed=0,hover=false;
  function draw(now){
    raf=0;const dt=Math.min(.05,(now-last)/1000||1/60);last=now;
    const ease=reduced.matches?1:1-Math.exp(-26*dt);
    const oldX=x,oldY=y;
    x+=(tx-x)*ease;y+=(ty-y)*ease;
    const velocity=Math.hypot(x-oldX,y-oldY)/dt;
    speed+=(velocity-speed)*(1-Math.exp(-9*dt));
    const targetSize=reduced.matches?.85:.85+Math.min(.65,speed/1500)+(hover?.1:0);
    size+=(targetSize-size)*(reduced.matches?1:1-Math.exp(-12*dt));
    ring.style.transform=`translate3d(${x}px,${y}px,0) scale(${size})`;
    if(shown&&(Math.abs(tx-x)+Math.abs(ty-y)+Math.abs(targetSize-size)+speed/1500>.001))raf=requestAnimationFrame(draw);
  }
  function hide(){shown=false;cancelAnimationFrame(raf);raf=0;ring.style.display='none';speed=0;}
  function show(px,py){
    if(!fine.matches||document.hidden)return;
    tx=px;ty=py;if(!shown){x=tx;y=ty;size=.85;speed=0;shown=true;}
    ring.style.display='block';if(!raf)raf=requestAnimationFrame(draw);
  }
  addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse'||!fine.matches){hide();return;}
    hover=!!event.target.closest('a,button,summary,[role="button"]');
    show(event.clientX,event.clientY);
  },{passive:true});
  document.addEventListener('pointerleave',hide);addEventListener('blur',hide);
  document.addEventListener('visibilitychange',hide);fine.addEventListener('change',hide);
  addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse')hide();},{passive:true});
  return {show,hide,snapshot(fallbackX,fallbackY){
    if(!shown){x=tx=fallbackX;y=ty=fallbackY;size=.85;show(x,y);}
    return {x,y,radius:20*size};
  }};
}
