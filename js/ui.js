import { UI_FONT } from './config.js';

const DEFAULT_TEXT_OPTS = {
  stroke: '#0b1530',
  strokeW: 0,
  shadow: 'rgba(0, 0, 0, 0.55)',
  shadowDy: 0,
  align: 'center',
  baseline: 'middle'
};

const RIBBON_TEXT_OPTS = {
  stroke: '#0b1530',
  strokeW: 5,
  shadow: 'rgba(0, 0, 0, 0.55)',
  shadowDy: 2,
  align: 'center',
  baseline: 'middle'
};

function roundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export function outlinedText(ctx, text, x, y, size, weight, fill, opts = null) {
  const stroke = (opts && opts.stroke) || DEFAULT_TEXT_OPTS.stroke;
  const strokeW = (opts && opts.strokeW) || Math.max(3, size * 0.16);
  const shadow = (opts && opts.shadow) || DEFAULT_TEXT_OPTS.shadow;
  const shadowDy = (opts && opts.shadowDy) || Math.max(2, size * 0.08);
  const align = (opts && opts.align) || DEFAULT_TEXT_OPTS.align;
  const baseline = (opts && opts.baseline) || DEFAULT_TEXT_OPTS.baseline;

  ctx.font = `${weight} ${size}px ${UI_FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  // 1. Bóng = strokeText + fillText màu shadow lệch shadowDy xuống
  ctx.strokeStyle = shadow;
  ctx.lineWidth = strokeW;
  ctx.strokeText(text, x, y + shadowDy);
  ctx.fillStyle = shadow;
  ctx.fillText(text, x, y + shadowDy);

  // 2. strokeText viền
  ctx.strokeStyle = stroke;
  ctx.lineWidth = strokeW;
  ctx.strokeText(text, x, y);

  // 3. fillText màu chính
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

export function pill(ctx, x, y, w, h, fill, border = null, borderW = 0) {
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + r, r, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (border && borderW > 0) {
    ctx.strokeStyle = border;
    ctx.lineWidth = borderW;
    ctx.stroke();
  }
}

export function button3d(ctx, cx, cy, w, h, label, size, scale = 1, enabled = true) {
  ctx.save();
  ctx.translate(cx, cy);
  if (scale !== 1) {
    ctx.scale(scale, scale);
  }

  const halfW = w / 2;
  const halfH = h / 2;
  const x = -halfW;
  const y = -halfH;

  const bodyFill = enabled ? '#22c55e' : '#64748b';
  const edgeFill = enabled ? '#15803d' : '#334155';
  const textFill = enabled ? '#06301a' : '#1e293b';

  // 1. Cạnh dưới lệch xuống 8 px
  pill(ctx, x, y + 8, w, h, edgeFill, '#0b1530', 4);

  // 2. Thân nút
  pill(ctx, x, y, w, h, bodyFill, '#0b1530', 4);

  // 3. Chữ không viền
  ctx.font = `800 ${size}px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textFill;
  ctx.fillText(label, 0, 0);

  ctx.restore();
}

export function card(ctx, x, y, w, h, border = '#ef4444') {
  // 1. Bóng khối lệch 8 px xuống
  roundedRectPath(ctx, x, y + 8, w, h, 28);
  ctx.fillStyle = '#0b1530';
  ctx.fill();

  // 2. Thân card + viền
  roundedRectPath(ctx, x, y, w, h, 28);
  ctx.fillStyle = '#0f1a3a';
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 4;
  ctx.stroke();
}

export function ribbon(ctx, cx, cy, text, size, bg = '#ef4444', fg = '#ffffff') {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-2 * Math.PI / 180);

  ctx.font = `800 ${size}px ${UI_FONT}`;
  const textW = ctx.measureText(text).width;
  const w = textW + 48;
  const h = size * 1.45;
  const rx = -w / 2;
  const ry = -h / 2;

  // 1. Bóng khối lệch 5 px xuống
  roundedRectPath(ctx, rx, ry + 5, w, h, 14);
  ctx.fillStyle = '#0b1530';
  ctx.fill();

  // 2. Thân ribbon + viền
  roundedRectPath(ctx, rx, ry, w, h, 14);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = '#0b1530';
  ctx.lineWidth = 4;
  ctx.stroke();

  // 3. Chữ outlinedText
  outlinedText(ctx, text, 0, 0, size, 800, fg, RIBBON_TEXT_OPTS);

  ctx.restore();
}

export function crown(ctx, cx, cy, s, color = '#fbbf24') {
  ctx.save();
  ctx.translate(cx, cy);

  const hw = (s * 1.3) / 2;
  const hh = s / 2;

  ctx.beginPath();
  ctx.moveTo(-hw, hh);
  ctx.lineTo(hw, hh);
  ctx.lineTo(hw, -hh * 0.7);
  ctx.lineTo(hw * 0.45, hh * 0.1);
  ctx.lineTo(0, -hh * 1.15);
  ctx.lineTo(-hw * 0.45, hh * 0.1);
  ctx.lineTo(-hw, -hh * 0.7);
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#0b1530';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // 3 chấm ngọc trên đỉnh 3 răng
  const dotR = Math.max(1.8, s * 0.12);
  ctx.fillStyle = '#ffffff';

  ctx.beginPath();
  ctx.arc(0, -hh * 1.15, dotR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(-hw, -hh * 0.7, dotR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(hw, -hh * 0.7, dotR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

export function arrowIcon(ctx, cx, cy, r, kind) {
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (kind === 'lr') {
    // Mũi tên 2 đầu trái - phải
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.65, cy);
    ctx.lineTo(cx + r * 0.65, cy);

    // Đầu trái
    ctx.moveTo(cx - r * 0.3, cy - r * 0.38);
    ctx.lineTo(cx - r * 0.65, cy);
    ctx.lineTo(cx - r * 0.3, cy + r * 0.38);

    // Đầu phải
    ctx.moveTo(cx + r * 0.3, cy - r * 0.38);
    ctx.lineTo(cx + r * 0.65, cy);
    ctx.lineTo(cx + r * 0.3, cy + r * 0.38);
    ctx.stroke();
  } else if (kind === 'up') {
    // Mũi tên lên
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.55);
    ctx.lineTo(cx, cy - r * 0.55);
    ctx.moveTo(cx - r * 0.45, cy - r * 0.15);
    ctx.lineTo(cx, cy - r * 0.55);
    ctx.lineTo(cx + r * 0.45, cy - r * 0.15);
    ctx.stroke();
  } else if (kind === 'down') {
    // Mũi tên xuống
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.55);
    ctx.lineTo(cx, cy + r * 0.55);
    ctx.moveTo(cx - r * 0.45, cy + r * 0.15);
    ctx.lineTo(cx, cy + r * 0.55);
    ctx.lineTo(cx + r * 0.45, cy + r * 0.15);
    ctx.stroke();
  }

  ctx.restore();
}
