import { LOBBY_ACTION_MIN, LOBBY_ACTION_MAX } from './config.js';

export const LOBBY = {
  back: { x: 16, y: 14, w: 52, h: 52 },
  prev: { x: 14, y: 330, w: 60, h: 60 },
  next: { x: 466, y: 330, w: 60, h: 60 },
  card: { x: 24, y: 630, w: 492, h: 316 },
  selectBtn: { x: 80, y: 874, w: 380, h: 64 },
  progress: { x: 60, y: 872, w: 420, h: 10 }
};

function insideBox(px, py, box) {
  return px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h;
}

export function lobbyHit(x, y) {
  if (insideBox(x, y, LOBBY.back)) return 'back';
  if (insideBox(x, y, LOBBY.prev)) return 'prev';
  if (insideBox(x, y, LOBBY.next)) return 'next';
  if (insideBox(x, y, LOBBY.selectBtn)) return 'select';
  return null;
}

export function progressRatio(best, unlockBest) {
  if (!unlockBest || unlockBest <= 0) return 1;
  const ratio = best / unlockBest;
  if (ratio < 0) return 0;
  if (ratio > 1) return 1;
  return ratio;
}

export function nextActionDelay(r) {
  const t = Math.max(0, Math.min(0.999999, r));
  return LOBBY_ACTION_MIN + (LOBBY_ACTION_MAX - LOBBY_ACTION_MIN) * t;
}
