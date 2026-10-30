export function createFlow(x, y) {
  return {target: {x, y}, nodes: Array.from({length: 18}, () => ({x, y, vx: 0, vy: 0}))};
}

// A damped fluid spine keeps the wake connected through fast direction changes.
// Small integration steps make the motion independent of pointer event rate.
export function advanceFlow(flow, seconds) {
  const duration = Math.min(0.05, Math.max(0, seconds));
  const steps = Math.max(1, Math.ceil(duration * 120));
  const dt = duration / steps;
  for (let step = 0; step < steps; step++) {
    flow.nodes.forEach((node, index) => {
      const parent = index ? flow.nodes[index - 1] : flow.target;
      const frequency = index ? 23 : 34;
      for (const axis of ['x', 'y']) {
        const velocity = axis === 'x' ? 'vx' : 'vy';
        const offset = node[axis] - parent[axis];
        const impulse = node[velocity] + frequency * offset;
        const decay = Math.exp(-frequency * dt);
        node[axis] = parent[axis] + (offset + impulse * dt) * decay;
        node[velocity] = (node[velocity] - frequency * impulse * dt) * decay;
      }
      if (index) {
        const dx = node.x - parent.x, dy = node.y - parent.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 6) {
          node.x = parent.x + dx / distance * 6;
          node.y = parent.y + dy / distance * 6;
          node.vx *= 0.65; node.vy *= 0.65;
        }
      }
    });
  }
}

export function sampleFlow(flow, now, born) {
  const nodes = flow.nodes.map((node, index, all) => {
    const before = all[Math.max(0, index - 1)], after = all[Math.min(all.length - 1, index + 1)];
    const dx = before.x - after.x, dy = before.y - after.y;
    const length = Math.hypot(dx, dy);
    const curl = Math.sin(now / 420 - index * 0.42) * Math.min(1, length / 5) * (index / (all.length - 1)) * 5;
    return {x: node.x - dy / (length || 1) * curl, y: node.y + dx / (length || 1) * curl};
  });
  const samples = [];
  const spline = (a, b, c, d, t) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  for (let i = 0; i < nodes.length - 1; i++) {
    const [a, b, c, d] = [nodes[Math.max(0, i - 1)], nodes[i], nodes[i + 1], nodes[Math.min(nodes.length - 1, i + 2)]];
    const count = Math.max(1, Math.ceil(Math.hypot(c.x - b.x, c.y - b.y) / 2));
    for (let j = 0; j < count; j++) {
      const t = j / count, tail = (i + t) / (nodes.length - 1);
      samples.push({x: spline(a.x, b.x, c.x, d.x, t), y: spline(a.y, b.y, c.y, d.y, t), born,
        radiusScale: 1 - tail * 0.65, strength: 1 - tail * 0.2});
    }
  }
  return samples;
}
