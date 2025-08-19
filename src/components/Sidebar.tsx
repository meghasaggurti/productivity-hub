'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection, onSnapshot, query, where, updateDoc, doc, writeBatch, arrayRemove,
} from 'firebase/firestore';
import { db, auth } from '@/lib/clientOnlyDb';
import type { Workspace } from '@/types/app';
import WorkspaceTree from './WorkspaceTree';
import { createWorkspaceWithHome, softDeleteWorkspace, reorderWorkspaces as reorderWorkspacesOp } from '@/lib/ops';
import { useDragAutoScroll } from '@/hooks/useDragAutoScroll';
import { useAuth } from '@/components/AuthProvider';

// ---------- Minimal mono icons ----------
function IconChevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5"
      className={`transition-transform ${open ? 'rotate-90' : ''}`}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
function IconWorkspace() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
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
function IconHamburger() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
function IconInbox() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 4h16v10h-4l-2 3h-4l-2-3H4z" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </svg>
  );
}
function IconRename() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 21h6l12-12-6-6L3 15v6z" />
      <path d="M15 3l6 6" />
    </svg>
  );
}
function IconLeave() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M10 17l-5-5 5-5" />
      <path d="M4 12h12" />
      <path d="M20 19V5a2 2 0 0 0-2-2h-6" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <rect x="6" y="6" width="12" height="14" rx="2" />
    </svg>
  );
}

// ---------- Types ----------
type WsWithUi = Workspace & { isDeleted?: boolean; order?: number };

// ---------- Props ----------
type Props = {
  collapsed?: boolean;
  onToggle?: () => void;
  currentWorkspaceId?: string;
  onOpenPage?: (p: any) => void;
  onOpenSettings?: () => void;
  onOpenPermissions?: () => void;
  onOpenTrash?: () => void;
};

// ---------- Sidebar ----------
export default function Sidebar({
  collapsed,
  onToggle,
  currentWorkspaceId,
  onOpenPage,
  onOpenSettings,
  onOpenPermissions,
  onOpenTrash,
}: Props) {
  const router = useRouter();
  const { user } = useAuth();

  // --- NEW: controlled/uncontrolled collapse support ---
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const isControlled = typeof collapsed === 'boolean';
  const isCollapsed = isControlled ? !!collapsed : localCollapsed;
  const toggle = onToggle ?? (() => setLocalCollapsed((c) => !c));
  // ----------------------------------------------------

  const [workspaces, setWorkspaces] = useState<WsWithUi[]>([]);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [menuForWs, setMenuForWs] = useState<string | null>(null);
  const [renamingWs, setRenamingWs] = useState<string | null>(null);

  // click-outside for the little "..." menus
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuForWs(null);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // live workspaces for the member
  useEffect(() => {
    if (!user?.uid) { setWorkspaces([]); return; }
    const qWs = query(collection(db, 'workspaces'), where('memberIds', 'array-contains', user.uid));
    const off = onSnapshot(qWs, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as WsWithUi[];
      rows.sort((a, b) => (a.order ?? a.createdAt ?? 0) - (b.order ?? b.createdAt ?? 0));
      setWorkspaces(rows);
      // open the current workspace's tree by default
      setOpenMap((prev) => {
        const next: Record<string, boolean> = { ...prev };
        if (currentWorkspaceId && next[currentWorkspaceId] === undefined) next[currentWorkspaceId] = true;
        return next;
      });
    });
    return () => off();
  }, [user?.uid, currentWorkspaceId]);

  // owner count (guard last-delete)
  const ownedActiveCount = useMemo(() => {
    if (!user?.uid) return 0;
    return workspaces.filter((w) => w.ownerId === user.uid && w.isDeleted !== true).length;
  }, [workspaces, user?.uid]);

  const getActiveWsId = () => currentWorkspaceId || workspaces.find((w) => w.isDeleted !== true)?.id;

  async function renameWorkspace(wsId: string, newName: string) {
    await updateDoc(doc(db, 'workspaces', wsId), { name: newName || 'Untitled workspace', updatedAt: Date.now() });
  }
  async function leaveWorkspace(wsId: string) {
    if (!user?.uid) return;
    await updateDoc(doc(db, 'workspaces', wsId), { memberIds: arrayRemove(user.uid), updatedAt: Date.now() });
  }
  async function addRootPage(wsId: string) {
    const now = Date.now();
    const pageRef = doc(collection(db, 'workspaces', wsId, 'pages'));
    const b = writeBatch(db);
    b.set(pageRef, { title: 'Untitled', parentId: null, order: now, isDeleted: false, createdAt: now, updatedAt: now });
    await b.commit();
    setOpenMap((m) => ({ ...m, [wsId]: true }));
  }

  // open panels (via ?panel=)
  const goSettings = () => { if (onOpenSettings) return onOpenSettings(); const id = getActiveWsId(); if (id) router.push(`/w/${id}?panel=settings`); };
  const goPermissions = () => { if (onOpenPermissions) return onOpenPermissions(); const id = getActiveWsId(); if (id) router.push(`/w/${id}?panel=permissions`); };
  const goTrash = () => { if (onOpenTrash) return onOpenTrash(); const id = getActiveWsId(); if (id) router.push(`/w/${id}?panel=trash`); };

  // DnD infra
  const listRef = useRef<HTMLDivElement | null>(null);
  const wsAutoScroll = useDragAutoScroll(listRef);
  const [wsDraggingId, setWsDraggingId] = useState<string | null>(null);
  const [wsIndicator, setWsIndicator] = useState<{ y: number } | null>(null);

  async function commitWorkspaceOrder(orderedActiveIds: string[]) {
    try {
      if (typeof reorderWorkspacesOp === 'function') await reorderWorkspacesOp(orderedActiveIds);
      else {
        const b = writeBatch(db);
        orderedActiveIds.forEach((id, i) => b.update(doc(db, 'workspaces', id), { order: i, updatedAt: Date.now() }));
        await b.commit();
      }
    } finally { setWsDraggingId(null); setWsIndicator(null); }
  }

  // resizer (hydration-safe)
  const [mounted, setMounted] = useState(false);
  const [width, setWidth] = useState<number>(280);
  useEffect(() => {
    setMounted(true);
    try {
      const fromLS = Number(localStorage.getItem('sidebarWidth'));
      if (Number.isFinite(fromLS) && fromLS >= 200 && fromLS <= 420) setWidth(fromLS);
    } catch {}
  }, []);
  useEffect(() => {
    if (!isCollapsed && mounted) localStorage.setItem('sidebarWidth', String(width));
  }, [width, isCollapsed, mounted]);

  const isDraggingResizer = useRef(false);
  useEffect(() => {
    function onMove(e: MouseEvent) { if (!isDraggingResizer.current) return; setWidth(() => Math.min(420, Math.max(200, e.clientX))); }
    function onUp() { isDraggingResizer.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const font = 'font-sans text-[13px]';
  const asideWidth = isCollapsed ? 56 : (mounted ? width : 280);

  // helper: open a workspace
  const openWorkspace = (id: string) => router.push(`/w/${id}`);

  return (
    <aside
      className="h-screen bg-[#F8F5EF] text-black transition-[width] duration-150 flex flex-col relative"
      style={{ width: asideWidth }}
      aria-label="Sidebar"
    >
      {/* Header: profile + icons + hamburger */}
      <div className="h-12 px-2 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="flex items-center gap-2">
            <UserProfileMenu
              goSettings={goSettings}
              goPermissions={goPermissions}
              currentWsId={getActiveWsId() || undefined}
              userName={user?.displayName || user?.email || 'Profile'}
              photoURL={(user as any)?.photoURL || undefined}
            />
            <button className="rounded-md p-1 hover:bg.black/5" title="Inbox">
              <IconInbox />
            </button>
            <button className="rounded-md p-1 hover:bg.black/5" title="Calendar">
              <IconCalendar />
            </button>
          </div>
        ) : (
          <div />
        )}

        <button
          className="inline-flex items-center gap-2 rounded-md px-2 py-1 hover:bg-neutral-100"
          title={isCollapsed ? 'Expand' : 'Collapse'}
          onClick={toggle}
        >
          <IconHamburger />
        </button>
      </div>

      {/* Workspaces header */}
      {!isCollapsed && (
        <div className="px-3 pt-2 pb-1 flex items-center justify-between group">
          <div className="text-xs uppercase tracking-wide opacity-60">Workspaces</div>
          <button
            className="opacity-0 group-hover:opacity-100 rounded px-1 py-0.5"
            title="New workspace"
            onClick={async () => {
              try { await createWorkspaceWithHome(); }
              catch (e: any) { alert(e?.message || 'Could not create workspace (check Firestore rules).'); }
            }}
          >
            <IconPlus />
          </button>
        </div>
      )}

      {/* Body list */}
      <div ref={listRef} className="px-2 pb-2 overflow-auto flex-1">
        {!user?.uid ? (
          <div className="text-sm opacity-60 px-2">Sign in to see your workspaces.</div>
        ) : (
          <ul className="space-y-1">
            {workspaces.filter((w) => w.isDeleted !== true).map((ws) => {
              const isOpen = !!openMap[ws.id];
              const isOwner = ws.ownerId === user?.uid;
              const disableTrash = isOwner && ownedActiveCount <= 1;

              return (
                <li
                  key={ws.id}
                  className="group"
                  draggable={!isCollapsed}
                  onDragStart={(e) => { setWsDraggingId(ws.id); e.dataTransfer.effectAllowed = 'move'; }}
                  onDragEnd={() => { setWsDraggingId(null); setWsIndicator(null); }}
                  onDragOver={(e) => {
                    if (!wsDraggingId || wsDraggingId === ws.id) return;
                    const row = e.currentTarget.firstChild as HTMLElement | null;
                    if (!row) return;
                    const r = row.getBoundingClientRect();
                    const y = e.clientY - r.top;
                    const h = r.height || 1;
                    setWsIndicator({ y: y > h / 2 ? r.bottom : r.top });
                    wsAutoScroll.onDragOver(e);
                    e.preventDefault();
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    if (!wsDraggingId || wsDraggingId === ws.id) return;
                    const active = workspaces.filter((w) => w.isDeleted !== true);
                    const ids = active.map((w) => w.id);
                    const from = ids.indexOf(wsDraggingId);
                    const targetIndex = ids.indexOf(ws.id);

                    const row = e.currentTarget.firstChild as HTMLElement | null;
                    const r = row?.getBoundingClientRect();
                    const after = r ? (e.clientY - r.top) > (r.height! / 2) : false;
                    let to = targetIndex + (after ? 1 : 0);
                    to = Math.max(0, Math.min(ids.length, to));
                    if (from < 0 || to < 0 || from === to || from === to - 1) { setWsDraggingId(null); setWsIndicator(null); return; }

                    const reordered = ((): typeof active => {
                      const a = active.slice();
                      const [m] = a.splice(from, 1);
                      a.splice(to > from ? to - 1 : to, 0, m);
                      return a;
                    })();
                    const rest = workspaces.filter((w) => w.isDeleted === true);
                    setWorkspaces([...reordered, ...rest]);
                    await commitWorkspaceOrder(reordered.map((w) => w.id));
                  }}
                >
                  <div className="flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-100">
                    {!isCollapsed && (
                      <button
                        className="px-1 py-0.5 rounded hover:bg-black/10"
                        onClick={() => setOpenMap((m) => ({ ...m, [ws.id]: !m[ws.id] }))}
                        aria-label="toggle workspace"
                        title={isOpen ? 'Collapse' : 'Expand'}
                      >
                        <IconChevron open={isOpen} />
                      </button>
                    )}

                    <IconWorkspace />

                    {!isCollapsed && (
                      <>
                        {renamingWs === ws.id ? (
                          <input
                            autoFocus
                            defaultValue={ws.name}
                            onBlur={async (e) => { await renameWorkspace(ws.id, e.currentTarget.value.trim()); setRenamingWs(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
                            className="ml-2 flex-1 bg-white border px-2 py-1 rounded text-sm"
                          />
                        ) : (
                          <button
                            className="ml-2 flex-1 text-left text-sm truncate"
                            title={ws.name}
                            // CLICK → open workspace
                            onClick={() => openWorkspace(ws.id)}
                            // Double-click → rename
                            onDoubleClick={() => setRenamingWs(ws.id)}
                          >
                            {ws.name}
                          </button>
                        )}

                        {/* Add a root page */}
                        <button
                          className="opacity-0 group-hover:opacity-100 rounded px-1 py-0.5 hover:bg-black/10"
                          title="Add page"
                          onClick={() => addRootPage(ws.id)}
                        >
                          <IconPlus />
                        </button>

                        {/* Menu */}
                        <div className="relative" ref={menuRef}>
                          <button
                            className="opacity-0 group-hover:opacity-100 rounded px-1 py-0.5 hover:bg-black/10"
                            onClick={() => setMenuForWs(menuForWs === ws.id ? null : ws.id)}
                            title="More"
                          >
                            <IconMore />
                          </button>
                          {menuForWs === ws.id && (
                            <div
                              className={`${font} absolute right-0 top-7 z-20 w-48 bg-white border border-neutral-200 rounded-lg shadow-md p-1`}
                            >
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-100"
                                onClick={() => { setRenamingWs(ws.id); setMenuForWs(null); }}
                              >
                                <IconRename /> <span>Rename</span>
                              </button>

                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-100"
                                onClick={async () => {
                                  setMenuForWs(null);
                                  if (confirm('Leave this workspace? You will lose access until re-invited.')) {
                                    await leaveWorkspace(ws.id);
                                  }
                                }}
                              >
                                <IconLeave /> <span>Leave workspace</span>
                              </button>

                              <button
                                disabled={(isOwner && ownedActiveCount <= 1) || !isOwner}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md ${
                                  (isOwner && ownedActiveCount <= 1) || !isOwner
                                    ? 'opacity-40 cursor-not-allowed'
                                    : 'hover:bg-neutral-100 text-red-600'
                                }`}
                                onClick={async () => {
                                  if ((isOwner && ownedActiveCount <= 1) || !isOwner) return;
                                  setMenuForWs(null);
                                  if (confirm('Move workspace to Trash?')) {
                                    await softDeleteWorkspace(ws.id);
                                  }
                                }}
                              >
                                <IconTrash /> <span>Trash</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Pages under this workspace */}
                  {!isCollapsed && isOpen && (
                    <div className="pl-7 pr-1 py-1">
                      <WorkspaceTree
                        wsId={ws.id}
                        onOpen={(p: any) => {
                          if (onOpenPage) return onOpenPage(p);
                          // fallback: route to the page
                          const pageId = p?.id;
                          if (ws.id && pageId) router.push(`/w/${ws.id}/p/${pageId}`);
                        }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer actions */}
      {!isCollapsed && (
        <div className="px-2 py-3">
          <nav className={`${font} space-y-1`}>
            <button className="w-full text-left px-2 py-1 rounded hover:bg-neutral-100" onClick={goSettings}>Settings</button>
            <button className="w-full text-left px-2 py-1 rounded hover:bg-neutral-100" onClick={goPermissions}>Permissions</button>
            <button className="w-full text-left px-2 py-1 rounded hover:bg-neutral-100" onClick={goTrash}>Trash</button>
          </nav>
        </div>
      )}

      {/* Global indicator line for workspace reorder */}
      {wsIndicator && (
        <div
          className="pointer-events-none fixed z-50 h-[2px] bg-black/40"
          style={{ top: wsIndicator.y - 1, left: 16, right: 24 }}
        />
      )}

      {/* Resizer (only when expanded) */}
      {!isCollapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          title="Resize"
          onMouseDown={() => {
            isDraggingResizer.current = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-black/10 active:bg-black/20"
        />
      )}
    </aside>
  );
}

// ---------- User Profile Menu ----------
function UserProfileMenu({
  currentWsId,
  goSettings,
  goPermissions,
  userName,
  photoURL,
}: {
  currentWsId?: string;
  goSettings: () => void;
  goPermissions: () => void;
  userName: string;
  photoURL?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const avatar = photoURL ? (
    <img src={photoURL} alt="Avatar" className="w-7 h-7 rounded-md object-cover" />
  ) : (
    <div aria-hidden className="w-7 h-7 rounded-md border border-neutral-300 grid place-items-center">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="8" r="3" />
        <path d="M4 20c1.5-4 14.5-4 16 0" />
      </svg>
    </div>
  );

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="inline-flex items-center gap-2 rounded-md px-2 py-1 hover:bg-neutral-100"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {avatar}
        {!!currentWsId && <span className="text-sm">{userName}</span>}
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-9 z-20 w-56 bg-white border border-neutral-200 rounded-lg shadow-md p-1 font-sans text-[13px]"
        >
          <div className="px-2 py-1 text-[11px] uppercase tracking-wide opacity-60">Account</div>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-100"
            onClick={() => { setOpen(false); goSettings(); }}
            disabled={!currentWsId}
            title={currentWsId ? 'Open Settings' : 'Open a workspace first'}
          >
            Account Settings
          </button>

          <div className="px-2 pt-2 pb-1 text-[11px] uppercase tracking-wide opacity-60">Collaboration</div>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-100"
            onClick={() => { setOpen(false); goPermissions(); }}
            disabled={!currentWsId}
            title={currentWsId ? 'Open Permissions' : 'Open a workspace first'}
          >
            Invite Collaborators
          </button>

          <div className="h-px my-1 bg-neutral-200" />

          <button
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-100 text-red-600"
            onClick={() => auth.signOut()}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
















