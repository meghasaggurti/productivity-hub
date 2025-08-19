'use client';

import { db, auth, googleProvider } from "@/lib/clientOnlyDb";
import { doc, setDoc } from 'firebase/firestore';

export async function upsertOwnProfile() {
  const u = auth.currentUser;
  if (!u) return;
  await setDoc(
    doc(db, 'users', u.uid),
    {
      uid: u.uid,
      displayName: u.displayName || null,
      email: u.email || null,
      emailLower: (u.email || '').toLowerCase(),
      photoURL: u.photoURL || null,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}
