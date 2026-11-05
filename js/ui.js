/*! © 2026 YABAI · BHP Run · all rights reserved */
import{UI_FONT}from'./config.js';
const DEFAULT_TEXT_OPTS={
stroke:'#0b1530',
strokeW:0,
shadow:'rgba(0, 0, 0, 0.55)',
shadowDy:0,
align:'center',
baseline:'middle'
};
const RIBBON_TEXT_OPTS={
stroke:'#0b1530',
strokeW:5,
shadow:'rgba(0, 0, 0, 0.55)',
shadowDy:2,
align:'center',
baseline:'middle'
};
function roundedRectPath(ctx,x,y,w,h,r){
ctx.beginPath();
ctx.moveTo(x+r,y);
ctx.lineTo(x+w-r,y);
ctx.arcTo(x+w,y,x+w,y+r,r);
ctx.lineTo(x+w,y+h-r);
ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
ctx.lineTo(x+r,y+h);
ctx.arcTo(x,y+h,x,y+h-r,r);
ctx.lineTo(x,y+r);
ctx.arcTo(x,y,x+r,y,r);
ctx.closePath();
}
export function outlinedText(ctx,text,x,y,size,weight,fill,opts=null){
const stroke=(opts&&opts.stroke)||DEFAULT_TEXT_OPTS.stroke;
const strokeW=(opts&&opts.strokeW)||Math.max(3,size*0.16);
const shadow=(opts&&opts.shadow)||DEFAULT_TEXT_OPTS.shadow;
const shadowDy=(opts&&opts.shadowDy)||Math.max(2,size*0.08);
const align=(opts&&opts.align)||DEFAULT_TEXT_OPTS.align;
const baseline=(opts&&opts.baseline)||DEFAULT_TEXT_OPTS.baseline;
ctx.font=`${weight} ${size}px ${UI_FONT}`;
ctx.textAlign=align;
ctx.textBaseline=baseline;
ctx.lineJoin='round';
ctx.miterLimit=2;
ctx.strokeStyle=shadow;
ctx.lineWidth=strokeW;
ctx.strokeText(text,x,y+shadowDy);
ctx.fillStyle=shadow;
ctx.fillText(text,x,y+shadowDy);
ctx.strokeStyle=stroke;
ctx.lineWidth=strokeW;
ctx.strokeText(text,x,y);
ctx.fillStyle=fill;
ctx.fillText(text,x,y);
}
export function pill(ctx,x,y,w,h,fill,border=null,borderW=0){
const r=h/2;
ctx.beginPath();
ctx.moveTo(x+r,y);
ctx.lineTo(x+w-r,y);
ctx.arc(x+w-r,y+r,r,-Math.PI/2,Math.PI/2);
ctx.lineTo(x+r,y+h);
ctx.arc(x+r,y+r,r,Math.PI/2,-Math.PI/2);
ctx.closePath();
if(fill){
ctx.fillStyle=fill;
ctx.fill();
}
if(border&&borderW>0){
ctx.strokeStyle=border;
ctx.lineWidth=borderW;
ctx.stroke();
}
}
export function button3d(ctx,cx,cy,w,h,label,size,scale=1,enabled=true,customBody=null){
ctx.save();
ctx.translate(cx,cy);
if(scale!==1){
ctx.scale(scale,scale);
}
const halfW=w/2;
const halfH=h/2;
const x=-halfW;
const y=-halfH;
const bodyFill=customBody?customBody:(enabled?'#22c55e':'#64748b');
const edgeFill=customBody?'#0f5132':(enabled?'#15803d':'#334155');
const textFill=customBody?'#bbf7d0':(enabled?'#06301a':'#1e293b');
pill(ctx,x,y+8,w,h,edgeFill,'#0b1530',4);
pill(ctx,x,y,w,h,bodyFill,'#0b1530',4);
if(label){
ctx.font=`800 ${size}px ${UI_FONT}`;
ctx.textAlign='center';
ctx.textBaseline='middle';
ctx.fillStyle=textFill;
ctx.fillText(label,0,0);
}
ctx.restore();
}
export function secondaryButton3d(ctx,cx,cy,w,h,label,size=28){
ctx.save();
ctx.translate(cx,cy);
const halfW=w/2;
const halfH=h/2;
const x=-halfW;
const y=-halfH;
pill(ctx,x,y+8,w,h,'#0b1530','#0b1530',4);
pill(ctx,x,y,w,h,'#0f1a3a','#22d3ee',4);
if(label){
ctx.font=`800 ${size}px ${UI_FONT}`;
ctx.textAlign='center';
ctx.textBaseline='middle';
ctx.fillStyle='#e2e8f0';
ctx.fillText(label,0,0);
}
ctx.restore();
}
export function card(ctx,x,y,w,h,border='#ef4444'){
roundedRectPath(ctx,x,y+8,w,h,28);
ctx.fillStyle='#0b1530';
ctx.fill();
roundedRectPath(ctx,x,y,w,h,28);
ctx.fillStyle='#0f1a3a';
ctx.fill();
ctx.strokeStyle=border;
ctx.lineWidth=4;
ctx.stroke();
}
export function ribbon(ctx,cx,cy,text,size,bg='#ef4444',fg='#ffffff'){
ctx.save();
ctx.translate(cx,cy);
ctx.rotate(-2*Math.PI/180);
ctx.font=`800 ${size}px ${UI_FONT}`;
const textW=ctx.measureText(text).width;
const w=textW+48;
const h=size*1.45;
const rx=-w/2;
const ry=-h/2;
roundedRectPath(ctx,rx,ry+5,w,h,14);
ctx.fillStyle='#0b1530';
ctx.fill();
roundedRectPath(ctx,rx,ry,w,h,14);
ctx.fillStyle=bg;
ctx.fill();
ctx.strokeStyle='#0b1530';
ctx.lineWidth=4;
ctx.stroke();
outlinedText(ctx,text,0,0,size,800,fg,RIBBON_TEXT_OPTS);
ctx.restore();
}
export function crown(ctx,cx,cy,s,color='#fbbf24'){
ctx.save();
ctx.translate(cx,cy);
const hw=(s*1.3)/2;
const hh=s/2;
ctx.beginPath();
ctx.moveTo(-hw,hh);
ctx.lineTo(hw,hh);
ctx.lineTo(hw,-hh*0.7);
ctx.lineTo(hw*0.45,hh*0.1);
ctx.lineTo(0,-hh*1.15);
ctx.lineTo(-hw*0.45,hh*0.1);
ctx.lineTo(-hw,-hh*0.7);
ctx.closePath();
ctx.fillStyle=color;
ctx.fill();
ctx.strokeStyle='#0b1530';
ctx.lineWidth=2.5;
ctx.lineJoin='round';
ctx.stroke();
const dotR=Math.max(1.8,s*0.12);
ctx.fillStyle='#ffffff';
ctx.beginPath();
ctx.arc(0,-hh*1.15,dotR,0,Math.PI*2);
ctx.fill();
ctx.stroke();
ctx.beginPath();
ctx.arc(-hw,-hh*0.7,dotR,0,Math.PI*2);
ctx.fill();
ctx.stroke();
ctx.beginPath();
ctx.arc(hw,-hh*0.7,dotR,0,Math.PI*2);
ctx.fill();
ctx.stroke();
ctx.restore();
}
export function arrowIcon(ctx,cx,cy,r,kind){
ctx.save();
ctx.strokeStyle='#ffffff';
ctx.lineWidth=4;
ctx.lineCap='round';
ctx.lineJoin='round';
if(kind==='lr'){
ctx.beginPath();
ctx.moveTo(cx-r*0.65,cy);
ctx.lineTo(cx+r*0.65,cy);
ctx.moveTo(cx-r*0.3,cy-r*0.38);
ctx.lineTo(cx-r*0.65,cy);
ctx.lineTo(cx-r*0.3,cy+r*0.38);
ctx.moveTo(cx+r*0.3,cy-r*0.38);
ctx.lineTo(cx+r*0.65,cy);
ctx.lineTo(cx+r*0.3,cy+r*0.38);
ctx.stroke();
}else if(kind==='up'){
ctx.beginPath();
ctx.moveTo(cx,cy+r*0.55);
ctx.lineTo(cx,cy-r*0.55);
ctx.moveTo(cx-r*0.45,cy-r*0.15);
ctx.lineTo(cx,cy-r*0.55);
ctx.lineTo(cx+r*0.45,cy-r*0.15);
ctx.stroke();
}else if(kind==='down'){
ctx.beginPath();
ctx.moveTo(cx,cy-r*0.55);
ctx.lineTo(cx,cy+r*0.55);
ctx.moveTo(cx-r*0.45,cy+r*0.15);
ctx.lineTo(cx,cy+r*0.55);
ctx.lineTo(cx+r*0.45,cy+r*0.15);
ctx.stroke();
}else if(kind==='left'){
ctx.beginPath();
ctx.moveTo(cx+r*0.4,cy-r*0.45);
ctx.lineTo(cx-r*0.35,cy);
ctx.lineTo(cx+r*0.4,cy+r*0.45);
ctx.stroke();
}else if(kind==='right'){
ctx.beginPath();
ctx.moveTo(cx-r*0.4,cy-r*0.45);
ctx.lineTo(cx+r*0.35,cy);
ctx.lineTo(cx-r*0.4,cy+r*0.45);
ctx.stroke();
}
ctx.restore();
}
export function lockIcon(ctx,cx,cy,s){
ctx.save();
const strokeW=Math.max(2,s*0.12);
ctx.beginPath();
ctx.arc(cx,cy-s*0.14,s*0.24,Math.PI,0);
ctx.lineTo(cx+s*0.24,cy-s*0.02);
ctx.lineTo(cx-s*0.24,cy-s*0.02);
ctx.strokeStyle='#94a3b8';
ctx.lineWidth=strokeW;
ctx.lineCap='round';
ctx.stroke();
const bw=s*0.72;
const bh=s*0.52;
const bx=cx-bw/2;
const by=cy-s*0.04;
roundedRectPath(ctx,bx,by,bw,bh,4);
ctx.fillStyle='#fbbf24';
ctx.fill();
ctx.strokeStyle='#0b1530';
ctx.lineWidth=Math.max(1.5,s*0.08);
ctx.stroke();
ctx.beginPath();
ctx.arc(cx,by+bh*0.4,s*0.09,0,Math.PI*2);
ctx.fillStyle='#0b1530';
ctx.fill();
ctx.fillRect(cx-s*0.04,by+bh*0.4,s*0.08,bh*0.35);
ctx.restore();
}
export function chickenIcon(ctx,cx,cy,s,flapPhase=0){
ctx.save();
const borderW=Math.max(2,s*0.07);
ctx.fillStyle='#ef4444';
ctx.strokeStyle='#0b1530';
ctx.lineWidth=Math.max(1.5,borderW*0.7);
const headX=cx+s*0.22;
const headY=cy-s*0.22;
for(let i=-1;i<=1;i++){
ctx.beginPath();
ctx.arc(headX+i*s*0.09,headY-s*0.14-Math.abs(i)*s*0.02,s*0.09,0,Math.PI*2);
ctx.fill();
ctx.stroke();
}
ctx.fillStyle='#fbbf24';
ctx.beginPath();
ctx.moveTo(cx+s*0.34,cy-s*0.18);
ctx.lineTo(cx+s*0.52,cy-s*0.12);
ctx.lineTo(cx+s*0.34,cy-s*0.06);
ctx.closePath();
ctx.fill();
ctx.stroke();
ctx.fillStyle='#ef4444';
ctx.beginPath();
ctx.arc(cx+s*0.30,cy+s*0.02,s*0.07,0,Math.PI*2);
ctx.fill();
ctx.stroke();
ctx.fillStyle='#f8fafc';
ctx.strokeStyle='#0b1530';
ctx.lineWidth=borderW;
ctx.beginPath();
ctx.ellipse(cx,cy,s*0.42,s*0.34,0,0,Math.PI*2);
ctx.fill();
ctx.stroke();
ctx.fillStyle='#0b1530';
ctx.beginPath();
ctx.arc(cx+s*0.24,cy-s*0.14,Math.max(1.5,s*0.045),0,Math.PI*2);
ctx.fill();
const wingScaleY=0.6+0.4*Math.abs(Math.sin(flapPhase));
ctx.fillStyle='#e2e8f0';
ctx.beginPath();
ctx.ellipse(cx-s*0.08,cy,s*0.22,s*0.18*wingScaleY,0,0,Math.PI*2);
ctx.fill();
ctx.stroke();
ctx.restore();
}
export function cherryBoxIcon(ctx,cx,cy,s){
ctx.save();
const w=s*1.15;
const h=s*0.9;
const rx=cx-w/2;
const ry=cy-h/2;
roundedRectPath(ctx,rx,ry,w,h,6);
ctx.fillStyle='rgba(255, 255, 255, 0.25)';
ctx.fill();
ctx.strokeStyle='#ffffff';
ctx.lineWidth=Math.max(1.5,s*0.07);
ctx.stroke();
const dotR=Math.max(2,s*0.12);
const cols=3;
const rows=2;
const startX=cx-(cols-1)*(dotR*2.2)/2;
const startY=cy-(rows-1)*(dotR*2.0)/2;
for(let r=0;r<rows;r++){
for(let c=0;c<cols;c++){
const x=startX+c*(dotR*2.2);
const y=startY+r*(dotR*2.0);
ctx.beginPath();
ctx.arc(x,y,dotR,0,Math.PI*2);
ctx.fillStyle='#ef4444';
ctx.fill();
ctx.strokeStyle='#991b1b';
ctx.lineWidth=1;
ctx.stroke();
ctx.beginPath();
ctx.arc(x-dotR*0.35,y-dotR*0.35,dotR*0.3,0,Math.PI*2);
ctx.fillStyle='#ffffff';
ctx.fill();
}
}
ctx.restore();
}
