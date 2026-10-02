/**
 * FLIP (First, Last, Invert, Play) for elements that move between steps: ShiftRows, the
 * a–h register shift, rows that reorder. Each moving element carries `data-flip-key`;
 * `measure` records where each one sits relative to the container, and `play` starts each
 * element from its old place and lets the `cv-move` keyframe (globals.css) carry it home.
 *
 * DOM-only and dependency-free on purpose (UIUX §6.1 rule 5): the keyframe does the
 * tweening, so this file only measures and sets two custom properties.
 */

export type FlipRects = Map<string, { x: number; y: number }>;

export const FLIP_ATTR = 'data-flip-key';

/** Where every keyed element sits now, relative to `root`. */
export function measure(root: Element): FlipRects {
  const origin = root.getBoundingClientRect();
  const rects: FlipRects = new Map();
  for (const node of root.querySelectorAll<HTMLElement>(`[${FLIP_ATTR}]`)) {
    const key = node.getAttribute(FLIP_ATTR);
    if (key === null) continue;
    const box = node.getBoundingClientRect();
    rects.set(key, { x: box.left - origin.left, y: box.top - origin.top });
  }
  return rects;
}

/** Restart a CSS animation class on `node`, from its first frame. */
export function restartClass(node: HTMLElement, className: string): void {
  node.classList.remove(className);
  // Reading layout here is the point: it makes the browser drop the old animation.
  void node.offsetWidth;
  node.classList.add(className);
}

/**
 * Move each keyed element from where it was (`before`) to where it is now. Elements that
 * didn't move, or weren't there before, are left alone. Returns how many moved.
 */
export function play(root: Element, before: FlipRects, after: FlipRects): number {
  let moved = 0;
  for (const node of root.querySelectorAll<HTMLElement>(`[${FLIP_ATTR}]`)) {
    const key = node.getAttribute(FLIP_ATTR);
    const from = key === null ? undefined : before.get(key);
    const to = key === null ? undefined : after.get(key);
    if (!from || !to) continue;
    const dx = from.x - to.x;
    const dy = from.y - to.y;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
    node.style.setProperty('--from-x', `${dx}px`);
    node.style.setProperty('--from-y', `${dy}px`);
    restartClass(node, 'motion-move');
    moved += 1;
  }
  return moved;
}
