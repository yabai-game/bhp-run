import { LANE_WIDTH, CAM_DIST, CAM_HEIGHT, FOCAL, HORIZON_Y, CX } from './config.js';

export function laneX(lane) {
  return (lane - 1) * LANE_WIDTH;
}

export function project(x, y, z) {
  const scale = FOCAL / (z + CAM_DIST);
  const sx = CX + x * scale;
  const sy = HORIZON_Y + (CAM_HEIGHT - y) * scale;
  return { sx, sy, scale };
}
