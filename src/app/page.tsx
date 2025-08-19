"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ensureHubAndHome } from "@/lib/bootstrap";
import { getClientFirebase } from "@/lib/firebaseDb";

/**
 * HomePage
 * - Client-only
 * - Uses lazy, browser-only Firebase initialization
 * - If user isn't signed in, triggers Google sign-in via your AuthProvider.login()
 * - After sign-in, ensures the default "Hub" + "Home" exist, then routes to them
 */
export default function HomePage() {
  const router = useRouter();

  // Your AuthProvider should expose: { user, loading, login }
  const { user, loading: authLoading, login } = useAuth();

  // Lazy Firebase Web SDK (browser only). If envs are placeholders, ready === false.
  const { auth, ready } = getClientFirebase();

  // UI state for this page
  const [opening, setOpening] = useState(false);
  const busy = useMemo(() => authLoading || opening, [authLoading, opening]);

  const open = useCallback(async () => {
    try {
      setOpening(true);

      // Guard: if Firebase envs are missing/placeholder, show a friendly message
      if (!ready) {
        alert(
          "App not fully configured yet. Add NEXT_PUBLIC_FIREBASE_* env vars to Vercel and redeploy."
        );
        return;
      }

      // If signed out, sign in first (your AuthProvider.login should do a Google popup)
      if (!auth.currentUser) {
        await login?.();
      }

      const uid = auth.currentUser?.uid;
      if (!uid) {
        alert("Could not determine your user. Please try again.");
        return;
      }

      // Ensure the default Hub workspace + Home page exist, then navigate to it
      const { wsId, pageId } = await ensureHubAndHome(uid);
      router.push(`/w/${wsId}/p/${pageId}`);
    } catch (e) {
      console.error(e);
      alert("Could not open your Hub. Please try again.");
    } finally {
      setOpening(false);
    }
  }, [auth, login, ready, router]);

  // Optional: if already signed in and you want auto-open on load
  // useEffect(() => {
  //   if (ready && user && !busy) { void open(); }
  // }, [ready, user, busy, open]);

  return (
    <div className="min-h-screen grid place-items-center bg-[#F8F5EF] font-sans">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow">
        <div className="text-lg font-medium">Welcome to Hub</div>
        <p className="text-sm opacity-70 mt-1">
          Create or open your workspace. You’ll start on the Home page.
        </p>

        <div className="mt-5 space-y-2">
          {!user ? (
            <button
              onClick={open}
              disabled={busy}
              className="w-full px-3 py-2 rounded border hover:bg-neutral-50 disabled:opacity-60"
            >
              {busy ? "Loading…" : "Sign in with Google & Open"}
            </button>
          ) : (
            <button
              onClick={open}
              disabled={busy}
              className="w-full px-3 py-2 rounded border hover:bg-neutral-50 disabled:opacity-60"
            >
              {busy ? "Opening…" : "Open my Hub"}
            </button>
          )}

          {/* Helpful hint if envs aren’t configured yet */}
          {!ready && (
            <p className="text-xs text-red-600 mt-2">
              Firebase env vars are not configured. The app will render, but actions are disabled.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}






