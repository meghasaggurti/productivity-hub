'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// Pull a real Firestore instance from the client-only shim
import { db, ready as firebaseReady, auth } from '@/lib/clientOnlyDb';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

import { useAuth } from '@/components/AuthProvider'; // your context (login/logout/user)
import { ensureMembershipForUser } from '@/lib/ensureMembership';
import { upsertOwnProfile } from '@/lib/upsertOwnProfile';

// ---- helpers that ALWAYS receive a real Firestore instance ----
async function ensureHomePageId(dbInst: typeof db, wsId: string): Promise<string> {
  // pages collection under workspace
  const pagesRef = collection(dbInst, 'workspaces', wsId, 'pages');

  const pagesSnap = await getDocs(pagesRef);
  const pages = pagesSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((p) => p.isDeleted !== true);

  const home = pages.find((p) => p.title === 'Home');
  if (home) return home.id;

  if (pages[0]) return pages[0].id;

  // Create Home page if none
  const batch = writeBatch(dbInst);
  const newPageRef = doc(pagesRef);
  batch.set(newPageRef, {
    title: 'Home',
    parentId: null,
    order: 0,
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return newPageRef.id;
}

async function ensureWorkspaceAndFirstPage(dbInst: typeof db, userId: string): Promise<{ wsId: string; pageId: string }> {
  // Workspaces where the user is a member
  const wsQ = query(collection(dbInst, 'workspaces'), where('memberIds', 'array-contains', userId));
  const wsSnap = await getDocs(wsQ);
  const workspaces = wsSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((w) => w.isDeleted !== true);

  if (workspaces.length > 0) {
    // Choose the first by order (default 0)
    workspaces.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const wsId = workspaces[0].id;
    const pageId = await ensureHomePageId(dbInst, wsId);
    return { wsId, pageId };
  }

  // Create a new workspace + Home page atomically
  const t = serverTimestamp();
  const batch = writeBatch(dbInst);

  const wsRef = doc(collection(dbInst, 'workspaces'));
  const pageRef = doc(collection(dbInst, 'workspaces', wsRef.id, 'pages'));

  batch.set(wsRef, {
    name: 'Hub',
    ownerId: userId,
    memberIds: [userId],
    isDeleted: false,
    createdAt: t,
    updatedAt: t,
  });

  batch.set(pageRef, {
    title: 'Home',
    parentId: null,
    order: 0,
    isDeleted: false,
    createdAt: t,
    updatedAt: t,
  });

  await batch.commit();
  return { wsId: wsRef.id, pageId: pageRef.id };
}

// ---- Component ----
export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading, login } = useAuth();

  const [busy, setBusy] = useState(false);
  const loading = useMemo(() => authLoading || busy, [authLoading, busy]);

  const onOpen = useCallback(async () => {
    try {
      setBusy(true);

      if (!firebaseReady) {
        alert('App not fully configured yet. Add NEXT_PUBLIC_FIREBASE_* env vars and redeploy.');
        return;
      }

      // Ensure signed in
      if (!auth.currentUser) {
        await login?.();
      }
      const uid = auth.currentUser?.uid;
      if (!uid) {
        alert('Could not determine your user. Please try again.');
        return;
      }

      // Keep your profile + membership mirror logic
      await Promise.all([upsertOwnProfile(), ensureMembershipForUser(uid)]).catch(() => {});

      // IMPORTANT: pass the db we imported directly
      const { wsId, pageId } = await ensureWorkspaceAndFirstPage(db, uid);
      router.push(`/w/${wsId}/p/${pageId}`);
    } catch (err) {
      console.error(err);
      alert('Could not open your Hub. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [login, router]);

  return (
    <div className="min-h-screen grid place-items-center bg-[#F8F5EF] font-sans">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow">
        <div className="text-lg font-medium">Welcome to Hub</div>
        <p className="text-sm opacity-70 mt-1">
          Create or open your workspace. You’ll start on the Home page.
        </p>

        <div className="mt-5 space-y-2">
          <button
            onClick={onOpen}
            disabled={loading}
            className="w-full px-3 py-2 rounded border hover:bg-neutral-50 disabled:opacity-60"
          >
            {user ? (loading ? 'Opening…' : 'Open my Hub') : (loading ? 'Loading…' : 'Sign in with Google & Open')}
          </button>

          {!firebaseReady && (
            <p className="text-xs text-red-600 mt-2">
              Firebase env vars are not configured. The app will render, but actions are disabled.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}





