// src/app/trash/page.tsx
"use client";

/**
 * Trash
 * - Lists deleted workspaces (user is member of) and deleted pages across those workspaces
 * - Restore workspace / restore page
 * - Permanently delete page (hard delete)
 *
 * Note: We filter client-side to avoid new indexes during MVP.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebaseDb";
import { restoreWorkspace, restorePage, hardDeletePage } from "@/lib/ops";

type WS = { id: string; name: string; deletedAt?: any };
type PageItem = { id: string; title: string; wsId: string; deletedAt?: any };

export default function TrashPage() {
  const { user } = useAuth();
  const [deletedWorkspaces, setDeletedWorkspaces] = useState<WS[]>([]);
  const [deletedPages, setDeletedPages] = useState<PageItem[]>([]);

  // Deleted workspaces
  useEffect(() => {
    if (!user) return;

    const qMy = query(
      collection(db, "workspaces"),
      where("memberIds", "array-contains", user.uid)
    );

    const unsub = onSnapshot(qMy, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      const deleted = all.filter((w: any) => w.isDeleted);
      setDeletedWorkspaces(
        deleted.map((w: any) => ({
          id: w.id,
          name: w.name,
          deletedAt: w.deletedAt,
        }))
      );
    });

    return () => unsub();
  }, [user]);

  // Deleted pages across my workspaces
  useEffect(() => {
    if (!user) return;

    (async () => {
      const acc: PageItem[] = [];
      const wq = query(
        collection(db, "workspaces"),
        where("memberIds", "array-contains", user.uid)
      );
      const wSnap = await getDocs(wq);
      for (const wDoc of wSnap.docs) {
        const wsId = wDoc.id;
        const pagesSnap = await getDocs(
          collection(db, "workspaces", wsId, "pages")
        );
        pagesSnap.forEach((p) => {
          const data = p.data() as any;
          if (data.isDeleted) {
            acc.push({
              id: p.id,
              title: data.title,
              wsId,
              deletedAt: data.deletedAt,
            });
          }
        });
      }
      setDeletedPages(acc);
    })();
  }, [user]);

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Trash</h1>

      <section className="mb-8">
        <h2 className="text-lg font-medium mb-2">Workspaces</h2>
        {deletedWorkspaces.length === 0 ? (
          <div className="text-sm text-gray-500">No deleted workspaces.</div>
        ) : (
          <ul className="space-y-2">
            {deletedWorkspaces.map((w) => (
              <li key={w.id} className="flex items-center gap-2 border rounded p-2">
                <div className="flex-1">
                  <div className="font-medium">{w.name}</div>
                  <div className="text-xs text-gray-500">
                    Will auto-delete 30 days after deletion.
                  </div>
                </div>
                <button
                  onClick={() => restoreWorkspace(w.id)}
                  className="text-sm border px-2 py-1 rounded hover:bg-gray-50"
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Pages</h2>
        {deletedPages.length === 0 ? (
          <div className="text-sm text-gray-500">No deleted pages.</div>
        ) : (
          <ul className="space-y-2">
            {deletedPages.map((p) => (
              <li key={p.id} className="flex items-center gap-2 border rounded p-2">
                <div className="flex-1">
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-gray-500">
                    Workspace: <span className="font-mono">{p.wsId}</span>
                  </div>
                </div>
                <button
                  onClick={() => restorePage(p.wsId, p.id)}
                  className="text-sm border px-2 py-1 rounded hover:bg-gray-50"
                >
                  Restore
                </button>
                <button
                  onClick={() => {
                    if (
                      confirm(
                        "Permanently delete this page? This cannot be undone."
                      )
                    ) {
                      hardDeletePage(p.wsId, p.id);
                    }
                  }}
                  className="text-sm border px-2 py-1 rounded hover:bg-red-50 text-red-700"
                >
                  Delete permanently
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

