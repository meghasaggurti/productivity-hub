// src/components/MovePageDialog.tsx
"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from '@/lib/clientOnlyDb';
import { buildPageTree, type PageNode } from "@/utils/pageTree";

type Props = {
  workspaceId: string;
  pages: PageNode[];
  pageId: string;
  onClose: () => void;
};

/**
 * MovePageDialog
 * - Lets the user move a page to root or under another page.
 * - Prevents moving a page under itself or any of its descendants.
 * - Puts the page at the end of the chosen destination's siblings.
 */
function MovePageDialogImpl({ workspaceId, pages, pageId, onClose }: Props): React.ReactElement {
  // IMPORTANT: use buildPageTree (returns { roots, childrenByParent })
  const { roots, childrenByParent } = useMemo(() => buildPageTree(pages), [pages]);

  // null = root; otherwise a page id as destination parent
  const [dest, setDest] = useState<string | null>(null);

  const page = pages.find((p) => p.id === pageId);

  // Build a Set of forbidden ids (the page itself and all its descendants)
  const forbidden = useMemo(() => {
    const bag = new Set<string>();
    if (!page) return bag;

    const walk = (id: string) => {
      bag.add(id);
      (childrenByParent[id] || []).forEach((c) => walk(c.id));
    };
    walk(page.id);
    return bag;
  }, [childrenByParent, page]);

  // Flatten tree into a list of selectable destinations with indentation depth
  const candidates = useMemo(() => {
    const items: { id: string; title: string; depth: number }[] = [];

    const walk = (nodes: PageNode[], depth: number) => {
      nodes.forEach((n) => {
        if (!forbidden.has(n.id)) {
          items.push({ id: n.id, title: n.title || "Untitled Page", depth });
          const kids = childrenByParent[n.id] || [];
          if (kids.length) walk(kids, depth + 1);
        }
      });
    };

    walk(roots, 0);
    return items;
  }, [roots, childrenByParent, forbidden]);

  // Apply the move
  async function confirmMove() {
    if (!page) return;

    // Place at the end of the destination’s sibling list
    const siblings = pages
      .filter((p) => (dest ? p.parentId === dest : p.parentId == null) && !p.isDeleted)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const lastOrder = siblings.at(-1)?.order ?? 0;
    const newOrder = Math.floor(lastOrder + 1);

    await updateDoc(doc(db, "workspaces", workspaceId, "pages", page.id), {
      parentId: dest,
      order: newOrder,
      updatedAt: serverTimestamp(),
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* scrim */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* card */}
      <div className="relative w-[560px] max-w-[96vw] bg-white border shadow-2xl rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Move Page</h2>
          <button className="px-2 py-1 rounded hover:bg-neutral-100" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="text-sm text-neutral-600">Choose a destination:</div>

          <div className="border rounded divide-y max-h-[320px] overflow-auto">
            {/* Move to root */}
            <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-neutral-50">
              <input
                type="radio"
                name="dest"
                checked={dest === null}
                onChange={() => setDest(null)}
              />
              <span>Main (root)</span>
            </label>

            {/* Move under a page (excluding forbidden ids) */}
            {candidates.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-neutral-50"
              >
                <input
                  type="radio"
                  name="dest"
                  checked={dest === item.id}
                  onChange={() => setDest(item.id)}
                />
                <span className="truncate" style={{ paddingLeft: item.depth * 12 }}>
                  ▸ {item.title}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="px-3 py-2 rounded hover:bg-neutral-100" onClick={onClose}>
            Cancel
          </button>
          <button className="px-3 py-2 rounded bg-black text-white" onClick={confirmMove}>
            Move
          </button>
        </div>
      </div>
    </div>
  );
}

// Named + default exports to avoid import shape issues across client/server boundaries.
export const MovePageDialog = MovePageDialogImpl;
export default MovePageDialogImpl;
