/**
 * Shared staff and ledger geometry/rendering used by drag and draw modes.
 */

/** Converts client (viewport) coordinates to SVG user space using the SVG's screen CTM inverse. */
export function clientToSvg(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): { x: number; y: number } | null {
  try {
    const ctm = svg.getScreenCTM?.();
    if (!ctm) return null;
    const inv = ctm.inverse();
    if (typeof (globalThis as any).DOMPoint === 'function') {
      const p = new (globalThis as any).DOMPoint(clientX, clientY).matrixTransform(inv);
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
      return { x: p.x, y: p.y };
    }
    const pt = svg.createSVGPoint?.();
    if (!pt) return null;
    pt.x = clientX;
    pt.y = clientY;
    const p2 = pt.matrixTransform(inv);
    if (!Number.isFinite(p2.x) || !Number.isFinite(p2.y)) return null;
    return { x: p2.x, y: p2.y };
  } catch {
    return null;
  }
}

/** Finds the top and bottom Y (SVG units) of the five staff lines near the given X/Y. */
export function guessStaffBounds(
  svg: SVGSVGElement,
  noteCenterX: number,
  nearY: number
): { top: number; bottom: number } | null {
  const candidates: Array<{ y: number }> = [];
  const els = svg.querySelectorAll('path, line');
  for (const el of els) {
    const r = (el as SVGGraphicsElement).getBBox?.();
    if (!r) continue;
    if (r.width < 80) continue;
    if (r.height > 3) continue;
    if (noteCenterX < r.x - 5 || noteCenterX > r.x + r.width + 5) continue;
    const cy = r.y + r.height / 2;
    if (Math.abs(cy - nearY) > 300) continue;
    candidates.push({ y: cy });
  }
  if (candidates.length < 5) return null;
  candidates.sort((a, b) => Math.abs(a.y - nearY) - Math.abs(b.y - nearY));
  const nearest5 = candidates.slice(0, 5).map((c) => c.y);
  const top = Math.min(...nearest5);
  const bottom = Math.max(...nearest5);
  if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom <= top) return null;
  return { top, bottom };
}

/** One diatonic staff step (line–space) in SVG units from staff bounds. */
export function staffStepFromBounds(top: number, bottom: number): number {
  return Math.max(0.5, Math.min(50, ((bottom - top) / 4) / 2));
}

/** Y positions for ledger lines above/below staff (every 2 steps beyond staff). */
export function computeLedgerLineYs(
  staffTopY: number,
  staffBottomY: number,
  noteCenterY: number,
  staffStep: number
): number[] {
  const beyondTopSteps = Math.max(0, Math.ceil((staffTopY - noteCenterY) / staffStep));
  const beyondBottomSteps = Math.max(0, Math.ceil((noteCenterY - staffBottomY) / staffStep));
  const ys: number[] = [];
  const step2 = staffStep * 2;
  if (beyondTopSteps >= 2) {
    const lines = Math.floor(beyondTopSteps / 2);
    for (let i = 1; i <= lines; i++) ys.push(staffTopY - i * step2);
  } else if (beyondBottomSteps >= 2) {
    const lines = Math.floor(beyondBottomSteps / 2);
    for (let i = 1; i <= lines; i++) ys.push(staffBottomY + i * step2);
  }
  return ys;
}

/** Clears the group and appends horizontal ledger lines at the given Y positions. */
export function drawLedgerLines(
  group: SVGGElement,
  noteCenterX: number,
  halfWidth: number,
  ys: number[],
  stroke: string
): void {
  while (group.firstChild) group.removeChild(group.firstChild);
  const ns = 'http://www.w3.org/2000/svg';
  for (const y of ys) {
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', String(noteCenterX - halfWidth));
    line.setAttribute('x2', String(noteCenterX + halfWidth));
    line.setAttribute('y1', String(y));
    line.setAttribute('y2', String(y));
    line.setAttribute('stroke', stroke);
    line.setAttribute('stroke-width', '1');
    line.setAttribute('stroke-linecap', 'round');
    group.appendChild(line);
  }
}
