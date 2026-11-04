import { SIREN_METER_THRESHOLD } from './config.js';

export const SIREN_E5 = 659.26;
export const SIREN_F5 = 698.46;

/**
 * Xác định cấp độ căng thẳng dựa trên police meter:
 * meter < 70 -> level 0 (bình thường)
 * meter >= 70 -> level 1 (căng thẳng / còi hú)
 *
 * @param {number} meter
 * @returns {number}
 */
export function levelFor(meter) {
  return (typeof meter === 'number' && meter >= SIREN_METER_THRESHOLD) ? 1 : 0;
}

/**
 * Tính thời điểm đầu ô nhịp kế tiếp (>= now) căn theo thời điểm bắt đầu t0 và tốc độ bpm.
 * Độ dài 1 ô nhịp 4/4 tính bằng giây: 4 * 60 / bpm = 240 / bpm.
 * - Nếu now <= t0: trả về t0.
 * - Nếu now nằm ở đầu hoặc giữa ô nhịp: trả về mốc đầu ô nhịp kế tiếp >= now.
 *
 * @param {number} now
 * @param {number} t0
 * @param {number} bpm
 * @returns {number}
 */
export function nextBarTime(now, t0, bpm) {
  if (typeof bpm !== 'number' || bpm <= 0) return now;
  const barLen = 240 / bpm;
  if (now <= t0) return t0;
  // Trừ sai số floating-point nhỏ (1e-9) để tránh nhảy lố khi now trùng khít đầu ô nhịp
  const k = Math.ceil((now - t0) / barLen - 1e-9);
  return t0 + k * barLen;
}

/**
 * Tần số nốt hú cảnh sát luân phiên theo nửa ô nhịp:
 * - Chỉ số chẵn -> E5 (659.26 Hz)
 * - Chỉ số lẻ -> F5 (698.46 Hz)
 *
 * @param {number} halfBarIndex
 * @returns {number}
 */
export function sirenNoteAt(halfBarIndex) {
  const idx = Math.abs(Math.round(halfBarIndex));
  return idx % 2 === 0 ? SIREN_E5 : SIREN_F5;
}

/**
 * Kiểm tra và trích xuất độ dài vòng lặp từ JSON nhạc rượt đuổi:
 * Bắt buộc 0 <= loopStart < loopEnd và cả hai đều là số hữu hạn.
 * Trả về thời lượng vòng lặp (loopEnd - loopStart) tính bằng giây;
 * nếu JSON hỏng hoặc không thoả điều kiện -> trả về null.
 *
 * @param {any} json
 * @returns {number|null}
 */
export function loopRegion(json) {
  if (!json || typeof json !== 'object') return null;
  const { loopStart, loopEnd } = json;
  if (typeof loopStart !== 'number' || typeof loopEnd !== 'number') return null;
  if (!Number.isFinite(loopStart) || !Number.isFinite(loopEnd)) return null;
  if (loopStart < 0 || loopStart >= loopEnd) return null;
  return loopEnd - loopStart;
}
