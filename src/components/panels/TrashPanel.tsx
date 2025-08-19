'use client';

import { useEffect, useRef, useState } from 'react';
import {
  collection,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth, googleProvider } from "@/lib/clientOnlyDb";
import { hardDeletePage, restorePage } from '@/lib/ops';

type Props = { wsId: string; onClose: () => void };

type PageRow = {
  id: string;
  title?: string;
  isDeleted?: boolean;
  updatedAt?: number | { seconds: number; nanoseconds: number };
};

export default function TrashPanel({ wsId, onClose }: Props) {
  const [trashed, setTrashed] = useState<PageRow[]>([]);

  // Live pages list; filter client-side to avoid composite index requirement
  useEffect(() => {
    if (!wsId) return;
    const ref = collection(db, 'workspaces', wsId, 'pages');
    const off = onSnapshot(ref, (snap) => {
      const rows: PageRow[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setTrashed(rows.filter((p) => p.isDeleted === true));
    });
    return () => off();
  }, [wsId]);

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const panelRef = useRef<HTMLDivElement | null>(null);

  async function onRestore(id: string) {
    try {
      await restorePage(wsId, id);
    } catch (e) {
      alert((e as Error)?.message || 'Failed to restore page');
    }
  }

  async function onDelete(id: string) {
    const ok = confirm('Permanently delete this page? This cannot be undone.');
    if (!ok) return;
    try {
      await hardDeletePage(wsId, id);
    } catch (e) {
      alert((e as Error)?.message || 'Failed to delete page');
    }
  }

  async function onEmpty() {
    const ok = confirm('Permanently delete ALL items in Trash? This cannot be undone.');
    if (!ok) return;
    for (const p of trashed) {
      try {
        await hardDeletePage(wsId, p.id);
      } catch (e) {
        console.error('Failed to delete page', p.id, e);
      }
    }
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {/* Backdrop */}
      <div
        className="pointer-events-auto fixed inset-0 bg-black/40"
        aria-hidden="true"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Trash"
        className="pointer-events-auto fixed right-0 top-0 h-full w-[min(720px,90vw)] bg-white shadow-xl border-l border-neutral-200 flex flex-col"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
          <h2 className="text-sm font-medium tracking-wide uppercase text-neutral-700">
            Trash
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-md px-3 py-1.5 border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            >
              Close
            </button>
            <button
              onClick={onEmpty}
              className="rounded-md px-3 py-1.5 border border-red-600 text-red-700 hover:bg-red-100"
            >
              Empty trash
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {trashed.length === 0 ? (
            <div className="text-[13px] text-neutral-500">Nothing in trash.</div>
          ) : (
            <ul className="space-y-2">
              {trashed.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-[13px] text-neutral-900 truncate">
                      {p.title || 'Untitled'}
                    </div>
                    <div className="text-[11px] text-neutral-500">#{p.id}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => onRestore(p.id)}
                      className="rounded-md px-3 py-1.5 border border-neutral-800 text-neutral-900 hover:bg-neutral-100"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => onDelete(p.id)}
                      className="rounded-md px-3 py-1.5 border border-red-600 text-red-700 hover:bg-red-100"
                    >
                      Delete forever
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}


