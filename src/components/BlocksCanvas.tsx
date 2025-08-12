// src/components/BlocksCanvas.tsx
"use client";

import { useEffect, useState } from "react";
import {
  collection, onSnapshot, orderBy, query, addDoc, updateDoc, doc, deleteDoc
} from "firebase/firestore";
import { db } from "@/lib/firebaseDb";
import type { Block, TextData } from "@/types/db";

export default function BlocksCanvas({ workspaceId, pageId }: { workspaceId: string; pageId: string; }) {
  const [blocks, setBlocks] = useState<Block[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "workspaces", workspaceId, "pages", pageId, "blocks"),
      orderBy("order", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setBlocks(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Block[]
      );
    });
    return () => unsub();
  }, [workspaceId, pageId]);

  const addTextBlock = async () => {
    const nextOrder = (blocks.at(-1)?.order ?? -1) + 1;
    await addDoc(collection(db, "workspaces", workspaceId, "pages", pageId, "blocks"), {
      type: "text",
      order: nextOrder,
      data: { text: "" } as TextData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  const updateText = async (id: string, text: string) => {
    await updateDoc(doc(db, "workspaces", workspaceId, "pages", pageId, "blocks", id), {
      "data.text": text,
      updatedAt: Date.now(),
    });
  };

  const removeBlock = async (id: string) => {
    await deleteDoc(doc(db, "workspaces", workspaceId, "pages", pageId, "blocks", id));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex gap-2 mb-4">
        <button onClick={addTextBlock} className="border px-3 py-1 rounded">+ Text</button>
        {/* Later: + Image, + Board, + Table, + Chart, + Gantt, + Embed */}
      </div>

      <div className="space-y-4">
        {blocks.map((b) => {
          if (b.type === "text") {
            return (
              <TextBlock
                key={b.id}
                id={b.id}
                text={(b.data as TextData).text}
                onChange={(t) => updateText(b.id, t)}
                onRemove={() => removeBlock(b.id)}
              />
            );
          }
          // Fallback: skip unknown types (we'll add more soon)
          return null;
        })}
      </div>
    </div>
  );
}

function TextBlock({
  id, text, onChange, onRemove
}: {
  id: string; text: string; onChange: (t: string) => void; onRemove: () => void;
}) {
  return (
    <div className="border rounded p-3 bg-white">
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs text-gray-500">Text</div>
        <button onClick={onRemove} className="text-xs text-red-600">Delete</button>
      </div>
      <textarea
        className="w-full min-h-[80px] outline-none"
        placeholder="Type…"
        value={text}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
