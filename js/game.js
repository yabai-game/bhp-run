import {
  SPEED_START,
  SPEED_GAIN,
  SPEED_MAX,
  STUMBLE_SPEED_MUL,
  STUMBLE_TIME,
  METER_HIT,
  METER_DECAY,
  METER_MAX,
  RESTART_LOCK,
  DESPAWN_Z,
  ITEM_TYPES
} from './config.js';
import { createRng } from './rng.js';
import { createPlayer, applyAction, updatePlayer } from './player.js';
import { createSpawner } from './spawner.js';
import { checkCollisions } from './collide.js';

export function createGame(seed = 123456789, initialPhase = 'ready', opts = {}) {
  const rng = createRng(seed);
  return {
    phase: initialPhase,
    seed,
    time: 0,
    distance: 0,
    speed: SPEED_START,
    meter: 0,
    stumbleT: 0,
    items: 0,
    score: 0,
    caughtReason: null,
    restartLockT: 0,
    objects: [],
    player: createPlayer(),
    events: [],
    spawner: createSpawner(rng, opts)
  };
}

export function step(state, dt, actions = [], opts = {}) {
  state.events = [];

  if (state.phase === 'ready') {
    if (actions.includes('start')) {
      state.phase = 'running';
    }
    return state;
  }

  if (state.phase === 'caught') {
    if (state.restartLockT > 0) {
      state.restartLockT -= dt;
    }
    if (state.restartLockT <= 0 && actions.includes('start')) {
      const newSeed = opts?.seed !== undefined ? opts.seed : ((state.seed + 1) >>> 0);
      const nextGame = createGame(newSeed, 'running', opts);
      Object.assign(state, nextGame);
    }
    return state;
  }

  // 1. Áp action
  for (let i = 0; i < actions.length; i++) {
    const act = actions[i];
    if (act === 'left' || act === 'right' || act === 'jump' || act === 'slide') {
      const applied = applyAction(state.player, act);
      if (applied) {
        if (act === 'left') state.events.push({ type: 'lane', dir: -1 });
        else if (act === 'right') state.events.push({ type: 'lane', dir: 1 });
        else if (act === 'jump') state.events.push({ type: 'jump' });
        else if (act === 'slide') state.events.push({ type: 'slide' });
      }
    }
  }

  // 2. Cập nhật player
  updatePlayer(state.player, dt);

  // 3. Cập nhật tốc độ / quãng đường, trôi vật thể
  state.time += dt;
  const baseSpeed = Math.min(SPEED_START + SPEED_GAIN * state.time, SPEED_MAX);
  if (state.stumbleT > 0) {
    state.stumbleT = Math.max(0, state.stumbleT - dt);
    if (state.stumbleT <= 1e-9) {
      state.stumbleT = 0;
    }
    state.speed = baseSpeed * STUMBLE_SPEED_MUL;
  } else {
    state.speed = baseSpeed;
  }

  state.distance += state.speed * dt;
  for (let i = 0; i < state.objects.length; i++) {
    state.objects[i].z -= state.speed * dt;
  }

  // 4. Spawner
  state.spawner.update(state.objects, state.distance, state.speed);

  // 5. Va chạm
  const { hits, pickups } = checkCollisions(state.player, state.objects);

  for (let i = 0; i < pickups.length; i++) {
    const p = pickups[i];
    state.items += ITEM_TYPES[p.item].points;
    state.events.push({ type: 'pickup', item: p.item, lane: p.lane });
  }

  let hitOccurred = false;
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    state.events.push({ type: 'hit', obstacle: h.type });
    hitOccurred = true;

    if (state.stumbleT > 0) {
      state.phase = 'caught';
      state.caughtReason = 'double';
      state.restartLockT = RESTART_LOCK;
      state.events.push({ type: 'caught', reason: 'double' });
      break;
    } else {
      state.stumbleT = STUMBLE_TIME;
      state.speed = baseSpeed * STUMBLE_SPEED_MUL;
      state.meter = Math.min(METER_MAX, state.meter + METER_HIT);
      if (state.meter >= 100) {
        state.phase = 'caught';
        state.caughtReason = 'meter';
        state.restartLockT = RESTART_LOCK;
        state.events.push({ type: 'caught', reason: 'meter' });
        break;
      }
    }
  }

  // 6. Meter: chỉ giảm khi không va chạm và không trong trạng thái vấp (stumbleT === 0)
  if (!hitOccurred && state.stumbleT === 0) {
    state.meter = Math.max(0, state.meter - METER_DECAY * dt);
  }
  if (state.phase === 'running' && state.meter >= 100) {
    state.phase = 'caught';
    state.caughtReason = 'meter';
    state.restartLockT = RESTART_LOCK;
    state.events.push({ type: 'caught', reason: 'meter' });
  }

  // 7. Kiểm tra caught đã hoàn tất ở trên

  // 8. Dọn vật z < -5
  state.objects = state.objects.filter(obj => obj.z >= DESPAWN_Z);

  // Cập nhật điểm
  state.score = Math.floor(state.distance) + state.items;

  return state;
}
