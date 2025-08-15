// src/components/QuickReset.tsx
'use client';

import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebaseDb';
import { useRouter } from 'next/navigation';

// OPTIONAL: if you have this and want to keep it
// import { recomputeActiveWorkspaceCount } from '@/lib/ops';

export default function QuickReset() {
  const router = useRouter();

  async function ensureHome(wsId: string) {
    // Create a "Home" page if none exists; we don't need to read first
    const pageRef = await addDoc(collection(db, 'workspaces', wsId, 'pages'), {
      title: 'Home',
      parentId: null,
      order: 0,
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return pageRef.id;
  }

  async function run() {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      alert('Sign in first');
      return;
    }

    // 1) Find any accessible workspaces by membership (not ownerId)
    const qMember = query(
      collection(db, 'workspaces'),
      where('memberIds', 'array-contains', uid)
    );
    const memberSnap = await getDocs(qMember);
    const all = memberSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    const active = all.filter(w => w.isDeleted !== true);
    const deleted = all.filter(w => w.isDeleted === true);

    // If you still have any active workspace, just open the first one’s Home (create if missing).
    if (active.length > 0) {
      const wsId = active[0].id;
      const homeId = await ensureHome(wsId);
      // await recomputeActiveWorkspaceCount?.();
      router.push(`/w/${wsId}/p/${homeId}`);
      return;
    }

    // If you only have deleted ones, revive the first and recreate Home.
    if (deleted.length > 0) {
      const wsId = deleted[0].id;
      const b = writeBatch(db);
      b.update(doc(db, 'workspaces', wsId), {
        isDeleted: false,
        updatedAt: serverTimestamp(),
      });
      await b.commit();
      const homeId = await ensureHome(wsId);
      // await recomputeActiveWorkspaceCount?.();
      router.push(`/w/${wsId}/p/${homeId}`);
      return;
    }

    // 2) None exist -> create a fresh one named "Hub" with a Home page
    const now = serverTimestamp();
    const wsRef = doc(collection(db, 'workspaces'));
    const b = writeBatch(db);

    // IMPORTANT: send only what rules expect on create
    b.set(wsRef, {
      name: 'Hub',
      ownerId: uid,
      memberIds: [uid],
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    // Create Home page
    const pageRef = doc(collection(db, 'workspaces', wsRef.id, 'pages'));
    b.set(pageRef, {
      title: 'Home',
      parentId: null,
      order: 0,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    await b.commit();

    // await recomputeActiveWorkspaceCount?.();
    router.push(`/w/${wsRef.id}/p/${pageRef.id}`);
  }

  return (
    <div className="min-h-[60vh] grid place-items-center p-8 font-sans">
      <button
        onClick={run}
        className="px-3 py-2 rounded border shadow-sm hover:bg-neutral-50"
      >
        Reset & Open Home
      </button>
    </div>
  );
}


