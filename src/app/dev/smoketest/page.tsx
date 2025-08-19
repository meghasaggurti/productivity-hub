"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  where,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth, googleProvider } from "@/lib/clientOnlyDb";

type StepResult =
  | { ok: true; label: string; data?: any }
  | { ok: false; label: string; error: string };

export default function FirestoreSmokeTest() {
  const { user, loading } = useAuth();
  const [results, setResults] = useState<StepResult[]>([]);
  const [running, setRunning] = useState(false);

  const push = (r: StepResult) =>
    setResults((prev) => [...prev, r]);

  const run = async () => {
    setResults([]);
    setRunning(true);
    try {
      if (loading) {
        push({ ok: false, label: "auth", error: "Auth still loading" });
        return;
      }
      if (!user) {
        push({ ok: false, label: "auth", error: "No user. Sign in first." });
        return;
      }

      // 1) Find a workspace I'm a member of
      let wsId: string | null = null;
      try {
        const qMy = query(
          collection(db, "workspaces"),
          where("memberIds", "array-contains", user.uid),
          limit(1)
        );
        const snap = await getDocs(qMy);
        push({ ok: true, label: "query workspaces by memberIds", data: { count: snap.size } });

        if (snap.empty) {
          push({ ok: false, label: "no workspace", error: "You have no workspace the rules let you read." });
          return;
        }
        wsId = snap.docs[0].id;
      } catch (e: any) {
        push({ ok: false, label: "query workspaces by memberIds", error: e?.message ?? String(e) });
        return;
      }

      // 2) Read that workspace doc
      try {
        const w = await getDoc(doc(db, "workspaces", wsId));
        push({ ok: true, label: "read workspace doc", data: w.data() });
      } catch (e: any) {
        push({ ok: false, label: "read workspace doc", error: e?.message ?? String(e) });
        return;
      }

      // 3) Create a single test page if it doesn't exist
      let created = false;
      try {
        const existing = await getDocs(
          query(
            collection(db, "workspaces", wsId, "pages"),
            where("title", "==", "__SMOKE_TEST__"),
            limit(1)
          )
        );
        if (existing.empty) {
          await addDoc(collection(db, "workspaces", wsId, "pages"), {
            title: "__SMOKE_TEST__",
            parentId: null,
            order: 999999,
            isDeleted: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          created = true;
        }
        push({ ok: true, label: created ? "create page" : "create page (skipped: already exists)" });
      } catch (e: any) {
        push({ ok: false, label: "create page", error: e?.message ?? String(e) });
        return;
      }

      // 4) Count pages
      try {
        const pagesSnap = await getDocs(collection(db, "workspaces", wsId, "pages"));
        push({ ok: true, label: "list pages", data: { count: pagesSnap.size } });
      } catch (e: any) {
        push({ ok: false, label: "list pages", error: e?.message ?? String(e) });
        return;
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Firestore Debug</h1>
      <div className="text-sm text-gray-600">
        Project: <code>{process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}</code>
      </div>
      <div className="text-sm text-gray-600">
        User:{" "}
        <code>
          {user ? `${user.uid} (${user.email})` : "—"}
        </code>
      </div>

      <button
        onClick={run}
        disabled={running}
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
      >
        {running ? "Running…" : "Run Firestore Smoke Test"}
      </button>

      <div className="space-y-2">
        {results.map((r, i) => (
          <div key={i} className={`border rounded p-3 ${r.ok ? "border-green-300" : "border-red-300"}`}>
            <div className="font-medium">{r.label}</div>
            {"data" in r && r.data && (
              <pre className="text-xs mt-1 bg-gray-50 rounded p-2 overflow-auto">
                {JSON.stringify(r.data, null, 2)}
              </pre>
            )}
            {"error" in r && r.error && (
              <div className="text-sm text-red-600 mt-1">{r.error}</div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        This test only touches <code>/workspaces</code> and <code>/workspaces/&lt;wsId&gt;/pages</code>.
        If it passes but your app still throws “insufficient permissions”, some other listener
        (e.g. invites, members, trash) is querying a locked collection. We can fix that next.
      </p>
    </main>
  );
}
