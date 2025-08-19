"use client";

import {
  addDoc, arrayUnion, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where,
} from "firebase/firestore";
import { db, auth, googleProvider } from "@/lib/clientOnlyDb";
import { useEffect, useState } from "react";

/** Types */
export type Member = {
  userId: string;
  role: "viewer" | "editor";
  displayName?: string;
  email?: string;
  photoURL?: string;
};

export type Invite = {
  id: string;
  email: string;
  role: "viewer" | "editor";
  invitedBy: string;
  status: "pending" | "accepted" | "revoked";
  createdAt?: any;
};

/** Live members list */
export function useWorkspaceMembers(wsId: string) {
  const [members, setMembers] = useState<(Member & { id: string })[]>([]);
  useEffect(() => {
    if (!wsId) return;
    const q = query(collection(db, "workspaces", wsId, "members"));
    const unsub = onSnapshot(q, (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...(d.data() as Member) })));
    });
    return () => unsub();
  }, [wsId]);
  return members;
}

/** Live invites list */
export function useWorkspaceInvites(wsId: string) {
  const [invites, setInvites] = useState<Invite[]>([]);
  useEffect(() => {
    if (!wsId) return;
    const q = query(collection(db, "workspaces", wsId, "invites"));
    const unsub = onSnapshot(q, (snap) => {
      setInvites(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Invite,"id">) } as Invite)));
    });
    return () => unsub();
  }, [wsId]);
  return invites;
}

/** Create a pending invite by email */
export async function addWorkspaceInvite(wsId: string, data: { email: string; role: "viewer"|"editor"; invitedBy: string }) {
  await addDoc(collection(db, "workspaces", wsId, "invites"), {
    email: data.email,
    role: data.role,
    invitedBy: data.invitedBy,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

/** Change a member's role */
export async function setMemberRole(wsId: string, userId: string, role: "viewer"|"editor") {
  await updateDoc(doc(db, "workspaces", wsId, "members", userId), { role });
}

/** Remove a member completely */
export async function removeMember(wsId: string, userId: string) {
  await deleteDoc(doc(db, "workspaces", wsId, "members", userId));
}

/**
 * Accept an invite (call after the invited user signs in).
 * This:
 * 1) finds their pending invite by email
 * 2) writes /members/{uid}, updates workspace.memberIds
 * 3) marks invite accepted
 */
export async function acceptInvite(wsId: string, user: { uid: string; email?: string; displayName?: string; photoURL?: string }) {
  if (!user.email) return;

  // find pending invite for this email
  const qInv = query(collection(db, "workspaces", wsId, "invites"),
    where("email", "==", user.email.toLowerCase()),
    where("status", "==", "pending")
  );

  let inviteId: string | undefined;
  const unsub = onSnapshot(qInv, async (snap) => {
    unsub(); // one-shot
    const docSnap = snap.docs[0];
    if (!docSnap) return;
    inviteId = docSnap.id;

    // add member doc
    await setDoc(doc(db, "workspaces", wsId, "members", user.uid), {
      userId: user.uid,
      role: (docSnap.data().role as "viewer" | "editor") ?? "viewer",
      displayName: user.displayName ?? null,
      email: user.email ?? null,
      photoURL: user.photoURL ?? null,
      addedAt: serverTimestamp(),
    });

    // also arrayUnion into memberIds for convenience
    await updateDoc(doc(db, "workspaces", wsId), {
      memberIds: arrayUnion(user.uid),
    });

    // mark invite accepted
    await updateDoc(doc(db, "workspaces", wsId, "invites", inviteId), {
      status: "accepted",
    });
  });
}





