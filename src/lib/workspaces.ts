"use client";

/**
 * workspaces.ts
 *
 * Helper to create a workspace that *matches your Firestore rules*.
 * Rules expect:
 *  - ownerId == request.auth.uid
 *  - memberIds.hasOnly([request.auth.uid]) on create
 *  - members: { [uid]: "owner" }
 */

import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from '@/lib/clientOnlyDb';

/**
 * Create a brand new workspace owned by `uid`.
 * Returns the new workspace id.
 */
export async function createWorkspace(uid: string, name: string) {
  const ref = await addDoc(collection(db, "workspaces"), {
    name,
    ownerId: uid,
    // IMPORTANT: on create your rules require hasOnly([uid])
    memberIds: [uid],
    members: { [uid]: "owner" },
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

