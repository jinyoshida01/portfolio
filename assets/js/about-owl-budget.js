// Bound GPU allocations independently of the monitor's pixel density.
export function owlPixelRatio(width,height,pixelRatio=1){
 return Math.min(pixelRatio,1.25,1024/Math.max(width,height),Math.sqrt(600000/(width*height)));
}
export const owlFrameInterval=1000/30;
