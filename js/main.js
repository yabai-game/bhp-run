import { DT, VIEW_W } from './config.js';
import { createGame, step } from './game.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { createAccState, advance } from './loop.js';
import { loadSprites } from './assets.js';
import { initAudio, playEvent, startBgm, stopBgm, suspendAudio, resumeAudio } from './audio.js';

// Đăng ký Service Worker chỉ khi trong Secure Context (HTTPS hoặc localhost)
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.info('[BPR] Service Worker đã cập nhật phiên bản mới.');
  });
}

const STORAGE_KEY = 'boyphorun.best';

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

function init() {
  const canvas = document.getElementById('game');
  const rotateOverlay = document.getElementById('rotate');
  const ctx = canvas.getContext('2d');

  let savedBestScore = loadBestScore();
  let bestScore = savedBestScore;
  let seed = Date.now() >>> 0;
  let game = createGame(seed, 'ready');

  // Gắn __bpr, __bprAnim, __bprSfx vào globalThis nếu có ?debug=1 để kiểm thử
  const urlParams = new URLSearchParams(window.location.search);
  const isDebug = urlParams.get('debug') === '1';
  if (isDebug) {
    globalThis.__bpr = game;
    globalThis.__bprProps = 'fallback';
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
  }

  initAudio();

  const input = createInput(canvas);
  const renderer = createRenderer(canvas);

  // Nạp logo thương hiệu YABAI nền trong suốt cho giao diện game
  let brandLogo = null;
  const brandImg = new Image();
  brandImg.onload = () => {
    brandLogo = brandImg;
  };
  brandImg.onerror = () => {
    brandLogo = null;
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
    } else if (!document.hidden && game && game.phase === 'running') {
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
  }

  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      suspendAudio();
    } else if (!isPausedByRotate && game.phase === 'running') {
      resumeAudio();
    }
  });
  fit();

  // Vòng lặp fixed timestep DT = 1/120 s với logic loop.js
  const accState = createAccState();
  let lastTime = performance.now();

  // Tính FPS trung bình 1 giây cho chế độ debug
  let frameCount = 0;
  let lastFpsUpdate = performance.now();
  let displayFps = 60;

  const pollFn = () => {
    let actions = input.pollActions();
    if (loading) {
      actions = actions.filter(a => a !== 'start');
    }
    return actions;
  };

  const stepFn = (dt, currentActions) => {
    const nextSeed = Date.now() >>> 0;
    step(game, dt, currentActions, { seed: nextSeed });

    // Phát âm thanh và thông báo hiệu ứng hình ảnh cho từng sự kiện
    for (let i = 0; i < game.events.length; i++) {
      const ev = game.events[i];
      playEvent(ev);
      renderer.onEvent(ev);
    }

    if (game.score > bestScore) {
      bestScore = game.score;
    }

    // Chỉ ghi localStorage 1 lần khi chuyển sang caught và phá kỷ lục
    if (game.events.some(e => e.type === 'caught')) {
      if (game.score > savedBestScore) {
        savedBestScore = game.score;
        saveBestScore(savedBestScore);
      }
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
      input.pollActions(); // Xả và bỏ thao tác cũ
      accState.accumulator = 0;
      requestAnimationFrame(loop);
      return;
    }

    advance(accState, frameTime, pollFn, stepFn, DT);

    // Render với biến đổi scale phù hợp với canvas backing store
    const k = canvas.width / VIEW_W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    renderer.render(game, bestScore, sprites, isDebug ? displayFps : null, loading, frameTime, brandLogo);

    if (isDebug && renderer.lastAnim) {
      globalThis.__bprFps = displayFps;
      globalThis.__bprProps = (sprites && sprites.props) ? 'sprite' : 'fallback';
      globalThis.__bprAnim = {
        teo: { name: renderer.lastAnim.teo.name, frame: renderer.lastAnim.teo.frame },
        police: { name: renderer.lastAnim.police.name, frame: renderer.lastAnim.police.frame }
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
