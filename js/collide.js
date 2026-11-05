/*! © 2026 YABAI · BHP Run · all rights reserved */
import{
OBSTACLE_DEPTH,
PLAYER_DEPTH,
GATE_CLEAR_Y,
ITEM_PICK_RANGE
}from'./config.js';
export function checkCollisions(player,objects){
const hits=[];
const pickups=[];
const occupiedLane=player.occupiedLane;
const obstacleOverlap=(OBSTACLE_DEPTH+PLAYER_DEPTH)/2;
for(let i=0;i<objects.length;i++){
const obj=objects[i];
if(obj.kind==='obstacle'){
if(!obj.hit&&obj.lane===occupiedLane&&Math.abs(obj.z)<obstacleOverlap){
let isHit=false;
if(obj.type==='GATE'){
if(player.y<GATE_CLEAR_Y){
isHit=true;
}
}else if(obj.type==='BARRIER'){
if(!player.sliding){
isHit=true;
}
}else if(obj.type==='VENDING'){
isHit=true;
}
if(isHit){
obj.hit=true;
hits.push(obj);
}
}
}else if(obj.kind==='item'){
if(!obj.taken&&obj.lane===occupiedLane&&Math.abs(obj.z)<ITEM_PICK_RANGE){
obj.taken=true;
pickups.push(obj);
}
}
}
return{hits,pickups};
}
