export const HUD = {
  distance: { x: 16, y: 14, w: 116, h: 52 },
  score: { x: 140, y: 10, w: 204, h: 60 },
  best: { x: 352, y: 14, w: 112, h: 52 },
  mute: { x: 476, y: 14, w: 52, h: 52 },
  meter: { x: 16, y: 78, w: 512, h: 36 }
};

export function fitFontSize(text, maxW, startSize, minSize, measure) {
  let size = startSize;
  while (size > minSize && measure(text, size) > maxW) {
    size -= 2;
  }
  return Math.max(size, minSize);
}

export function formatScore(n) {
  if (typeof n !== 'number' || isNaN(n) || n < 0) {
    return '0';
  }
  const intVal = Math.floor(n);
  return intVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function meterColor(m) {
  if (m < 40) return '#22c55e';
  if (m < 70) return '#fbbf24';
  return '#ef4444';
}
