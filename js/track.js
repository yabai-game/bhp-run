/*! © 2026 YABAI · BHP Run · all rights reserved */
import{LANE_WIDTH,CAM_DIST,CAM_HEIGHT,FOCAL,HORIZON_Y,CX,CAM_FOLLOW}from'./config.js';
export function laneX(lane){
return(lane-1)*LANE_WIDTH;
}
export function cameraX(playerX){
return playerX*CAM_FOLLOW;
}
export function project(x,y,z,camX=0){
const scale=FOCAL/(z+CAM_DIST);
const sx=CX+(x-camX)*scale;
const sy=HORIZON_Y+(CAM_HEIGHT-y)*scale;
return{sx,sy,scale};
}
