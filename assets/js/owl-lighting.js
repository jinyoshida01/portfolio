// Preview lighting only: the current setup remains the homepage default.
export const owlLighting = {
  current: {ambient:1.3,key:2.5,keyAt:[-3,4,5],fill:.65,fillAt:[4,1,3],rim:2.4,rimAt:[1,3,-4]},
  side: {ambient:.13,key:2.8,keyAt:[-5,2,2],fill:.06,fillAt:[4,1,3],rim:.8,rimAt:[3,2,-4]},
  eclipse: {ambient:.045,key:.12,keyAt:[0,2,5],fill:1.6,fillAt:[-4,1,-2],rim:4.5,rimAt:[3,3,-3]},
  overhead: {ambient:.12,key:3.5,keyAt:[0,7,1],fill:.14,fillAt:[0,-2,4],rim:.7,rimAt:[1,2,-4]},
  softbox: {ambient:.45,key:1.15,keyAt:[-2,3,6],fill:.8,fillAt:[4,1,5],rim:1.1,rimAt:[0,4,-3]},
  underlight: {ambient:.09,key:2.5,keyAt:[-2,-5,3],fill:.12,fillAt:[3,2,3],rim:.7,rimAt:[2,3,-4]},
  sweep: {ambient:.14,key:2.5,keyAt:[-4,3,3],fill:.1,fillAt:[4,1,3],rim:1,rimAt:[0,3,-4]},
};
export function setOwlLighting(name, ambient, key, fill, rim) {
  const selected=Object.hasOwn(owlLighting,name)?name:'current';
  const setup=owlLighting[selected];
  ambient.intensity=setup.ambient;
  for(const [light,label] of [[key,'key'],[fill,'fill'],[rim,'rim']]) {
    light.intensity=setup[label];light.position.set(...setup[`${label}At`]);
  }
  return {name:selected,update(time){
    if(selected==='sweep')key.position.set(Math.sin(time*.35)*5,3,3.5+Math.cos(time*.35)*1.5);
  }};
}
