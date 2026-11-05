/*! © 2026 YABAI · BHP Run · all rights reserved */
import{DRAW_DIST,BILLBOARD_PERIOD,BILLBOARD_OFFSET,BILLBOARD_X}from'./config.js';
export function billboardSlots(distance,out=[]){
let count=0;
const startN=Math.max(1,Math.floor((distance-BILLBOARD_OFFSET-2)/BILLBOARD_PERIOD));
for(let n=startN;;n++){
const z=n*BILLBOARD_PERIOD+BILLBOARD_OFFSET-distance;
if(z<=-2)continue;
if(z>=DRAW_DIST)break;
const side=(n%2===0)?-1:1;
const x=side*BILLBOARD_X;
if(!out[count]){
out[count]={n,z,side,x};
}else{
out[count].n=n;
out[count].z=z;
out[count].side=side;
out[count].x=x;
}
count++;
}
out.length=count;
return out;
}
