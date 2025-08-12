// src/lib/bootstrap.ts
// src/lib/bootstrap.ts
"use client";

import { db } from "./firebaseDb"; // <-- FIXED: import db from firebaseDb
import { addDoc, collection, getDocs, limit, query, where } from "firebase/firestore";

/** Ensure the user has a workspace + first page. Returns { workspaceId, pageId }. */
export async function ensureInitialWorkspace(
  uid: string
): Promise<{ workspaceId: string; pageId: string }> {
  console.log("[bootstrap] ensureInitialWorkspace for uid:", uid);

  const wsQ = query(
    collection(db, "workspaces"),
    where("memberIds", "array-contains", uid),
    limit(1)
  );
  const wsSnap = await getDocs(wsQ);

  if (!wsSnap.empty) {
    const wsDoc = wsSnap.docs[0];

    const pagesQ = query(collection(db, "workspaces", wsDoc.id, "pages"), limit(1));
    const pagesSnap = await getDocs(pagesQ);

    if (!pagesSnap.empty) {
      return { workspaceId: wsDoc.id, pageId: pagesSnap.docs[0].id };
    }

    const pageRef = await addDoc(collection(db, "workspaces", wsDoc.id, "pages"), {
      title: "Home",
      parentId: null,
      order: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { workspaceId: wsDoc.id, pageId: pageRef.id };
  }

  const wsRef = await addDoc(collection(db, "workspaces"), {
    name: "Hub",
    ownerId: uid,
    members: { [uid]: "owner" },
    memberIds: [uid],
    theme: { primary: "#3b82f6" },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const pageRef = await addDoc(collection(db, "workspaces", wsRef.id, "pages"), {
    title: "Home",
    parentId: null,
    order: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return { workspaceId: wsRef.id, pageId: pageRef.id };
}

export const __bootstrap_module = true;
