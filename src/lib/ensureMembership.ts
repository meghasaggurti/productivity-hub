// src/lib/ensureMembership.ts
import { db } from '@/lib/firebaseDb';
import {
  collection, doc, getDoc, getDocs, query, where, setDoc,
} from 'firebase/firestore';
import { ensureHubAndHome } from '@/lib/ops';

/**
 * Ensure the signed-in user has at least one active workspace.
 * If user was deactivated previously, clear the flag and start fresh.
 */
export async function ensureMembershipForUser(uid: string) {
  // Check deactivated flag
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  const wasDeactivated = userSnap.exists() && !!(userSnap.data() as any).deactivatedAt;

  // Do they have any workspaces at all?
  const qWs = query(collection(db, 'workspaces'), where('memberIds', 'array-contains', uid));
  const snap = await getDocs(qWs);

  if (wasDeactivated || snap.empty) {
    // Clear flag and create fresh Hub → Home
    await setDoc(userRef, { deactivatedAt: null, updatedAt: Date.now() }, { merge: true });
    await ensureHubAndHome(uid);
  }
}
