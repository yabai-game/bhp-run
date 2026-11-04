export const CHARACTERS = {
  TEO: {
    id: 'TEO', name: 'TÈO', desc: 'Nhân vật gốc', unlockBest: 0, carriesChicken: false,
    story: 'Ở VN là boy phố, sang Nhật lương về tay 10 lá chưa ăn. Túng quá bỏ ra ngoài làm BHP.'
  },
  GA: {
    id: 'GA', name: 'TÍ', desc: 'Chạy chậm · gà vỗ cánh cứu 1 lần', unlockBest: 5000, carriesChicken: true,
    story: 'Qua Nhật sáng đi làm, chiều tối về đi trộm gà của người dân. Bị cảnh sát phát hiện nên trốn ra làm BHP.'
  }
};

export const CHARACTER_ORDER = ['TEO', 'GA'];

export function isUnlocked(id, best = 0, unlockAll = false) {
  if (!id || !CHARACTERS[id]) return false;
  if (unlockAll) return true;
  const numBest = Number.isFinite(best) ? best : 0;
  return numBest >= CHARACTERS[id].unlockBest;
}

export function nextCharacter(id, dir = 1) {
  let idx = CHARACTER_ORDER.indexOf(id);
  if (idx === -1) idx = 0;
  const step = dir >= 0 ? 1 : -1;
  const nextIdx = (idx + step + CHARACTER_ORDER.length) % CHARACTER_ORDER.length;
  return CHARACTER_ORDER[nextIdx];
}

export function sanitizeCharacter(id, best = 0, unlockAll = false) {
  if (isUnlocked(id, best, unlockAll)) return id;
  return 'TEO';
}

export function justUnlocked(prevBest = 0, newBest = 0) {
  const p = Number.isFinite(prevBest) ? prevBest : 0;
  const n = Number.isFinite(newBest) ? newBest : 0;
  const res = [];
  for (let i = 0; i < CHARACTER_ORDER.length; i++) {
    const id = CHARACTER_ORDER[i];
    const u = CHARACTERS[id].unlockBest;
    if (u > 0 && p < u && n >= u) {
      res.push(id);
    }
  }
  return res;
}
