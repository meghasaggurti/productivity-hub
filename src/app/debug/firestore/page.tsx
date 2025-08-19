// src/app/debug/firestore/page.tsx
"use client";

import { useState } from "react";
import { collection, query, where, limit, getDocs, addDoc, orderBy } from "firebase/firestore";
import { db, auth } from '@/lib/clientOnlyDb';
import { useAuth } from "@/components/AuthProvider";

export default function FirestoreDebug() {
  const { user } = useAuth();
  const [log, setLog] = useState<string>("");

  async function run() {
    const lines: string[] = [];
    const push = (o: any) => lines.push(typeof o === "string" ? o : JSON.stringify(o, null, 2));

    try {
      push("Run Firestore Smoke Test");

      if (!user) {
        push("Not signed in.");
        setLog(lines.join("\n\n"));
        return;
      }
      push(`user: ${user.uid} (${user.email || "no-email"})`);

      // 1) find my workspace
      const wsQ = query(
        collection(db, "workspaces"),
        where("memberIds", "array-contains", user.uid),
        limit(1)
      );
      const wsSnap = await getDocs(wsQ);
      if (wsSnap.empty) {
        push("No workspace found.");
        setLog(lines.join("\n\n"));
        return;
      }
      const ws = wsSnap.docs[0];
      push({ workspaceId: ws.id, workspace: ws.data() });

      // 2) pages list
      const pagesQ = query(
        collection(db, "workspaces", ws.id, "pages"),
        orderBy("order")
      );
      const pagesSnap = await getDocs(pagesQ);
      push({ pagesCount: pagesSnap.size });

      // 3) try add a page (commented by default)
      // const created = await addDoc(collection(db, "workspaces", ws.id, "pages"), {
      //   title: "Debug Page",
      //   order: (pagesSnap.size || 0) + 1,
      //   isDeleted: false,
      //   createdAt: new Date(),
      // });
      // push({ created: created.id });

      setLog(lines.join("\n\n"));
    } catch (e: any) {
      push(`ERROR: ${e?.message ?? String(e)}`);
      setLog(lines.join("\n\n"));
    }
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Firestore Debug</h1>
      <button onClick={run} className="px-3 py-2 rounded-lg bg-black text-white">
        Run Smoke Test
      </button>
      <pre className="mt-4 p-4 bg-black/5 rounded-lg whitespace-pre-wrap">{log}</pre>
    </main>
  );
}

