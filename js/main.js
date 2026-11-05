import { DT, VIEW_W, SPEED_START, CHICKEN_SPEED_MUL, CHERRY_SPEED_MUL } from './config.js';
import { createGame, step } from './game.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { createAccState, advance } from './loop.js';
import { loadSprites, loadCaughtSprites } from './assets.js';
import { initAudio, playEvent, startBgm, stopBgm, suspendAudio, resumeAudio } from './audio.js';
import { HUD, CAUGHT, caughtTapAction, pauseTapAction, isPauseButtonTap } from './hudlayout.js';
import {
  CHARACTERS,
  CHARACTER_ORDER,
  isUnlocked,
  nextCharacter,
  sanitizeCharacter,
  justUnlocked
} from './characters.js';
import { createLobby } from './lobby.js';
import { lobbyHit } from './lobbylayout.js';

// Đăng ký Service Worker chỉ khi trong Secure Context (HTTPS hoặc localhost)
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.info('[BPR] Service Worker đã cập nhật phiên bản mới.');
  });
}

const STORAGE_KEY = 'boyphorun.best';
const CHAR_STORAGE_KEY = 'boyphorun.char';

function loadBestScore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score) {
  try {
    localStorage.setItem(STORAGE_KEY, String(score));
  } catch {
    // Ignore localStorage errors (e.g. private browsing quota)
  }
}

function loadSelectedChar(best, unlockAll) {
  try {
    const raw = localStorage.getItem(CHAR_STORAGE_KEY);
    return sanitizeCharacter(raw, best, unlockAll);
  } catch {
    return 'TEO';
  }
}

function saveSelectedChar(charId) {
  try {
    localStorage.setItem(CHAR_STORAGE_KEY, charId);
  } catch {}
}

function insideRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

// ---- Anonymous play counts (GoatCounter, owner request 2026-11-05) ----
// No cookies, no personal data: one page view per visit plus a few milestones. count.js loads async from
// index.html with no_onload; calls made before it arrives wait in a small queue. GoatCounter ignores localhost.
const gcQueue = [];
let gcTimer = 0;
function gcFlush() {
  const gc = window.goatcounter;
  if (!gc || typeof gc.count !== 'function') return false;
  while (gcQueue.length) { try { gc.count(gcQueue.shift()); } catch { /* blocked or offline */ } }
  return true;
}
function gcSend(v) {
  gcQueue.push(v);
  if (gcFlush() || gcTimer) return;
  let tries = 0;
  gcTimer = setInterval(() => { if (gcFlush() || ++tries > 40) { clearInterval(gcTimer); gcTimer = 0; } }, 500);
}
function track(name, title = name) { gcSend({ path: `bhp/${name}`, title, event: true }); }
const scoreBucket = (s) => (s < 1000 ? '0-1k' : s < 2500 ? '1k-2.5k' : s < 5000 ? '2.5k-5k' : s < 10000 ? '5k-10k' : '10k-plus');

function init() {
  gcSend({ path: location.pathname.replace(/[^/]*$/, '') || '/', title: document.title });
  let gcRuns = 0;
  const canvas = document.getElementById('game');
  const rotateOverlay = document.getElementById('rotate');
  const ctx = canvas.getContext('2d');

  let savedBestScore = loadBestScore();
  let bestScore = savedBestScore;
  let bestScoreBeforeRun = bestScore;
  let isNewBest = false;
  let justUnlockedList = [];
  let flashCharSelectT = 0;
  let seed = Date.now() >>> 0;

  // Tải phông chữ Baloo 2 không chặn game
  let fontReady = false;
  if (typeof document !== 'undefined' && document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('800 32px "Baloo 2"'),
      document.fonts.load('800 32px "Baloo 2"', 'Tèo đã hiểu ạ')
    ]).then(() => {
      fontReady = true;
    }).catch(() => {});
  }

  // Gắn __bpr, __bprAnim, __bprSfx, __bprBrand, __bprDisclaimer, __bprUi, __bprChar vào globalThis nếu có ?debug=1 để kiểm thử
  const urlParams = new URLSearchParams(window.location.search);
  const isDebug = urlParams.get('debug') === '1';
  const isUnlockAll = isDebug && urlParams.get('unlockall') === '1';
  const isNoDisclaimer = urlParams.get('nodisclaimer') === '1';
  const isYabaiDebug = isDebug && urlParams.get('yabai') === '1';

  let selectedCharId = loadSelectedChar(bestScore, isUnlockAll);
  let lobbyIndex = Math.max(0, CHARACTER_ORDER.indexOf(selectedCharId));
  const lobby = createLobby();
  // Tạm dừng trong ván (nút ⏸ / Escape / tab bị ẩn); pendingStart = vào ván mới ở bước logic kế tiếp (CHƠI LẠI)
  let paused = false;
  let pendingStart = false;

  const gameOpts = {
    characterId: selectedCharId,
    ...(isYabaiDebug ? { forceItem: 'YABAI' } : {})
  };

  let game = createGame(seed, 'ready', gameOpts);

  const disclaimerEl = document.getElementById('disclaimer');
  const disclaimerOkBtn = document.getElementById('disclaimer-ok');
  const muteBtn = document.getElementById('mute');
  let disclaimerOpen = true;
  let justDismissedDisclaimer = false;

  function updateMuteVisibility() {
    if (!muteBtn) return;
    if (disclaimerOpen) {
      muteBtn.classList.add('hidden');
    } else {
      muteBtn.classList.remove('hidden');
    }
  }

  function updateMutePos() {
    if (!muteBtn || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cssW = parseFloat(canvas.style.width) || rect.width;
    const k = cssW / 540;
    const btnLeft = rect.left + HUD.mute.x * k;
    const btnTop = rect.top + HUD.mute.y * k;
    const btnSize = Math.max(44, HUD.mute.w * k);
    muteBtn.style.left = `${btnLeft}px`;
    muteBtn.style.top = `${btnTop}px`;
    muteBtn.style.width = `${btnSize}px`;
    muteBtn.style.height = `${btnSize}px`;
  }

  if (isNoDisclaimer && disclaimerEl) {
    disclaimerEl.classList.add('hidden');
    disclaimerOpen = false;
  }
  updateMuteVisibility();

  if (disclaimerOkBtn && disclaimerOpen) {
    disclaimerOkBtn.focus();
  }

  if (isDebug) {
    globalThis.__bpr = game;
    globalThis.__bprProps = 'fallback';
    globalThis.__bprChar = {
      id: game.characterId,
      held: Boolean(game.chicken?.held),
      flapReady: Boolean(game.chicken?.flapReady),
      sprite: 'fallback'
    };
    globalThis.__bprSfx = [];
    globalThis.__bprMusic = {
      source: 'none',
      level: 0,
      bpm: 149.8,
      decoded: false
    };
    globalThis.__bprAnim = {
      teo: { name: 'run', frame: 0 },
      police: { name: 'run', frame: 0 }
    };
    globalThis.__bprBrand = {
      boards: 0,
      tokenReady: false,
      skyline: false
    };
    globalThis.__bprDisclaimer = {
      get open() {
        return disclaimerOpen;
      }
    };
    globalThis.__bprUi = {
      get fontReady() {
        if (fontReady) return true;
        if (typeof document !== 'undefined' && document.fonts && document.fonts.check) {
          return document.fonts.check('800 32px "Baloo 2"');
        }
        return false;
      }
    };
  }

  globalThis.__bprLobby = {
    get open() { return game.phase === 'ready'; },
    get paused() { return paused; },
    get index() { return lobbyIndex; },
    get anim() { return lobby.getDebugState().anim; },
    get source() { return lobby.getDebugState().source; }
  };

  const caughtLoader = loadCaughtSprites();
  globalThis.__bprCaught = {
    get art() {
      const charKey = selectedCharId === 'GA' ? 'ga' : (selectedCharId === 'NO' ? 'no' : 'teo');
      return (caughtLoader && caughtLoader[charKey]) ? 'sprite' : 'none';
    }
  };

  initAudio();

  const input = createInput(canvas);
  const renderer = createRenderer(canvas);
  renderer.setCaughtSprites(caughtLoader);

  if (disclaimerOkBtn) {
    disclaimerOkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (disclaimerEl) {
        disclaimerEl.classList.add('hidden');
      }
      disclaimerOpen = false;
      updateMuteVisibility();
      updateMutePos();
      justDismissedDisclaimer = true;
      input.pollActions();
      input.pollTaps();
      resumeAudio();
    });
  }

  // Nạp logo thương hiệu YABAI nền trong suốt cho giao diện game
  let brandLogo = null;
  const brandImg = new Image();
  brandImg.onload = () => {
    brandLogo = brandImg;
    renderer.setBrandLogo(brandImg);
  };
  brandImg.onerror = () => {
    brandLogo = null;
    renderer.setBrandLogo(null);
  };
  brandImg.src = 'assets/brand/yabai_logo_white.png';

  // Tải sprite atlas không đồng bộ với cơ chế nâng cấp muộn
  let sprites = null;
  let loading = true;
  const spriteLoader = loadSprites();

  spriteLoader.ready.then(s => {
    if (s) {
      sprites = s;
    }
    loading = false;
  });

  spriteLoader.late.then(s => {
    if (s) {
      sprites = s;
    }
  });

  // Chặn menu chuột phải / giữ lâu trên canvas
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  let isPausedByRotate = false;

  function fit() {
    // Kiểm tra xoay ngang trên thiết bị cảm ứng (pointer: coarse)
    const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const isLandscape = window.innerWidth > window.innerHeight;
    isPausedByRotate = Boolean(isCoarse && isLandscape);

    if (rotateOverlay) {
      rotateOverlay.style.display = isPausedByRotate ? 'flex' : 'none';
    }

    if (isPausedByRotate) {
      suspendAudio();
    } else if (!document.hidden && game && game.phase === 'running' && !paused) {
      resumeAudio();
    }

    // Kích thước khả dụng = document.body.clientWidth/clientHeight trừ padding safe-area
    const bodyStyle = window.getComputedStyle(document.body);
    const padX = (parseFloat(bodyStyle.paddingLeft) || 0) + (parseFloat(bodyStyle.paddingRight) || 0);
    const padY = (parseFloat(bodyStyle.paddingTop) || 0) + (parseFloat(bodyStyle.paddingBottom) || 0);

    const availW = Math.max(0, document.body.clientWidth - padX);
    const availH = Math.max(0, document.body.clientHeight - padY);

    // Tính kích thước CSS lớn nhất giữ tỉ lệ 9:16
    let cssW = availW;
    let cssH = availW * (16 / 9);
    if (cssH > availH) {
      cssH = availH;
      cssW = availH * (9 / 16);
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const backingW = Math.round(cssW * dpr);
    const backingH = Math.round(cssH * dpr);

    canvas.width = backingW;
    canvas.height = backingH;
    canvas.style.width = `${Math.round(cssW)}px`;
    canvas.style.height = `${Math.round(cssH)}px`;

    updateMutePos();
  }

  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      suspendAudio();
      // Rời tab giữa ván (nghe điện thoại, chuyển app) → quay lại thấy bảng tạm dừng thay vì chạy tiếp ngay
      if (game.phase === 'running') paused = true;
    } else if (!isPausedByRotate && game.phase === 'running' && !paused) {
      resumeAudio();
    }
  });

  function backToReady() {
    // Giữ kỷ lục của ván bỏ dở (điểm đã ghi được vẫn tính)
    if (game.score > savedBestScore) {
      savedBestScore = game.score;
      saveBestScore(savedBestScore);
    }
    const nextSeed = Date.now() >>> 0;
    game = createGame(nextSeed, 'ready', { ...gameOpts, characterId: selectedCharId });
    if (isDebug) {
      globalThis.__bpr = game;
    }
    isNewBest = false;
    justUnlockedList = [];
    lobbyIndex = Math.max(0, CHARACTER_ORDER.indexOf(selectedCharId));
    lobby.setIndex(lobbyIndex);
  }

  function handlePausedInput() {
    const acts = input.pollActions();
    const tps = input.pollTaps();
    let act = null;
    if (acts.includes('escape')) act = 'resume';
    if (acts.includes('menu')) act = 'menu';
    for (let i = 0; i < tps.length; i++) {
      const a = pauseTapAction(tps[i].x, tps[i].y);
      if (a) act = a;
    }
    if (!act) return;
    paused = false;
    resumeAudio();
    if (act === 'resume') return;
    stopBgm();
    backToReady();
    if (act === 'restart') pendingStart = true;
  }
  fit();

  // Vòng lặp fixed timestep DT = 1/120 s với logic loop.js
  const accState = createAccState();
  let lastTime = performance.now();

  // Tính FPS trung bình 1 giây cho chế độ debug
  let frameCount = 0;
  let lastFpsUpdate = performance.now();
  let displayFps = 60;

  function applyCharacterSelection(newCharId) {
    selectedCharId = newCharId;
    saveSelectedChar(selectedCharId);
    game.characterId = selectedCharId;
    const carriesChicken = Boolean(CHARACTERS[selectedCharId]?.carriesChicken);
    game.chicken = { held: carriesChicken, flapReady: carriesChicken };
    const carriesCherry = CHARACTERS[selectedCharId]?.carry === 'cherry';
    game.cherry = { held: carriesCherry, lifeReady: carriesCherry };
    game.speed = carriesChicken
      ? SPEED_START * CHICKEN_SPEED_MUL
      : (carriesCherry ? SPEED_START * CHERRY_SPEED_MUL : SPEED_START);
  }

  const pollFn = () => {
    let actions = input.pollActions();
    const taps = input.pollTaps();

    if (disclaimerOpen) {
      return [];
    }
    if (justDismissedDisclaimer) {
      justDismissedDisclaimer = false;
      actions = actions.filter(a => a !== 'start');
    }
    if (loading) {
      actions = actions.filter(a => a !== 'start');
    }

    // CHƠI LẠI từ bảng tạm dừng: vào ván mới với nhân vật đang chọn
    if (pendingStart && game.phase === 'ready') {
      pendingStart = false;
      return ['start'];
    }

    // Trong ván: chạm nút ⏸ hoặc Escape → tạm dừng (không để cú chạm đó thành nhảy / thả đồ)
    if (game.phase === 'running') {
      let wantPause = actions.includes('escape');
      for (let i = 0; i < taps.length; i++) {
        if (isPauseButtonTap(taps[i].x, taps[i].y)) wantPause = true;
      }
      if (wantPause) {
        paused = true;
        suspendAudio();
        return [];
      }
    }

    // Màn chờ = sảnh nhân vật (chủ kênh 2026-11-04): ← → / vuốt / mũi tên đổi nhân vật,
    // nút CHẠY ĐI! (hoặc Enter / Space) chọn nhân vật đang xem và bắt đầu ván ngay
    if (game.phase === 'ready') {
      let startNow = actions.includes('start') && taps.length === 0;
      if (actions.includes('left')) {
        lobbyIndex = (lobbyIndex - 1 + CHARACTER_ORDER.length) % CHARACTER_ORDER.length;
        lobby.setIndex(lobbyIndex);
      }
      if (actions.includes('right') || actions.includes('char_next')) {
        lobbyIndex = (lobbyIndex + 1) % CHARACTER_ORDER.length;
        lobby.setIndex(lobbyIndex);
      }
      for (let i = 0; i < taps.length; i++) {
        const hit = lobbyHit(taps[i].x, taps[i].y);
        if (hit === 'prev') {
          lobbyIndex = (lobbyIndex - 1 + CHARACTER_ORDER.length) % CHARACTER_ORDER.length;
          lobby.setIndex(lobbyIndex);
        } else if (hit === 'next') {
          lobbyIndex = (lobbyIndex + 1) % CHARACTER_ORDER.length;
          lobby.setIndex(lobbyIndex);
        } else if (hit === 'select') {
          startNow = true;
        }
      }
      if (startNow && !loading) {
        const candidateId = CHARACTER_ORDER[lobbyIndex];
        if (isUnlocked(candidateId, bestScore, isUnlockAll)) {
          applyCharacterSelection(candidateId);
          return ['start'];
        }
      }
      return [];
    }

    // Xử lý ở màn bị tóm (caught)
    if (game.phase === 'caught') {
      if (game.restartLockT <= 0) {
        let returnToMenu = false;
        if (actions.includes('menu') || actions.includes('escape')) {
          returnToMenu = true;
          actions = actions.filter(a => a !== 'menu' && a !== 'escape');
        }

        let restartRequested = false;
        if (taps.length > 0) {
          for (let i = 0; i < taps.length; i++) {
            const tapAct = caughtTapAction(taps[i].x, taps[i].y);
            if (tapAct === 'menu') {
              returnToMenu = true;
            } else if (tapAct === 'restart') {
              restartRequested = true;
            }
          }
        }

        if (returnToMenu) {
          const nextSeed = Date.now() >>> 0;
          game = createGame(nextSeed, 'ready', { ...gameOpts, characterId: selectedCharId });
          if (isDebug) {
            globalThis.__bpr = game;
          }
          isNewBest = false;
          justUnlockedList = [];
          lobbyIndex = Math.max(0, CHARACTER_ORDER.indexOf(selectedCharId));
          lobby.setIndex(lobbyIndex);
          return [];
        }

        if (restartRequested && !actions.includes('start')) {
          actions.push('start');
        }
      } else {
        actions = actions.filter(a => a !== 'start' && a !== 'menu' && a !== 'escape');
      }
    }

    return actions;
  };

  const stepFn = (dt, currentActions) => {
    if (game.phase === 'ready' && currentActions.includes('start')) {
      gcRuns++;
      if (gcRuns === 1) track(`first-run-${selectedCharId.toLowerCase()}`, 'Lượt chạy đầu tiên');
      bestScoreBeforeRun = bestScore;
      isNewBest = false;
      justUnlockedList = [];
    } else if (game.phase === 'caught' && game.restartLockT <= 0 && currentActions.includes('start')) {
      gcRuns++;
      if (gcRuns === 5 || gcRuns === 20) track(`runs-${gcRuns}`, `Chơi ${gcRuns} lượt trong một lần mở`);
      bestScoreBeforeRun = bestScore;
      isNewBest = false;
      justUnlockedList = [];
    }

    const nextSeed = Date.now() >>> 0;
    step(game, dt, currentActions, { seed: nextSeed, ...gameOpts, characterId: selectedCharId });

    // Phát âm thanh và thông báo hiệu ứng hình ảnh cho từng sự kiện
    for (let i = 0; i < game.events.length; i++) {
      const ev = game.events[i];
      playEvent(ev);
      renderer.onEvent(ev);
    }

    if (game.events.some(e => e.type === 'caught')) {
      isNewBest = game.score > bestScoreBeforeRun;
      const newlyUnlocked = justUnlocked(bestScoreBeforeRun, game.score);
      justUnlockedList = newlyUnlocked;
      if (gcRuns <= 5) track(`score-${scoreBucket(game.score)}`, 'Điểm khi bị bắt');
      for (const id of newlyUnlocked) track(`unlock-${String(id).toLowerCase()}`, 'Mở khoá nhân vật');
      if (newlyUnlocked.length > 0) {
        flashCharSelectT = 0.9;
      }
      if (game.score > savedBestScore) {
        savedBestScore = game.score;
        saveBestScore(savedBestScore);
      }
    }

    if (game.score > bestScore) {
      bestScore = game.score;
    }
  };

  function loop(currentTime) {
    const frameTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Quản lý BGM: chỉ chạy khi running, tab hiện và không xoay ngang
    if (game.phase === 'running' && !document.hidden && !isPausedByRotate) {
      startBgm(game.meter);
    } else if (game.phase === 'ready') {
      stopBgm();
    }

    // Đo FPS trung bình mỗi giây
    frameCount++;
    if (currentTime - lastFpsUpdate >= 1000) {
      displayFps = Math.round((frameCount * 1000) / (currentTime - lastFpsUpdate));
      frameCount = 0;
      lastFpsUpdate = currentTime;
    }

    // Nếu tab ẩn hoặc đang phủ xoay ngang → bỏ action dồn lại và không tích lũy thời gian
    if (document.hidden || isPausedByRotate) {
      input.pollActions();
      input.pollTaps();
      accState.accumulator = 0;
      requestAnimationFrame(loop);
      return;
    }

    if (paused) {
      handlePausedInput();
      accState.accumulator = 0;
    } else {
      advance(accState, frameTime, pollFn, stepFn, DT);
    }

    if (flashCharSelectT > 0) {
      flashCharSelectT = Math.max(0, flashCharSelectT - frameTime);
    }

    // Render với biến đổi scale phù hợp với canvas backing store
    const k = canvas.width / VIEW_W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    renderer.render(
      game,
      bestScore,
      sprites,
      isDebug ? displayFps : null,
      loading,
      paused ? 0 : frameTime,
      brandLogo,
      isNewBest,
      justUnlockedList,
      isUnlockAll,
      flashCharSelectT,
      caughtLoader,
      paused
    );

    if (game.phase === 'ready') {
      // Màn chờ là sảnh nhân vật, phủ lên phố đêm (phố vẫn lờ mờ phía sau)
      const isReduced = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      lobby.ensureLoaded();
      lobby.update(frameTime, isReduced);
      lobby.render(
        ctx,
        lobbyIndex,
        selectedCharId,
        bestScore,
        isUnlockAll,
        isReduced,
        sprites,
        { loading, logo: brandLogo }
      );
    }

    if (isDebug) {
      globalThis.__bprFps = displayFps;
      globalThis.__bprProps = (sprites && sprites.props) ? 'sprite' : 'fallback';
      globalThis.__bprChar = {
        id: game.characterId,
        held: Boolean(game.chicken?.held || game.cherry?.held),
        flapReady: Boolean(game.chicken?.flapReady || game.cherry?.lifeReady),
        sprite: (sprites && (game.characterId === 'GA' ? sprites.gathief : (game.characterId === 'NO' ? sprites.no : sprites.teo))) ? 'sprite' : 'fallback'
      };
      if (renderer.lastAnim) {
        globalThis.__bprAnim = {
          teo: { name: renderer.lastAnim.teo.name, frame: renderer.lastAnim.teo.frame },
          police: { name: renderer.lastAnim.police.name, frame: renderer.lastAnim.police.frame }
        };
      }
      globalThis.__bprBrand = {
        boards: renderer.drawnBoardsCount,
        tokenReady: renderer.isTokenReady,
        skyline: renderer.hasSkylineSign
      };
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
