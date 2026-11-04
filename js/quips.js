export const QUIPS = [
  'Tèo: «Em chỉ đi lạc tí thôi mà anh!»',
  'Visa hết hạn từ lâu, giờ hết luôn đường chạy.',
  'Dép lào không chống trượt. Tiếc ghê.',
  'Lương chui chưa kịp gửi về quê.',
  'Tóc moi đẹp vậy mà không cứu được.',
  '— Vé tàu đâu? — Dạ… vé gì ạ?',
  'Chạy nhanh vậy mà thẻ SUIKA vẫn hết tiền.',
  'Onigiri còn ấm, người đã bị tóm.',
  'Lần sau nhớ mua vé nha Tèo.',
  'Cổng soát vé: 1 — Tèo: 0.',
  'Tèo xin phép gọi về cho mẹ một cuộc.',
  'Hôm nay không phải ngày của Tèo.'
];

export function quipFor(seed) {
  return QUIPS[(seed >>> 0) % QUIPS.length];
}

export function wrapText(text, maxWidth, measureFn) {
  if (!text) return [];
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (measureFn(candidate) <= maxWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}
