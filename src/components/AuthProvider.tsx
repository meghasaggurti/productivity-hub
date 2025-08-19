'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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
} from 'firebase/auth';
import { db, auth } from '@/lib/clientOnlyDb';
import { ensureMembershipForUser } from '@/lib/ensureMembership';
import { upsertOwnProfile } from '@/lib/upsertOwnProfile';

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
  typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
const isSafari = () =>
  typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const inflight = useRef<Promise<void> | null>(null);

  // Persist sessions in the browser
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);
  }, []);

  // Swallow redirect result errors quietly (e.g., user closed the sheet)
  useEffect(() => {
    getRedirectResult(auth).catch(() => {});
  }, []);

  // Auth state
  useEffect(() => {
    const off = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u?.uid) {
        try {
          // Ensure profile doc + membership mirror are in place on every login
          await Promise.all([upsertOwnProfile(), ensureMembershipForUser(u.uid)]);
        } catch {
          // no-op
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
          await signInWithRedirect(auth, provider);
          return; // flow continues after redirect
        }
        await signInWithPopup(auth, provider);
        if (auth.currentUser?.uid) {
          await Promise.all([upsertOwnProfile(), ensureMembershipForUser(auth.currentUser.uid)]).catch(
            () => {}
          );
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
    await signOut(auth);
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}













