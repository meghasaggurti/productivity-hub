// src/components/WorkspaceTree.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, auth, googleProvider } from "@/lib/clientOnlyDb";
import type { Page } from '@/types/app';
import { moveOrReorderPage } from '@/lib/ops';
import { useDragAutoScroll } from '@/hooks/useDragAutoScroll';

// --- icons ---
function IconChevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5"
      className={`transition-transform ${open ? 'rotate-90' : ''}`}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
function IconPage() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconMore() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

type Props = {
  wsId: string;
  onOpen?: (p: Page) => void;
};

type ByParent = Record<string, Page[]>;
type ParentOf = Record<string, string | null>;
type ById = Record<string, Page>;

export default function WorkspaceTree({ wsId, onOpen }: Props) {
  const [pages, setPages] = useState<Page[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  // drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [indicator, setIndicator] = useState<{ y: number; x: number; type: 'before' | 'after' | 'inside' } | null>(null);

  // container for auto-scroll
  const containerRef = useRef<HTMLDivElement | null>(null);
  const autoScroll = useDragAutoScroll(containerRef);

  // Load live pages
  useEffect(() => {
    if (!wsId) return;
    const qPages = query(
      collection(db, 'workspaces', wsId, 'pages'),
      where('isDeleted', '==', false)
    );
    const off = onSnapshot(qPages, (s) => {
      const list = s.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Page[];
      setPages(list);
    });
    return () => off();
  }, [wsId]);

  // Tree indexes
  const { byParent, byId, parentOf } = useMemo(() => {
    const _byParent: ByParent = {};
    const _byId: ById = {};
    const _parentOf: ParentOf = {};
    for (const p of pages) {
      _byId[p.id] = p;
      _parentOf[p.id] = p.parentId ?? null;
      const key = p.parentId ?? '__root__';
      (_byParent[key] ||= []).push(p);
    }
    const sort = (a: Page, b: Page) =>
      (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title);
    Object.keys(_byParent).forEach((k) => _byParent[k].sort(sort));
    return { byParent: _byParent, byId: _byId, parentOf: _parentOf };
  }, [pages]);

  const getSiblings = (parentId: string | null) => byParent[parentId ?? '__root__'] ?? [];

  // Guard: cannot drop into your own descendant
  const isDescendant = (maybeChildId: string, maybeAncestorId: string) => {
    let cur = parentOf[maybeChildId];
    while (cur) {
      if (cur === maybeAncestorId) return true;
      cur = parentOf[cur];
    }
    return false;
  };

  async function addPage(parentId: string | null) {
    const siblings = getSiblings(parentId);
    const maxOrder = siblings.reduce((m, p) => Math.max(m, p.order ?? 0), -1);
    const now = Date.now();
    const ref = await addDoc(collection(db, 'workspaces', wsId, 'pages'), {
      title: 'Untitled',
      parentId,
      order: maxOrder + 1,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    } as Partial<Page>);
    if (parentId) setOpen((o) => ({ ...o, [parentId]: true }));
    setEditing(ref.id);
  }

  async function renamePage(p: Page, title: string) {
    await updateDoc(doc(db, 'workspaces', wsId, 'pages', p.id), { title, updatedAt: Date.now() });
  }
  async function trashPage(p: Page) {
    await updateDoc(doc(db, 'workspaces', wsId, 'pages', p.id), { isDeleted: true, updatedAt: Date.now() });
  }

  async function placeDragged(args: {
    dropType: 'before' | 'after' | 'inside';
    target: Page;
    parentId: string | null;     // target's parent (for before/after)
    indexInParent: number;       // target index among its siblings
  }) {
    const draggedId = draggingId!;
    const dragged = byId[draggedId];
    if (!dragged) return;

    // Don’t allow dropping into own descendant
    if (args.dropType === 'inside' && isDescendant(args.target.id, draggedId)) {
      setDraggingId(null);
      setIndicator(null);
      return;
    }

    let newParentId = args.parentId;
    let insertIndex = args.indexInParent;

    if (args.dropType === 'inside') {
      newParentId = args.target.id;
      insertIndex = getSiblings(newParentId).length; // append
    } else if (args.dropType === 'after') {
      insertIndex = args.indexInParent + 1;
    }

    const sibs = getSiblings(newParentId);
    const withoutDragged = sibs.filter((p) => p.id !== draggedId);
    const newIds = [
      ...withoutDragged.slice(0, insertIndex).map((p) => p.id),
      draggedId,
      ...withoutDragged.slice(insertIndex).map((p) => p.id),
    ];

    await moveOrReorderPage({ wsId, pageId: draggedId, newParentId, siblingIdsInFinalOrder: newIds });

    if (args.dropType === 'inside') setOpen((o) => ({ ...o, [args.target.id]: true }));
    setDraggingId(null);
    setIndicator(null);
  }

  // ----- Row -----
  function Row({
    p, depth, parentId, indexInParent,
  }: { p: Page; depth: number; parentId: string | null; indexInParent: number; }) {
    const rowRef = useRef<HTMLDivElement | null>(null);
    const children = byParent[p.id] || [];
    const isOpen = !!open[p.id];

    function onDragStart(e: React.DragEvent) {
      setDraggingId(p.id);
      try {
        e.dataTransfer.setData('text/plain', p.id);
        const crt = document.createElement('div'); crt.style.opacity = '0';
        document.body.appendChild(crt); e.dataTransfer.setDragImage(crt, 0, 0);
        setTimeout(() => document.body.removeChild(crt), 0);
      } catch {}
      e.dataTransfer.effectAllowed = 'move';
    }
    function onDragEnd() { setDraggingId(null); setIndicator(null); }

    function onDragOver(e: React.DragEvent) {
      if (!draggingId || draggingId === p.id) return;

      const el = rowRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const y = e.clientY - r.top;
      const h = r.height || 1;

      let type: 'before' | 'after' | 'inside' = 'inside';
      if (y < h / 3) type = 'before';
      else if (y > (2 * h) / 3) type = 'after';

      const globalY = type === 'before' ? r.top : type === 'after' ? r.bottom : r.top + h / 2;
      const xIndent = 16 * depth + 20;
      setIndicator({ y: globalY, x: xIndent, type });

      // Auto-expand after hovering middle for 400ms
      if (type === 'inside' && !isOpen) {
        const id = window.setTimeout(() => setOpen((o) => ({ ...o, [p.id]: true })), 400);
        el.onmouseleave = () => window.clearTimeout(id);
      }

      autoScroll.onDragOver(e);
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }

    function onDrop(e: React.DragEvent) {
      e.preventDefault();
      if (!draggingId || draggingId === p.id) return;
      const dropType = indicator?.type ?? 'inside';
      placeDragged({ dropType, target: p, parentId, indexInParent });
    }

    return (
      <li role="listitem">
        <div
          ref={rowRef}
          className="group flex items-center gap-1 px-1 py-1 rounded hover:bg-neutral-100 cursor-grab active:cursor-grabbing"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <button
            className="px-1 py-0.5 rounded hover:bg-neutral-200"
            onClick={() => setOpen((o) => ({ ...o, [p.id]: !o[p.id] }))}
            aria-label="toggle"
            title={isOpen ? 'Collapse' : 'Expand'}
          >
            <IconChevron open={isOpen} />
          </button>

          <IconPage />

          {editing === p.id ? (
            <input
              autoFocus
              defaultValue={p.title}
              onBlur={(e) => { const v = e.currentTarget.value.trim() || 'Untitled'; renamePage(p, v); setEditing(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
              className="ml-1 flex-1 bg-white border px-1 py-0.5 rounded text-sm"
            />
          ) : (
            <button
              className="text-left ml-1 flex-1 truncate text-sm"
              onClick={() => onOpen?.(p)}
              onDoubleClick={() => setEditing(p.id)}
              title={p.title}
            >
              {p.title}
            </button>
          )}

          <button className="opacity-0 group-hover:opacity-100 rounded px-1 py-0.5 hover:bg-neutral-200" onClick={() => addPage(p.id)} title="Add subpage">
            <IconPlus />
          </button>

          <div className="relative">
            <button
              className="opacity-0 group-hover:opacity-100 rounded px-1 py-0.5 hover:bg-neutral-200"
              onClick={() => setMenuFor(menuFor === p.id ? null : p.id)}
              title="More"
            >
              <IconMore />
            </button>
            {menuFor === p.id && (
              <div className="absolute right-0 top-6 z-10 w-36 bg-white border rounded shadow">
                <button className="w-full text-left px-3 py-2 hover:bg-neutral-50"
                  onClick={() => { setEditing(p.id); setMenuFor(null); }}>
                  Rename
                </button>
                <button className="w-full text-left px-3 py-2 hover:bg-neutral-50 text-red-600"
                  onClick={() => { trashPage(p); setMenuFor(null); }}>
                  Move to Trash
                </button>
              </div>
            )}
          </div>
        </div>

        {isOpen && (
          <ul role="list" className="ml-6 mt-1 space-y-0.5">
            {(byParent[p.id] || []).map((c, i) => (
              <Row key={c.id} p={c} depth={depth + 1} parentId={p.id} indexInParent={i} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const roots = byParent['__root__'] || [];

  return (
    <div ref={containerRef} className="relative">
      <div className="mb-1">
        <button className="text-xs px-2 py-1 rounded hover:bg-neutral-100 flex items-center gap-1" onClick={() => addPage(null)}>
          <IconPlus /> New page
        </button>
      </div>

      <ul role="list" className="space-y-0.5">
        {roots.map((p, i) => (
          <Row key={p.id} p={p} depth={0} parentId={null} indexInParent={i} />
        ))}
        {roots.length === 0 && <li className="text-sm opacity-60 px-1">No pages yet.</li>}
      </ul>

      {/* global drop indicator for before/after */}
      {indicator && (indicator.type === 'before' || indicator.type === 'after') && (
        <div
          className="pointer-events-none fixed z-50 h-[2px] bg-black/40"
          style={{ top: indicator.y - 1, left: indicator.x, right: 24 }}
        />
      )}
    </div>
  );
}



