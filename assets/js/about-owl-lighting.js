// Full-body lighting studies. Soft Studio is the selected About page default.
export const aboutOwlLighting={
 current:{ambient:1.3,key:2.6,keyAt:[-3,4,5],fill:1.25,fillAt:[2,-1,6],rim:2.1,rimAt:[1,3,-4]},
 side:{ambient:.16,key:3.2,keyAt:[-5,3,5],fill:.18,fillAt:[4,0,4],rim:1.8,rimAt:[3,3,-4]},
 rim:{ambient:.06,key:.35,keyAt:[0,2,5],fill:2.8,fillAt:[-5,2,-3],rim:3.8,rimAt:[4,3,-3]},
 overhead:{ambient:.18,key:3.4,keyAt:[0,7,2],fill:.22,fillAt:[0,-3,5],rim:1.2,rimAt:[-2,2,-4]},
 soft:{ambient:.55,key:1.7,keyAt:[-3,4,6],fill:1.0,fillAt:[4,1,5],rim:1.1,rimAt:[0,4,-3]},
 split:{ambient:.10,key:2.5,keyAt:[-6,1,2],fill:1.8,fillAt:[5,-2,3],rim:.7,rimAt:[0,4,-4]},
 sweep:{ambient:.20,key:2.8,keyAt:[-4,3,5],fill:.20,fillAt:[4,0,4],rim:1.6,rimAt:[0,3,-4]},
};
export function setAboutOwlLighting(name,ambient,key,fill,rim){
 const selected=Object.hasOwn(aboutOwlLighting,name)?name:'soft',preset=aboutOwlLighting[selected];
 ambient.intensity=preset.ambient;
 for(const [light,label] of [[key,'key'],[fill,'fill'],[rim,'rim']]){
  light.intensity=preset[label];light.position.set(...preset[`${label}At`]);
 }
 return {name:selected,update(time){if(selected==='sweep')key.position.set(Math.sin(time*.3)*5,3,4.5+Math.cos(time*.3));}};
}
