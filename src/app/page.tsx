'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

// ✅ Use the real DB getter, not the Proxy
import { getDbOrThrow, ready as firebaseReady, auth } from '@/lib/clientOnlyDb';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';

import { useAuth } from '@/components/AuthProvider';
import { ensureMembershipForUser } from '@/lib/ensureMembership';
import { upsertOwnProfile } from '@/lib/upsertOwnProfile';

async function ensureHomePageId(dbInst: Firestore, wsId: string): Promise<string> {
  const pagesRef = collection(dbInst, 'workspaces', wsId, 'pages');
  const q = query(pagesRef, where('isDeleted', '!=', true));
  const snap = await getDocs(q);
  const pages = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  const home = pages.find((p) => p.title === 'Home');

  if (home) return home.id;

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

async function ensureWorkspaceAndFirstPage(dbInst: Firestore, userId: string): Promise<{ wsId: string; pageId: string }> {
  const wsQ = query(collection(dbInst, 'workspaces'), where('memberIds', 'array-contains', userId));
  const wsSnap = await getDocs(wsQ);
  const workspaces = wsSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((w) => w.isDeleted !== true);

  if (workspaces.length > 0) {
    workspaces.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const wsId = workspaces[0].id;
    const pageId = await ensureHomePageId(dbInst, wsId);
    return { wsId, pageId };
  }

  // Create a default workspace + home page if none
  const batch = writeBatch(dbInst);
  const wsRef = doc(collection(dbInst, 'workspaces'));
  const pgRef = doc(collection(dbInst, 'workspaces', wsRef.id, 'pages'));
  const now = Date.now();

  batch.set(wsRef, {
    name: 'Hub',
    ownerId: userId,
    memberIds: [userId],
    isDeleted: false,
    order: now,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(pgRef, {
    title: 'Home',
    parentId: null,
    order: 0,
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  return { wsId: wsRef.id, pageId: pgRef.id };
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading, login } = useAuth();
  const [busy, setBusy] = useState(false);

  // ✅ Prevent hydration mismatch: compute this client-side
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const loading = useMemo(() => authLoading || busy, [authLoading, busy]);

  const onOpen = useCallback(async () => {
    try {
      setBusy(true);

      if (!firebaseReady) {
        alert('App not fully configured yet. Add NEXT_PUBLIC_FIREBASE_* env vars and redeploy.');
        return;
      }

      if (!auth.currentUser) {
        await login?.();
      }
      const uid = auth.currentUser?.uid;
      if (!uid) {
        alert('Could not determine your user. Please try again.');
        return;
      }

      await Promise.all([upsertOwnProfile(), ensureMembershipForUser(uid)]).catch(() => {});

      // ✅ Use the real Firestore instance
      const db = getDbOrThrow();
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
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-semibold">Your Hub</h1>
        <p className="text-slate-600 mt-2">One place for work, wedding, school, and life.</p>

        <div className="mt-6">
          <button
            onClick={onOpen}
            disabled={loading}
            className="px-4 py-2 rounded-xl border shadow-sm"
          >
            {loading ? 'Opening...' : 'Open my Hub'}
          </button>

          {/* ✅ Only show this after mount so SSR/CSR match */}
          {mounted && !firebaseReady && (
            <p className="text-xs text-red-600 mt-2">
              Firebase env vars are not configured. The app will render, but actions are disabled.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}






