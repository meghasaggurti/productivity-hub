"use client";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { login, loading } = useAuth();

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="max-w-sm w-full border rounded-2xl p-6 bg-white/90 backdrop-blur">
        <h1 className="text-2xl font-semibold mb-4">Welcome</h1>
        <p className="text-sm text-neutral-600 mb-6">Sign in to continue.</p>
        <button
          onClick={login}
          disabled={loading}
          className="w-full px-4 py-2 rounded-lg bg-black text-white disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Continue with Google"}
        </button>
      </div>
    </main>
  );
}
