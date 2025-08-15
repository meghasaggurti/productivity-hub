// src/components/WorkspaceNav.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebaseDb';
import type { Page } from '@/types/app';

/** Load live pages (not deleted) for a workspace. */
function usePages(workspaceId: string) {
  const [pages, setPages] = useState<Page[]>([]);
  useEffect(() => {
    if (!workspaceId) return;
    const q = query(
      collection(db, 'workspaces', workspaceId, 'pages'),
      where('isDeleted', '==', false)
    );
    const unsub = onSnapshot(q, (snap) => {
      setPages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [workspaceId]);
  return pages;
}

// tiny monochrome icons
function IconBack() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}
function IconHome() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v9h14v-9" />
    </svg>
  );
}
function IconCaret() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M8 10l4 4 4-4" />
    </svg>
  );
}
function IconRight() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

type Node = Page & { children?: Node[] };

export default function WorkspaceNav({
  workspaceId,
  currentPageId,
}: {
  workspaceId: string;
  currentPageId?: string;
}) {
  const pages = usePages(workspaceId);

  // Build maps for quick lookups
  const { roots, byId, childrenOf, parentOf } = useMemo(() => {
    const map: Record<string, Node> = {};
    const parentOf: Record<string, string | null> = {};
    const childrenOf: Record<string, Node[]> = {};
    const roots: Node[] = [];

    pages.forEach((p) => {
      map[p.id] = { ...(p as Node), children: [] };
      parentOf[p.id] = p.parentId ?? null;
    });
    pages.forEach((p) => {
      const pid = p.parentId ?? null;
      if (pid) (childrenOf[pid] ||= []).push(map[p.id]);
    });
    pages.forEach((p) => {
      if (p.parentId == null) roots.push(map[p.id]);
    });

    const sort = (arr: Node[]) =>
      arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title));
    sort(roots);
    Object.keys(childrenOf).forEach((pid) => sort(childrenOf[pid]));

    return { roots, byId: map, childrenOf, parentOf };
  }, [pages]);

  const current = currentPageId ? byId[currentPageId] : undefined;
  const parentId = current ? parentOf[current.id] : null;
  const isRootPage = !current || parentId === null;

  // Which level to show:
  // - root level: all root pages
  // - nested: siblings under current parent
  const levelNodes: Node[] = useMemo(() => {
    if (!current || parentId === null) return roots;
    return childrenOf[parentId] ?? [];
  }, [current, parentId, roots, childrenOf]);

  // Back (one level up) and Home (first root)
  const backHref = !isRootPage && parentId ? `/w/${workspaceId}/p/${parentId}` : undefined;
  const homeHref = !isRootPage && roots[0]?.id ? `/w/${workspaceId}/p/${roots[0].id}` : undefined;

  // Controlled dropdown state so it stays open when moving cursor into the panel
  const [openFor, setOpenFor] = useState<string | null>(null);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);
  const openDropdown = (id: string) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setOpenFor(id);
  };
  const scheduleClose = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setOpenFor(null), 150);
  };
  const cancelClose = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  };

  // Recursive submenu inside the panel
  function SubMenu({ node }: { node: Node }) {
    const kids = childrenOf[node.id] || [];
    const hasKids = kids.length > 0;
    return (
      <div className="relative group/item">
        <Link
          href={`/w/${workspaceId}/p/${node.id}`}
          className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-neutral-100"
          title={node.title}
        >
          <span className="truncate">{node.title}</span>
          {hasKids && <IconRight />}
        </Link>
        {hasKids && (
          <div
            className="absolute left-full top-0 ml-1 min-w-56 rounded-lg border border-neutral-200 bg-white shadow-md p-1 font-sans text-[13px] hidden group-hover/item:block"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            {kids.map((c) => (
              <SubMenu key={c.id} node={c} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur">
      {/* compact padding, no borders on header/buttons */}
      <div className="px-3 py-2 flex items-center gap-2">
        {/* Left icons only on nested pages */}
        {!isRootPage && (
          <div className="flex items-center gap-1 shrink-0">
            {backHref && (
              <Link
                href={backHref}
                title="Back"
                className="inline-flex items-center justify-center rounded-md px-2 py-1 hover:bg-neutral-100"
              >
                <IconBack />
              </Link>
            )}
            {homeHref && (
              <Link
                href={homeHref}
                title="Home"
                className="inline-flex items-center justify-center rounded-md px-2 py-1 hover:bg-neutral-100"
              >
                <IconHome />
              </Link>
            )}
          </div>
        )}

        {/* Tabs (same level) spread evenly */}
        <div className="flex-1 grid grid-flow-col auto-cols-fr gap-2">
          {levelNodes.map((n) => {
            const active = n.id === currentPageId;
            const kids = childrenOf[n.id] || [];
            const hasKids = kids.length > 0;
            const open = openFor === n.id;

            return (
              <div
                key={n.id}
                className="relative"
                onMouseEnter={() => hasKids && openDropdown(n.id)}
                onMouseLeave={() => hasKids && scheduleClose()}
              >
                <Link
                  href={`/w/${workspaceId}/p/${n.id}`}
                  className={[
                    'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm w-full',
                    'hover:bg-neutral-100',
                    active ? 'bg-neutral-100 font-medium' : '',
                  ].join(' ')}
                  title={n.title}
                >
                  <span className="truncate">{n.title}</span>
                  {hasKids && (
                    <span className="ml-1 opacity-70">
                      <IconCaret />
                    </span>
                  )}
                </Link>

                {/* Dropdown panel for children; stays open while hovering */}
                {hasKids && open && (
                  <div
                    className="absolute left-0 top-full mt-1 min-w-56 rounded-lg border border-neutral-200 bg-white shadow-md p-1 font-sans text-[13px] z-40"
                    onMouseEnter={cancelClose}
                    onMouseLeave={scheduleClose}
                  >
                    {kids.map((c) => (
                      <SubMenu key={c.id} node={c} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right spacer so left icons don't push tabs; only when nested */}
        {!isRootPage && <div className="w-[54px] shrink-0" />}
      </div>
    </nav>
  );
}









