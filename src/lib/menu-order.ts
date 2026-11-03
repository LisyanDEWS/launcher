export type SlotRect = { left: number; top: number; width: number; height: number };

/** Returns a copy of `list` with the item at `from` moved to index `to` (clamped). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = list.slice();
  if (from < 0 || from >= next.length) return next;
  const target = Math.max(0, Math.min(next.length - 1, to));
  if (target === from) return next;
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item);
  return next;
}

/**
 * Which grid slot is under the pointer? The slot that contains it, otherwise the nearest slot centre —
 * so dropping in a gap or just outside the grid still does something sensible.
 */
export function slotAt(rects: readonly SlotRect[], x: number, y: number): number {
  if (!rects.length) return -1;
  const inside = rects.findIndex((r) => x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height);
  if (inside >= 0) return inside;
  let best = 0;
  let bestDistance = Infinity;
  rects.forEach((r, index) => {
    const distance = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}
