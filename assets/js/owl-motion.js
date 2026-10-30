const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function idlePose(seconds) {
  return {
    yaw: Math.sin(seconds * Math.PI * 2 / 12) * 0.035,
    pitch: Math.sin(seconds * Math.PI * 2 / 15) * 0.012,
    bob: Math.sin(seconds * Math.PI * 2 / 8) * 0.02,
  };
}

export function pointerTarget(x, y, rect) {
  return {
    yaw: clamp((x - rect.left - rect.width / 2) / Math.max(rect.width / 2, 1), -1, 1) * 0.48,
    pitch: clamp((y - rect.top - rect.height / 2) / Math.max(rect.height / 2, 1), -1, 1) * 0.28,
  };
}

export function follow(current, target, delta) {
  const alpha = 1 - Math.exp(-4.5 * Math.min(Math.max(delta, 0), 0.05));
  current.yaw += (target.yaw - current.yaw) * alpha;
  current.pitch += (target.pitch - current.pitch) * alpha;
  return Math.abs(target.yaw - current.yaw) + Math.abs(target.pitch - current.pitch) > 0.0001;
}
