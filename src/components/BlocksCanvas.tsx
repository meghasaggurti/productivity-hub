// src/components/BlocksCanvas.tsx
"use client"; // Specifies that this file is intended to run on the client-side in Next.js

/**
 * Blocks canvas:
 * - Real-time stream of blocks for the current page
 * - Add Text block, edit it, delete it
 * - Client-side order sorting to avoid needing an index during dev
 * 
 * This component manages a canvas where different types of blocks (like text) are displayed and manipulated:
 * - It listens to real-time updates of blocks using Firebase Firestore and updates the UI accordingly.
 * - The user can add new text blocks, edit their content, and delete them.
 * - Blocks are sorted client-side by the 'order' field to determine their display order.
 */
import { useEffect, useState } from "react"; // Importing React hooks for side effects and state management
import {
  collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc
} from "firebase/firestore"; // Firebase Firestore methods for reading and modifying data
import { db } from "@/lib/firebaseDb"; // Firebase Firestore database instance
import type { Block, TextData } from "@/types/db"; // Types for Block and TextData

export default function BlocksCanvas({
  workspaceId, pageId
}: { workspaceId: string; pageId: string; }) {
  const [blocks, setBlocks] = useState<Block[]>([]); // State to store blocks fetched from Firestore

  // Fetching blocks in real-time using Firestore's onSnapshot
  useEffect(() => {
    const q = query(collection(db, "workspaces", workspaceId, "pages", pageId, "blocks"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Block[];
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)); // Sort blocks by order field (client-side)
      setBlocks(list); // Set blocks state
    });

    // Cleanup the snapshot listener on component unmount
    return () => unsub();
  }, [workspaceId, pageId]); // Re-run this effect whenever workspaceId or pageId changes

  // Function to add a new text block to Firestore
  const addTextBlock = async () => {
    const nextOrder = (blocks.at(-1)?.order ?? -1) + 1; // Determine the order of the new block
    await addDoc(collection(db, "workspaces", workspaceId, "pages", pageId, "blocks"), {
      type: "text", // New block type
      order: nextOrder, // Set the order value
      data: { text: "" } as TextData, // Initialize with empty text
      createdAt: Date.now(), // Record creation time
      updatedAt: Date.now(), // Record the initial update time
    });
  };

  // Function to update the text in an existing text block
  const updateText = async (id: string, text: string) => {
    await updateDoc(doc(db, "workspaces", workspaceId, "pages", pageId, "blocks", id), {
      "data.text": text, // Update the text field in the block's data
      updatedAt: Date.now(), // Update the timestamp
    });
  };

  // Function to remove a block from Firestore
  const removeBlock = async (id: string) => {
    await deleteDoc(doc(db, "workspaces", workspaceId, "pages", pageId, "blocks", id)); // Remove block by ID
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Button to add a new text block */}
      <div className="flex gap-2 mb-4">
        <button onClick={addTextBlock} className="border px-3 py-1 rounded">+ Text</button>
        {/* Later: + Image, + Board, + Table, + Chart, + Gantt, + Embed */}
      </div>

      {/* Displaying blocks */}
      <div className="space-y-4">
        {blocks.map((b) =>
          b.type === "text" ? ( // Rendering only "text" type blocks
            <TextBlock
              key={b.id}
              id={b.id}
              text={(b.data as TextData).text}
              onChange={(t) => updateText(b.id, t)} // Update text block when user changes text
              onRemove={() => removeBlock(b.id)} // Remove text block when user clicks delete
            />
          ) : null
        )}
      </div>
    </div>
  );
}

// Component for individual text blocks
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
      {/* Editable textarea for text block */}
      <textarea
        className="w-full min-h-[80px] outline-none"
        placeholder="Type…"
        value={text}
        onChange={(e) => onChange(e.target.value)} // Trigger update when text changes
      />
    </div>
  );
}

