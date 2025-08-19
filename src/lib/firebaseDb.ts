// src/lib/firebaseDb.ts

import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

/**
 * Tiny, shared initializer used by both server and client files.
 * This file DOES NOT throw if envs are missing or if called during SSR.
 * Instead, it returns a "bag" with `ready=false` plus typed placeholders
 * so downstream code can choose how to handle it.
 */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

function hasRequiredEnv() {
  return (
    !!firebaseConfig.apiKey &&
    !!firebaseConfig.authDomain &&
    !!firebaseConfig.projectId &&
    !!firebaseConfig.appId
  );
}

type NotReadyReason = "missing-env" | "ssr" | "unknown";

export type FirebaseBag = {
  ready: boolean;
  reason: NotReadyReason | "ok";
  app: FirebaseApp | null;
  db: Firestore; // typed as real Firestore even when not ready (we cast placeholders)
  auth: Auth; // same idea
  googleProvider: GoogleAuthProvider; // same idea
};

let memo: FirebaseBag | null = null;

/**
 * Returns a bag of Firebase objects.
 * - In the browser with valid envs => ready=true and real instances.
 * - On the server or with missing envs => ready=false and typed placeholders.
 */
export function getClientFirebase(): FirebaseBag {
  if (memo) return memo;

  const isBrowser = typeof window !== "undefined";
  const envOk = hasRequiredEnv();

  if (!isBrowser) {
    memo = {
      ready: false,
      reason: "ssr",
      app: null,
      db: null as unknown as Firestore,
      auth: null as unknown as Auth,
      googleProvider: null as unknown as GoogleAuthProvider,
    };
    return memo;
  }

  if (!envOk) {
    memo = {
      ready: false,
      reason: "missing-env",
      app: null,
      db: null as unknown as Firestore,
      auth: null as unknown as Auth,
      googleProvider: null as unknown as GoogleAuthProvider,
    };
    return memo;
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  memo = {
    ready: true,
    reason: "ok",
    app,
    db: getFirestore(app),
    auth: getAuth(app),
    googleProvider: new GoogleAuthProvider(),
  };

  return memo;
}
