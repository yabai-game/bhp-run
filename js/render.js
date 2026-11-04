import {
  VIEW_W,
  VIEW_H,
  DRAW_DIST,
  PROP_PX_PER_M,
  ITEM_TYPES,
  UI_FONT
} from './config.js';
import { project, laneX, cameraX } from './track.js';
import {
  teoAnim,
  policeAnim,
  policeZ,
  policeX,
  spriteScale,
  frameIndex,
  propFrameKey,
  sidePropFrameKey,
  itemBottomY
} from './anim.js';
import { createProps } from './props.js';
import { createBackground } from './background.js';
import { quipFor, wrapText } from './quips.js';
import { billboardSlots } from './brand.js';
import {
  initBrandArt,
  updateBrandLogo,
  getTokenCanvas,
  getBillboardCanvas,
  isTokenReady,
  isBillboardReady
} from './brandart.js';
import { HUD, fitFontSize, formatScore, meterColor } from './hudlayout.js';
import {
  outlinedText,
  pill,
  button3d,
  card,
  ribbon,
  crown,
  arrowIcon
} from './ui.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const props = createProps();
  const bg = createBackground();
  let animTime = 0;

  // Danh sách phần tử vẽ tái sử dụng trong vòng lặp chính
  const renderList = [];
  const playerRenderItem = { kind: 'player', x: 0, y: 0, z: 0, sliding: false, airborne: false };
  const policeRenderItem = { kind: 'police', x: 0, y: 0, z: 0 };

  // Bộ cấp phát tĩnh cho đồ bên đường
  const sidePropsPool = [];
  for (let i = 0; i < 36; i++) {
    sidePropsPool.push({ kind: 'sideProp', propType: 'lamp', x: 0, z: 0 });
  }

  // Bộ cấp phát tĩnh 3 đối tượng cho biển quảng cáo YABAI bên đường
  const brandBoardsPool = [
    { kind: 'brandBoard', x: 0, z: 0 },
    { kind: 'brandBoard', x: 0, z: 0 },
    { kind: 'brandBoard', x: 0, z: 0 }
  ];
  const billboardSlotsOut = [];
  let drawnBoardsCount = 0;

  const lastAnim = {
    teo: { name: 'run', frame: 0 },
    police: { name: 'run', frame: 0 }
  };

  let shakeT = 0;
  let hitFlashT = 0;

  // Pool 12 phần tử tĩnh cho điểm bay (+N)
  const floatScoresPool = [];
  for (let i = 0; i < 12; i++) {
    floatScoresPool.push({ active: false, text: '', x: 0, y: 0, t: 0, colorPrefix: 'rgba(253, 224, 71,' });
  }

  function spawnFloatingScore(text, x, y, isYabai = false) {
    let slot = floatScoresPool.find(f => !f.active);
    if (!slot) {
      slot = floatScoresPool.reduce((oldest, item) => (item.t > oldest.t ? item : oldest), floatScoresPool[0]);
    }
    slot.active = true;
    slot.text = text;
    slot.x = x;
    slot.y = y;
    slot.t = 0;
    slot.colorPrefix = isYabai ? 'rgba(251, 191, 36,' : 'rgba(253, 224, 71,';
  }

  let lastCamX = 0;

  function onEvent(ev) {
    if (!ev) return;
    if (ev.type === 'hit') {
      shakeT = 0.25;
      hitFlashT = 0.25;
    } else if (ev.type === 'pickup') {
      const lane = ev.lane !== undefined ? ev.lane : 1;
      const p = project(laneX(lane), 0.5, 0, lastCamX);
      if (ev.item === 'YABAI') {
        spawnFloatingScore('+100 YABAI!', p.sx, p.sy, true);
      } else {
        const pts = ITEM_TYPES[ev.item] ? ITEM_TYPES[ev.item].points : 10;
        spawnFloatingScore(`+${pts}`, p.sx, p.sy, false);
      }
    }
  }

  let defaultBrandLogo = null;
  function setBrandLogo(img) {
    defaultBrandLogo = img;
    updateBrandLogo(img);
    bg.setBrandLogo(img);
  }

  function render(state, bestScore = 0, sprites = null, fps = null, loading = false, dt = 1 / 60, brandLogo = null, isNewBest = false) {
    const camX = cameraX(state.player.x);
    lastCamX = camX;
    const delta = typeof dt === 'number' && dt > 0 ? dt : 1 / 60;
    animTime += delta;
    const activeLogo = brandLogo || defaultBrandLogo;
    // Kích hoạt làm mịn ảnh chất lượng cao
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (state.phase === 'ready') {
      shakeT = 0;
      hitFlashT = 0;
      for (let i = 0; i < floatScoresPool.length; i++) {
        floatScoresPool[i].active = false;
      }
    } else {
      const delta = typeof dt === 'number' && dt > 0 ? dt : 1 / 60;
      if (shakeT > 0) shakeT = Math.max(0, shakeT - delta);
      if (hitFlashT > 0) hitFlashT = Math.max(0, hitFlashT - delta);

      for (let i = 0; i < floatScoresPool.length; i++) {
        const f = floatScoresPool[i];
        if (f.active) {
          f.t += delta;
          if (f.t >= 0.6) {
            f.active = false;
          }
        }
      }
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reducedMotion = Boolean(prefersReducedMotion);

    const isShaking = shakeT > 0 && !prefersReducedMotion;
    if (isShaking) {
      const amp = 6 * (shakeT / 0.25);
      const shakeX = (Math.random() * 2 - 1) * amp;
      const shakeY = (Math.random() * 2 - 1) * amp;
      ctx.save();
      ctx.translate(shakeX, shakeY);
    }

    // 1. Vẽ bầu trời và mặt đường Tokyo đêm
    bg.renderSkyAndBackground(ctx, state);

    // 2. Thu thập và sắp xếp vật thể
    renderList.length = 0;

    // Đồ bên đường (cột đèn & cặp đèn lồng đỏ xen kẽ mỗi 8m)
    let sidePropIdx = 0;
    const sidePhase = state.distance % 8;
    for (let k = 0; k <= 15; k++) {
      const z = k * 8 - sidePhase;
      if (z > -2 && z < DRAW_DIST) {
        const propType = (k % 2 === 0) ? 'lamp' : 'lanterns';

        const pLeft = sidePropsPool[sidePropIdx++];
        pLeft.propType = propType;
        pLeft.x = -4.65;
        pLeft.z = z;
        renderList.push(pLeft);

        const pRight = sidePropsPool[sidePropIdx++];
        pRight.propType = propType;
        pRight.x = 4.65;
        pRight.z = z;
        renderList.push(pRight);
      }
    }

    // Biển quảng cáo YABAI bên đường (nếu logo đã nạp thành công)
    drawnBoardsCount = 0;
    const bCanvas = getBillboardCanvas();
    if (bCanvas) {
      billboardSlots(state.distance, billboardSlotsOut);
      for (let i = 0; i < billboardSlotsOut.length && i < brandBoardsPool.length; i++) {
        const slot = billboardSlotsOut[i];
        const bb = brandBoardsPool[i];
        bb.x = slot.x;
        bb.z = slot.z;
        renderList.push(bb);
        drawnBoardsCount++;
      }
    }

    // Chướng ngại & Đồ nhặt
    for (let i = 0; i < state.objects.length; i++) {
      const obj = state.objects[i];
      if (obj.z > -2 && obj.z < DRAW_DIST) {
        if (obj.kind === 'item' && obj.taken) continue;
        renderList.push(obj);
      }
    }

    // Tèo
    playerRenderItem.x = state.player.x;
    playerRenderItem.y = state.player.y;
    playerRenderItem.z = 0;
    playerRenderItem.sliding = state.player.sliding;
    playerRenderItem.airborne = state.player.airborne;
    renderList.push(playerRenderItem);

    // Cảnh sát
    policeRenderItem.x = policeX(state.player);
    policeRenderItem.y = 0;
    policeRenderItem.z = policeZ(state.meter);
    renderList.push(policeRenderItem);

    // Sắp xếp z giảm dần (xa vẽ trước, gần vẽ sau)
    renderList.sort((a, b) => b.z - a.z);

    // 3. Vẽ từng vật thể theo thứ tự chiều sâu
    const hasPropSprites = Boolean(sprites && sprites.props && sprites.props.data);

    function drawPropSprite(key, x, y, z) {
      if (!hasPropSprites) return;
      const f = sprites.props.data.frames[key];
      if (!f) return;
      const p = project(x, y, z, camX);
      const k = p.scale / (sprites.props.data.pxPerMeter || 128);
      ctx.drawImage(
        sprites.props.img,
        f.x, f.y, f.w, f.h,
        p.sx - f.anchor[0] * k,
        p.sy - f.anchor[1] * k,
        f.w * k,
        f.h * k
      );
    }

    for (let i = 0; i < renderList.length; i++) {
      const item = renderList[i];

      if (item.kind === 'brandBoard') {
        const bCanvas = getBillboardCanvas();
        if (bCanvas) {
          const p = project(item.x, 0, item.z, camX);
          const k = p.scale / PROP_PX_PER_M;
          const w = bCanvas.width * k;
          const h = bCanvas.height * k;
          ctx.drawImage(bCanvas, p.sx - w / 2, p.sy - h, w, h);
        }
      } else if (item.kind === 'sideProp') {
        if (hasPropSprites) {
          const sideSign = item.x < 0 ? -1 : 1;
          const key = sidePropFrameKey(item.propType, sideSign);
          drawPropSprite(key, item.x, 0, item.z);
        } else {
          const p = project(item.x, 0, item.z, camX);
          const k = p.scale / PROP_PX_PER_M;
          const c = item.propType === 'lamp' ? props.lamp : props.lanterns;
          const w = c.w * k;
          const h = c.h * k;
          ctx.drawImage(c.canvas, p.sx - w / 2, p.sy - h, w, h);
        }
      } else if (item.kind === 'obstacle') {
        const ox = laneX(item.lane);
        const oz = item.z;
        const p = project(ox, 0, oz, camX);

        if (hasPropSprites) {
          const key = propFrameKey(item);
          const wMeters = (sprites.props.data.sizesMeters && sprites.props.data.sizesMeters[key])
            ? sprites.props.data.sizesMeters[key][0]
            : 2.0;

          // Bóng chướng ngại (vẽ trước vật): ellipse tại project(laneX, 0, z), bán kính 0.55 * rộng × 0.18 m × p.scale
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.beginPath();
          ctx.ellipse(p.sx, p.sy, 0.55 * wMeters * p.scale, 0.18 * p.scale, 0, 0, Math.PI * 2);
          ctx.fill();

          drawPropSprite(key, ox, 0, oz);
        } else {
          const k = p.scale / PROP_PX_PER_M;

          if (item.type === 'GATE') {
            const c = props.gate;
            const w = c.w * k;
            const h = c.h * k;
            ctx.drawImage(c.canvas, p.sx - w / 2, p.sy - h, w, h);
          } else if (item.type === 'BARRIER') {
            const c = props.barrier;
            const w = c.w * k;
            const h = c.h * k;
            const left = p.sx - w / 2;
            const top = p.sy - h;
            ctx.drawImage(c.canvas, left, top, w, h);

            // Đèn cam nhấp nháy trên đỉnh cột trái
            if (Math.floor(state.time * 3) % 2 === 0) {
              const lx = left + 48 * k;
              const ly = top + 10 * k;
              const r = Math.max(2, 6 * k);
              ctx.fillStyle = '#f97316';
              ctx.beginPath();
              ctx.arc(lx, ly, r, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = 'rgba(249, 115, 22, 0.4)';
              ctx.beginPath();
              ctx.arc(lx, ly, r * 2, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (item.type === 'VENDING') {
            const c = props.vendings[item.lane] || props.vendings[0];
            const w = c.w * k;
            const h = c.h * k;
            ctx.drawImage(c.canvas, p.sx - w / 2, p.sy - h, w, h);
          }
        }
      } else if (item.kind === 'item') {
        const ix = laneX(item.lane);
        const iz = item.z;

        // Bóng nhỏ dưới đất
        const pGnd = project(ix, 0, iz, camX);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(pGnd.sx, pGnd.sy, 0.25 * pGnd.scale, 0.08 * pGnd.scale, 0, 0, Math.PI * 2);
        ctx.fill();

        if (item.item === 'YABAI') {
          const tCanvas = getTokenCanvas();
          const iy = itemBottomY(state.time, iz);
          const p = project(ix, iy, iz, camX);
          const rScreen = 0.3 * p.scale; // YABAI_TOKEN_M = 0.6 m -> r = 0.3 m
          const cx = p.sx;
          const cy = p.sy - rScreen; // tâm huy hiệu

          // Quầng vàng sau lưng = 1 hình tròn rgba(251,191,36,0.25) bán kính 1.35 * r
          ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
          ctx.beginPath();
          ctx.arc(cx, cy, 1.35 * rScreen, 0, Math.PI * 2);
          ctx.fill();

          // Xoay: chiều ngang nhân max(0.2, |cos(time * 3 + z)|)
          const spin = Math.max(0.2, Math.abs(Math.cos(state.time * 3 + iz)));
          const w = 2 * rScreen * spin;
          const h = 2 * rScreen;
          ctx.drawImage(tCanvas, cx - w / 2, cy - h / 2, w, h);
        } else if (hasPropSprites) {
          const key = propFrameKey(item);
          const iy = itemBottomY(state.time, iz);
          drawPropSprite(key, ix, iy, iz);
        } else {
          // Đồ nhặt lơ lửng fallback
          const iy = 0.5 + 0.08 * Math.sin(state.time * 4 + iz);
          const p = project(ix, iy, iz, camX);
          const k = p.scale / PROP_PX_PER_M;

          let c = props.onigiri;
          if (item.item === 'TICKET') c = props.ticket;
          else if (item.item === 'SUIKA') c = props.suika;
          else if (item.item === 'SALARY') c = props.salary;

          const w = c.w * k;
          const h = c.h * k;
          ctx.drawImage(c.canvas, p.sx - w / 2, p.sy - h / 2, w, h);
        }
      } else if (item.kind === 'player') {
        // Bóng của Tèo
        const pGnd = project(item.x, 0, 0, camX);
        const alpha = 0.35 * (1 - Math.min(item.y / 1.2, 0.6));
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(pGnd.sx, pGnd.sy, 0.45 * pGnd.scale, 0.16 * pGnd.scale, 0, 0, Math.PI * 2);
        ctx.fill();

        if (sprites && sprites.teo) {
          const anim = teoAnim(state);
          const aData = sprites.teo.data.animations[anim.name];
          const fIdx = frameIndex(aData.frames.length, anim.u, anim.loop);
          const fKey = aData.frames[fIdx];
          const f = sprites.teo.data.frames[fKey];
          const p = project(item.x, item.y, 0, camX);
          const k = spriteScale(p.scale);
          const [ax, ay] = sprites.teo.data.anchor;
          ctx.drawImage(sprites.teo.img, f.x, f.y, f.w, f.h, p.sx - ax * k, p.sy - ay * k, f.w * k, f.h * k);

          lastAnim.teo.name = anim.name;
          lastAnim.teo.frame = fIdx;
        } else {
          // Khối màu dự phòng G00
          const py = item.y;
          const pHeight = item.sliding ? 0.9 : 1.8;
          const pBot = project(item.x, py, 0, camX);
          const pTop = project(item.x, py + pHeight, 0, camX);
          const scale = pBot.scale;
          const w = 1.2 * scale;
          const h = pBot.sy - pTop.sy;
          const left = pBot.sx - w / 2;
          const top = pTop.sy;

          ctx.fillStyle = state.stumbleT > 0 ? '#fb923c' : '#ea580c';
          ctx.fillRect(left, top, w, h);
          ctx.strokeStyle = '#c2410c';
          ctx.lineWidth = Math.max(2, scale * 0.05);
          ctx.strokeRect(left, top, w, h);

          ctx.fillStyle = '#ffffff';
          ctx.font = `700 ${Math.max(16, Math.round(scale * 0.35))}px ${UI_FONT}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('TÈO', pBot.sx, top + h / 2);

          lastAnim.teo.name = 'fallback';
          lastAnim.teo.frame = 0;
        }
      } else if (item.kind === 'police') {
        // Bóng của cảnh sát
        const pGnd = project(item.x, 0, item.z, camX);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(pGnd.sx, pGnd.sy, 0.45 * pGnd.scale, 0.16 * pGnd.scale, 0, 0, Math.PI * 2);
        ctx.fill();

        if (sprites && sprites.police) {
          const anim = policeAnim(state);
          const aData = sprites.police.data.animations[anim.name];
          const fIdx = frameIndex(aData.frames.length, anim.u, anim.loop);
          const fKey = aData.frames[fIdx];
          const f = sprites.police.data.frames[fKey];
          const p = project(item.x, item.y, item.z, camX);
          const k = spriteScale(p.scale);
          const [ax, ay] = sprites.police.data.anchor;
          ctx.drawImage(sprites.police.img, f.x, f.y, f.w, f.h, p.sx - ax * k, p.sy - ay * k, f.w * k, f.h * k);

          lastAnim.police.name = anim.name;
          lastAnim.police.frame = fIdx;
        } else {
          // Khối màu dự phòng G00
          const pBot = project(item.x, item.y, item.z, camX);
          const pTop = project(item.x, item.y + 1.8, item.z, camX);
          const scale = pBot.scale;
          const w = 1.5 * scale;
          const h = pBot.sy - pTop.sy;
          const left = pBot.sx - w / 2;
          const top = pTop.sy;

          ctx.fillStyle = '#1d4ed8';
          ctx.fillRect(left, top, w, h);
          ctx.strokeStyle = '#1e40af';
          ctx.lineWidth = Math.max(2, scale * 0.05);
          ctx.strokeRect(left, top, w, h);

          ctx.fillStyle = '#ffffff';
          ctx.font = `700 ${Math.max(16, Math.round(scale * 0.3))}px ${UI_FONT}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('CẢNH SÁT', pBot.sx, top + h / 2);

          lastAnim.police.name = 'fallback';
          lastAnim.police.frame = 0;
        }
      }
    }

    // 4. Sương xa chân trời
    bg.renderFarFog(ctx);

    // Điểm bay (+N)
    for (let i = 0; i < floatScoresPool.length; i++) {
      const f = floatScoresPool[i];
      if (f.active) {
        const progress = f.t / 0.6;
        const curY = f.y - progress * 60;
        const isYabai = f.text.includes('YABAI');
        const color = isYabai ? '#fbbf24' : '#fde047';
        const size = isYabai ? 32 : 30;
        outlinedText(ctx, f.text, f.x, curY, size, 800, color);
      }
    }

    if (isShaking) {
      ctx.restore();
    }

    // 5. HUD khi chạy (running)
    if (state.phase === 'running') {
      // 1. Quãng đường (distance pill)
      pill(ctx, HUD.distance.x, HUD.distance.y, HUD.distance.w, HUD.distance.h, 'rgba(11, 21, 48, 0.88)', '#fbbf24', 3);
      const distStr = `${Math.floor(state.distance)} m`;
      const distSize = fitFontSize(distStr, HUD.distance.w - 24, 28, 16, (t, s) => {
        ctx.font = `800 ${s}px ${UI_FONT}`;
        return ctx.measureText(t).width;
      });
      outlinedText(ctx, distStr, HUD.distance.x + HUD.distance.w / 2, HUD.distance.y + HUD.distance.h / 2, distSize, 800, '#ffffff');

      // 2. Điểm số (score)
      const scoreStr = formatScore(state.score);
      const scoreSize = fitFontSize(scoreStr, HUD.score.w, 48, 28, (t, s) => {
        ctx.font = `800 ${s}px ${UI_FONT}`;
        return ctx.measureText(t).width;
      });
      outlinedText(ctx, scoreStr, HUD.score.x + HUD.score.w / 2, HUD.score.y + HUD.score.h / 2, scoreSize, 800, '#ffffff');

      // 3. Kỷ lục (best pill)
      pill(ctx, HUD.best.x, HUD.best.y, HUD.best.w, HUD.best.h, 'rgba(11, 21, 48, 0.88)', '#94a3b8', 3);
      crown(ctx, HUD.best.x + 22, HUD.best.y + HUD.best.h / 2, 20, '#fbbf24');
      const bestStr = formatScore(bestScore);
      const bestSize = fitFontSize(bestStr, HUD.best.w - 42, 26, 14, (t, s) => {
        ctx.font = `800 ${s}px ${UI_FONT}`;
        return ctx.measureText(t).width;
      });
      outlinedText(ctx, bestStr, HUD.best.x + 30 + (HUD.best.w - 30) / 2, HUD.best.y + HUD.best.h / 2, bestSize, 800, '#fbbf24');

      // 4. Thanh cảnh sát (Police Meter pill)
      const isHighMeter = state.meter >= 70;
      const altCycle = Math.floor(animTime / 0.25) % 2 === 1;
      const meterBorder = (isHighMeter && !reducedMotion && altCycle) ? '#3b82f6' : (isHighMeter ? '#ef4444' : '#0b1530');

      pill(ctx, HUD.meter.x, HUD.meter.y, HUD.meter.w, HUD.meter.h, 'rgba(11, 21, 48, 0.88)');

      ctx.save();
      const mr = HUD.meter.h / 2;
      ctx.beginPath();
      ctx.moveTo(HUD.meter.x + mr, HUD.meter.y);
      ctx.lineTo(HUD.meter.x + HUD.meter.w - mr, HUD.meter.y);
      ctx.arc(HUD.meter.x + HUD.meter.w - mr, HUD.meter.y + mr, mr, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(HUD.meter.x + mr, HUD.meter.y + HUD.meter.h);
      ctx.arc(HUD.meter.x + mr, HUD.meter.y + mr, mr, Math.PI / 2, -Math.PI / 2);
      ctx.closePath();
      ctx.clip();

      const fillRatio = Math.min(1, Math.max(0, state.meter / 100));
      ctx.fillStyle = meterColor(state.meter);
      ctx.fillRect(HUD.meter.x, HUD.meter.y, HUD.meter.w * fillRatio, HUD.meter.h);
      ctx.restore();

      pill(ctx, HUD.meter.x, HUD.meter.y, HUD.meter.w, HUD.meter.h, null, meterBorder, 3);

      ctx.beginPath();
      ctx.arc(36, HUD.meter.y + HUD.meter.h / 2, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#0b1530';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(54, HUD.meter.y + HUD.meter.h / 2, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#0b1530';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      outlinedText(ctx, `CẢNH SÁT ${Math.round(state.meter)}%`, HUD.meter.x + HUD.meter.w / 2, HUD.meter.y + HUD.meter.h / 2, 20, 800, '#ffffff');

      if (fps !== null && fps !== undefined) {
        outlinedText(ctx, `${fps} FPS`, 20, 130, 16, 700, '#22c55e', { align: 'left' });
      }
    }

    // 6. Màn Ready / Game Over
    if (state.phase === 'ready') {
      ctx.fillStyle = 'rgba(8, 12, 34, 0.45)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      const bobY = reducedMotion ? 0 : 4 * Math.sin(animTime * 2);
      outlinedText(ctx, 'BHP Run', 270, 300 + bobY, 104, 800, '#fde047', {
        stroke: '#0b1530',
        strokeW: 14,
        shadow: '#db2777',
        shadowDy: 8
      });

      const subText = 'Tèo làm BHP — cảnh sát đang đuổi, chạy đi!';
      ctx.font = `700 22px ${UI_FONT}`;
      const subMeasure = ctx.measureText(subText).width;
      if (subMeasure <= 440) {
        const subW = Math.min(480, subMeasure + 40);
        const subH = 44;
        pill(ctx, 270 - subW / 2, 384 - subH / 2, subW, subH, 'rgba(11, 21, 48, 0.88)', '#f472b6', 3);
        outlinedText(ctx, subText, 270, 384, 22, 700, '#ffffff');
      } else {
        const subLines = wrapText(subText, 440, str => ctx.measureText(str).width);
        const subH = subLines.length * 30 + 14;
        const maxLineW = Math.max(...subLines.map(l => ctx.measureText(l).width));
        const subW = Math.min(480, maxLineW + 40);
        pill(ctx, 270 - subW / 2, 384 - subH / 2, subW, subH, 'rgba(11, 21, 48, 0.88)', '#f472b6', 3);
        for (let i = 0; i < subLines.length; i++) {
          const lineY = 384 - ((subLines.length - 1) * 30) / 2 + i * 30;
          outlinedText(ctx, subLines[i], 270, lineY, 22, 700, '#ffffff');
        }
      }

      const bestStr = `KỶ LỤC ${formatScore(bestScore)}`;
      ctx.font = `800 22px ${UI_FONT}`;
      const recBadgeW = ctx.measureText(bestStr).width + 56;
      const recBadgeH = 44;
      pill(ctx, 270 - recBadgeW / 2, 470 - recBadgeH / 2, recBadgeW, recBadgeH, 'rgba(11, 21, 48, 0.88)', '#fbbf24', 3);
      crown(ctx, 270 - recBadgeW / 2 + 22, 470, 20, '#fbbf24');
      outlinedText(ctx, bestStr, 270 + 12, 470, 22, 800, '#fbbf24');

      const btnScale = reducedMotion ? 1 : (1 + 0.04 * Math.sin(animTime * 4));
      const btnLabel = loading ? 'ĐANG TẢI…' : 'CHẠM ĐỂ CHẠY';
      button3d(ctx, 270, 560, 380, 84, btnLabel, 36, btnScale, !loading);

      const chipY = 660;
      const chipR = 26;
      const chips = [
        { x: 170, kind: 'lr', label: 'Đổi làn' },
        { x: 270, kind: 'up', label: 'Nhảy' },
        { x: 370, kind: 'down', label: 'Trượt' }
      ];
      for (const chip of chips) {
        pill(ctx, chip.x - chipR, chipY - chipR, chipR * 2, chipR * 2, 'rgba(11, 21, 48, 0.88)', '#22d3ee', 3);
        arrowIcon(ctx, chip.x, chipY, 15, chip.kind);
        outlinedText(ctx, chip.label, chip.x, 712, 18, 700, '#cbd5e1');
      }

      outlinedText(ctx, 'Một game của', 270, 770, 18, 700, '#94a3b8');
      if (activeLogo && activeLogo.complete && activeLogo.naturalWidth > 0) {
        const logoW = 220;
        const logoH = logoW * (213 / 845);
        const logoX = (VIEW_W - logoW) / 2;
        const logoY = 788;
        ctx.drawImage(activeLogo, logoX, logoY, logoW, logoH);
      }

      if (fps !== null && fps !== undefined) {
        outlinedText(ctx, `${fps} FPS`, 20, 130, 16, 700, '#22c55e', { align: 'left' });
      }
    } else if (state.phase === 'caught') {
      ctx.fillStyle = 'rgba(8, 12, 34, 0.62)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      card(ctx, 40, 200, 460, 580, '#ef4444');
      ribbon(ctx, 270, 200, 'BỊ TÓM!', 44, '#ef4444', '#ffffff');

      const reasonText = state.caughtReason === 'meter' ? 'Cảnh sát bắt kịp rồi.' : 'Vấp hai lần liên tiếp.';
      outlinedText(ctx, reasonText, 270, 268, 24, 700, '#fca5a5');

      const quipText = quipFor(state.seed);
      ctx.font = `600 24px ${UI_FONT}`;
      const quipLines = wrapText(quipText, 360, str => ctx.measureText(str).width);
      const quipBoxH = quipLines.length <= 1 ? 64 : 96;

      ctx.beginPath();
      const qx = 72;
      const qy = 296;
      const qw = 396;
      const qh = quipBoxH;
      const qr = 18;
      ctx.moveTo(qx + qr, qy);
      ctx.lineTo(qx + qw - qr, qy);
      ctx.arcTo(qx + qw, qy, qx + qw, qy + qr, qr);
      ctx.lineTo(qx + qw, qy + qh - qr);
      ctx.arcTo(qx + qw, qy + qh, qx + qw - qr, qy + qh, qr);
      ctx.lineTo(qx + qr, qy + qh);
      ctx.arcTo(qx, qy + qh, qx, qy + qh - qr, qr);
      ctx.lineTo(qx, qy + qr);
      ctx.arcTo(qx, qy, qx + qr, qy, qr);
      ctx.closePath();
      ctx.fillStyle = '#1e2a52';
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (quipLines.length === 1) {
        ctx.fillText(quipLines[0], 270, qy + qh / 2);
      } else {
        ctx.fillText(quipLines[0], 270, qy + 16 + 16);
        ctx.fillText(quipLines[1], 270, qy + 16 + 16 + 32);
      }

      outlinedText(ctx, 'ĐIỂM', 270, 430, 20, 700, '#94a3b8');
      const scoreStr = formatScore(state.score);
      const scoreSize = fitFontSize(scoreStr, 380, 72, 44, (t, s) => {
        ctx.font = `800 ${s}px ${UI_FONT}`;
        return ctx.measureText(t).width;
      });
      outlinedText(ctx, scoreStr, 270, 488, scoreSize, 800, '#ffffff');

      if (isNewBest) {
        const newBestStr = 'KỶ LỤC MỚI!';
        ctx.font = `800 20px ${UI_FONT}`;
        const nbW = ctx.measureText(newBestStr).width + 48;
        const nbH = 40;
        pill(ctx, 270 - nbW / 2, 548 - nbH / 2, nbW, nbH, '#fbbf24', '#0b1530', 3);
        ctx.font = `800 20px ${UI_FONT}`;
        ctx.fillStyle = '#3b2603';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(newBestStr, 270, 548);
      } else {
        const bestStr = `Kỷ lục: ${formatScore(bestScore)}`;
        ctx.font = `700 22px ${UI_FONT}`;
        const bW = ctx.measureText(bestStr).width + 56;
        const bH = 40;
        pill(ctx, 270 - bW / 2, 548 - bH / 2, bW, bH, 'rgba(11, 21, 48, 0.88)', '#fbbf24', 3);
        crown(ctx, 270 - bW / 2 + 22, 548, 18, '#fbbf24');
        outlinedText(ctx, bestStr, 270 + 12, 548, 22, 700, '#fbbf24');
      }

      const restartEnabled = state.restartLockT <= 0;
      button3d(ctx, 270, 640, 380, 80, 'CHẠY LẠI', 34, 1, restartEnabled);

      if (activeLogo && activeLogo.complete && activeLogo.naturalWidth > 0) {
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = 0.85;
        const logoW = 150;
        const logoH = logoW * (213 / 845);
        const logoX = (VIEW_W - logoW) / 2;
        const logoY = 708;
        ctx.drawImage(activeLogo, logoX, logoY, logoW, logoH);
        ctx.globalAlpha = prevAlpha;
      }

      if (fps !== null && fps !== undefined) {
        outlinedText(ctx, `${fps} FPS`, 20, 130, 16, 700, '#22c55e', { align: 'left' });
      }
    }

    // Viền đỏ mờ khi vấp chướng ngại
    if (hitFlashT > 0) {
      const flashAlpha = 0.25 * (hitFlashT / 0.25);
      ctx.strokeStyle = `rgba(239, 68, 68, ${flashAlpha.toFixed(2)})`;
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, VIEW_W - 8, VIEW_H - 8);
    }
  }

  return {
    render,
    lastAnim,
    onEvent,
    setBrandLogo,
    get drawnBoardsCount() {
      return drawnBoardsCount;
    },
    get isTokenReady() {
      return isTokenReady();
    },
    get hasSkylineSign() {
      return bg.hasSkylineSign;
    }
  };
}
