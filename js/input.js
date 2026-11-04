import { classifySwipe, isTap, isDoubleTap } from './gesture.js';

export function createInput(canvas) {
  const queue = [];
  const tapsQueue = [];

  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let swipeLocked = false;
  let lastTapTime = 0;

  function onPointerDown(e) {
    if (activePointerId !== null) return;
    activePointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    startTime = performance.now();
    swipeLocked = false;
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (e.pointerId !== activePointerId) return;
    e.preventDefault();
    if (swipeLocked) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const action = classifySwipe(dx, dy);
    if (action !== null) {
      queue.push(action);
      swipeLocked = true;
    }
  }

  function onPointerUp(e) {
    if (e.pointerId !== activePointerId) return;
    e.preventDefault();
    if (!swipeLocked) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const elapsed = performance.now() - startTime;
      if (isTap(dx, dy, elapsed)) {
        queue.push('start');
        const now = performance.now();
        if (lastTapTime > 0 && isDoubleTap(lastTapTime, now)) {
          queue.push('drop');
          lastTapTime = 0;
        } else {
          lastTapTime = now;
        }

        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const cssW = rect.width || 540;
          const cssH = rect.height || 960;
          const scaleX = 540 / cssW;
          const scaleY = 960 / cssH;
          const logicX = (e.clientX - rect.left) * scaleX;
          const logicY = (e.clientY - rect.top) * scaleY;
          tapsQueue.push({ x: logicX, y: logicY });
        }
      }
    }
    activePointerId = null;
    swipeLocked = false;
  }

  function onPointerCancel(e) {
    if (e.pointerId !== activePointerId) return;
    activePointerId = null;
    swipeLocked = false;
  }

  function onKeyDown(e) {
    if (e.repeat) return;

    let handled = false;
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        queue.push('left');
        handled = true;
        break;
      case 'ArrowRight':
        queue.push('right');
        handled = true;
        break;
      case 'KeyD':
        queue.push('drop');
        handled = true;
        break;
      case 'KeyC':
        queue.push('char_next');
        handled = true;
        break;
      case 'ArrowUp':
      case 'KeyW':
        queue.push('jump');
        handled = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        queue.push('slide');
        handled = true;
        break;
      case 'Space':
        queue.push('start');
        queue.push('jump');
        handled = true;
        break;
      case 'Enter':
        queue.push('start');
        handled = true;
        break;
    }

    if (handled && (e.code.startsWith('Arrow') || e.code === 'Space')) {
      e.preventDefault();
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
  canvas.addEventListener('pointermove', onPointerMove, { passive: false });
  canvas.addEventListener('pointerup', onPointerUp, { passive: false });
  canvas.addEventListener('pointercancel', onPointerCancel, { passive: false });
  window.addEventListener('keydown', onKeyDown);

  return {
    pollActions() {
      if (queue.length === 0) return [];
      const actions = queue.slice();
      queue.length = 0;
      return actions;
    },
    pollTaps() {
      if (tapsQueue.length === 0) return [];
      const taps = tapsQueue.slice();
      tapsQueue.length = 0;
      return taps;
    },
    destroy() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('keydown', onKeyDown);
    }
  };
}
