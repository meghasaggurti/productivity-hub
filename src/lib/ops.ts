// src/lib/ops.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebaseDb";

/** ---------------- Workspaces ---------------- */
export async function createWorkspace(ownerUid: string, name = "New Workspace") {
  const wsRef = await addDoc(collection(db, "workspaces"), {
    name,
    ownerId: ownerUid,
    members: { [ownerUid]: "owner" },
    memberIds: [ownerUid],
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return wsRef.id;
}

/** Create workspace and immediately create a first page, return both ids */
export async function createWorkspaceWithInitialPage(
  ownerUid: string,
  name = "New Workspace"
) {
  const wsId = await createWorkspace(ownerUid, name);
  const firstPageId = await createPage(wsId, "Home", 0);
  return { wsId, pageId: firstPageId };
}

export async function renameWorkspace(wsId: string, name: string) {
  await updateDoc(doc(db, "workspaces", wsId), {
    name,
    updatedAt: serverTimestamp(),
  });
}

export async function softDeleteWorkspace(wsId: string) {
  await updateDoc(doc(db, "workspaces", wsId), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function restoreWorkspace(wsId: string) {
  await updateDoc(doc(db, "workspaces", wsId), {
    isDeleted: false,
    deletedAt: null,
    updatedAt: serverTimestamp(),
  });
}

/** Get first non-deleted page id for a workspace (fallback to any page if needed) */
export async function getFirstPageId(wsId: string) {
  // First try by order (ascending) — client-side filters avoided; we’ll just read and filter.
  const snap = await getDocs(collection(db, "workspaces", wsId, "pages"));
  const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  const nonDeleted = all.filter((p) => !p.isDeleted);
  if (nonDeleted.length) {
    nonDeleted.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return nonDeleted[0].id;
  }
  // If all deleted (or none), pick the first doc if any (so routing won’t break)
  if (all.length) return all[0].id;
  // Else create one
  const newId = await createPage(wsId, "Home", 0);
  return newId;
}

/** ---------------- Pages ---------------- */
export async function createPage(wsId: string, title = "Untitled Page", order = 0) {
  const ref = await addDoc(collection(db, "workspaces", wsId, "pages"), {
    title,
    parentId: null,
    order,
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function renamePage(wsId: string, pageId: string, title: string) {
  await updateDoc(doc(db, "workspaces", wsId, "pages", pageId), {
    title,
    updatedAt: serverTimestamp(),
  });
}

export async function softDeletePage(wsId: string, pageId: string) {
  await updateDoc(doc(db, "workspaces", wsId, "pages", pageId), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function restorePage(wsId: string, pageId: string) {
  await updateDoc(doc(db, "workspaces", wsId, "pages", pageId), {
    isDeleted: false,
    deletedAt: null,
    updatedAt: serverTimestamp(),
  });
}

/** (Optional) Hard delete a page immediately */
export async function hardDeletePage(wsId: string, pageId: string) {
  await deleteDoc(doc(db, "workspaces", wsId, "pages", pageId));
}

