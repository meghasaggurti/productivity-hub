"use client";
import { useAuth } from "./AuthProvider";

export default function LogoutButton() {
  const { logout } = useAuth();
  return (
    <button onClick={logout} className="px-4 py-2 rounded-xl border">
      Sign out
    </button>
  );
}
