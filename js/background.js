/*! © 2026 YABAI · BHP Run · all rights reserved */
import{
VIEW_W,
HORIZON_Y,
DRAW_DIST,
LANE_WIDTH,
WALL_X,
WALL_H,
WIN_PERIOD
}from'./config.js';
import{project,cameraX}from'./track.js';
import{createRng}from'./rng.js';
function winHash(n,floorIdx,sideIdx){
const v=Math.sin((n*1337.0+floorIdx*37.0+sideIdx*101.0)*12.9898)*43758.5453;
return v-Math.floor(v);
}
export function createBackground(){
const skylineCanvas=document.createElement('canvas');
skylineCanvas.width=1080;
skylineCanvas.height=260;
const sCtx=skylineCanvas.getContext('2d');
const rng=createRng(1234);
let curX=0;
const neonWords=['ラーメン','居酒屋','カラオケ','薬','営業中'];
const neonColors=['#f472b6','#22d3ee','#fde047'];
const buildings=[];
while(curX<skylineCanvas.width){
const bW=45+Math.floor(rng()*45);
const bH=80+Math.floor(rng()*150);
const bY=skylineCanvas.height-bH;
buildings.push({x:curX,w:bW,y:bY});
const shade=20+Math.floor(rng()*14);
sCtx.fillStyle=`rgb(${shade}, ${shade - 5}, ${shade + 18})`;
sCtx.fillRect(curX,bY,bW,bH);
const winW=4;
const winH=6;
const gapX=5;
const gapY=8;
const cols=Math.floor((bW-10)/(winW+gapX));
const rows=Math.floor((bH-20)/(winH+gapY));
for(let r=0;r<rows;r++){
for(let c=0;c<cols;c++){
const wx=curX+6+c*(winW+gapX);
const wy=bY+12+r*(winH+gapY);
if(rng()<0.25){
sCtx.fillStyle=rng()<0.6?'#ffd27a':'#9ad0ff';
}else{
sCtx.fillStyle='#15102a';
}
sCtx.fillRect(wx,wy,winW,winH);
}
}
if(rng()<0.35&&bH>=110){
const neonWord=neonWords[Math.floor(rng()*neonWords.length)];
const neonColor=neonColors[Math.floor(rng()*neonColors.length)];
const signW=20;
const signH=neonWord.length*18+10;
const signX=curX+bW-signW-4;
const signY=bY+10;
sCtx.fillStyle='#0f0a20';
sCtx.fillRect(signX,signY,signW,signH);
sCtx.strokeStyle=neonColor;
sCtx.lineWidth=1;
sCtx.strokeRect(signX,signY,signW,signH);
sCtx.fillStyle=neonColor;
sCtx.font='bold 13px sans-serif';
sCtx.textAlign='center';
sCtx.textBaseline='middle';
for(let i=0;i<neonWord.length;i++){
sCtx.fillText(neonWord[i],signX+signW/2,signY+10+i*18);
}
}
curX+=bW-2;
}
const floors=[
{y1:1.6,y2:3.2,floorIdx:0},
{y1:4.2,y2:5.6,floorIdx:1}
];
const sides=[
{x:-WALL_X,sideIdx:0},
{x:WALL_X,sideIdx:1}
];
function renderSkyAndBackground(ctx,state){
const camX=cameraX(state.player.x);
const skyGrad=ctx.createLinearGradient(0,0,0,HORIZON_Y);
skyGrad.addColorStop(0,'#120a2e');
skyGrad.addColorStop(0.5,'#2a1c5a');
skyGrad.addColorStop(1,'#3b2a6e');
ctx.fillStyle=skyGrad;
ctx.fillRect(0,0,VIEW_W,HORIZON_Y);
const parallaxX=(VIEW_W-skylineCanvas.width)/2-state.player.x*8;
ctx.drawImage(skylineCanvas,parallaxX,HORIZON_Y-skylineCanvas.height);
const pL_bn=project(-WALL_X,0,0,camX);
const pL_bf=project(-WALL_X,0,DRAW_DIST,camX);
const pL_tf=project(-WALL_X,WALL_H,DRAW_DIST,camX);
const pL_tn=project(-WALL_X,WALL_H,0,camX);
ctx.fillStyle='#1c1640';
ctx.beginPath();
ctx.moveTo(pL_bn.sx,pL_bn.sy);
ctx.lineTo(pL_bf.sx,pL_bf.sy);
ctx.lineTo(pL_tf.sx,pL_tf.sy);
ctx.lineTo(pL_tn.sx,pL_tn.sy);
ctx.closePath();
ctx.fill();
const pR_bn=project(WALL_X,0,0,camX);
const pR_bf=project(WALL_X,0,DRAW_DIST,camX);
const pR_tf=project(WALL_X,WALL_H,DRAW_DIST,camX);
const pR_tn=project(WALL_X,WALL_H,0,camX);
ctx.beginPath();
ctx.moveTo(pR_bn.sx,pR_bn.sy);
ctx.lineTo(pR_bf.sx,pR_bf.sy);
ctx.lineTo(pR_tf.sx,pR_tf.sy);
ctx.lineTo(pR_tn.sx,pR_tn.sy);
ctx.closePath();
ctx.fill();
const distBase=Math.floor(state.distance/WIN_PERIOD);
const winPhase=state.distance%WIN_PERIOD;
for(let k=0;k*WIN_PERIOD<DRAW_DIST;k++){
const zc=k*WIN_PERIOD-winPhase;
const z1=zc;
const z2=zc+2.2;
if(z2<=0.1||z1>=DRAW_DIST)continue;
const clampZ1=Math.max(0.1,z1);
const clampZ2=Math.min(DRAW_DIST,z2);
if(clampZ2<=clampZ1)continue;
const worldK=k+distBase;
for(let s=0;s<sides.length;s++){
const{x:wx,sideIdx}=sides[s];
for(let f=0;f<floors.length;f++){
const{y1,y2,floorIdx}=floors[f];
const hVal=winHash(worldK,floorIdx,sideIdx);
ctx.fillStyle=hVal<0.3?'rgba(255, 210, 122, 0.55)':'rgba(154, 208, 255, 0.10)';
const p_bn_win=project(wx,y1,clampZ1,camX);
const p_bf_win=project(wx,y1,clampZ2,camX);
const p_tf_win=project(wx,y2,clampZ2,camX);
const p_tn_win=project(wx,y2,clampZ1,camX);
ctx.beginPath();
ctx.moveTo(p_bn_win.sx,p_bn_win.sy);
ctx.lineTo(p_bf_win.sx,p_bf_win.sy);
ctx.lineTo(p_tf_win.sx,p_tf_win.sy);
ctx.lineTo(p_tn_win.sx,p_tn_win.sy);
ctx.closePath();
ctx.fill();
}
}
}
const roadHalfWidth=1.5*LANE_WIDTH;
const pL_sw_outer_near=project(-WALL_X,0,-2,camX);
const pL_sw_outer_far=project(-WALL_X,0,DRAW_DIST,camX);
const pL_sw_inner_far=project(-roadHalfWidth,0,DRAW_DIST,camX);
const pL_sw_inner_near=project(-roadHalfWidth,0,-2,camX);
ctx.fillStyle='#2b2540';
ctx.beginPath();
ctx.moveTo(pL_sw_outer_near.sx,pL_sw_outer_near.sy);
ctx.lineTo(pL_sw_outer_far.sx,pL_sw_outer_far.sy);
ctx.lineTo(pL_sw_inner_far.sx,pL_sw_inner_far.sy);
ctx.lineTo(pL_sw_inner_near.sx,pL_sw_inner_near.sy);
ctx.closePath();
ctx.fill();
const pR_sw_inner_near=project(roadHalfWidth,0,-2,camX);
const pR_sw_inner_far=project(roadHalfWidth,0,DRAW_DIST,camX);
const pR_sw_outer_far=project(WALL_X,0,DRAW_DIST,camX);
const pR_sw_outer_near=project(WALL_X,0,-2,camX);
ctx.beginPath();
ctx.moveTo(pR_sw_inner_near.sx,pR_sw_inner_near.sy);
ctx.lineTo(pR_sw_inner_far.sx,pR_sw_inner_far.sy);
ctx.lineTo(pR_sw_outer_far.sx,pR_sw_outer_far.sy);
ctx.lineTo(pR_sw_outer_near.sx,pR_sw_outer_near.sy);
ctx.closePath();
ctx.fill();
const pNearL=project(-roadHalfWidth,0,-2,camX);
const pNearR=project(roadHalfWidth,0,-2,camX);
const pFarR=project(roadHalfWidth,0,DRAW_DIST,camX);
const pFarL=project(-roadHalfWidth,0,DRAW_DIST,camX);
ctx.fillStyle='#23232e';
ctx.beginPath();
ctx.moveTo(pNearL.sx,pNearL.sy);
ctx.lineTo(pNearR.sx,pNearR.sy);
ctx.lineTo(pFarR.sx,pFarR.sy);
ctx.lineTo(pFarL.sx,pFarL.sy);
ctx.closePath();
ctx.fill();
ctx.strokeStyle='#eab308';
ctx.lineWidth=4;
ctx.beginPath();
ctx.moveTo(pNearL.sx,pNearL.sy);
ctx.lineTo(pFarL.sx,pFarL.sy);
ctx.moveTo(pNearR.sx,pNearR.sy);
ctx.lineTo(pFarR.sx,pFarR.sy);
ctx.stroke();
ctx.strokeStyle='#f8fafc';
ctx.lineWidth=3;
const laneDivs=[-0.5*LANE_WIDTH,0.5*LANE_WIDTH];
const dashLen=3;
const dashGap=3;
const period=dashLen+dashGap;
const phase=state.distance%period;
for(let d=0;d<laneDivs.length;d++){
const lx=laneDivs[d];
ctx.beginPath();
for(let z=0;z<DRAW_DIST;z+=period){
const segZ1=Math.max(0,z-phase);
const segZ2=Math.min(DRAW_DIST,segZ1+dashLen);
if(segZ2>segZ1){
const pt1=project(lx,0,segZ1,camX);
const pt2=project(lx,0,segZ2,camX);
ctx.moveTo(pt1.sx,pt1.sy);
ctx.lineTo(pt2.sx,pt2.sy);
}
}
ctx.stroke();
}
}
function renderFarFog(ctx){
const fogGrad=ctx.createLinearGradient(0,HORIZON_Y,0,HORIZON_Y+60);
fogGrad.addColorStop(0,'rgba(59, 42, 110, 0.7)');
fogGrad.addColorStop(1,'rgba(59, 42, 110, 0)');
ctx.fillStyle=fogGrad;
ctx.fillRect(0,HORIZON_Y,VIEW_W,60);
}
let skylineSignDrawn=false;
function setBrandLogo(img){
if(!img||!img.complete||img.naturalWidth<=0)return;
if(skylineSignDrawn)return;
const b=buildings.find(b=>540>=b.x&&540<b.x+b.w);
const roofY=b?b.y:100;
const signW=132;
const signH=44;
const signX=540-signW/2;
let signBottomY=roofY-8;
let signY=signBottomY-signH;
if(roofY<56){
signY=4;
signBottomY=signY+signH;
}
sCtx.fillStyle='#334155';
const legW=2;
const leg1X=signX+24;
const leg2X=signX+signW-26;
if(roofY>signBottomY){
sCtx.fillRect(leg1X,signBottomY,legW,roofY-signBottomY);
sCtx.fillRect(leg2X,signBottomY,legW,roofY-signBottomY);
}
sCtx.fillStyle='#0b1530';
sCtx.fillRect(signX,signY,signW,signH);
sCtx.strokeStyle='#f472b6';
sCtx.lineWidth=2;
sCtx.strokeRect(signX+1,signY+1,signW-2,signH-2);
const logoW=116;
const aspect=img.naturalWidth/img.naturalHeight||(845/213);
const logoH=logoW/aspect;
const logoX=signX+(signW-logoW)/2;
const logoY=signY+(signH-logoH)/2;
sCtx.drawImage(img,logoX,logoY,logoW,logoH);
skylineSignDrawn=true;
}
return{
renderSkyAndBackground,
renderFarFog,
setBrandLogo,
get hasSkylineSign(){
return skylineSignDrawn;
}
};
}
