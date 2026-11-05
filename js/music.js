/*! © 2026 YABAI · BHP Run · all rights reserved */
import{SIREN_METER_THRESHOLD}from'./config.js';
export const SIREN_DS5=622.25;
export const SIREN_E5=659.26;
export function levelFor(meter){
return(typeof meter==='number'&&meter>=SIREN_METER_THRESHOLD)?1:0;
}
export function nextBarTime(now,t0,bpm){
if(typeof bpm!=='number'||bpm<=0)return now;
const barLen=240/bpm;
if(now<=t0)return t0;
const k=Math.ceil((now-t0)/barLen-1e-9);
return t0+k*barLen;
}
export function sirenNoteAt(halfBarIndex){
const idx=Math.abs(Math.round(halfBarIndex));
return idx%2===0?SIREN_DS5:SIREN_E5;
}
export function loopRegion(json){
if(!json||typeof json!=='object')return null;
const{loopStart,loopEnd}=json;
if(typeof loopStart!=='number'||typeof loopEnd!=='number')return null;
if(!Number.isFinite(loopStart)||!Number.isFinite(loopEnd))return null;
if(loopStart<0||loopStart>=loopEnd)return null;
return loopEnd-loopStart;
}
