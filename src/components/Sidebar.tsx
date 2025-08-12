// src/components/Sidebar.tsx
"use client";

/**
 * Sidebar:
 * - Middle: Workspaces + Pages
 * - Bottom: sticky user footer (avatar, name/email, Settings, Sign out)
 * - Uses client-side sort to avoid composite-index requirements during dev
 */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import { collection, onSnapshot, query, where, addDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebaseDb";
import LogoutButton from "./LogoutButton";

type WS = { id: string; name: string; createdAt?: number };
type Page = { id: string; title: string; order: number };

export default function Sidebar({ currentWorkspaceId }: { currentWorkspaceId?: string }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WS[]>([]);
  const [pages, setPages] = useState<Page[]>([]);

  // Initial for avatar if no photo
  const avatarFallback = useMemo(
    () => (user?.displayName?.[0] ?? user?.email?.[0] ?? "?").toUpperCase(),
    [user]
  );

  // Load workspaces (client-side sort by createdAt)
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "workspaces"),
      where("memberIds", "array-contains", user.uid)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data() as any;
          return { id: d.id, name: data.name, createdAt: data.createdAt ?? 0 } as WS;
        });
        list.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
        setWorkspaces(list);
      },
      async (err) => {
        // Fallback while an index is building, etc.
        if ((err as any).code === "failed-precondition") {
          const snap = await getDocs(q);
          const list = snap.docs.map((d) => {
            const data = d.data() as any;
            return { id: d.id, name: data.name, createdAt: data.createdAt ?? 0 } as WS;
          });
          list.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
          setWorkspaces(list);
        } else {
          console.error("[Sidebar] workspaces onSnapshot error:", err);
        }
      }
    );

    return () => unsub();
  }, [user]);

  // Load pages for the current workspace (client-side sort by order)
  useEffect(() => {
    if (!currentWorkspaceId) return;

    const q = query(collection(db, "workspaces", currentWorkspaceId, "pages"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data() as any;
          return { id: d.id, title: data.title, order: data.order ?? 0 } as Page;
        });
        list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setPages(list);
      },
      async (err) => {
        if ((err as any).code === "failed-precondition") {
          const snap = await getDocs(q);
          const list = snap.docs.map((d) => {
            const data = d.data() as any;
            return { id: d.id, title: data.title, order: data.order ?? 0 } as Page;
          });
          list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setPages(list);
        } else {
          console.error("[Sidebar] pages onSnapshot error:", err);
        }
      }
    );

    return () => unsub();
  }, [currentWorkspaceId]);

  // Create a new page at the end
  const addPage = async () => {
    if (!currentWorkspaceId) return;
    const nextOrder = (pages.at(-1)?.order ?? -1) + 1;
    await addDoc(collection(db, "workspaces", currentWorkspaceId, "pages"), {
      title: "Untitled Page",
      parentId: null,
      order: nextOrder,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  return (
    <aside className="border-r p-3 h-screen flex flex-col">
      {/* CONTENT */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
        {/* Workspaces */}
        <div>
          <div className="text-sm font-semibold text-gray-500 mb-1">Workspaces</div>
          <nav className="space-y-1">
            {workspaces.map((w) => (
              <Link
                key={w.id}
                href={`/w/${w.id}`} // workspace landing redirects to first page
                className={`block px-2 py-1 rounded ${
                  w.id === currentWorkspaceId ? "bg-gray-100" : "hover:bg-gray-50"
                }`}
              >
                {w.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="h-px bg-gray-200" />

        {/* Pages */}
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-500">Pages</div>
          <button onClick={addPage} className="text-xs border px-2 py-1 rounded">+ New</button>
        </div>
        <nav className="space-y-1">
          {pages.map((p) => (
            <Link
              key={p.id}
              href={`/w/${currentWorkspaceId}/p/${p.id}`}
              className="block px-2 py-1 rounded hover:bg-gray-100"
            >
              {p.title}
            </Link>
          ))}
        </nav>
      </div>

      {/* FOOTER: user panel pinned at bottom */}
      <div className="mt-auto pt-3 border-t">
        <div className="flex items-center gap-3 p-2 rounded-lg">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="avatar" className="size-8 rounded-full border" />
          ) : (
            <div className="size-8 rounded-full border grid place-items-center text-sm bg-white">
              {avatarFallback}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{user?.displayName ?? "Unnamed"}</div>
            <div className="text-xs text-gray-500 truncate">{user?.email}</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/settings" className="text-xs underline">Settings</Link>
            <LogoutButton />
          </div>
        </div>
      </div>
    </aside>
  );
}
