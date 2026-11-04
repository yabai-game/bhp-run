import {
  SFX_VOL,
  BGM_VOL,
  MUSIC_FILE_VOL,
  SIREN_VOL,
  MUSIC_LP_NORMAL,
  MUSIC_LP_TENSE,
  MUSIC_LP_TRANSITION,
  MUSIC_STUMBLE_VOL_MUL,
  MUSIC_STUMBLE_DROP_TIME,
  MUSIC_STUMBLE_RECOVER_TIME,
  MUSIC_CAUGHT_FADE_TIME,
  MUSIC_CROSSFADE_TIME
} from './config.js';
import { createRng } from './rng.js';
import { levelFor, sirenNoteAt, loopRegion } from './music.js';

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

// Procedural BGM scheduler state
let bgmIntervalId = null;
let nextNoteTime = 0;
let currentStep = 0;
let proceduralGain = null;

// Chase music file state
let chaseMeta = null;
let chaseAudioBuffer = null;
let isAudioDecoded = false;
let isAudioLoading = false;
let fileLoadFailed = false;

// Active file music playback state
let musicSourceNode = null;
let musicFilter = null;
let musicGain = null;
let musicSource = 'none'; // 'file' | 'procedural' | 'none'
let isBgmActive = false;
let currentMeter = 0;
let currentLevel = 0; // 0 (< 70) | 1 (>= 70)
let fileStartTime = 0;
let sirenIntervalId = null;
let nextHalfBarIndex = 0;
let caughtFadeTimeoutId = null;

function updateDebugMusic() {
  if (typeof globalThis !== 'undefined' && globalThis.__bprMusic) {
    globalThis.__bprMusic.source = musicSource;
    globalThis.__bprMusic.level = currentLevel;
    globalThis.__bprMusic.bpm = chaseMeta ? chaseMeta.bpm : 149.8;
    globalThis.__bprMusic.decoded = isAudioDecoded;
  }
}

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

export function suspendAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'running') {
    ctx.suspend().catch(() => {});
  }
}

export function resumeAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended' && unlocked) {
    ctx.resume().catch(() => {});
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

export function loadMusicFile() {
  if (typeof window === 'undefined') return;

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('nomusicfile') === '1') {
    fileLoadFailed = true;
    isAudioDecoded = false;
    updateDebugMusic();
    return;
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  isAudioLoading = true;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  fetch('assets/audio/chase.json', { signal: controller.signal })
    .then(res => {
      if (!res.ok) throw new Error('Fetch chase.json failed: ' + res.status);
      return res.json();
    })
    .then(json => {
      const dur = loopRegion(json);
      if (dur === null) throw new Error('Invalid chase.json loop region');
      chaseMeta = json;
      const audioFileName = json.file || 'chase.mp3';
      return fetch('assets/audio/' + audioFileName, { signal: controller.signal });
    })
    .then(res => {
      if (!res.ok) throw new Error('Fetch audio file failed: ' + res.status);
      return res.arrayBuffer();
    })
    .then(arrayBuffer => {
      clearTimeout(timeoutId);
      return ctx.decodeAudioData(arrayBuffer);
    })
    .then(audioBuffer => {
      chaseAudioBuffer = audioBuffer;
      isAudioDecoded = true;
      isAudioLoading = false;
      updateDebugMusic();

      // Nếu đang phát procedural fallback giữa ván -> chuyển chéo sang file ở đầu ô nhịp kế tiếp
      if (isBgmActive && musicSource === 'procedural') {
        triggerCrossfadeToFile();
      }
    })
    .catch(() => {
      clearTimeout(timeoutId);
      isAudioLoading = false;
      fileLoadFailed = true;
      chaseAudioBuffer = null;
      chaseMeta = null;
      isAudioDecoded = false;
      updateDebugMusic();
    });
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
  loadMusicFile();
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

// BGM Scheduler (G02 procedural synth): 120 BPM -> 1 beat = 0.5 s, 1 step (1/8 note) = 0.25 s
function scheduleBgmStep(step, time) {
  if (!audioCtx) return;
  const targetGain = proceduralGain || bgmGain;

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
    noteGain.connect(targetGain);

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
    bassNoteGain.connect(targetGain);

    bassOsc.start(time);
    bassOsc.stop(time + 0.48);
  }
}

function bgmScheduler() {
  if (!audioCtx || musicSource !== 'procedural' || !isBgmActive) return;
  const lookahead = 0.1;
  while (nextNoteTime < audioCtx.currentTime + lookahead) {
    scheduleBgmStep(currentStep, nextNoteTime);
    nextNoteTime += 0.25;
    currentStep = (currentStep + 1) % 64;
  }
}

function startProceduralMusic() {
  const ctx = getAudioContext();
  if (!ctx) return;

  stopProceduralMusic();

  proceduralGain = ctx.createGain();
  proceduralGain.gain.setValueAtTime(1.0, ctx.currentTime);
  proceduralGain.connect(bgmGain);

  musicSource = 'procedural';
  currentLevel = 0;
  nextNoteTime = ctx.currentTime + 0.05;
  currentStep = 0;

  if (!bgmIntervalId) {
    bgmIntervalId = setInterval(bgmScheduler, 25);
  }
  updateDebugMusic();
}

function stopProceduralMusic() {
  if (bgmIntervalId) {
    clearInterval(bgmIntervalId);
    bgmIntervalId = null;
  }
  if (proceduralGain) {
    try {
      proceduralGain.disconnect();
    } catch {}
    proceduralGain = null;
  }
}

function startFileMusic(startTime = null, initialGain = MUSIC_FILE_VOL) {
  const ctx = getAudioContext();
  if (!ctx || !chaseAudioBuffer || !chaseMeta) return;

  stopFileMusicNode();

  const now = ctx.currentTime;
  const tStart = startTime !== null ? startTime : now;
  fileStartTime = tStart;

  musicSourceNode = ctx.createBufferSource();
  musicSourceNode.buffer = chaseAudioBuffer;
  musicSourceNode.loop = true;
  musicSourceNode.loopStart = chaseMeta.loopStart;
  musicSourceNode.loopEnd = chaseMeta.loopEnd;

  musicFilter = ctx.createBiquadFilter();
  musicFilter.type = 'lowpass';
  currentLevel = levelFor(currentMeter);
  const filterFreq = currentLevel === 1 ? MUSIC_LP_TENSE : MUSIC_LP_NORMAL;
  musicFilter.frequency.setValueAtTime(filterFreq, tStart);

  musicGain = ctx.createGain();
  musicGain.gain.setValueAtTime(initialGain, tStart);

  musicSourceNode.connect(musicFilter);
  musicFilter.connect(musicGain);
  musicGain.connect(bgmGain);

  musicSourceNode.start(tStart, chaseMeta.loopStart);
  musicSource = 'file';

  startSirenScheduler(tStart, chaseMeta.bpm);
  updateDebugMusic();
}

function stopFileMusicNode() {
  stopSirenScheduler();
  if (musicSourceNode) {
    try {
      musicSourceNode.stop();
      musicSourceNode.disconnect();
    } catch {}
    musicSourceNode = null;
  }
  if (musicFilter) {
    try {
      musicFilter.disconnect();
    } catch {}
    musicFilter = null;
  }
  if (musicGain) {
    try {
      musicGain.disconnect();
    } catch {}
    musicGain = null;
  }
}

function triggerCrossfadeToFile() {
  const ctx = getAudioContext();
  if (!ctx || !isAudioDecoded || !isBgmActive || musicSource !== 'procedural') return;

  // Tính đầu ô nhịp kế tiếp của nhạc tự sinh (mỗi ô = 8 bước = 2.0 s)
  const stepsUntilNextBar = (8 - (currentStep % 8)) % 8;
  const crossfadeStartTime = Math.max(ctx.currentTime + 0.02, nextNoteTime + stepsUntilNextBar * 0.25);
  const crossfadeEndTime = crossfadeStartTime + MUSIC_CROSSFADE_TIME;

  // Bắt đầu file music tại crossfadeStartTime với gain = 0
  startFileMusic(crossfadeStartTime, 0.0001);

  if (musicGain) {
    musicGain.gain.setValueAtTime(0.0001, crossfadeStartTime);
    musicGain.gain.linearRampToValueAtTime(MUSIC_FILE_VOL, crossfadeEndTime);
  }

  if (proceduralGain) {
    proceduralGain.gain.setValueAtTime(proceduralGain.gain.value, crossfadeStartTime);
    proceduralGain.gain.linearRampToValueAtTime(0.0001, crossfadeEndTime);
  }

  setTimeout(() => {
    if (musicSource === 'file') {
      stopProceduralMusic();
    }
  }, Math.max(10, Math.round((crossfadeEndTime - ctx.currentTime) * 1000)));
}

function scheduleSirenPulse(T, index, halfBarDur) {
  if (!audioCtx || !bgmGain) return;
  const freq = sirenNoteAt(index);
  const dur = 0.9 * halfBarDur;

  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  const noteGain = audioCtx.createGain();

  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(freq, T);
  osc1.detune.setValueAtTime(-6, T);

  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(freq, T);
  osc2.detune.setValueAtTime(6, T);

  // Vibrato 6 Hz, +/-10 cent
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(6, T);
  lfoGain.gain.setValueAtTime(10, T);

  lfo.connect(lfoGain);
  lfoGain.connect(osc1.detune);
  lfoGain.connect(osc2.detune);

  // Lowpass 2500 Hz
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2500, T);

  // Envelope: attack 0.02s to SIREN_VOL = 0.07, hold, decay at end
  noteGain.gain.setValueAtTime(0.0001, T);
  noteGain.gain.linearRampToValueAtTime(SIREN_VOL, T + 0.02);
  noteGain.gain.setValueAtTime(SIREN_VOL, Math.max(T + 0.02, T + dur - 0.05));
  noteGain.gain.linearRampToValueAtTime(0.0001, T + dur);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(noteGain);
  noteGain.connect(bgmGain);

  osc1.start(T);
  osc2.start(T);
  lfo.start(T);

  osc1.stop(T + dur);
  osc2.stop(T + dur);
  lfo.stop(T + dur);
}

function startSirenScheduler(t0, bpm) {
  stopSirenScheduler();

  const barDur = 240 / bpm;
  const halfBarDur = barDur / 2;
  nextHalfBarIndex = 0;

  sirenIntervalId = setInterval(() => {
    if (!audioCtx || musicSource !== 'file' || !isBgmActive) return;

    const lookahead = 0.1;
    const now = audioCtx.currentTime;

    while ((t0 + nextHalfBarIndex * halfBarDur) < now + lookahead) {
      const halfBarTime = t0 + nextHalfBarIndex * halfBarDur;

      // Đổi cấp độ chỉ ở đầu mỗi ô nhịp (chỉ số chẵn)
      if (nextHalfBarIndex % 2 === 0) {
        const newLevel = levelFor(currentMeter);
        if (newLevel !== currentLevel) {
          currentLevel = newLevel;
          if (musicFilter) {
            const targetFreq = currentLevel === 1 ? MUSIC_LP_TENSE : MUSIC_LP_NORMAL;
            musicFilter.frequency.setTargetAtTime(targetFreq, halfBarTime, MUSIC_LP_TRANSITION);
          }
          updateDebugMusic();
        }
      }

      // Phát tiếng hú nếu ở level 1
      if (currentLevel === 1 && halfBarTime >= now - 0.05) {
        scheduleSirenPulse(halfBarTime, nextHalfBarIndex, halfBarDur);
      }

      nextHalfBarIndex++;
    }
  }, 25);
}

function stopSirenScheduler() {
  if (sirenIntervalId) {
    clearInterval(sirenIntervalId);
    sirenIntervalId = null;
  }
}

export function startBgm(meter = 0) {
  currentMeter = meter;
  if (caughtFadeTimeoutId) {
    clearTimeout(caughtFadeTimeoutId);
    caughtFadeTimeoutId = null;
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  if (isBgmActive) {
    return;
  }

  isBgmActive = true;

  if (isAudioDecoded && chaseAudioBuffer && chaseMeta) {
    startFileMusic(null, MUSIC_FILE_VOL);
  } else {
    startProceduralMusic();
  }
}

export function stopBgm(immediate = false) {
  if (!isBgmActive && musicSource === 'none') return;
  stopAllMusicImmediately();
}

function stopAllMusicImmediately() {
  if (caughtFadeTimeoutId) {
    clearTimeout(caughtFadeTimeoutId);
    caughtFadeTimeoutId = null;
  }
  isBgmActive = false;
  stopFileMusicNode();
  stopProceduralMusic();
  stopSirenScheduler();
  musicSource = 'none';
  currentLevel = 0;
  updateDebugMusic();
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
    // Stumble choke: "hụt hơi" — musicGain về 35% trong 0,08 s, lên lại trong 0,35 s
    if (musicGain && musicSource === 'file') {
      musicGain.gain.cancelScheduledValues(now);
      musicGain.gain.setValueAtTime(musicGain.gain.value, now);
      musicGain.gain.linearRampToValueAtTime(MUSIC_FILE_VOL * MUSIC_STUMBLE_VOL_MUL, now + MUSIC_STUMBLE_DROP_TIME);
      musicGain.gain.linearRampToValueAtTime(MUSIC_FILE_VOL, now + MUSIC_STUMBLE_DROP_TIME + MUSIC_STUMBLE_RECOVER_TIME);
    } else if (proceduralGain && musicSource === 'procedural') {
      proceduralGain.gain.cancelScheduledValues(now);
      proceduralGain.gain.setValueAtTime(proceduralGain.gain.value, now);
      proceduralGain.gain.linearRampToValueAtTime(MUSIC_STUMBLE_VOL_MUL, now + MUSIC_STUMBLE_DROP_TIME);
      proceduralGain.gain.linearRampToValueAtTime(1.0, now + MUSIC_STUMBLE_DROP_TIME + MUSIC_STUMBLE_RECOVER_TIME);
    }

    // Hit SFX: Sine 110 Hz → 60 Hz 0.25 s + nhiễu ngắn 0.08 s
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
    // Tắt dần nhạc nền: hạ musicGain về 0 trong 0,3 s rồi stop()
    if (musicGain) {
      musicGain.gain.cancelScheduledValues(now);
      musicGain.gain.setValueAtTime(musicGain.gain.value, now);
      musicGain.gain.linearRampToValueAtTime(0.0001, now + MUSIC_CAUGHT_FADE_TIME);
    }
    if (proceduralGain) {
      proceduralGain.gain.cancelScheduledValues(now);
      proceduralGain.gain.setValueAtTime(proceduralGain.gain.value, now);
      proceduralGain.gain.linearRampToValueAtTime(0.0001, now + MUSIC_CAUGHT_FADE_TIME);
    }

    stopSirenScheduler();

    caughtFadeTimeoutId = setTimeout(() => {
      stopAllMusicImmediately();
    }, MUSIC_CAUGHT_FADE_TIME * 1000);

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
