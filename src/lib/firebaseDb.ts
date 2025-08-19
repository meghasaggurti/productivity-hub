'use client';

import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

if (
  !firebaseConfig.apiKey ||
  !firebaseConfig.authDomain ||
  !firebaseConfig.projectId ||
  !firebaseConfig.appId
) {
  // If this ever fires on Vercel, make sure the NEXT_PUBLIC_* vars are set in Project → Settings → Environment Variables
  throw new Error('Missing required NEXT_PUBLIC_FIREBASE_* environment variables');
}

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Client SDKs — safe only in the browser
export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// (Optional) default export of the app if you need it elsewhere
export default app;

/**
 * 🔄 Option B: Legacy shim for older imports
 * Some files may still do `import { getClientFirebase } from "@/lib/firebaseDb"`
 * This keeps them working until you update everything to import { db, auth, googleProvider }
 */
export function getClientFirebase() {
  return {
    app,
    db,
    auth,
    googleProvider,
    ready: true,
    reason: 'ok',
  };
}
