"use client";

import { useState } from "react";
import {
  addWorkspaceInvite,
  useWorkspaceInvites,
  useWorkspaceMembers,
  setMemberRole,
  removeMember,
} from "@/lib/members";
import { useAuth } from "./AuthProvider";

export function SharePermissionsPanel({ workspaceId, onClose }:{
  workspaceId: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const invites = useWorkspaceInvites(workspaceId);
  const members = useWorkspaceMembers(workspaceId);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer"|"editor">("viewer");
  const [tab, setTab] = useState<"members"|"invite">("members");

  async function onInvite() {
    if (!email.trim() || !user?.uid) return;
    await addWorkspaceInvite(workspaceId, {
      email: email.trim().toLowerCase(),
      role,
      invitedBy: user.uid,
    });
    setEmail("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative h-full w-full max-w-xl bg-white border-l shadow-xl p-4 overflow-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Share & Permissions</h2>
          <button className="px-2 py-1 rounded hover:bg-neutral-100" onClick={onClose}>✕</button>
        </div>

        <div className="mt-4 flex gap-2">
          <button className={`px-3 py-1.5 rounded ${tab==="members"?"bg-black text-white":"hover:bg-neutral-100"}`} onClick={()=>setTab("members")}>Members</button>
          <button className={`px-3 py-1.5 rounded ${tab==="invite"?"bg-black text-white":"hover:bg-neutral-100"}`} onClick={()=>setTab("invite")}>Invite</button>
        </div>

        {tab==="members" ? (
          <div className="mt-4">
            <div className="text-sm text-neutral-600 mb-2">Current access</div>
            <div className="divide-y border rounded">
              {members.length === 0 && <div className="px-3 py-2 text-sm text-neutral-500">No members yet.</div>}
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    {m.photoURL ? (
                      <img src={m.photoURL} alt="" className="size-7 rounded-full border" />
                    ) : (
                      <div className="size-7 rounded-full border grid place-items-center text-xs bg-white">{(m.displayName ?? m.email ?? m.userId ?? "?").slice(0,1).toUpperCase()}</div>
                    )}
                    <div>
                      <div className="text-sm">{m.displayName ?? m.email ?? m.userId}</div>
                      <div className="text-xs text-neutral-500">{m.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={m.role}
                      onChange={(e)=> setMemberRole(workspaceId, m.userId, e.target.value as "viewer"|"editor")}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button className="text-sm px-2 py-1 rounded hover:bg-red-50 text-red-600" onClick={()=>removeMember(workspaceId, m.userId)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <div className="text-sm text-neutral-600 mb-2">Invite by email</div>
            <div className="flex items-center gap-2">
              <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="name@example.com" className="flex-1 border rounded px-3 py-2" />
              <select value={role} onChange={(e)=>setRole(e.target.value as "viewer"|"editor")} className="border rounded px-2 py-2">
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <button onClick={onInvite} className="rounded bg-black text-white px-3 py-2">Send</button>
            </div>

            <div className="mt-6">
              <div className="text-sm text-neutral-600 mb-2">Pending invites</div>
              <div className="divide-y border rounded">
                {invites.length === 0 && <div className="px-3 py-2 text-sm text-neutral-500">No invites yet.</div>}
                {invites.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between px-3 py-2">
                    <div className="text-sm">{inv.email}</div>
                    <div className="text-xs text-neutral-500">role: {inv.role} • {inv.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


