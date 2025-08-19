// src/lib/invites.ts
"use client";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth, googleProvider } from "@/lib/clientOnlyDb";

export async function addWorkspaceInvite(params: {
  workspaceId: string;
  email: string;
  role: "viewer" | "editor";
  invitedBy: string;
}) {
  const emailLower = params.email.trim().toLowerCase();

  await addDoc(collection(db, "workspaceInvites"), {
    workspaceId: params.workspaceId,
    emailLower,              // <- required for rules & queries
    email: params.email,     // optional: keep original case for display
    role: params.role,
    invitedBy: params.invitedBy,
    createdAt: serverTimestamp(),
  });
}
