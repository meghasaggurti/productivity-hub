// ---------- src/lib/bootstrap.ts ----------
'use client';

import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, googleProvider } from "@/lib/clientOnlyDb";

/** Find a non-deleted page or create "Home" if none, then return the pageId. */
async function ensureHomeIn(wsId: string): Promise<string> {
  // Prefer an existing live page (no orderBy to avoid composite indexes)
  const pagesSnap = await getDocs(collection(db, 'workspaces', wsId, 'pages'));
  const pages = pagesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  const live = pages.filter((p) => p.isDeleted !== true);
  const home = live.find((p) => p.title === 'Home');
  if (home) return home.id;

  if (live[0]) return live[0].id;

  // No live pages → create "Home"
  const pageRef = await addDoc(collection(db, 'workspaces', wsId, 'pages'), {
    title: 'Home',
    parentId: null,
    order: 0,
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return pageRef.id;
}

/**
 * Ensure the user has at least one active workspace and a "Home" page.
 * Returns { wsId, pageId } for navigation.
 * - Finds by membership (memberIds array-contains uid)
 * - If none, creates a "Hub" workspace and a "Home" page
 *
 * NOTE: Create payload matches your security rules:
 *   { ownerId: uid, memberIds: [uid], isDeleted: false, createdAt, updatedAt, name }
 */
export async function ensureHubAndHome(
  uid: string
): Promise<{ wsId: string; pageId: string }> {
  // 1) Find ALL workspaces where the user is a member (avoid composite index by not filtering isDeleted here)
  const wsQ = query(collection(db, 'workspaces'), where('memberIds', 'array-contains', uid));
  const wsSnap = await getDocs(wsQ);
  const all = wsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  const active = all.filter((w) => w.isDeleted !== true);

  if (active.length > 0) {
    // Pick the one with the smallest 'order' (or created first if not set)
    active.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const wsId = active[0].id;
    const pageId = await ensureHomeIn(wsId);
    return { wsId, pageId };
  }

  // 2) None exist → create a new "Hub" and its "Home" page in one batch
  const now = serverTimestamp();
  const wsRef = doc(collection(db, 'workspaces'));
  const homeRef = doc(collection(db, 'workspaces', wsRef.id, 'pages'));

  const b = writeBatch(db);
  b.set(wsRef, {
    name: 'Hub',
    ownerId: uid,
    memberIds: [uid],
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  });
  b.set(homeRef, {
    title: 'Home',
    parentId: null,
    order: 0,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  });
  await b.commit();

  return { wsId: wsRef.id, pageId: homeRef.id };
}

/**
 * Back-compat alias for older code that imported ensureInitialWorkspace.
 * Returns { workspaceId, pageId } but uses ensureHubAndHome under the hood.
 */
export async function ensureInitialWorkspace(
  uid: string
): Promise<{ workspaceId: string; pageId: string }> {
  const { wsId, pageId } = await ensureHubAndHome(uid);
  return { workspaceId: wsId, pageId };
}



