// FK-54: a knockout bracket as big as the first screen allows (the cups pages, and FK-56's UCL simulator bracket).

import { useLayoutEffect, useRef } from 'react';

/** FK-54: the bracket's zoom limits and the room kept under it at the bottom of the window (CSS px). */
export const FIT_MIN = 0.6;
export const FIT_MAX = 3;
export const FIT_MARGIN = 12;

/**
 * FK-54: the knockout bracket as big as the first screen allows — CSS zoom (text and crests grow with the cells) to the
 * largest size at which it fits the page's width and the window's height below its top, so it is whole without
 * scrolling and the groups start right under it. Worked out at the bracket's natural size, again on a resize and when
 * the picks change (the simulator's waiting lists). Off where the bracket is not the page's first thing (the League view).
 */
export function useFitBracket(on: boolean, key: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!on || !el) return;
    const fit = () => {
      el.style.zoom = '1';
      el.classList.add('fk-ko-measure');
      const r = el.getBoundingClientRect();
      el.classList.remove('fk-ko-measure');
      const width = el.parentElement!.clientWidth;
      const height = window.innerHeight - (r.top + window.scrollY) - FIT_MARGIN;
      const z = Math.max(FIT_MIN, Math.min(FIT_MAX, width / r.width, height / r.height));
      el.style.zoom = String(Math.floor(z * 100) / 100);
      el.dataset.zoom = el.style.zoom;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [on, key]);
  return ref;
}

