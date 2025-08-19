// src/lib/firebaseDb.ts
"use client";

import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth, GoogleAuthProvider } from "firebase/auth";

export type FirebaseBag = {
  ready: boolean;
  app: FirebaseApp | null;
  db: Firestore; // when not ready, these are placeholders (casted) and only used via clientOnlyDb guards
  auth: Auth;
  googleProvider: GoogleAuthProvider;
};

function hasRequiredEnvs() {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  );
}

export default function getClientFirebase(): FirebaseBag {
  // Block during SSR or if envs are missing
  const isBrowser = typeof window !== "undefined";
  const envOK = hasRequiredEnvs();

  if (!isBrowser || !envOK) {
    // return a stable shape; real access will be gated by clientOnlyDb
    return {
      ready: false,
      app: null,
      db: (null as unknown) as Firestore,
      auth: (null as unknown) as Auth,
      googleProvider: new GoogleAuthProvider(),
    };
  }

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  };

  const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);
  const googleProvider = new GoogleAuthProvider();

  return { ready: true, app, db, auth, googleProvider };
}
