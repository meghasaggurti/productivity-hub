// src/lib/bootstrap.ts
"use client"; // Specifies that this file is intended to run on the client-side in Next.js

/**
 * Ensures the signed-in user has at least one workspace ("Hub")
 * and at least one page ("Home"). Returns their IDs.
 * 
 * This function checks if the user has an existing workspace and page. If not, it creates a default workspace ("Hub") and a default page ("Home").
 */
import { db } from "./firebaseDb"; // Import Firebase Firestore database instance
import { addDoc, collection, getDocs, limit, query, where } from "firebase/firestore"; // Import Firestore functions for querying and adding documents

// Function to ensure that a signed-in user has a workspace and page
export async function ensureInitialWorkspace(
  uid: string // The user's unique ID
): Promise<{ workspaceId: string; pageId: string }> {
  // 1) Look for any workspace where this user is a member
  const wsQ = query(
    collection(db, "workspaces"), // Query the 'workspaces' collection
    where("memberIds", "array-contains", uid), // Filter where the user is a member of the workspace
    limit(1) // Limit the query to return only 1 workspace
  );
  const wsSnap = await getDocs(wsQ); // Execute the query and get the snapshot

  if (!wsSnap.empty) { // If there's at least one workspace where the user is a member
    const wsDoc = wsSnap.docs[0]; // Get the first workspace document

    // 2) Look for a page in that workspace
    const pagesQ = query(collection(db, "workspaces", wsDoc.id, "pages"), limit(1)); // Query for pages in that workspace
    const pagesSnap = await getDocs(pagesQ); // Execute the query and get the snapshot

    if (!pagesSnap.empty) { // If there’s at least one page in the workspace
      return { workspaceId: wsDoc.id, pageId: pagesSnap.docs[0].id }; // Return the workspace and page IDs
    }

    // 3) Create initial page ("Home") in the workspace if no pages exist
    const pageRef = await addDoc(collection(db, "workspaces", wsDoc.id, "pages"), {
      title: "Home", // Default page title
      parentId: null, // Parent ID is null for top-level pages
      order: 0, // Set the order for the page (0)
      createdAt: Date.now(), // Set the creation timestamp
      updatedAt: Date.now(), // Set the update timestamp
    });
    return { workspaceId: wsDoc.id, pageId: pageRef.id }; // Return workspace and newly created page IDs
  }

  // 4) If no workspace exists, create a default "Hub" workspace for this user
  const wsRef = await addDoc(collection(db, "workspaces"), {
    name: "Hub", // Default workspace name
    ownerId: uid, // Set the workspace owner to the current user
    members: { [uid]: "owner" }, // Assign the user as the owner in the members field
    memberIds: [uid], // Set the memberIds array to contain the current user's ID
    theme: { primary: "#3b82f6" }, // Set a default theme color for the workspace
    createdAt: Date.now(), // Set the creation timestamp
    updatedAt: Date.now(), // Set the update timestamp
  });

  // 5) Create the first page ("Home") in the new workspace
  const pageRef = await addDoc(collection(db, "workspaces", wsRef.id, "pages"), {
    title: "Home", // Default page title
    parentId: null, // Parent ID is null for top-level pages
    order: 0, // Set the order for the page (0)
    createdAt: Date.now(), // Set the creation timestamp
    updatedAt: Date.now(), // Set the update timestamp
  });

  return { workspaceId: wsRef.id, pageId: pageRef.id }; // Return IDs of the newly created workspace and page
}


