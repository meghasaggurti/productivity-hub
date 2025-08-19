/**
 * Server-safe Firebase client bootstrap
 * - No "use client" so server files can import it without build errors
 * - Does NOT initialize on the server; proxies throw if used during SSR
 * - Keeps legacy named exports: { db, auth, googleProvider, ready }
 */

import type { FirebaseApp } from "firebase/app";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, type Firestore, setLogLevel } from "firebase/firestore";
import { getAuth, type Auth, GoogleAuthProvider } from "firebase/auth";

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;
let _googleProvider: GoogleAuthProvider | null = null;

function cfg() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };
}
function envLooksValid(c: ReturnType<typeof cfg>) {
  return Boolean(c.apiKey && c.projectId && c.appId);
}

/** Call from client components/hooks only */
export function getClientFirebase() {
  if (typeof window === "undefined") {
    return {
      app: null as unknown as FirebaseApp,
      db: null as unknown as Firestore,
      auth: null as unknown as Auth,
      googleProvider: null as unknown as GoogleAuthProvider,
      ready: false,
      reason: "server" as const,
    };
  }

  const conf = cfg();
  if (!envLooksValid(conf)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[firebaseDb] Missing NEXT_PUBLIC_FIREBASE_* envs. Skipping init."
      );
    }
    return {
      app: null as unknown as FirebaseApp,
      db: null as unknown as Firestore,
      auth: null as unknown as Auth,
      googleProvider: null as unknown as GoogleAuthProvider,
      ready: false,
      reason: "env" as const,
    };
  }

  if (!_app) _app = getApps().length ? getApp() : initializeApp(conf);
  if (!_db) _db = getFirestore(_app);
  if (!_auth) _auth = getAuth(_app);
  if (!_googleProvider) _googleProvider = new GoogleAuthProvider();

  if (process.env.NODE_ENV === "development") setLogLevel("debug");

  return {
    app: _app,
    db: _db,
    auth: _auth,
    googleProvider: _googleProvider,
    ready: true,
    reason: "ok" as const,
  };
}

/* --------------------------------------------------------------------------------
 * Compatibility named exports that are safe to import on the server.
 * Accessing them during SSR will throw with a clear message.
 * -------------------------------------------------------------------------------- */

function ensureClient(kind: "Firestore" | "Auth" | "GoogleProvider") {
  if (typeof window === "undefined") {
    throw new Error(`[firebaseDb] ${kind} cannot be used during SSR.`);
  }
  const bag = getClientFirebase();
  if (!bag.ready) {
    throw new Error(
      `[firebaseDb] ${kind} not ready. Check NEXT_PUBLIC_FIREBASE_* envs.`
    );
  }
  return bag;
}

export const db: Firestore = new Proxy({} as Firestore, {
  get(_t, prop) {
    const bag = ensureClient("Firestore");
    // @ts-expect-error dynamic
    return bag.db[prop];
  },
}) as Firestore;

export const auth: Auth = new Proxy({} as Auth, {
  get(_t, prop) {
    const bag = ensureClient("Auth");
    // @ts-expect-error dynamic
    return bag.auth[prop];
  },
}) as Auth;

export const googleProvider: GoogleAuthProvider = new Proxy(
  {} as GoogleAuthProvider,
  {
    get(_t, prop) {
      const bag = ensureClient("GoogleProvider");
      // @ts-expect-error dynamic
      return bag.googleProvider[prop];
    },
  }
) as GoogleAuthProvider;

// lightweight flag; true only on the client with valid env
export const ready: boolean =
  typeof window !== "undefined" && envLooksValid(cfg());
