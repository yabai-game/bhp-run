/*! © 2026 YABAI · BHP Run · all rights reserved */
import{
RUN_CYCLE_M,
JUMP_ANIM_TIME,
SLIDE_ANIM_TIME,
STUMBLE_ANIM_TIME,
POLICE_PHASE_OFFSET,
SPRITE_PX_PER_M,
JUMP_V,
GRAVITY,
SLIDE_TIME,
STUMBLE_TIME,
ITEM_BOTTOM_Y,
ITEM_BOB,
POLICE_Z_FAR,
POLICE_Z_NEAR
}from'./config.js';
function clamp(val,min,max){
return Math.max(min,Math.min(max,val));
}
export function frameIndex(n,u,loop){
if(n<=0)return 0;
if(loop){
let frac=u%1;
if(frac<0)frac+=1;
return Math.floor(frac*n);
}
const clamped=clamp(u,0,1);
return Math.min(n-1,Math.floor(clamped*n));
}
export function animNameFor(baseName,chickenHeld){
return chickenHeld?baseName:(baseName+'_free');
}
export function teoAnim(state){
if(state.phase==='caught'){
return{name:'stumble',u:1,loop:false};
}
if(state.phase==='ready'){
return{name:'run',u:0,loop:true};
}
if(state.player&&state.player.airborne){
const u=clamp((JUMP_V-state.player.vy)/(GRAVITY*JUMP_ANIM_TIME),0,1);
return{name:'jump',u,loop:false};
}
if(state.player&&state.player.sliding){
const u=(SLIDE_TIME-state.player.slideT)/SLIDE_ANIM_TIME;
return{name:'slide',u,loop:true};
}
if(state.stumbleT>0){
const e=STUMBLE_TIME-state.stumbleT;
if(e<STUMBLE_ANIM_TIME){
const u=e/STUMBLE_ANIM_TIME;
return{name:'stumble',u,loop:false};
}
}
const u=state.distance/RUN_CYCLE_M;
return{name:'run',u,loop:true};
}
export function policeAnim(state){
return{
name:'run',
loop:true,
u:state.distance/RUN_CYCLE_M+POLICE_PHASE_OFFSET
};
}
export function policeZ(meter){
return POLICE_Z_FAR+((POLICE_Z_NEAR-POLICE_Z_FAR)*meter)/100;
}
export function policeX(player){
return player?player.x*0.6:0;
}
export function spriteScale(projScale){
return projScale/SPRITE_PX_PER_M;
}
export function propFrameKey(obj){
if(!obj)return null;
if(obj.kind==='obstacle'){
if(obj.type==='GATE')return'gate';
if(obj.type==='BARRIER')return'barrier';
if(obj.type==='VENDING')return'vending';
}else if(obj.kind==='item'){
if(obj.item==='ONIGIRI')return'onigiri';
if(obj.item==='TICKET')return'ticket';
if(obj.item==='SUIKA')return'suika';
if(obj.item==='SALARY')return'salary';
}
return null;
}
export function sidePropFrameKey(propType,side){
if(propType==='lamp'){
if(side<0)return'lamp_left';
if(side>0)return'lamp_right';
return null;
}
if(propType==='lanterns'||propType==='lantern'){
return'lantern';
}
return null;
}
export function itemBottomY(time,z){
return ITEM_BOTTOM_Y+ITEM_BOB*Math.sin(time*4+z);
}
