// src/components/AppClientLayout.tsx
"use client";
import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ensureMembershipForUser } from "@/lib/ensureMembership";

export default function AppClientLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.uid) ensureMembershipForUser(user.uid).catch(console.error);
  }, [user?.uid]);

  return <>{children}</>;
}

