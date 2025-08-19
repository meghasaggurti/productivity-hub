"use client";

import { useEffect, useState } from "react";
import { db, auth } from '@/lib/clientOnlyDb';
import { onAuthStateChanged } from "firebase/auth";
import { ensureMembershipForUser } from "@/lib/ensureMembership";

export default function AuthDebug() {
  const [user, setUser] = useState<any>(null);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const off = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLog((L) => [...L, `onAuthStateChanged: ${u?.uid ?? "null"}`]);
      if (u?.uid) {
        try {
          await ensureMembershipForUser(u.uid);
          setLog((L) => [...L, "ensureMembershipForUser: done"]);
        } catch (e: any) {
          setLog((L) => [...L, `ensureMembershipForUser failed: ${e?.message}`]);
        }
      }
    });
    return () => off();
  }, []);

  return (
    <main className="max-w-xl mx-auto p-6 space-y-3">
      <h1 className="text-xl font-semibold">Auth Debug</h1>
      <div className="text-sm">
        <div>uid: {user?.uid ?? "null"}</div>
        <div>email: {user?.email ?? "null"}</div>
      </div>
      <div className="text-sm border rounded p-3 bg-white">
        <div className="font-medium mb-2">Log</div>
        <pre className="text-xs whitespace-pre-wrap">{log.join("\n")}</pre>
      </div>
    </main>
  );
}
