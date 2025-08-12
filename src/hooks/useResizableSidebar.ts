// src/hooks/useResizableSidebar.ts
import { useCallback, useEffect, useRef, useState } from "react";

const WIDTH_KEY = "phub.sidebarWidth";
const COLLAPSED_KEY = "phub.sidebarCollapsed";
const DEFAULT_WIDTH = 288; // px (~w-72)
const MIN_W = 200;
const MAX_W = 520;

export function useResizableSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const dragging = useRef(false);

  // Load saved prefs on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const cw = window.localStorage.getItem(WIDTH_KEY);
    const c = window.localStorage.getItem(COLLAPSED_KEY);
    if (cw) {
      const px = parseInt(cw, 10);
      if (!Number.isNaN(px)) setWidth(Math.min(MAX_W, Math.max(MIN_W, px)));
    }
    if (c) setCollapsed(c === "1");
  }, []);

  // Persist prefs
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(WIDTH_KEY, String(width));
  }, [width]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // Start drag to resize
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      const startX = e.clientX;
      const startW = width;

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = ev.clientX - startX;
        const next = Math.min(MAX_W, Math.max(MIN_W, startW + delta));
        setWidth(next);
      };

      const onUp = () => {
        dragging.current = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [width]
  );

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);

  return {
    collapsed,
    width,
    onMouseDown,
    toggleCollapsed,
    setCollapsed,
    setWidth,
    MIN_W,
    MAX_W,
  };
}

