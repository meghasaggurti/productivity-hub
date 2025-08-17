// src/lib/firebaseAdmin.ts
// Node/server-only Firebase Admin initializer for API routes and server actions.
// Uses a service account key provided via env. NEVER import this in client components.

import { initializeApp, cert, getApp, getApps, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

let _app: App | null = null;

function readServiceAccount() {
  // Prefer base64 to avoid JSON escaping in Vercel
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_B64 || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_B64 or FIREBASE_SERVICE_ACCOUNT_KEY env. " +
      "Set one in Vercel → Project → Settings → Environment Variables."
    );
  }
  // If it's base64, decode; if it's raw JSON, use directly
  const json = raw.includes("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(json);
}

export function getAdminApp(): App {
  if (_app) return _app;
  const creds = readServiceAccount();
  _app = getApps().length ? getApp() : initializeApp({ credential: cert(creds) });
  return _app;
}

export function adminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}
