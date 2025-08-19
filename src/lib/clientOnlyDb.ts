"use client";

/**
 * Client-only shim for the Firebase Web SDK.
 *
 * Why this exists:
 * - We want TypeScript to see `db` as a real `Firestore` (not `Firestore | undefined`)
 *   to satisfy call sites like `collection(db, ...)`.
 * - At the same time, we still want to *block usage* when envs are missing or during SSR.
 *
 * How it works:
 * - `getClientFirebase()` ALWAYS returns `db`/`auth` typed as real instances (even when not ready,
 *   they are `null` cast to those types). We add runtime guards in the getters below to throw
 *   with a helpful error if someone tries to use them when `ready === false`.
 */

import { getClientFirebase } from "@/lib/firebaseDb";
import type { Firestore } from "firebase/firestore";
import type { Auth, GoogleAuthProvider } from "firebase/auth";

// Use the exact return type so fields are non-optional
type FirebaseBag = ReturnType<typeof getClientFirebase>;

let memo: FirebaseBag | undefined;

function ensureMemo(): FirebaseBag {
  if (!memo) {
    memo = getClientFirebase();
  }
  return memo!;
}

/** Returns `db` or throws with a clear message (and narrows the type at call sites). */
export function getDbOrThrow(): Firestore {
  const bag = ensureMemo();
  if (!bag.ready) {
    throw new Error(
      "[clientOnlyDb] Firestore is not ready. Missing NEXT_PUBLIC_FIREBASE_* envs or called during SSR."
    );
  }
  return bag.db; // typed as Firestore (not undefined)
}

/** Returns `auth` or throws with a clear message. */
export function getAuthOrThrow(): Auth {
  const bag = ensureMemo();
  if (!bag.ready) {
    throw new Error(
      "[clientOnlyDb] Auth is not ready. Missing NEXT_PUBLIC_FIREBASE_* envs or called during SSR."
    );
  }
  return bag.auth;
}

/** Returns the Google provider or throws with a clear message. */
export function getGoogleProviderOrThrow(): GoogleAuthProvider {
  const bag = ensureMemo();
  if (!bag.ready) {
    throw new Error(
      "[clientOnlyDb] Google provider not ready (envs missing or SSR)."
    );
  }
  return bag.googleProvider;
}

/**
 * Convenience exports:
 * These are values (not functions) so you can keep existing imports like:
 *   import { db } from "@/lib/clientOnlyDb";
 *
 * They’ll be *typed* as Firestore/Auth/GoogleAuthProvider (not optional),
 * and will throw at runtime if actually used before `ready` is true.
 */
const _bag = ensureMemo();

// Getter-style proxies: defer the "throw if not ready" until the first actual use
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

// Keep an explicit ready flag if you want to branch on it in UI
export const ready: boolean = _bag.ready;
