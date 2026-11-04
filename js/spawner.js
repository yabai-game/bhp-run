import {
  DRAW_DIST,
  FIRST_ROW_Z,
  ROW_GAP_MIN,
  ROW_GAP_TIME,
  ITEM_TYPES,
  GRACE_M
} from './config.js';

const OBSTACLE_TYPE_LIST = ['GATE', 'BARRIER', 'VENDING'];

export function patternWeights(distance) {
  const d = Math.max(0, distance);
  let t = 0;
  if (d <= 300) {
    t = 0;
  } else if (d >= 1000) {
    t = 1;
  } else {
    t = (d - 300) / 700;
  }

  const single = 0.45 + t * (0.30 - 0.45);
  const twoBlocks = 0.20 + t * (0.30 - 0.20);
  const gateWall = 0.10 + t * (0.17 - 0.10);
  const barrierWall = 0.10 + t * (0.17 - 0.10);
  const itemsOnly = 0.15 + t * (0.06 - 0.15);

  return {
    single,
    twoBlocks,
    gateWall,
    barrierWall,
    itemsOnly
  };
}

export function pickItemType(r) {
  let cumulative = 0;
  const entries = Object.entries(ITEM_TYPES);
  for (let i = 0; i < entries.length; i++) {
    const [key, val] = entries[i];
    cumulative += val.prob;
    if (r < cumulative) {
      return key;
    }
  }
  return entries[entries.length - 1][0];
}

export function createSpawner(rng, opts = {}) {
  let nextSpawnDist = FIRST_ROW_Z;
  let lastGap = ROW_GAP_MIN;
  const forceItem = opts?.forceItem || null;

  function spawnRow(world, rowZ, speed, rowDist = nextSpawnDist) {
    const patternR = rng();
    const obstacles = [];
    let pattern = 'single';

    if (rowDist < GRACE_M) {
      const w = patternWeights(rowDist);
      const sum = w.single + w.itemsOnly;
      const pSingle = w.single / sum;
      if (patternR < pSingle) {
        pattern = 'single';
      } else {
        pattern = 'itemsOnly';
      }
    } else {
      const w = patternWeights(rowDist);
      const cSingle = w.single;
      const cTwoBlocks = cSingle + w.twoBlocks;
      const cGateWall = cTwoBlocks + w.gateWall;
      const cBarrierWall = cGateWall + w.barrierWall;

      if (patternR < cSingle) {
        pattern = 'single';
      } else if (patternR < cTwoBlocks) {
        pattern = 'twoBlocks';
      } else if (patternR < cGateWall) {
        pattern = 'gateWall';
      } else if (patternR < cBarrierWall) {
        pattern = 'barrierWall';
      } else {
        pattern = 'itemsOnly';
      }
    }

    if (pattern === 'single') {
      const typeIdx = Math.floor(rng() * 3);
      const type = OBSTACLE_TYPE_LIST[typeIdx];
      const lane = Math.floor(rng() * 3);
      obstacles.push({ kind: 'obstacle', type, lane, z: rowZ, hit: false });
    } else if (pattern === 'twoBlocks') {
      const emptyLane = Math.floor(rng() * 3);
      for (let l = 0; l < 3; l++) {
        if (l !== emptyLane) {
          obstacles.push({ kind: 'obstacle', type: 'VENDING', lane: l, z: rowZ, hit: false });
        }
      }
    } else if (pattern === 'gateWall') {
      for (let l = 0; l < 3; l++) {
        obstacles.push({ kind: 'obstacle', type: 'GATE', lane: l, z: rowZ, hit: false });
      }
    } else if (pattern === 'barrierWall') {
      for (let l = 0; l < 3; l++) {
        obstacles.push({ kind: 'obstacle', type: 'BARRIER', lane: l, z: rowZ, hit: false });
      }
    } else {
      pattern = 'itemsOnly';
    }

    // Determine valid lanes for items (lanes without VENDING in this row)
    const vendingLanes = new Set(obstacles.filter(o => o.type === 'VENDING').map(o => o.lane));
    const validLanes = [0, 1, 2].filter(l => !vendingLanes.has(l));
    const itemLane = validLanes[Math.floor(rng() * validLanes.length)];

    const items = [];
    let yabaiCountInRow = 0;
    for (let i = 0; i < 5; i++) {
      const itemZ = rowZ + 4 + i * 2;
      const ir = rng();
      let itemType;
      if (forceItem) {
        itemType = forceItem;
      } else {
        itemType = pickItemType(ir);
        if (itemType === 'YABAI') {
          if (yabaiCountInRow > 0) {
            itemType = 'TICKET';
          } else {
            yabaiCountInRow++;
          }
        }
      }

      items.push({
        kind: 'item',
        item: itemType,
        lane: itemLane,
        z: itemZ,
        taken: false
      });
    }

    if (world) {
      for (let i = 0; i < obstacles.length; i++) {
        world.push(obstacles[i]);
      }
      for (let i = 0; i < items.length; i++) {
        world.push(items[i]);
      }
    }

    return { pattern, obstacles, items, itemLane, rowZ, rowDist };
  }

  function update(world, distance, speed) {
    while (nextSpawnDist <= distance + DRAW_DIST) {
      const rowZ = nextSpawnDist - distance;
      const rowDist = nextSpawnDist;
      spawnRow(world, rowZ, speed, rowDist);
      lastGap = Math.max(ROW_GAP_MIN, speed * ROW_GAP_TIME);
      nextSpawnDist += lastGap;
    }
  }

  return {
    update,
    spawnRow,
    get nextSpawnDist() {
      return nextSpawnDist;
    },
    set nextSpawnDist(v) {
      nextSpawnDist = v;
    },
    get lastGap() {
      return lastGap;
    }
  };
}
