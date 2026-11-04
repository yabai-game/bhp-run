import { DRAW_DIST, BILLBOARD_PERIOD, BILLBOARD_OFFSET, BILLBOARD_X } from './config.js';

/**
 * Tính toán các vị trí biển quảng cáo YABAI bên đường xuất hiện trong tầm nhìn (-2, DRAW_DIST).
 * Hàm thuần tuý (pure logic), tái dùng các phần tử trong mảng out để không cấp phát bộ nhớ mỗi frame.
 *
 * @param {number} distance Quãng đường người chơi đã chạy (m)
 * @param {Array} out Mảng lưu kết quả (được ghi đè trực tiếp)
 * @returns {Array} Trả lại chính mảng out truyền vào
 */
export function billboardSlots(distance, out = []) {
  let count = 0;
  // Biển n >= 1 có toạ độ world: n * BILLBOARD_PERIOD + BILLBOARD_OFFSET
  // Toạ độ relative z = world - distance.
  // Điều kiện z > -2: n * 56 + 4 - distance > -2 => n > (distance - 6) / 56
  const startN = Math.max(1, Math.floor((distance - BILLBOARD_OFFSET - 2) / BILLBOARD_PERIOD));

  for (let n = startN; ; n++) {
    const z = n * BILLBOARD_PERIOD + BILLBOARD_OFFSET - distance;
    if (z <= -2) continue;
    if (z >= DRAW_DIST) break;

    const side = (n % 2 === 0) ? -1 : 1;
    const x = side * BILLBOARD_X;

    if (!out[count]) {
      out[count] = { n, z, side, x };
    } else {
      out[count].n = n;
      out[count].z = z;
      out[count].side = side;
      out[count].x = x;
    }
    count++;
  }

  out.length = count;
  return out;
}
