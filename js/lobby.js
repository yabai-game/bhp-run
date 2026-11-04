import {
  UI_FONT,
  LOBBY_ACTION_MIN,
  LOBBY_ACTION_MAX
} from './config.js';
import {
  CHARACTERS,
  CHARACTER_ORDER,
  isUnlocked
} from './characters.js';
import {
  LOBBY,
  progressRatio,
  nextActionDelay
} from './lobbylayout.js';
import {
  outlinedText,
  pill,
  button3d,
  card,
  ribbon,
  lockIcon,
  arrowIcon,
  chickenIcon,
  cherryBoxIcon
} from './ui.js';
import { wrapText } from './quips.js';
import { formatScore } from './hudlayout.js';
import { createRng } from './rng.js';

function roundedRect(ctx, x, y, w, h, r) {
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

export function createLobby() {
  // 1. Đèn sân khấu vẽ sẵn 1 lần lên canvas offscreen
  let spotCanvas = null;
  if (typeof document !== 'undefined') {
    spotCanvas = document.createElement('canvas');
    spotCanvas.width = 600;
    spotCanvas.height = 600;
    const spotCtx = spotCanvas.getContext('2d');
    const grad = spotCtx.createRadialGradient(300, 300, 0, 300, 300, 300);
    grad.addColorStop(0, 'rgba(253, 224, 71, 0.30)');
    grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    spotCtx.fillStyle = grad;
    spotCtx.fillRect(0, 0, 600, 600);
  }

  // 3. Nạp lười 3 atlas lobby khi mở lobby lần đầu
  const lobbyAtlases = { TEO: null, GA: null, NO: null };
  let isLoaded = false;
  let isLoading = false;

  function ensureLoaded() {
    if (isLoaded || isLoading) return;
    isLoading = true;

    const loadSingleAtlas = async (fileBase) => {
      try {
        const res = await fetch(`assets/sprites/${fileBase}.json`);
        if (!res.ok) return null;
        const data = await res.json();
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Img load err'));
          img.src = `assets/sprites/${data.image || `${fileBase}.webp`}`;
        });
        return { img, data };
      } catch {
        return null;
      }
    };

    Promise.all([
      loadSingleAtlas('lobby_teo'),
      loadSingleAtlas('lobby_ga'),
      loadSingleAtlas('lobby_no')
    ]).then(([teo, ga, no]) => {
      lobbyAtlases.TEO = teo;
      lobbyAtlases.GA = ga;
      lobbyAtlases.NO = no;
      isLoaded = true;
      isLoading = false;
    }).catch(() => {
      isLoaded = true;
      isLoading = false;
    });
  }

  // 4. Trạng thái hoạt ảnh riêng
  const rng = createRng(135792468);
  let animState = 'idle'; // 'idle' | 'action'
  let animTimer = 0;
  let actionDelay = nextActionDelay(rng());
  let curIndex = 0;
  let lastSource = 'fallback';

  function setIndex(idx) {
    if (idx !== curIndex) {
      curIndex = idx;
      animState = 'idle';
      animTimer = 0;
      actionDelay = nextActionDelay(rng());
    }
  }

  function update(dt, isReducedMotion = false) {
    animTimer += dt;
    if (isReducedMotion) {
      animState = 'idle';
      return;
    }

    if (animState === 'idle') {
      actionDelay -= dt;
      if (actionDelay <= 0) {
        animState = 'action';
        animTimer = 0;
      }
    } else if (animState === 'action') {
      if (animTimer >= 1.2) {
        animState = 'idle';
        animTimer = 0;
        actionDelay = nextActionDelay(rng());
      }
    }
  }

  function render(
    ctx,
    lobbyIndex,
    selectedCharId,
    bestScore,
    unlockAll = false,
    isReducedMotion = false,
    gameSprites = null
  ) {
    setIndex(lobbyIndex);
    const charId = CHARACTER_ORDER[lobbyIndex] || 'TEO';
    const charDef = CHARACTERS[charId];
    const unlocked = isUnlocked(charId, bestScore, unlockAll);
    const isSelected = charId === selectedCharId;

    // Nền tối phủ gần kín (trạng thái canvas có thể còn alpha / blend từ lượt vẽ trước)
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(8, 12, 34, 0.95)';
    ctx.fillRect(0, 0, 540, 960);

    // Đèn sân khấu
    if (spotCanvas) {
      ctx.drawImage(spotCanvas, 270 - 300, 260 - 300);
    }

    // Bệ nhân vật: elip tâm (270, 566) rx 170 ry 30
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(270, 566, 170, 30, 0, 0, Math.PI * 2);
    if (unlocked) {
      const podGrad = ctx.createLinearGradient(270, 536, 270, 596);
      podGrad.addColorStop(0, 'rgba(34, 211, 238, 0.55)');
      podGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
      ctx.fillStyle = podGrad;
      ctx.fill();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();

    // Nhân vật trên bệ (atlas lobby hoặc fallback chạy x2.2)
    const lobbyAtlas = lobbyAtlases[charId];
    let source = 'fallback';

    if (lobbyAtlas && lobbyAtlas.data && lobbyAtlas.img) {
      source = 'lobby';
      const anims = lobbyAtlas.data.animations || {};
      const currentAnimName = (animState === 'action' && anims.action) ? 'action' : 'idle';
      const aData = anims[currentAnimName] || anims.idle;
      const frameList = (aData && aData.frames) ? aData.frames : Object.keys(lobbyAtlas.data.frames);
      const fIdx = isReducedMotion ? 0 : Math.floor(animTimer * 12) % frameList.length;
      const fKey = frameList[fIdx];
      const f = lobbyAtlas.data.frames[fKey];
      const [ax, ay] = lobbyAtlas.data.anchor || [192, 500];

      // Nhân vật khoá vẫn hiện đủ màu (chủ kênh 2026-11-04), chỉ thêm huy hiệu ổ khoá
      ctx.drawImage(lobbyAtlas.img, f.x, f.y, f.w, f.h, 270 - ax, 566 - ay, f.w, f.h);
    } else {
      // Fallback: khung run_00 của atlas chạy phóng x2.2
      source = 'fallback';
      let runAtlas = null;
      if (charId === 'GA' && gameSprites?.gathief) {
        runAtlas = gameSprites.gathief;
      } else if (charId === 'NO' && gameSprites?.no) {
        runAtlas = gameSprites.no;
      } else if (gameSprites?.teo) {
        runAtlas = gameSprites.teo;
      }

      if (runAtlas && runAtlas.data && runAtlas.img) {
        const f = runAtlas.data.frames['run_00'] || Object.values(runAtlas.data.frames)[0];
        const [ax, ay] = runAtlas.data.anchor || [128, 204];
        const scale = 2.2;

        ctx.drawImage(
          runAtlas.img,
          f.x, f.y, f.w, f.h,
          270 - ax * scale, 566 - ay * scale,
          f.w * scale, f.h * scale
        );
        if (charId === 'NO') {
          cherryBoxIcon(ctx, 270 + 44, 566 - 150, 44);
        } else if (charId === 'GA' && runAtlas === gameSprites?.teo) {
          chickenIcon(ctx, 270 + 38, 566 - 176, 52, 0);
        }
      }
    }

    // Huy hiệu ổ khoá cho nhân vật chưa mở (nhân vật vẫn đủ màu, chỉ không chọn được)
    if (!unlocked) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(392, 196, 34, 0, Math.PI * 2);
      ctx.fillStyle = '#0f1a3a';
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
      lockIcon(ctx, 392, 198, 40);
    }
    lastSource = source;

    // 5. Nút quay lại & Ribbon tiêu đề
    const bcx = LOBBY.back.x + LOBBY.back.w / 2;
    const bcy = LOBBY.back.y + LOBBY.back.h / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(bcx, bcy, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#0f1a3a';
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.stroke();
    arrowIcon(ctx, bcx, bcy, 15, 'left');
    ctx.restore();

    ribbon(ctx, 270, 40, 'CHỌN NHÂN VẬT', 26, '#fbbf24', '#3b2603');

    // 6. Nút chuyển trang trái/phải
    pill(ctx, LOBBY.prev.x, LOBBY.prev.y, LOBBY.prev.w, LOBBY.prev.h, 'rgba(11, 21, 48, 0.88)', '#22d3ee', 3);
    arrowIcon(ctx, LOBBY.prev.x + LOBBY.prev.w / 2, LOBBY.prev.y + LOBBY.prev.h / 2, 18, 'left');

    pill(ctx, LOBBY.next.x, LOBBY.next.y, LOBBY.next.w, LOBBY.next.h, 'rgba(11, 21, 48, 0.88)', '#22d3ee', 3);
    arrowIcon(ctx, LOBBY.next.x + LOBBY.next.w / 2, LOBBY.next.y + LOBBY.next.h / 2, 18, 'right');

    // 7. Chấm trang dưới bệ tại y = 612
    for (let i = 0; i < CHARACTER_ORDER.length; i++) {
      const dotX = 270 + (i - 1) * 22;
      ctx.beginPath();
      ctx.arc(dotX, 612, 6, 0, Math.PI * 2);
      ctx.fillStyle = (i === lobbyIndex) ? '#22d3ee' : '#64748b';
      ctx.fill();
      ctx.strokeStyle = '#0b1530';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 8. Thẻ thông tin
    let cardBorder = isSelected ? '#22d3ee' : (unlocked ? '#f472b6' : '#64748b');
    card(ctx, LOBBY.card.x, LOBBY.card.y, LOBBY.card.w, LOBBY.card.h, cardBorder);

    // Tên nhân vật tâm y = 672
    outlinedText(ctx, charDef.name, 270, 672, 44, 800, '#ffffff');

    // Tag pill 800 16 px tâm y = 706
    let tagBg = '#22d3ee';
    let tagFg = '#063040';
    if (charId === 'GA') {
      tagBg = '#f472b6';
      tagFg = '#4b0f2b';
    } else if (charId === 'NO') {
      tagBg = '#fbbf24';
      tagFg = '#3b2603';
    }
    ctx.font = `800 16px ${UI_FONT}`;
    const tw = ctx.measureText(charDef.tag).width;
    const pw = tw + 28;
    pill(ctx, 270 - pw / 2, 706 - 13, pw, 26, tagBg, null, 0);
    ctx.fillStyle = tagFg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(charDef.tag, 270, 706);

    // 2 ô MẠNH và YẾU cạnh nhau (y = 726..784)
    // Ô MẠNH: x = 40..266
    roundedRect(ctx, 40, 726, 226, 58, 10);
    ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
    ctx.fill();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = `800 13px ${UI_FONT}`;
    ctx.fillStyle = '#22c55e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('MẠNH', 153, 731);

    ctx.font = `700 14px ${UI_FONT}`;
    ctx.fillStyle = '#bbf7d0';
    const stLines = wrapText(charDef.strength, 210, s => ctx.measureText(s).width);
    if (stLines.length <= 1) {
      ctx.textBaseline = 'middle';
      ctx.fillText(stLines[0] || '', 153, 762);
    } else {
      ctx.textBaseline = 'middle';
      ctx.fillText(stLines[0], 153, 753);
      ctx.fillText(stLines[1], 153, 769);
    }

    // Ô YẾU: x = 274..500
    roundedRect(ctx, 274, 726, 226, 58, 10);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = `800 13px ${UI_FONT}`;
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('YẾU', 387, 731);

    ctx.font = `700 14px ${UI_FONT}`;
    ctx.fillStyle = '#fecaca';
    const wkLines = wrapText(charDef.weakness, 210, s => ctx.measureText(s).width);
    if (wkLines.length <= 1) {
      ctx.textBaseline = 'middle';
      ctx.fillText(wkLines[0] || '', 387, 762);
    } else {
      ctx.textBaseline = 'middle';
      ctx.fillText(wkLines[0], 387, 753);
      ctx.fillText(wkLines[1], 387, 769);
    }

    // Ô HOÀN CẢNH nền #1e2a52 bo 12 (x = 40..500, y = 794..862)
    roundedRect(ctx, 40, 794, 460, 68, 12);
    ctx.fillStyle = '#1e2a52';
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = `800 13px ${UI_FONT}`;
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('HOÀN CẢNH', 52, 800);

    // 16 px (chủ kênh 2026-11-04: chữ hoàn cảnh to hơn) — mọi câu chuyện hiện tại gói đúng 2 dòng trong 436 px
    ctx.font = `700 16px ${UI_FONT}`;
    ctx.fillStyle = '#f1f5f9';
    const storyLines = wrapText(charDef.story, 436, s => ctx.measureText(s).width);
    for (let l = 0; l < Math.min(2, storyLines.length); l++) {
      ctx.fillText(storyLines[l], 52, 816 + l * 20);
    }

    // Nút chọn / Thanh tiến độ
    if (isSelected) {
      button3d(ctx, 270, 906, 380, 64, 'ĐANG CHỌN ✓', 24, 1, false, '#15803d');
    } else if (unlocked) {
      button3d(ctx, 270, 906, 380, 64, 'CHỌN ' + charDef.name, 24, 1, true);
    } else {
      // Thanh tiến độ x 60..480 y 862 h 8 (nằm giữa ô hoàn cảnh và nút)
      pill(ctx, 60, 864, 420, 8, '#0f172a', '#334155', 1);
      const ratio = progressRatio(bestScore, charDef.unlockBest);
      const fillW = Math.max(0, Math.min(420, 420 * ratio));
      if (fillW > 0) {
        pill(ctx, 60, 864, fillW, 8, '#fbbf24', null, 0);
      }

      // Nút xám ổ khoá + điểm
      button3d(ctx, 270, 906, 380, 64, '', 20, 1, false);
      const lockText = `${formatScore(bestScore)} / ${formatScore(charDef.unlockBest)} ĐIỂM`;
      ctx.font = `800 18px ${UI_FONT}`;
      const ltW = ctx.measureText(lockText).width;
      const totalW = 18 + 8 + ltW;
      const startX = 270 - totalW / 2;
      lockIcon(ctx, startX + 9, 906, 18);
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(lockText, startX + 26, 906);
    }
  }

  return {
    ensureLoaded,
    update,
    render,
    setIndex,
    getDebugState() {
      return {
        index: curIndex,
        anim: animState,
        source: lastSource
      };
    }
  };
}
