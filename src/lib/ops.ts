'use client';

// src/lib/ops.ts
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  deleteField, // needed for removing roles.{uid}
} from 'firebase/firestore';
import { db, auth, googleProvider } from "@/lib/clientOnlyDb";

/** ---------- Helpers ---------- */

function nowMs() {
  return Date.now();
}

/** Safely read all workspaces where the given user is a member; filter client-side. */
async function loadMemberWorkspaces(uid: string) {
  const snap = await getDocs(
    query(collection(db, 'workspaces'), where('memberIds', 'array-contains', uid))
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

/** Find a live page or create "Home" if none, then return the pageId. */
async function ensureHomeIn(wsId: string): Promise<string> {
  const pagesSnap = await getDocs(collection(db, 'workspaces', wsId, 'pages'));
  const pages = pagesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  const live = pages.filter((p) => p.isDeleted !== true);

  const homeByName = live.find((p) => (p.title || '').toLowerCase() === 'home');
  if (homeByName) return homeByName.id;

  if (live.length) {
    const sorted = [...live].sort(
      (a, b) =>
        (a.order ?? 0) - (b.order ?? 0) ||
        String(a.title || '').localeCompare(b.title || '')
    );
    return sorted[0].id;
  }

  const ref = await addDoc(collection(db, 'workspaces', wsId, 'pages'), {
    title: 'Home',
    parentId: null,
    order: 0,
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** ---------- Creation & Bootstrap ---------- */

export async function createWorkspaceWithHome(name = 'New Workspace') {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  const now = nowMs();

  const wsRef = await addDoc(collection(db, 'workspaces'), {
    name,
    ownerId: uid,
    memberIds: [uid],
    isDeleted: false,
    order: now,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const pgRef = await addDoc(collection(db, 'workspaces', wsRef.id, 'pages'), {
    title: 'Home',
    parentId: null,
    order: 0,
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { wsId: wsRef.id, pageId: pgRef.id };
}

export async function ensureHubAndHome(
  uid: string
): Promise<{ wsId: string; pageId: string }> {
  const all = await loadMemberWorkspaces(uid);
  const active = all.filter((w) => w.isDeleted !== true);
  if (active.length) {
    const ws = [...active].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
    const pageId = await ensureHomeIn(ws.id);
    return { wsId: ws.id, pageId };
  }

  const wsRef = await addDoc(collection(db, 'workspaces'), {
    name: 'Hub',
    ownerId: uid,
    memberIds: [uid],
    isDeleted: false,
    order: nowMs(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const pageRef = await addDoc(collection(db, 'workspaces', wsRef.id, 'pages'), {
    title: 'Home',
    parentId: null,
    order: 0,
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { wsId: wsRef.id, pageId: pageRef.id };
}

export async function ensureInitialWorkspace(
  uid: string
): Promise<{ workspaceId: string; pageId: string }> {
  const { wsId, pageId } = await ensureHubAndHome(uid);
  return { workspaceId: wsId, pageId };
}

/** ---------- Workspace Ops ---------- */

export async function renameWorkspace(wsId: string, name: string) {
  await updateDoc(doc(db, 'workspaces', wsId), {
    name: name || 'Untitled workspace',
    updatedAt: nowMs(),
  });
}

export async function softDeleteWorkspace(wsId: string) {
  await updateDoc(doc(db, 'workspaces', wsId), {
    isDeleted: true,
    updatedAt: nowMs(),
  });
}

export async function restoreWorkspace(wsId: string) {
  await updateDoc(doc(db, 'workspaces', wsId), {
    isDeleted: false,
    updatedAt: nowMs(),
  });
}

export async function leaveWorkspace(wsId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  await updateDoc(doc(db, 'workspaces', wsId), {
    memberIds: arrayRemove(uid),
    updatedAt: nowMs(),
  });
}

export async function reorderWorkspaces(orderedIds: string[]) {
  const b = writeBatch(db);
  const t = nowMs();
  orderedIds.forEach((id, idx) => {
    b.update(doc(db, 'workspaces', id), { order: idx, updatedAt: t });
  });
  await b.commit();
}

export async function recomputeActiveWorkspaceCount() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const all = await loadMemberWorkspaces(uid);
  const ownedActive = all.filter((w) => w.ownerId === uid && w.isDeleted !== true).length;

  try {
    const mirror = doc(collection(db, 'workspaceMembers'), uid);
    await updateDoc(mirror, {
      userId: uid,
      activeOwnedCount: ownedActive,
      touchedAt: nowMs(),
    });
  } catch {
    await addDoc(collection(db, 'workspaceMembers'), {
      userId: uid,
      activeOwnedCount: ownedActive,
      touchedAt: nowMs(),
    });
  }
}

/** ---------- Members / Invites ---------- */

export async function addMembers(wsId: string, uids: string[]) {
  if (!uids.length) return;
  const b = writeBatch(db);
  b.update(doc(db, 'workspaces', wsId), {
    memberIds: arrayUnion(...uids),
    updatedAt: nowMs(),
  });
  await b.commit();
}

/** ---------- Page Ops ---------- */

export async function createPage(
  wsId: string,
  parentId: string | null,
  title = 'Untitled'
) {
  const ref = await addDoc(collection(db, 'workspaces', wsId, 'pages'), {
    title,
    parentId,
    order: nowMs(),
    isDeleted: false,
    createdAt: nowMs(),
    updatedAt: nowMs(),
  });
  return ref.id;
}

export async function renamePage(wsId: string, pageId: string, title: string) {
  await updateDoc(doc(db, 'workspaces', wsId, 'pages', pageId), {
    title: title || 'Untitled',
    updatedAt: nowMs(),
  });
}

export async function softDeletePage(wsId: string, pageId: string) {
  await updateDoc(doc(db, 'workspaces', wsId, 'pages', pageId), {
    isDeleted: true,
    updatedAt: nowMs(),
  });
}

export async function restorePage(wsId: string, pageId: string) {
  await updateDoc(doc(db, 'workspaces', wsId, 'pages', pageId), {
    isDeleted: false,
    updatedAt: nowMs(),
  });
}

/** Move/reorder within parent (optionally reparent). */
export async function moveOrReorderPage(params: {
  wsId: string;
  pageId: string;
  newParentId: string | null;
  siblingIdsInFinalOrder: string[];
}) {
  const { wsId, pageId, newParentId, siblingIdsInFinalOrder } = params;
  const b = writeBatch(db);
  const t = nowMs();

  b.update(doc(db, 'workspaces', wsId, 'pages', pageId), {
    parentId: newParentId,
    updatedAt: t,
  });
  siblingIdsInFinalOrder.forEach((id, idx) => {
    b.update(doc(db, 'workspaces', wsId, 'pages', id), { order: idx, updatedAt: t });
  });

  await b.commit();
}

/** First root page id (by order). */
export async function getFirstRootPageId(wsId: string) {
  const snap = await getDocs(collection(db, 'workspaces', wsId, 'pages'));
  const pages = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  const roots = pages.filter(
    (p) => (p.parentId ?? null) === null && p.isDeleted !== true
  );
  if (!roots.length) return undefined;
  const sorted = roots.sort(
    (a, b) =>
      (a.order ?? 0) - (b.order ?? 0) ||
      String(a.title || '').localeCompare(b.title || '')
  );
  return sorted[0].id;
}

/** ---------- Hard deletes (owner-only, per rules) ---------- */

export async function hardDeletePage(wsId: string, pageId: string) {
  // delete all blocks first (<= 500 ops per batch)
  const blocksSnap = await getDocs(
    collection(db, 'workspaces', wsId, 'pages', pageId, 'blocks')
  );
  const ids = blocksSnap.docs.map((d) => d.id);

  const chunkSize = 450;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const b = writeBatch(db);
    ids.slice(i, i + chunkSize).forEach((id) => {
      b.delete(doc(db, 'workspaces', wsId, 'pages', pageId, 'blocks', id));
    });
    await b.commit();
  }

  await deleteDoc(doc(db, 'workspaces', wsId, 'pages', pageId));
}

export async function hardDeleteWorkspace(wsId: string) {
  // fetch pages
  const pagesSnap = await getDocs(collection(db, 'workspaces', wsId, 'pages'));
  const pageIds = pagesSnap.docs.map((d) => d.id);

  // delete blocks under each page (chunked)
  const chunkSize = 450;
  for (const pid of pageIds) {
    const blocksSnap = await getDocs(
      collection(db, 'workspaces', wsId, 'pages', pid, 'blocks')
    );
    const blockIds = blocksSnap.docs.map((d) => d.id);
    for (let i = 0; i < blockIds.length; i += chunkSize) {
      const b = writeBatch(db);
      blockIds.slice(i, i + chunkSize).forEach((id) => {
        b.delete(doc(db, 'workspaces', wsId, 'pages', pid, 'blocks', id));
      });
      await b.commit();
    }
  }

  // delete pages (chunked)
  for (let i = 0; i < pageIds.length; i += chunkSize) {
    const b = writeBatch(db);
    pageIds.slice(i, i + chunkSize).forEach((pid) => {
      b.delete(doc(db, 'workspaces', wsId, 'pages', pid));
    });
    await b.commit();
  }

  // finally delete workspace
  await deleteDoc(doc(db, 'workspaces', wsId));
}

/** ---------- Account Deactivation ---------- */
/**
 * Deletes everything owned by the current user and removes their membership
 * from other workspaces. Finally deletes users/{uid} and signs out.
 *
 * Safe to re-login: on next sign-in your bootstrap (ensureHubAndHome / ensureInitialWorkspace)
 * will create a fresh empty workspace.
 */
export async function deactivateAccount(): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  // 1) Delete ALL workspaces owned by me
  const ownedSnap = await getDocs(
    query(collection(db, 'workspaces'), where('ownerId', '==', uid))
  );
  for (const w of ownedSnap.docs) {
    try {
      await hardDeleteWorkspace(w.id);
    } catch (e) {
      console.error('Failed to hard delete workspace', w.id, e);
    }
  }

  // 2) Leave any other workspaces where I'm just a member
  const memberSnap = await getDocs(
    query(collection(db, 'workspaces'), where('memberIds', 'array-contains', uid))
  );
  for (const w of memberSnap.docs) {
    const data = w.data() as any;
    if (data?.ownerId === uid) continue; // just deleted above
    try {
      await updateDoc(doc(db, 'workspaces', w.id), {
        memberIds: arrayRemove(uid),
        [`roles.${uid}`]: deleteField(),
        updatedAt: nowMs(),
      });
    } catch (e) {
      console.error('Failed to remove membership from workspace', w.id, e);
    }
  }

  // 3) Delete my users/{uid} profile (if any)
  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch {
    // ignore if missing
  }

  // 4) Sign out so the next login is a clean bootstrap
  try {
    await auth.signOut();
  } catch (e) {
    console.warn('Sign-out after deactivation failed', e);
  }
}
