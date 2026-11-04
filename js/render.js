import {
  VIEW_W,
  VIEW_H,
  DRAW_DIST,
  PROP_PX_PER_M,
  ITEM_TYPES
} from './config.js';
import { project, laneX } from './track.js';
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

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const props = createProps();
  const bg = createBackground();

  // Danh sách phần tử vẽ tái sử dụng trong vòng lặp chính
  const renderList = [];
  const playerRenderItem = { kind: 'player', x: 0, y: 0, z: 0, sliding: false, airborne: false };
  const policeRenderItem = { kind: 'police', x: 0, y: 0, z: 0 };

  // Bộ cấp phát tĩnh cho đồ bên đường
  const sidePropsPool = [];
  for (let i = 0; i < 36; i++) {
    sidePropsPool.push({ kind: 'sideProp', propType: 'lamp', x: 0, z: 0 });
  }

  const lastAnim = {
    teo: { name: 'run', frame: 0 },
    police: { name: 'run', frame: 0 }
  };

  let shakeT = 0;
  let hitFlashT = 0;

  // Pool 12 phần tử tĩnh cho điểm bay (+N)
  const floatScoresPool = [];
  for (let i = 0; i < 12; i++) {
    floatScoresPool.push({ active: false, text: '', x: 0, y: 0, t: 0 });
  }

  function spawnFloatingScore(text, x, y) {
    let slot = floatScoresPool.find(f => !f.active);
    if (!slot) {
      slot = floatScoresPool.reduce((oldest, item) => (item.t > oldest.t ? item : oldest), floatScoresPool[0]);
    }
    slot.active = true;
    slot.text = text;
    slot.x = x;
    slot.y = y;
    slot.t = 0;
  }

  function onEvent(ev) {
    if (!ev) return;
    if (ev.type === 'hit') {
      shakeT = 0.25;
      hitFlashT = 0.25;
    } else if (ev.type === 'pickup') {
      const pts = ITEM_TYPES[ev.item] ? ITEM_TYPES[ev.item].points : 10;
      const lane = ev.lane !== undefined ? ev.lane : 1;
      const p = project(laneX(lane), 0.5, 0);
      spawnFloatingScore(`+${pts}`, p.sx, p.sy);
    }
  }

  let defaultBrandLogo = null;
  function setBrandLogo(img) {
    defaultBrandLogo = img;
  }

  function render(state, bestScore = 0, sprites = null, fps = null, loading = false, dt = 1 / 60, brandLogo = null) {
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
      const p = project(x, y, z);
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

      if (item.kind === 'sideProp') {
        if (hasPropSprites) {
          const sideSign = item.x < 0 ? -1 : 1;
          const key = sidePropFrameKey(item.propType, sideSign);
          drawPropSprite(key, item.x, 0, item.z);
        } else {
          const p = project(item.x, 0, item.z);
          const k = p.scale / PROP_PX_PER_M;
          const c = item.propType === 'lamp' ? props.lamp : props.lanterns;
          const w = c.w * k;
          const h = c.h * k;
          ctx.drawImage(c.canvas, p.sx - w / 2, p.sy - h, w, h);
        }
      } else if (item.kind === 'obstacle') {
        const ox = laneX(item.lane);
        const oz = item.z;
        const p = project(ox, 0, oz);

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
        const pGnd = project(ix, 0, iz);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(pGnd.sx, pGnd.sy, 0.25 * pGnd.scale, 0.08 * pGnd.scale, 0, 0, Math.PI * 2);
        ctx.fill();

        if (hasPropSprites) {
          const key = propFrameKey(item);
          const iy = itemBottomY(state.time, iz);
          drawPropSprite(key, ix, iy, iz);
        } else {
          // Đồ nhặt lơ lửng fallback
          const iy = 0.5 + 0.08 * Math.sin(state.time * 4 + iz);
          const p = project(ix, iy, iz);
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
        const pGnd = project(item.x, 0, 0);
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
          const p = project(item.x, item.y, 0);
          const k = spriteScale(p.scale);
          const [ax, ay] = sprites.teo.data.anchor;
          ctx.drawImage(sprites.teo.img, f.x, f.y, f.w, f.h, p.sx - ax * k, p.sy - ay * k, f.w * k, f.h * k);

          lastAnim.teo.name = anim.name;
          lastAnim.teo.frame = fIdx;
        } else {
          // Khối màu dự phòng G00
          const py = item.y;
          const pHeight = item.sliding ? 0.9 : 1.8;
          const pBot = project(item.x, py, 0);
          const pTop = project(item.x, py + pHeight, 0);
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
          ctx.font = `bold ${Math.max(16, scale * 0.35)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('TÈO', pBot.sx, top + h / 2);

          lastAnim.teo.name = 'fallback';
          lastAnim.teo.frame = 0;
        }
      } else if (item.kind === 'police') {
        // Bóng của cảnh sát
        const pGnd = project(item.x, 0, item.z);
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
          const p = project(item.x, item.y, item.z);
          const k = spriteScale(p.scale);
          const [ax, ay] = sprites.police.data.anchor;
          ctx.drawImage(sprites.police.img, f.x, f.y, f.w, f.h, p.sx - ax * k, p.sy - ay * k, f.w * k, f.h * k);

          lastAnim.police.name = anim.name;
          lastAnim.police.frame = fIdx;
        } else {
          // Khối màu dự phòng G00
          const pBot = project(item.x, item.y, item.z);
          const pTop = project(item.x, item.y + 1.8, item.z);
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
          ctx.font = `bold ${Math.max(16, scale * 0.3)}px system-ui, sans-serif`;
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
    ctx.save();
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < floatScoresPool.length; i++) {
      const f = floatScoresPool[i];
      if (f.active) {
        const progress = f.t / 0.6;
        const alpha = Math.max(0, 1 - progress);
        const curY = f.y - progress * 60;
        ctx.fillStyle = `rgba(253, 224, 71, ${alpha.toFixed(2)})`;
        ctx.fillText(f.text, f.x, curY);
      }
    }
    ctx.restore();

    if (isShaking) {
      ctx.restore();
    }

    // 5. HUD (y < 140, font chữ chuẩn điện thoại)
    ctx.fillStyle = 'rgba(11, 21, 48, 0.75)';
    ctx.fillRect(0, 0, VIEW_W, 135);

    // Điểm số trung tâm (44px)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText(String(state.score), 270, 10);

    // Mét và Kỷ lục (28px)
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.floor(state.distance)} m`, 16, 18);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`KỶ LỤC: ${bestScore}`, VIEW_W - 16, 18);

    // Thanh Police Meter
    const meterBarW = 360;
    const meterBarH = 18;
    const meterBarX = (VIEW_W - meterBarW) / 2;
    const meterBarY = 66;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(meterBarX, meterBarY, meterBarW, meterBarH);

    const fillRatio = Math.min(1, Math.max(0, state.meter / 100));
    let meterColor = '#3b82f6';
    if (fillRatio > 0.7) {
      meterColor = '#ef4444';
    } else if (fillRatio > 0.4) {
      meterColor = '#f59e0b';
    }

    ctx.fillStyle = meterColor;
    ctx.fillRect(meterBarX, meterBarY, meterBarW * fillRatio, meterBarH);

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(meterBarX, meterBarY, meterBarW, meterBarH);

    // Nhãn cảnh sát (22px)
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`CẢNH SÁT: ${Math.round(state.meter)}%`, 270, 92);

    // Hiển thị FPS khi ở chế độ debug (?debug=1)
    if (fps !== null && fps !== undefined) {
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${fps} FPS`, 16, 100);
    }

    // 6. Màn Ready / Game Over
    if (state.phase === 'ready') {
      ctx.fillStyle = 'rgba(11, 21, 48, 0.85)';
      ctx.fillRect(0, 140, VIEW_W, VIEW_H - 140);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 52px system-ui, sans-serif';
      ctx.fillText('BHP Run', 270, 360);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillText('Tèo trốn vé tàu — chạy đi!', 270, 430);

      if (loading) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 32px system-ui, sans-serif';
        ctx.fillText('Đang tải…', 270, 520);
      } else {
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 32px system-ui, sans-serif';
        ctx.fillText('Chạm để chạy', 270, 520);
      }

      ctx.fillStyle = '#94a3b8';
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillText('Vuốt ← → đổi làn · ↑ nhảy · ↓ trượt', 270, 600);

      if (activeLogo && activeLogo.complete && activeLogo.naturalWidth > 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.fillText('Một game của', 270, 690);

        const logoW = 240;
        const logoH = logoW * (213 / 845);
        const logoX = (VIEW_W - logoW) / 2;
        const logoY = 706;
        ctx.drawImage(activeLogo, logoX, logoY, logoW, logoH);
      }
    } else if (state.phase === 'caught') {
      ctx.fillStyle = 'rgba(11, 21, 48, 0.88)';
      ctx.fillRect(0, 140, VIEW_W, VIEW_H - 140);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 52px system-ui, sans-serif';
      ctx.fillText('BỊ TÓM!', 270, 310);

      const reasonText =
        state.caughtReason === 'meter'
          ? 'Cảnh sát bắt kịp rồi.'
          : 'Vấp hai lần liên tiếp.';
      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillText(reasonText, 270, 365);

      // Câu châm biếm
      const quipText = quipFor(state.seed);
      ctx.font = '22px system-ui, sans-serif';
      ctx.fillStyle = '#e2e8f0';
      const quipLines = wrapText(quipText, 460, str => ctx.measureText(str).width);
      for (let i = 0; i < quipLines.length; i++) {
        ctx.fillText(quipLines[i], 270, 415 + i * 28);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px system-ui, sans-serif';
      ctx.fillText(`Điểm: ${state.score}`, 270, 495);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.fillText(`Kỷ lục: ${bestScore}`, 270, 545);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 28px system-ui, sans-serif';
      ctx.fillText('Chạm để chạy lại', 270, 625);

      if (activeLogo && activeLogo.complete && activeLogo.naturalWidth > 0) {
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = 0.85;
        const logoW = 150;
        const logoH = logoW * (213 / 845);
        const logoX = (VIEW_W - logoW) / 2;
        const logoY = 690;
        ctx.drawImage(activeLogo, logoX, logoY, logoW, logoH);
        ctx.globalAlpha = prevAlpha;
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

  return { render, lastAnim, onEvent, setBrandLogo };
}
