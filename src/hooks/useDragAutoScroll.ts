// src/hooks/useDragAutoScroll.ts
'use client';

import { useCallback, useRef } from 'react';

/**
 * Auto-scroll a scrollable container while dragging near its top/bottom edges.
 *
 * Usage:
 *   const listRef = useRef<HTMLDivElement | null>(null);
 *   const { onDragOver } = useDragAutoScroll(listRef);
 *   ...
 *   <div ref={listRef} onDragOver={onDragOver}>...</div>
 */
export function useDragAutoScroll<T extends HTMLElement>(
  containerRef: React.RefObject<T | null>
) {
  const lastTsRef = useRef(0);

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      const el = containerRef.current;
      if (!el) return;

      const now = performance.now?.() ?? Date.now();
      if (now - lastTsRef.current < 12) return; // ~80fps throttle
      lastTsRef.current = now;

      const rect = el.getBoundingClientRect();
      const y = e.clientY;

      // Start scrolling when pointer is within EDGE px of top/bottom.
      const EDGE = Math.min(64, rect.height / 4);
      const MAX_STEP = 22;

      let dy = 0;
      if (y < rect.top + EDGE) {
        const dist = rect.top + EDGE - y;
        dy = -Math.min(MAX_STEP, Math.max(1, dist / 4));
      } else if (y > rect.bottom - EDGE) {
        const dist = y - (rect.bottom - EDGE);
        dy = Math.min(MAX_STEP, Math.max(1, dist / 4));
      }

      if (dy !== 0) {
        el.scrollTop += dy;
      }
    },
    [containerRef]
  );

  return { onDragOver };
}

export default useDragAutoScroll;

