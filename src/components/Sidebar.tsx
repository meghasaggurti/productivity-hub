//src/components/Sidebar.tsx

"use client";

/**
 * Sidebar (collapsible + resizable) with:
 * - Profile dropdown (Invite Users, My Account, Sign out) — pretty menu
 * - Collapse chevron, Inbox popover, Calendar popover
 * - Workspace dropdown selector (+ add workspace)
 * - Pages: borderless search, + add page, nested pages with toggles
 * - Right-click context menu (pretty) on Workspace & Page: Rename, Move, Trash
 * - Settings & Trash section (below pages)
 * - Footer: Permissions
 *
 * Fully dynamic (Firestore). No placeholders.
 */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebaseDb";
import { useResizableSidebar } from "@/hooks/useResizableSidebar";
import {
  createWorkspaceWithInitialPage,
  getFirstPageId,
  renameWorkspace,
  renamePage,
  softDeleteWorkspace,
  softDeletePage,
} from "@/lib/ops";

// ---- Icons (custom, simple outlines to avoid look-alikes) ----
const IconChevron = ({ rotated = false }: { rotated?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
    <path
      d="M9 18l6-6-6-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      transform={rotated ? "rotate(180 12 12)" : "none"}
      style={{ transformOrigin: "12px 12px", transition: "transform 200ms ease" }}
    />
  </svg>
);

const IconInbox = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
    <path fill="currentColor" d="M3 4h18l-2 10h-5l-2 3l-2-3H5L3 4zm2 2l1.2 6H9l1.5 2.2L12 12h4.8L19 6H5z" />
  </svg>
);

const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
    <path fill="currentColor" d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2zm13 6H4v12h16V8z" />
  </svg>
);

const IconWorkspace = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
    <path fill="currentColor" d="M3 4h8v8H3zM13 4h8v5h-8zM13 11h8v9h-8z" />
  </svg>
);

const IconPage = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
    <path fill="currentColor" d="M6 2h9l3 3v15a2 2 0 0 1-2 2H6zM9 7h6v2H9zm0 4h6v2H9z" />
  </svg>
);

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
    <path fill="currentColor" d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" />
  </svg>
);

const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="currentColor"
      d="M19.14 12.94a7.07 7.07 0 0 0 .05-.94a7.07 7.07 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.04 7.04 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 12 0H8a.5.5 0 0 0-.49.41l-.36 2.54c-.58.23-1.12.53-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L.62 6.98a.5.5 0 0 0 .12.64l2.03 1.58c-.03.31-.05.63-.05.94s.02.63.05.94L.74 12.66a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.33.64.22l2.39-.96c.5.41 1.05.74 1.63.94l.36 2.54c.05.24.25.41.49.41h4c.24 0 .45-.17.49-.41l.36-2.54c.58-.23 1.12-.53 1.63-.94l2.39.96c.24.1.51 0 .64-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM10 8a4 4 0 1 1 0 8a4 4 0 0 1 0-8z"
    />
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
    <path fill="currentColor" d="M9 3h6l1 1h5v2H3V4h5l1-1zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z" />
  </svg>
);

const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="currentColor"
      d="M16 11c1.66 0 3-1.79 3-4s-1.34-4-3-4s-3 1.79-3 4s1.34 4 3 4zM8 12c2.21 0 4-2.24 4-5s-1.79-5-4-5S4 4.24 4 7s1.79 5 4 5zm8 2c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4zM8 14c-2.67 0-8 1.34-8 4v3h6v-3c0-1.23.5-2.35 1.34-3.31C7.54 14.23 7.76 14 8 14z"
    />
  </svg>
);

const IconPencil = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
    <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83l3.75 3.75l1.83-1.83z"/>
  </svg>
);

const IconFolderMove = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
    <path fill="currentColor" d="M10 4l2 2h8v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6h6zm5 5v2h-3v2h3v2l3-3l-3-3z"/>
  </svg>
);

// ---- Data types ----
type WS = { id: string; name: string; createdAt?: number; isDeleted?: boolean };
type Page = {
  id: string;
  title: string;
  parentId: string | null;
  order: number;
  isDeleted?: boolean;
};

// ---- Build nested tree from flat pages ----
function buildPageTree(pages: Page[]) {
  const children: Record<string, Page[]> = {};
  const root: Page[] = [];

  // Init child buckets
  pages.forEach((p) => (children[p.id] = children[p.id] || []));

  // Distribute into root/children
  pages.forEach((p) => {
    if (p.parentId) {
      children[p.parentId] = children[p.parentId] || [];
      children[p.parentId].push(p);
    } else {
      root.push(p);
    }
  });

  // Sort children by order
  Object.values(children).forEach((arr) => arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  root.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return { root, children };
}

// ---- Utility: collect all descendants for "Move" validation ----
function collectDescendants(pageId: string, childMap: Record<string, Page[]>, bag = new Set<string>()) {
  (childMap[pageId] || []).forEach((c) => {
    bag.add(c.id);
    collectDescendants(c.id, childMap, bag);
  });
  return bag;
}

export default function Sidebar({ currentWorkspaceId }: { currentWorkspaceId?: string }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { collapsed, width, onMouseDown, toggleCollapsed } = useResizableSidebar();

  // Data state
  const [workspaces, setWorkspaces] = useState<WS[]>([]);
  const [selectedWs, setSelectedWs] = useState<string | undefined>(currentWorkspaceId);
  const [pages, setPages] = useState<Page[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Quick info popovers & dropdowns
  const [profileOpen, setProfileOpen] = useState(false);
  const [wsOpen, setWsOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);

  // Right-click context menu state
  type MenuTarget =
    | { kind: "workspace"; wsId: string; label: string }
    | { kind: "page"; wsId: string; pageId: string; label: string };
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxPos, setCtxPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [ctxTarget, setCtxTarget] = useState<MenuTarget | null>(null);

  // Move menu for pages
  const [moveOpen, setMoveOpen] = useState(false);
  const [movePos, setMovePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [moveSource, setMoveSource] = useState<{ wsId: string; pageId: string; label: string } | null>(null);

  // Profile/inbox/calendar anchor refs (for positioning if needed later)
  const profileBtnRef = useRef<HTMLButtonElement | null>(null);
  const inboxBtnRef = useRef<HTMLButtonElement | null>(null);
  const calBtnRef = useRef<HTMLButtonElement | null>(null);
  const wsBtnRef = useRef<HTMLButtonElement | null>(null);

  // Optional realtime items
  const [inboxItems, setInboxItems] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  // Avatar fallback
  const avatarFallback = useMemo(
    () => (user?.displayName?.[0] ?? user?.email?.[0] ?? "?").toUpperCase(),
    [user]
  );

  // Load workspaces
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "workspaces"), where("memberIds", "array-contains", user.uid));

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as WS[];
        const clean = list.filter((w) => !w.isDeleted);
        clean.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
        setWorkspaces(clean);
        if (!selectedWs && clean.length > 0) setSelectedWs(clean[0].id);
      },
      async (err) => {
        if ((err as any).code === "failed-precondition") {
          const snap2 = await getDocs(q);
          const list = snap2.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as WS[];
          const clean = list.filter((w) => !w.isDeleted);
          clean.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
          setWorkspaces(clean);
          if (!selectedWs && clean.length > 0) setSelectedWs(clean[0].id);
        } else {
          console.error("[Sidebar] workspaces error:", err);
        }
      }
    );
    return () => unsub();
  }, [user, selectedWs]);

  // Load pages
  useEffect(() => {
    if (!selectedWs) return;
    const q = query(collection(db, "workspaces", selectedWs, "pages"));
    const unsub = onSnapshot(
      q,
      async (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Page[];
        const clean = list.filter((p) => !p.isDeleted);
        clean.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setPages(clean);
      },
      async (err) => {
        if ((err as any).code === "failed-precondition") {
          const snap2 = await getDocs(q);
          const list = snap2.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Page[];
          const clean = list.filter((p) => !p.isDeleted);
          clean.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setPages(clean);
        } else {
          console.error("[Sidebar] pages error:", err);
        }
      }
    );
    return () => unsub();
  }, [selectedWs]);

  // Optional inbox/events
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "userData", user.uid, "inbox"), orderBy("createdAt", "desc"), limit(10));
    const unsub = onSnapshot(q, (snap) => {
      setInboxItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    const q = query(
      collection(db, "userData", user.uid, "events"),
      where("startMs", ">", now),
      orderBy("startMs", "asc"),
      limit(5)
    );
    const unsub = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [user]);

  // Build nested structure
  const { root, children: childMap } = useMemo(() => buildPageTree(pages), [pages]);

  // Search state
  const [pageQuery, setPageQuery] = useState("");
  const normalizedQuery = pageQuery.trim().toLowerCase();
  const matchQuery = (p: Page) => !normalizedQuery || (p.title ?? "").toLowerCase().includes(normalizedQuery);

  // Add workspace
  const addWorkspace = async () => {
    if (!user) return;
    const name = prompt("Workspace name?")?.trim();
    if (!name) return;
    const { wsId, pageId } = await createWorkspaceWithInitialPage(user.uid, name);
    setSelectedWs(wsId);
    router.replace(`/w/${wsId}/p/${pageId}`);
  };

  // Select workspace from dropdown
  const selectWorkspace = async (wsId: string) => {
    setSelectedWs(wsId);
    const firstPageId = await getFirstPageId(wsId);
    router.replace(`/w/${wsId}/p/${firstPageId}`);
  };

  // Add new page at root
  const addPage = async () => {
    if (!selectedWs) return;
    const nextOrder = (pages.at(-1)?.order ?? -1) + 1;
    await addDoc(collection(db, "workspaces", selectedWs, "pages"), {
      title: "Untitled Page",
      parentId: null,
      order: nextOrder,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  // Toggle expand state
  const toggleExpand = (pageId: string) => {
    setExpanded((prev) => ({ ...prev, [pageId]: !prev[pageId] }));
  };

  // Profile actions
  const onInviteUsers = () => {
    router.push(`/w/${selectedWs ?? ""}/invite`);
    setProfileOpen(false);
  };
  const onMyAccount = () => {
    router.push("/settings");
    setProfileOpen(false);
  };
  const onSignOut = async () => {
    await logout();
    setProfileOpen(false);
    router.replace("/");
  };

  // Right-click (context menu)
  const openContextMenu = (e: React.MouseEvent, target: MenuTarget) => {
    e.preventDefault();
    setCtxTarget(target);
    setCtxPos({ x: e.clientX, y: e.clientY });
    setCtxOpen(true);
    setMoveOpen(false);
  };

  // Move page helper (update parentId and push to end of target group)
  const movePage = async (wsId: string, pageId: string, newParentId: string | null) => {
    // Compute last order inside the new parent (root or specific)
    const siblings = pages
      .filter((p) => (newParentId ? p.parentId === newParentId : p.parentId == null) && !p.isDeleted)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const nextOrder = (siblings.at(-1)?.order ?? -1) + 1;
    await updateDoc(doc(db, "workspaces", wsId, "pages", pageId), {
      parentId: newParentId,
      order: nextOrder,
      updatedAt: Date.now(),
    });
  };

  // Open pretty move menu for page
  const openMoveMenu = (e: React.MouseEvent, wsId: string, pageId: string, label: string) => {
    e.preventDefault();
    setMoveSource({ wsId, pageId, label });
    setMovePos({ x: e.clientX + 8, y: e.clientY + 8 });
    setMoveOpen(true);
    setCtxOpen(false);
  };

  // Render nested page node with toggle, right-click menu, and search filtering
  const renderPageNode = (p: Page) => {
    const kids = childMap[p.id] || [];
    const hasKids = kids.length > 0;

    // Whether this branch should show under search
    const branchMatches =
      matchQuery(p) ||
      kids.some(
        (c) =>
          matchQuery(c) ||
          (childMap[c.id] || []).some((gc) => matchQuery(gc))
      );
    if (!branchMatches) return null;

    return (
      <div key={p.id}>
        <Link
          href={`/w/${selectedWs}/p/${p.id}`}
          onContextMenu={(e) => openContextMenu(e, { kind: "page", wsId: selectedWs!, pageId: p.id, label: p.title })}
          className="group flex items-center gap-2 px-2 py-1 rounded hover:bg-black/5 transition"
        >
          {/* Caret toggle */}
          {hasKids ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                toggleExpand(p.id);
              }}
              className="p-0.5 rounded hover:bg-black/10"
              aria-label={expanded[p.id] ? "Collapse" : "Expand"}
              title={expanded[p.id] ? "Collapse" : "Expand"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                <path
                  d="M9 18l6-6-6-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  transform={expanded[p.id] ? "rotate(90 12 12)" : "rotate(0 12 12)"}
                  style={{ transformOrigin: "12px 12px", transition: "transform 150ms ease" }}
                />
              </svg>
            </button>
          ) : (
            <span className="inline-block w-[18px]" />
          )}

          {/* Page icon + title */}
          <IconPage />
          <span className="truncate">{p.title}</span>
        </Link>

        {/* Children */}
        {hasKids && expanded[p.id] && (
          <div className="ml-5 mt-1 space-y-1">
            {kids.map((child) => renderPageNode(child))}
          </div>
        )}
      </div>
    );
  };

  // Styles for pretty menus
  const menuClass =
    "z-50 bg-white backdrop-blur border border-black/10 shadow-xl rounded-xl overflow-hidden";
  const menuItem =
    "w-full text-left px-3 py-2 text-sm hover:bg-black/5 transition flex items-center gap-2";
  const sectionTitle = "px-3 py-1 text-[11px] uppercase tracking-wide text-gray-500";

  // Sidebar width style
  const sidebarStyle = collapsed ? { width: 64 } : { width };

  return (
    <aside
      className="h-screen flex flex-col relative select-none bg-gradient-to-b from-gray-50 to-gray-100"
      style={sidebarStyle}
      aria-label="Sidebar"
      onClick={() => {
        // Clicking anywhere inside sidebar closes context/move menus
        setCtxOpen(false);
        setMoveOpen(false);
      }}
    >
      {/* === Top: Profile + Collapse + Inbox + Calendar === */}
      <div className="h-12 flex items-center gap-2 px-3 relative">
        {/* Profile */}
        <button
          ref={profileBtnRef}
          onClick={(e) => {
            e.stopPropagation();
            setProfileOpen((s) => !s);
            setCtxOpen(false);
            setMoveOpen(false);
          }}
          className="flex items-center gap-2 p-1 rounded hover:bg-black/5 transition"
          aria-haspopup="menu"
          aria-expanded={profileOpen}
          title="Account"
        >
          {user?.photoURL ? (
            <img src={user.photoURL!} alt="avatar" className="size-8 rounded-full border" />
          ) : (
            <div className="size-8 rounded-full border grid place-items-center text-sm bg-white">
              {(user?.displayName ?? user?.email ?? "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          {!collapsed && (
            <div className="text-left">
              <div className="text-sm font-medium leading-tight">
                {user?.displayName ?? "Unnamed"}
              </div>
              <div className="text-[11px] text-gray-500 leading-tight">{user?.email}</div>
            </div>
          )}
        </button>

        {/* Collapse chevron */}
        <button
          onClick={toggleCollapsed}
          className="ml-auto p-1 rounded hover:bg-black/5 transition"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <IconChevron rotated={collapsed} />
        </button>

        {/* Inbox */}
        <button
          ref={inboxBtnRef}
          onClick={(e) => {
            e.stopPropagation();
            setInboxOpen((s) => !s);
            setProfileOpen(false);
            setCalOpen(false);
          }}
          className="p-1 rounded hover:bg-black/5 transition relative"
          aria-haspopup="dialog"
          aria-expanded={inboxOpen}
          title="Inbox"
        >
          <IconInbox />
          {inboxItems.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-red-500" />
          )}
        </button>

        {/* Calendar */}
        <button
          ref={calBtnRef}
          onClick={(e) => {
            e.stopPropagation();
            setCalOpen((s) => !s);
            setInboxOpen(false);
            setProfileOpen(false);
          }}
          className="p-1 rounded hover:bg-black/5 transition"
          aria-haspopup="dialog"
          aria-expanded={calOpen}
          title="Upcoming events"
        >
          <IconCalendar />
        </button>

        {/* Profile menu */}
        {profileOpen && (
          <div
            className={`${menuClass} absolute top-12 left-3 w-64`}
            role="menu"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2">
              <div className="text-sm font-medium">{user?.displayName ?? "Account"}</div>
              <div className="text-xs text-gray-500">{user?.email}</div>
            </div>
            <div className="h-px bg-black/5" />
            <div className={sectionTitle}>Collaboration</div>
            <button className={menuItem} onClick={onInviteUsers} role="menuitem">
              <IconUsers />
              Invite users
            </button>
            <div className="h-px bg-black/5" />
            <div className={sectionTitle}>Account</div>
            <button className={menuItem} onClick={onMyAccount} role="menuitem">
              <IconSettings />
              My account
            </button>
            <button
              className={`${menuItem} text-red-600 hover:bg-red-50`}
              onClick={onSignOut}
              role="menuitem"
            >
              <IconTrash />
              Sign out
            </button>
          </div>
        )}

        {/* Inbox popover */}
        {inboxOpen && (
          <div
            role="dialog"
            className={`${menuClass} absolute top-12 right-12 w-80 p-2`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 text-xs text-gray-500">Inbox</div>
            <div className="max-h-72 overflow-auto">
              {inboxItems.length === 0 ? (
                <div className="p-2 text-sm text-gray-600">No recent activity.</div>
              ) : (
                inboxItems.map((it) => (
                  <div key={it.id} className="px-2 py-2 rounded hover:bg-black/5">
                    <div className="text-sm font-medium">{it.title ?? "Update"}</div>
                    <div className="text-xs text-gray-500">{it.description ?? ""}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Calendar popover */}
        {calOpen && (
          <div
            role="dialog"
            className={`${menuClass} absolute top-12 right-2 w-96 p-2`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 text-xs text-gray-500">Upcoming events</div>
            <div className="max-h-72 overflow-auto">
              {events.length === 0 ? (
                <div className="p-2 text-sm text-gray-600">
                  No upcoming events. Connect Google Calendar to see items here.
                </div>
              ) : (
                events.map((ev) => (
                  <div key={ev.id} className="px-2 py-2 rounded hover:bg-black/5">
                    <div className="text-sm font-medium">{ev.summary ?? "Event"}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(ev.startMs).toLocaleString()} — {new Date(ev.endMs).toLocaleString()}
                    </div>
                    {ev.location && <div className="text-xs text-gray-500">{ev.location}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* === Workspace dropdown + Add (+) === */}
      <div className="px-3 pt-3">
        <div className="flex items-center gap-2">
          <button
            ref={wsBtnRef}
            onClick={(e) => {
              e.stopPropagation();
              setWsOpen((s) => !s);
              setCtxOpen(false);
              setMoveOpen(false);
            }}
            className={`flex-1 text-left px-2 py-2 rounded-lg transition ${collapsed ? "hidden" : "hover:bg-black/5"}`}
            aria-haspopup="listbox"
            aria-expanded={wsOpen}
            title="Choose workspace"
          >
            <div className="flex items-center gap-2">
              <IconWorkspace />
              <span className="truncate">
                {workspaces.find((w) => w.id === selectedWs)?.name ?? "Select workspace"}
              </span>
              <span className="ml-auto">
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                  <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </span>
            </div>
          </button>

          <button
            onClick={addWorkspace}
            className="p-2 rounded-lg hover:bg-black/5 transition"
            aria-label="Add workspace"
            title="Add workspace"
          >
            <IconPlus />
          </button>
        </div>

        {wsOpen && !collapsed && (
          <div
            role="listbox"
            className={`${menuClass} mt-2 max-h-64 overflow-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            {workspaces.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-600">No workspaces yet.</div>
            ) : (
              workspaces.map((w) => (
                <button
                  key={w.id}
                  onClick={() => {
                    selectWorkspace(w.id);
                    setWsOpen(false);
                  }}
                  onContextMenu={(e) =>
                    openContextMenu(e, { kind: "workspace", wsId: w.id, label: w.name })
                  }
                  className={`w-full text-left px-3 py-2 hover:bg-black/5 ${
                    w.id === selectedWs ? "bg-black/5" : ""
                  }`}
                  role="option"
                  aria-selected={w.id === selectedWs}
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-block size-2 rounded-full bg-blue-500" />
                    <span className="truncate">{w.name}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* === Page search + Add page (+) === */}
      <div className={`px-3 pt-3 ${collapsed ? "hidden" : ""}`}>
        <div className="flex items-center gap-2">
          <input
            value={pageQuery}
            onChange={(e) => setPageQuery(e.target.value)}
            placeholder="Search pages…"
            className="flex-1 px-3 py-2 rounded-lg bg-black/5 outline-none"
            aria-label="Search pages"
          />
          <button
            onClick={addPage}
            className="p-2 rounded-lg hover:bg-black/5 transition"
            aria-label="Add page"
            title="Add page"
          >
            <IconPlus />
          </button>
        </div>
      </div>

      {/* === Pages (nested) === */}
      <div className={`flex-1 overflow-y-auto px-3 py-2 ${collapsed ? "hidden" : ""}`}>
        <nav className="space-y-1">
          {root.filter((p) => matchQuery(p)).map((p) => renderPageNode(p))}
        </nav>
      </div>

      {/* === Settings & Trash === */}
      <div className={`px-3 pb-3 space-y-2 ${collapsed ? "hidden" : ""}`}>
        <Link
          href="/settings"
          className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-black/5 transition"
          title="Settings"
        >
          <IconSettings />
          <span>Settings</span>
        </Link>

        <Link
          href="/trash"
          className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-black/5 transition"
          title="Trash"
        >
          <IconTrash />
          <span>Trash</span>
        </Link>
      </div>

      {/* === Footer: Permissions === */}
      <div className={`mt-auto px-3 pb-3 ${collapsed ? "hidden" : ""}`}>
        <Link
          href={`/w/${selectedWs ?? ""}/permissions`}
          className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-black/5 transition"
          title="Permissions"
        >
          <IconUsers />
          <span>Permissions</span>
        </Link>
      </div>

      {/* === Resizer handle === */}
      {!collapsed && (
        <div
          onMouseDown={onMouseDown}
          className="absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-black/10"
          title="Drag to resize"
          aria-label="Resize sidebar"
        />
      )}

      {/* === Context menu (pretty) for Workspace/Page === */}
      {ctxOpen && ctxTarget && (
        <div
          className={`${menuClass} fixed`}
          style={{ top: ctxPos.y, left: ctxPos.x, width: 220 }}
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2">
            <div className="text-xs text-gray-500">
              {ctxTarget.kind === "workspace" ? "Workspace" : "Page"}
            </div>
            <div className="text-sm font-medium truncate">{ctxTarget.label}</div>
          </div>
          <div className="h-px bg-black/5" />
          {/* Rename */}
          <button
            className={menuItem}
            onClick={async () => {
              if (ctxTarget.kind === "workspace") {
                const name = prompt("New workspace name?")?.trim();
                if (name) await renameWorkspace(ctxTarget.wsId, name);
              } else {
                const name = prompt("New page title?")?.trim();
                if (name) await renamePage(ctxTarget.wsId, ctxTarget.pageId, name);
              }
              setCtxOpen(false);
            }}
            role="menuitem"
          >
            🖊️  Rename
          </button>
          {/* Move (pages only) */}
          {ctxTarget.kind === "page" && (
            <button
              className={menuItem}
              onClick={(e) => {
                openMoveMenu(e, ctxTarget.wsId, ctxTarget.pageId, ctxTarget.label);
              }}
              role="menuitem"
            >
              📂 Move…
            </button>
          )}
          {/* Trash */}
          <button
            className={`${menuItem} text-red-600 hover:bg-red-50`}
            onClick={async () => {
              if (ctxTarget.kind === "workspace") {
                const ok = confirm(
                  `Move entire workspace "${ctxTarget.label}" to Trash?\n(All pages will be hidden until restored.)`
                );
                if (ok) await softDeleteWorkspace(ctxTarget.wsId);
              } else {
                const ok = confirm(`Move page "${ctxTarget.label}" to Trash?`);
                if (ok) await softDeletePage(ctxTarget.wsId, ctxTarget.pageId);
              }
              setCtxOpen(false);
            }}
            role="menuitem"
          >
            🗑️ Delete
          </button>
        </div>
      )}

      {/* === Move menu (pretty) for pages === */}
      {moveOpen && moveSource && selectedWs && (
        <div
          className={`${menuClass} fixed`}
          style={{ top: movePos.y, left: movePos.x, width: 280 }}
          role="dialog"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2">
            <div className="text-xs text-gray-500">Move page</div>
            <div className="text-sm font-medium truncate">{moveSource.label}</div>
          </div>
          <div className="h-px bg-black/5" />
          <div className={sectionTitle}>Destination</div>

          {/* Move to root */}
          <button
            className={menuItem}
            onClick={async () => {
              await movePage(selectedWs, moveSource.pageId, null);
              setMoveOpen(false);
            }}
          >
            ⬆ Move to Main
          </button>

          {/* Move under another root page (exclude itself and its descendants) */}
          <div className="max-h-60 overflow-auto py-1">
            {root.length === 0 ? (
              <div className="px-3 py-1 text-sm text-gray-600">No top-level pages.</div>
            ) : (
              (() => {
                const forbidden = collectDescendants(moveSource.pageId, childMap);
                forbidden.add(moveSource.pageId); // cannot move into itself
                const candidates = root.filter((p) => !forbidden.has(p.id));
                return candidates.length === 0 ? (
                  <div className="px-3 py-1 text-sm text-gray-600">No valid destinations.</div>
                ) : (
                  candidates.map((p) => (
                    <button
                      key={p.id}
                      className={menuItem}
                      onClick={async () => {
                        await movePage(selectedWs, moveSource.pageId, p.id);
                        setMoveOpen(false);
                      }}
                    >
                      <IconPage />
                      <span className="truncate">Under “{p.title}”</span>
                    </button>
                  ))
                );
              })()
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
