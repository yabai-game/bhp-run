export function loadSprites() {
  let noSprites = false;
  let noProps = false;
  if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    noSprites = params.get('nosprites') === '1';
    noProps = params.get('noprops') === '1';
  }

  if (noSprites) {
    return {
      ready: Promise.resolve({ teo: null, police: null, props: null }),
      late: Promise.resolve({ teo: null, police: null, props: null })
    };
  }

  const loadImg = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Decode tùy chọn sau onload, nếu lỗi decode thì không làm hỏng nạp ảnh
      if (typeof img.decode === 'function') {
        img.decode().catch(() => {});
      }
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Không thể nạp ảnh: ${src}`));
    img.src = src;
  });

  const loadSingle = async (baseName) => {
    try {
      const res = await fetch(`assets/sprites/${baseName}.json`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} cho ${baseName}.json`);
      }
      const data = await res.json();
      const img = await loadImg(`assets/sprites/${data.image || `${baseName}.webp`}`);
      return { img, data };
    } catch (err) {
      console.warn(`Không thể nạp atlas ${baseName}:`, err);
      return null;
    }
  };

  // Nạp 3 atlas độc lập: teo, police, props
  const pTeo = loadSingle('teo');
  const pPolice = loadSingle('police');
  const pProps = noProps ? Promise.resolve(null) : loadSingle('props');

  const loadAll = Promise.all([pTeo, pPolice, pProps])
    .then(([teo, police, props]) => ({ teo, police, props }));

  // Promise late: nạp xong thật (kể cả sau timeout ready)
  const late = loadAll.catch(err => {
    console.warn('Lỗi nạp sprite (late):', err);
    return { teo: null, police: null, props: null };
  });

  // Đồng hồ timeout 8 s chỉ đếm khi trang đang hiển thị (document.visibilityState === 'visible')
  let cleanupTimer = () => {};
  const timerPromise = new Promise((resolve) => {
    if (typeof document === 'undefined') {
      const t = setTimeout(resolve, 8000);
      cleanupTimer = () => clearTimeout(t);
      return;
    }

    let remainingMs = 8000;
    let lastVisibleTime = document.visibilityState === 'visible' ? performance.now() : null;
    let timerId = null;

    const stopTimer = () => {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    };

    const startTimer = () => {
      stopTimer();
      if (remainingMs <= 0) {
        cleanup();
        resolve();
        return;
      }
      lastVisibleTime = performance.now();
      timerId = setTimeout(() => {
        cleanup();
        resolve();
      }, remainingMs);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startTimer();
      } else {
        if (lastVisibleTime !== null) {
          const elapsed = performance.now() - lastVisibleTime;
          remainingMs -= elapsed;
          lastVisibleTime = null;
        }
        stopTimer();
      }
    };

    const cleanup = () => {
      stopTimer();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
    cleanupTimer = cleanup;

    document.addEventListener('visibilitychange', onVisibilityChange);
    if (document.visibilityState === 'visible') {
      startTimer();
    }
  });

  // Promise ready: resolve khi nạp xong hoặc hết 8s hiển thị
  const ready = Promise.race([
    loadAll.then(s => {
      cleanupTimer();
      return s;
    }),
    timerPromise.then(() => {
      console.warn('Quá thời gian nạp sprite (8s trang hiển thị), chuyển sang chế độ dự phòng.');
      return { teo: null, police: null, props: null };
    })
  ]).catch(err => {
    cleanupTimer();
    console.warn('Lỗi khi nạp sprite kịp thời:', err);
    return { teo: null, police: null, props: null };
  });

  return { ready, late };
}
