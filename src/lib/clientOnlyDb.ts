// src/lib/clientOnlyDb.ts
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
 *   they are `null` cast to those types). We add runtime guards below to throw with a helpful error
 *   if someone tries to use them when `ready === false`.
 */

import { getClientFirebase, type FirebaseBag } from "@/lib/firebaseDb";
import type { Firestore } from "firebase/firestore";
import type { Auth, GoogleAuthProvider } from "firebase/auth";

let memo: FirebaseBag | undefined;

/** Ensure we only initialize once per client */
function ensureMemo(): FirebaseBag {
  if (!memo) memo = getClientFirebase();
  return memo!;
}

/** Throws a clear message when someone uses a resource before it's ready */
function notReadyMsg(name: string, reason: FirebaseBag["reason"]) {
  const hint =
    reason === "ssr"
      ? "called during SSR"
      : reason === "missing-env"
      ? "missing NEXT_PUBLIC_FIREBASE_* envs"
      : "unknown";
  return `[clientOnlyDb] ${name} is not ready (${hint}).`;
}

/** Generic proxy creator that defers the throw until first actual use */
function proxyOrThrow<T extends object>(name: string, getter: () => T): T {
  return new Proxy({} as T, {
    get(_t, prop) {
      const bag = ensureMemo();
      if (!bag.ready) {
        throw new Error(notReadyMsg(name, bag.reason));
      }
      return (getter() as any)[prop];
    },
    apply(_t, thisArg, argArray) {
      const bag = ensureMemo();
      if (!bag.ready) {
        throw new Error(notReadyMsg(name, bag.reason));
      }
      return (getter() as any).apply(thisArg, argArray);
    },
  }) as T;
}

/** Safe getters (throw if not ready) */
export function getDbOrThrow(): Firestore {
  const bag = ensureMemo();
  if (!bag.ready) throw new Error(notReadyMsg("Firestore", bag.reason));
  return bag.db;
}

export function getAuthOrThrow(): Auth {
  const bag = ensureMemo();
  if (!bag.ready) throw new Error(notReadyMsg("Auth", bag.reason));
  return bag.auth;
}

export function getGoogleProviderOrThrow(): GoogleAuthProvider {
  const bag = ensureMemo();
  if (!bag.ready)
    throw new Error(notReadyMsg("GoogleAuthProvider", bag.reason));
  return bag.googleProvider;
}

/**
 * Convenience exports matching your old imports:
 *   import { db, auth, googleProvider } from "@/lib/firebaseDb";
 *
 * These are *typed* as real SDK instances and only throw if actually used before ready.
 */
export const db: Firestore = proxyOrThrow<Firestore>("Firestore", () => getDbOrThrow());
export const auth: Auth = proxyOrThrow<Auth>("Auth", () => getAuthOrThrow());
export const googleProvider: GoogleAuthProvider = proxyOrThrow<GoogleAuthProvider>(
  "GoogleAuthProvider",
  () => getGoogleProviderOrThrow()
);

/** Optional ready flag for UI branching (never throws) */
export const ready: boolean = ensureMemo().ready;
