"use client";

/**
 * Client-only Firebase initialization (safe for Vercel builds)
 * - Never runs during SSR/prerender (checks typeof window)
 * - Works even when env values are placeholders (returns ready=false)
 * - Your components should gate on `ready` before using db/auth
 * - For backward compatibility, this file now also exports { db, auth, googleProvider, ready }
 *   so existing imports like `import { db } from "@/lib/firebaseDb"` keep working.
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

/** Use ONLY inside client components */
export function getClientFirebase() {
  // ✅ Do not initialize Web SDK on the server (SSR/prerender)
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
        "[firebaseDb] Missing/placeholder Firebase env. Set NEXT_PUBLIC_FIREBASE_* in Vercel/Local."
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

/* -------------------------------------------------------------------------------------------------
 * Compatibility shim exports
 * Keep legacy imports working:
 *   import { db, auth, googleProvider, ready } from "@/lib/firebaseDb";
 * These proxies defer to the real instances and throw helpful errors if not ready.
 * ------------------------------------------------------------------------------------------------- */

const __bag = getClientFirebase();

function __ensureReady(kind: "Firestore" | "Auth" | "GoogleProvider") {
  if (!__bag.ready) {
    throw new Error(
      `[firebaseDb] ${kind} is not ready. Missing NEXT_PUBLIC_FIREBASE_* envs or called during SSR.`
    );
  }
}

// Proxy for Firestore that throws if accessed before ready
export const db: Firestore = new Proxy({} as Firestore, {
  get(_t, prop) {
    __ensureReady("Firestore");
    return (__bag.db as any)[prop];
  },
}) as Firestore;

// Proxy for Auth that throws if accessed before ready
export const auth: Auth = new Proxy({} as Auth, {
  get(_t, prop) {
    __ensureReady("Auth");
    return (__bag.auth as any)[prop];
  },
}) as Auth;

// Proxy for GoogleAuthProvider that throws if accessed before ready
export const googleProvider: GoogleAuthProvider = new Proxy(
  {} as GoogleAuthProvider,
  {
    get(_t, prop) {
      __ensureReady("GoogleProvider");
      return (__bag.googleProvider as any)[prop];
    },
  }
) as GoogleAuthProvider;

// Handy flag for UI branching
export const ready: boolean = __bag.ready;
