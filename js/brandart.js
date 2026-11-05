/*! © 2026 YABAI · BHP Run · all rights reserved */
let tokenCanvas=null;
let billboardCanvas=null;
let brandLoaded=false;
function renderToken(ctx,logoImg){
ctx.clearRect(0,0,192,192);
const cx=96;
const cy=96;
const r=90;
ctx.fillStyle='#0b1530';
ctx.beginPath();
ctx.arc(cx,cy,r,0,Math.PI*2);
ctx.fill();
ctx.strokeStyle='#fbbf24';
ctx.lineWidth=12;
ctx.beginPath();
ctx.arc(cx,cy,r,0,Math.PI*2);
ctx.stroke();
ctx.strokeStyle='#b45309';
ctx.lineWidth=2;
ctx.beginPath();
ctx.arc(cx,cy,r-7,0,Math.PI*2);
ctx.stroke();
if(logoImg&&logoImg.complete&&logoImg.naturalWidth>0){
const logoW=150;
const aspect=logoImg.naturalWidth/logoImg.naturalHeight||(845/213);
const logoH=logoW/aspect;
const logoX=(192-logoW)/2;
const logoY=(192-logoH)/2;
ctx.drawImage(logoImg,logoX,logoY,logoW,logoH);
}else{
ctx.fillStyle='#ffffff';
ctx.font='bold 40px system-ui, sans-serif';
ctx.textAlign='center';
ctx.textBaseline='middle';
ctx.fillText('YABAI',cx,cy);
}
}
function renderBillboard(ctx,logoImg){
ctx.clearRect(0,0,384,640);
if(!logoImg||!logoImg.complete||logoImg.naturalWidth<=0){
return;
}
ctx.fillStyle='#334155';
const poleW=12.8;
const poleH=480;
const poleY=160;
ctx.fillRect(192-128-poleW/2,poleY,poleW,poleH);
ctx.fillRect(192+128-poleW/2,poleY,poleW,poleH);
ctx.fillStyle='#0b1530';
ctx.fillRect(0,0,384,160);
ctx.strokeStyle='rgba(244, 114, 182, 0.25)';
ctx.lineWidth=10;
ctx.strokeRect(5,5,374,150);
ctx.strokeStyle='#f472b6';
ctx.lineWidth=4;
ctx.strokeRect(2,2,380,156);
const logoW=320;
const aspect=logoImg.naturalWidth/logoImg.naturalHeight||(845/213);
const logoH=logoW/aspect;
const logoX=(384-logoW)/2;
const logoY=19.2;
ctx.drawImage(logoImg,logoX,logoY,logoW,logoH);
ctx.fillStyle='#fde047';
ctx.font='bold 38px system-ui, sans-serif';
ctx.textAlign='center';
ctx.textBaseline='middle';
ctx.fillText('ヤバい！',192,130);
}
export function initBrandArt(logoImg=null){
if(typeof document==='undefined')return;
if(!tokenCanvas){
tokenCanvas=document.createElement('canvas');
tokenCanvas.width=192;
tokenCanvas.height=192;
}
if(!billboardCanvas){
billboardCanvas=document.createElement('canvas');
billboardCanvas.width=384;
billboardCanvas.height=640;
}
updateBrandLogo(logoImg);
}
export function updateBrandLogo(logoImg){
if(!tokenCanvas||!billboardCanvas){
initBrandArt(logoImg);
return;
}
brandLoaded=Boolean(logoImg&&logoImg.complete&&logoImg.naturalWidth>0);
const tCtx=tokenCanvas.getContext('2d');
renderToken(tCtx,logoImg);
const bCtx=billboardCanvas.getContext('2d');
renderBillboard(bCtx,logoImg);
}
export function getTokenCanvas(){
if(!tokenCanvas)initBrandArt(null);
return tokenCanvas;
}
export function getBillboardCanvas(){
if(!brandLoaded)return null;
return billboardCanvas;
}
export function isTokenReady(){
return brandLoaded;
}
export function isBillboardReady(){
return brandLoaded;
}
