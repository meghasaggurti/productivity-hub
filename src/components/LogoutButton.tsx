"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

export default function LogoutButton() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout(); // sign out from Firebase
    router.replace("/"); // redirect to home/login page
  };

  return (
    <button onClick={handleLogout} className="px-4 py-2 rounded-xl border">
      Sign out
    </button>
  );
}



