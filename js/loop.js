import { DT } from './config.js';

export function createAccState() {
  return { accumulator: 0 };
}

export function advance(accState, frameTime, pollFn, stepFn, dt = DT, maxFrameTime = 0.25) {
  const clampedFrameTime = Math.min(frameTime, maxFrameTime);
  accState.accumulator += clampedFrameTime;

  let isFirstStepInFrame = true;
  let stepsRun = 0;

  while (accState.accumulator >= dt) {
    const actions = isFirstStepInFrame ? (pollFn ? pollFn() : []) : [];
    isFirstStepInFrame = false;
    stepFn(dt, actions);
    accState.accumulator -= dt;
    stepsRun++;
  }

  return stepsRun;
}
