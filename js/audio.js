import { SFX_VOL, BGM_VOL } from './config.js';
import { createRng } from './rng.js';

let audioCtx = null;
let masterGain = null;
let sfxGain = null;
let bgmGain = null;
let isMuted = false;
let unlocked = false;
let noiseBuffer = null;

// Miyako-bushi scale: E F A B C (in Hz)
const MIYAKO_SCALE = [329.63, 349.23, 440.00, 493.88, 523.25, 659.25];
const BASS_ROOTS = [82.41, 87.31, 82.41, 123.47, 130.81, 123.47, 110.00, 82.41]; // 8 bars

// Pre-generate 64 steps (8 bars × 8 steps of 1/8 note at 120 BPM = 16 s)
const rng = createRng(77);
const melodySteps = [];
for (let i = 0; i < 64; i++) {
  if (rng() < 0.70) {
    const idx = Math.floor(rng() * MIYAKO_SCALE.length);
    melodySteps.push(MIYAKO_SCALE[idx]);
  } else {
    melodySteps.push(0); // rest
  }
}

// BGM scheduler state
let bgmIntervalId = null;
let nextNoteTime = 0;
let currentStep = 0;
let isBgmPlaying = false;

function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();

      masterGain = audioCtx.createGain();
      sfxGain = audioCtx.createGain();
      bgmGain = audioCtx.createGain();

      sfxGain.gain.setValueAtTime(SFX_VOL, audioCtx.currentTime);
      bgmGain.gain.setValueAtTime(BGM_VOL, audioCtx.currentTime);

      sfxGain.connect(masterGain);
      bgmGain.connect(masterGain);
      masterGain.connect(audioCtx.destination);

      masterGain.gain.setValueAtTime(isMuted ? 0 : 1, audioCtx.currentTime);
    }
  }
  return audioCtx;
}

function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().then(() => {
      unlocked = true;
    }).catch(() => {});
  } else if (ctx && ctx.state === 'running') {
    unlocked = true;
  }
}

function getNoiseBuffer(ctx) {
  if (!noiseBuffer) {
    const bufferSize = ctx.sampleRate;
    noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return noiseBuffer;
}

export function initAudio() {
  try {
    isMuted = localStorage.getItem('boyphorun.mute') === 'true';
  } catch {
    isMuted = false;
  }

  const muteBtn = typeof document !== 'undefined' ? document.getElementById('mute') : null;
  if (muteBtn) {
    muteBtn.textContent = isMuted ? '🔇' : '🔊';

    const stopEv = (e) => {
      e.stopPropagation();
    };

    muteBtn.addEventListener('pointerdown', stopEv);
    muteBtn.addEventListener('pointerup', stopEv);
    muteBtn.addEventListener('touchstart', stopEv, { passive: false });
    muteBtn.addEventListener('touchend', stopEv, { passive: false });
    muteBtn.addEventListener('mousedown', stopEv);
    muteBtn.addEventListener('mouseup', stopEv);
    muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggleMute();
    });
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
  }

  getAudioContext();
}

export function toggleMute() {
  isMuted = !isMuted;
  try {
    localStorage.setItem('boyphorun.mute', String(isMuted));
  } catch {
    // Ignore localStorage errors
  }

  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(isMuted ? 0 : 1, audioCtx.currentTime);
  }

  const muteBtn = typeof document !== 'undefined' ? document.getElementById('mute') : null;
  if (muteBtn) {
    muteBtn.textContent = isMuted ? '🔇' : '🔊';
  }

  return isMuted;
}

export function isAudioMuted() {
  return isMuted;
}

// BGM Scheduler: 120 BPM -> 1 beat = 0.5 s, 1 step (1/8 note) = 0.25 s
function scheduleBgmStep(step, time) {
  if (!audioCtx) return;

  const noteFreq = melodySteps[step];
  if (noteFreq > 0) {
    const osc = audioCtx.createOscillator();
    const noteGain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(noteFreq, time);

    noteGain.gain.setValueAtTime(0.0001, time);
    noteGain.gain.exponentialRampToValueAtTime(0.3, time + 0.02);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);

    osc.connect(noteGain);
    noteGain.connect(bgmGain);

    osc.start(time);
    osc.stop(time + 0.24);
  }

  // Bass line on every half bar (beats 0 and 2: steps 0, 4 in 8-step bar)
  if (step % 4 === 0) {
    const barIdx = Math.floor(step / 8);
    const bassFreq = BASS_ROOTS[barIdx % 8];

    const bassOsc = audioCtx.createOscillator();
    const bassNoteGain = audioCtx.createGain();

    bassOsc.type = 'sine';
    bassOsc.frequency.setValueAtTime(bassFreq, time);

    bassNoteGain.gain.setValueAtTime(0.0001, time);
    bassNoteGain.gain.exponentialRampToValueAtTime(0.4, time + 0.03);
    bassNoteGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.45);

    bassOsc.connect(bassNoteGain);
    bassNoteGain.connect(bgmGain);

    bassOsc.start(time);
    bassOsc.stop(time + 0.48);
  }
}

function bgmScheduler() {
  if (!audioCtx || !isBgmPlaying) return;
  const lookahead = 0.1;
  while (nextNoteTime < audioCtx.currentTime + lookahead) {
    scheduleBgmStep(currentStep, nextNoteTime);
    nextNoteTime += 0.25;
    currentStep = (currentStep + 1) % 64;
  }
}

export function startBgm() {
  const ctx = getAudioContext();
  if (!ctx || isBgmPlaying) return;
  isBgmPlaying = true;
  nextNoteTime = ctx.currentTime + 0.05;
  currentStep = 0;
  if (!bgmIntervalId) {
    bgmIntervalId = setInterval(bgmScheduler, 25);
  }
}

export function stopBgm() {
  isBgmPlaying = false;
  if (bgmIntervalId) {
    clearInterval(bgmIntervalId);
    bgmIntervalId = null;
  }
}

export function playEvent(ev) {
  if (!ev) return;

  // Debug recording
  if (typeof globalThis !== 'undefined' && globalThis.__bprSfx) {
    globalThis.__bprSfx.push(ev.type);
    if (globalThis.__bprSfx.length > 20) {
      globalThis.__bprSfx.shift();
    }
  }

  // Vibration feedback (only when vibrate available and not muted)
  if (!isMuted && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    if (ev.type === 'hit') {
      try {
        navigator.vibrate(40);
      } catch {}
    } else if (ev.type === 'caught') {
      try {
        navigator.vibrate([60, 40, 120]);
      } catch {}
    }
  }

  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'running' || !sfxGain) return;

  const now = ctx.currentTime;

  if (ev.type === 'jump') {
    // Sóng vuông quét 300 → 700 Hz trong 0.12 s, tắt dần
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.12);

    g.gain.setValueAtTime(0.3, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(g);
    g.connect(sfxGain);

    osc.start(now);
    osc.stop(now + 0.12);
  } else if (ev.type === 'slide') {
    // Nhiễu trắng qua lowpass 1200 → 300 Hz, 0.2 s
    const buffer = getNoiseBuffer(ctx);
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.2);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    src.connect(filter);
    filter.connect(g);
    g.connect(sfxGain);

    src.start(now);
    src.stop(now + 0.2);
  } else if (ev.type === 'lane') {
    // Tam giác 1200 Hz, 0.03 s
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);

    g.gain.setValueAtTime(0.35, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(g);
    g.connect(sfxGain);

    osc.start(now);
    osc.stop(now + 0.03);
  } else if (ev.type === 'pickup') {
    // 2 nốt sine nối nhau 0.07 s mỗi nốt: TICKET 880→1320, ONIGIRI 660→990, SUIKA 990→1480; SALARY 3 nốt 784→988→1319
    let freqs = [880, 1320];
    if (ev.item === 'ONIGIRI') freqs = [660, 990];
    else if (ev.item === 'SUIKA') freqs = [990, 1480];
    else if (ev.item === 'SALARY') freqs = [784, 988, 1319];

    for (let i = 0; i < freqs.length; i++) {
      const noteStart = now + i * 0.07;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqs[i], noteStart);

      g.gain.setValueAtTime(0.0001, noteStart);
      g.gain.exponentialRampToValueAtTime(0.4, noteStart + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.068);

      osc.connect(g);
      g.connect(sfxGain);

      osc.start(noteStart);
      osc.stop(noteStart + 0.07);
    }
  } else if (ev.type === 'hit') {
    // Sine 110 Hz → 60 Hz 0.25 s + nhiễu ngắn 0.08 s
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);

    g.gain.setValueAtTime(0.5, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(g);
    g.connect(sfxGain);

    osc.start(now);
    osc.stop(now + 0.25);

    // Nhiễu ngắn 0.08 s
    const buffer = getNoiseBuffer(ctx);
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(800, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(sfxGain);

    noiseSrc.start(now);
    noiseSrc.stop(now + 0.08);
  } else if (ev.type === 'caught') {
    // Còi cảnh sát: 2 hồi sine 2800 Hz có rung tần số (LFO 30 Hz, ±150 Hz), mỗi hồi 0.18 s cách 0.08 s; rồi 3 nốt đi xuống 523→392→262
    const playSirenPulse = (startTime) => {
      const carrier = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const pulseGain = ctx.createGain();

      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(2800, startTime);

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(30, startTime);

      lfoGain.gain.setValueAtTime(150, startTime);

      lfo.connect(lfoGain);
      lfoGain.connect(carrier.frequency);

      pulseGain.gain.setValueAtTime(0.4, startTime);
      pulseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

      carrier.connect(pulseGain);
      pulseGain.connect(sfxGain);

      lfo.start(startTime);
      carrier.start(startTime);
      lfo.stop(startTime + 0.18);
      carrier.stop(startTime + 0.18);
    };

    playSirenPulse(now);
    playSirenPulse(now + 0.26);

    // 3 nốt đi xuống 523 → 392 → 262 sau còi
    const caughtNotes = [523, 392, 262];
    const notesStart = now + 0.48;
    for (let i = 0; i < caughtNotes.length; i++) {
      const nStart = notesStart + i * 0.12;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(caughtNotes[i], nStart);

      g.gain.setValueAtTime(0.0001, nStart);
      g.gain.exponentialRampToValueAtTime(0.35, nStart + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, nStart + 0.118);

      osc.connect(g);
      g.connect(sfxGain);

      osc.start(nStart);
      osc.stop(nStart + 0.12);
    }
  }
}
