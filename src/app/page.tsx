"use client";
import { useAuth } from "../components/AuthProvider";
import LoginButton from "../components/LoginButton";
import LogoutButton from "../components/LogoutButton";

export default function Page() {
  const { user, loading } = useAuth();

  if (loading) return <main className="p-8">Loading…</main>;

  if (!user) {
    return (
      <main className="min-h-screen grid place-items-center">
        <div className="p-8 rounded-2xl shadow space-y-4 text-center">
          <div className="text-2xl font-semibold">Welcome</div>
          <LoginButton />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen grid place-items-center">
      <div className="p-8 rounded-2xl shadow space-y-4 text-center">
        <div className="text-xl">Hi, {user.displayName ?? user.email}</div>
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt="avatar"
            className="mx-auto size-16 rounded-full border"
          />
        ) : null}
        <LogoutButton />
      </div>
    </main>
  );
}

