import {
  LANE_WIDTH,
  LANE_SWITCH_SPEED,
  JUMP_V,
  GRAVITY,
  FAST_FALL_V,
  SLIDE_TIME
} from './config.js';
import { laneX } from './track.js';

export function createPlayer() {
  return {
    lane: 1,
    x: 0,
    y: 0,
    vy: 0,
    airborne: false,
    slideT: 0,
    sliding: false,
    slideOnLand: false,
    occupiedLane: 1
  };
}

export function applyAction(player, action) {
  if (action === 'left') {
    if (player.lane > 0) {
      player.lane -= 1;
      return true;
    }
    return false;
  } else if (action === 'right') {
    if (player.lane < 2) {
      player.lane += 1;
      return true;
    }
    return false;
  } else if (action === 'jump') {
    if (!player.airborne) {
      player.slideT = 0;
      player.sliding = false;
      player.slideOnLand = false;
      player.vy = JUMP_V;
      player.airborne = true;
      return true;
    }
    return false;
  } else if (action === 'slide') {
    if (player.airborne) {
      if (player.slideOnLand) return false;
      player.vy = FAST_FALL_V;
      player.slideOnLand = true;
      return true;
    }
    if (player.sliding) {
      return false;
    }
    player.slideT = SLIDE_TIME;
    player.sliding = true;
    return true;
  }
  return false;
}

export function updatePlayer(player, dt) {
  // Horizontal movement towards target lane
  const targetX = laneX(player.lane);
  if (player.x !== targetX) {
    const step = LANE_SWITCH_SPEED * dt;
    if (Math.abs(targetX - player.x) <= step) {
      player.x = targetX;
    } else if (player.x < targetX) {
      player.x += step;
    } else {
      player.x -= step;
    }
  }
  player.occupiedLane = Math.round(player.x / LANE_WIDTH + 1);

  // Slide timer on ground
  if (player.slideT > 0) {
    player.slideT -= dt;
    if (player.slideT <= 0) {
      player.slideT = 0;
      player.sliding = false;
    } else {
      player.sliding = true;
    }
  } else {
    player.sliding = false;
  }

  // Vertical physics
  if (player.airborne) {
    player.y += (player.vy - 0.5 * GRAVITY * dt) * dt;
    player.vy -= GRAVITY * dt;
    if (player.y <= 0) {
      player.y = 0;
      player.vy = 0;
      player.airborne = false;
      if (player.slideOnLand) {
        player.slideOnLand = false;
        player.slideT = SLIDE_TIME;
        player.sliding = true;
      }
    }
  }
}
