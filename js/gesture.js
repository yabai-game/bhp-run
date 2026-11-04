import { SWIPE_MIN_PX, TAP_MAX_PX, TAP_MAX_MS, DOUBLE_TAP_MS } from './config.js';

export function classifySwipe(dx, dy) {
  if (Math.hypot(dx, dy) < SWIPE_MIN_PX) {
    return null;
  }
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy < 0 ? 'jump' : 'slide';
}

export function isTap(dx, dy, ms) {
  return Math.hypot(dx, dy) <= TAP_MAX_PX && ms <= TAP_MAX_MS;
}

export function isDoubleTap(prevTapMs, tapMs) {
  if (typeof prevTapMs !== 'number' || !Number.isFinite(prevTapMs) || prevTapMs <= 0) {
    return false;
  }
  if (typeof tapMs !== 'number' || !Number.isFinite(tapMs) || tapMs < prevTapMs) {
    return false;
  }
  const diff = tapMs - prevTapMs;
  return diff >= 0 && diff <= DOUBLE_TAP_MS;
}
