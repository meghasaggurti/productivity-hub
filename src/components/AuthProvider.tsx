// src/components/AuthProvider.tsx
"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from "firebase/auth";

// ✅ Use the client shim, not firebaseDb directly
import { auth, ready } from "@/lib/clientOnlyDb";
import { ensureMembershipForUser } from "@/lib/ensureMembership";
import { upsertOwnProfile } from "@/lib/upsertOwnProfile";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(Ctx);

const isIOS = () =>
  typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
const isSafari = () =>
  typeof navigator !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const inflight = useRef<Promise<void> | null>(null);

  // Only touch `auth` when Firebase is actually ready in the browser.
  useEffect(() => {
    if (!ready) return;
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  }, []);

  useEffect(() => {
    if (!ready) return;
    // swallow benign errors (e.g., user closed the Google window)
    getRedirectResult(auth).catch(() => {});
  }, []);

  useEffect(() => {
    if (!ready) {
      // we’re in SSR or envs not configured — expose non-loading UI instead of throwing
      setLoading(false);
      return;
    }
    const off = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u?.uid) {
        try {
          await Promise.all([upsertOwnProfile(), ensureMembershipForUser(u.uid)]);
        } catch {
          /* no-op */
        }
      }
    });
    return () => off();
  }, []);

  const login = async () => {
    if (inflight.current) return inflight.current;
    const provider = new GoogleAuthProvider();
    const useRedirect = isIOS() || isSafari();

    const run = async () => {
      try {
        setLoading(true);
        if (useRedirect) {
          if (!ready) throw new Error("Auth not ready.");
          await signInWithRedirect(auth, provider);
          return;
        }
        if (!ready) throw new Error("Auth not ready.");
        await signInWithPopup(auth, provider);
        if (auth.currentUser?.uid) {
          await Promise.all([upsertOwnProfile(), ensureMembershipForUser(auth.currentUser.uid)]).catch(() => {});
        }
      } finally {
        setLoading(false);
      }
    };

    inflight.current = run();
    try {
      await inflight.current;
    } finally {
      inflight.current = null;
    }
  };

  const logout = async () => {
    inflight.current = null;
    if (ready) await signOut(auth);
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}













