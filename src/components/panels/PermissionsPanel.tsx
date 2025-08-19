'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { db, auth } from '@/lib/clientOnlyDb';
import { addMembers } from '@/lib/ops';

type Props = { wsId: string; onClose: () => void };

type Role = 'viewer' | 'editor' | 'owner';

export default function PermissionsPanel({ wsId, onClose }: Props) {
  const [members, setMembers] = useState<string[]>([]);
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const me = auth.currentUser?.uid || '';

  // Live workspace doc
  useEffect(() => {
    if (!wsId) return;
    const ref = doc(db, 'workspaces', wsId);
    const off = onSnapshot(ref, (snap) => {
      const data = snap.data() as any;
      setMembers((data?.memberIds as string[]) || []);
      setRoles((data?.roles as Record<string, Role>) || {});
    });
    return () => off();
  }, [wsId]);

  // Change role for a member
  async function setRole(uid: string, role: Role) {
    const ref = doc(db, 'workspaces', wsId);
    await updateDoc(ref, { [`roles.${uid}`]: role, updatedAt: Date.now() });
  }

  // Add member by UID (kept simple; you can attach email->uid lookup later)
  const [newUid, setNewUid] = useState('');
  async function onAdd() {
    const uid = newUid.trim();
    if (!uid) return;
    try {
      await addMembers(wsId, [uid]);
      setNewUid('');
    } catch (e) {
      alert((e as Error)?.message || 'Could not add member');
    }
  }

  // Don’t allow demoting the only owner
  const numOwners = useMemo(
    () => members.filter((m) => (roles[m] || 'editor') === 'owner').length,
    [members, roles]
  );

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const panelRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {/* Backdrop */}
      <div
        className="pointer-events-auto fixed inset-0 bg-black/40"
        aria-hidden="true"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Permissions"
        className="pointer-events-auto fixed right-0 top-0 h-full w-[min(720px,90vw)] bg-white shadow-xl border-l border-neutral-200 flex flex-col"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
          <h2 className="text-sm font-medium tracking-wide uppercase text-neutral-700">
            Permissions
          </h2>
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
          >
            Close
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Add member */}
          <section>
            <div className="text-[11px] uppercase tracking-wide text-neutral-500 mb-3">
              Add member (UID)
            </div>
            <div className="flex gap-2">
              <label htmlFor="add-uid" className="sr-only">User ID</label>
              <input
                id="add-uid"
                name="uid"
                value={newUid}
                onChange={(e) => setNewUid(e.currentTarget.value)}
                placeholder="Paste a Firebase UID"
                className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-neutral-300"
              />
              <button
                onClick={onAdd}
                className="rounded-md px-3 py-2 border border-neutral-800 text-neutral-900 hover:bg-neutral-100"
              >
                Add
              </button>
            </div>
            <p className="mt-2 text-[11px] text-neutral-500">
              (Later you can wire email→uid lookup; this version uses raw UID.)
            </p>
          </section>

          {/* Members */}
          <section>
            <div className="text-[11px] uppercase tracking-wide text-neutral-500 mb-3">
              Members & roles
            </div>
            <ul className="space-y-2">
              {members.map((m) => {
                const role = roles[m] || 'editor';
                const isMe = m === me;
                const isOwner = role === 'owner';
                const disablingOwnerDemotion =
                  isOwner && numOwners <= 1; // last owner

                return (
                  <li key={m} className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-[13px] text-neutral-900 truncate">
                        {m} {isMe && <span className="text-neutral-500">(you)</span>}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        Role: {role}
                      </div>
                    </div>

                    <div className="shrink-0">
                      <label htmlFor={`role-${m}`} className="sr-only">Role</label>
                      <select
                        id={`role-${m}`}
                        name={`role-${m}`}
                        className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-[13px]"
                        value={role}
                        onChange={async (e) => {
                          const next = e.currentTarget.value as Role;
                          if (disablingOwnerDemotion && next !== 'owner') {
                            alert('You cannot demote the last owner.');
                            return;
                          }
                          try {
                            await setRole(m, next);
                          } catch (err) {
                            alert((err as Error)?.message || 'Failed to change role.');
                          }
                        }}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="owner">Owner</option>
                      </select>
                    </div>
                  </li>
                );
              })}
              {!members.length && (
                <li className="text-[13px] text-neutral-500">
                  No members yet.
                </li>
              )}
            </ul>
          </section>
        </div>
      </aside>
    </div>
  );
}


