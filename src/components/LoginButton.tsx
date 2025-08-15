// src/components/LoginButton.tsx
"use client";
import { useAuth } from "@/components/AuthProvider";

export default function LoginButton() {
  const { login, loading } = useAuth();
  return (
    <button
      onClick={login}
      disabled={loading}
      className="px-4 py-2 rounded-xl border bg-black text-white disabled:opacity-60"
    >
      {loading ? "Signing in…" : "Continue with Google"}
    </button>
  );
}





