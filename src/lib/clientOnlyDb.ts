// src/lib/clientOnlyDb.ts
"use client";

/**
 * Client-only shim for the Firebase Web SDK.
 * - Provides strongly typed `db`, `auth`, `googleProvider`
 * - Only throws if you actually *use* them when not ready (envs missing or SSR)
 */
import getClientFirebase, { type FirebaseBag } from "@/lib/firebaseDb";
import type { Firestore } from "firebase/firestore";
import type { Auth, GoogleAuthProvider } from "firebase/auth";

let memo: FirebaseBag | undefined;
function ensureMemo(): FirebaseBag {
  if (!memo) memo = getClientFirebase();
  return memo!;
}

export function getDbOrThrow(): Firestore {
  const bag = ensureMemo();
  if (!bag.ready) {
    throw new Error("[clientOnlyDb] Firestore is not ready (missing NEXT_PUBLIC_FIREBASE_* envs or SSR).");
  }
  return bag.db;
}

export function getAuthOrThrow(): Auth {
  const bag = ensureMemo();
  if (!bag.ready) {
    throw new Error("[clientOnlyDb] Auth is not ready (missing NEXT_PUBLIC_FIREBASE_* envs or SSR).");
  }
  return bag.auth;
}

export function getGoogleProviderOrThrow(): GoogleAuthProvider {
  const bag = ensureMemo();
  if (!bag.ready) {
    throw new Error("[clientOnlyDb] Google provider not ready (missing envs or SSR).");
  }
  return bag.googleProvider;
}

// Proxies so existing “import { db, auth } …” code still works
export const db: Firestore = new Proxy({} as Firestore, {
  get(_t, prop) {
    return (getDbOrThrow() as any)[prop];
  },
}) as Firestore;

export const auth: Auth = new Proxy({} as Auth, {
  get(_t, prop) {
    return (getAuthOrThrow() as any)[prop];
  },
}) as Auth;

export const googleProvider: GoogleAuthProvider = new Proxy({} as GoogleAuthProvider, {
  get(_t, prop) {
    return (getGoogleProviderOrThrow() as any)[prop];
  },
}) as GoogleAuthProvider;

// expose readiness so components can guard side-effects
const _bag = ensureMemo();
export const ready: boolean = _bag.ready;
