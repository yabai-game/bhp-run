import { classifySwipe, isTap } from './gesture.js';

export function createInput(canvas) {
  const queue = [];

  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let swipeLocked = false;

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
      case 'KeyD':
        queue.push('right');
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
    destroy() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('keydown', onKeyDown);
    }
  };
}
