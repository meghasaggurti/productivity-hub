// src/app/page.tsx
"use client"; // Specifies that this file is intended to run on the client-side in Next.js

/**
 * Home page:
 * - If not logged in: show Login button
 * - If logged in: ensure a default workspace/page exists and redirect there
 * 
 * This page handles the following logic:
 * 1. If the user is not logged in, it shows the Login button for authentication.
 * 2. If the user is logged in, it ensures that a default workspace and page exist for them.
 *    - It performs a check by calling `ensureInitialWorkspace` and, once complete, redirects to that workspace/page.
 * 3. If the user is logged in and a workspace/page exists, it automatically redirects to the workspace's page.
 * 
 * The page displays a loading screen while checking the login state and redirects users accordingly.
 */
import { useEffect, useState } from "react"; // Importing React hooks for side effects and state management
import { useRouter } from "next/navigation"; // Hook to navigate programmatically in Next.js
import { useAuth } from "@/components/AuthProvider"; // Custom hook to access authentication state
import { ensureInitialWorkspace } from "@/lib/bootstrap"; // Function to ensure the user has a workspace and page
import LoginButton from "@/components/LoginButton"; // Login button component to trigger user authentication
import LogoutButton from "@/components/LogoutButton"; // Logout button component to trigger user logout

export default function Home() { // Home page component
  const { user, loading } = useAuth(); // Accessing authentication state (user and loading status)
  const router = useRouter(); // Using router to programmatically navigate
  const [busy, setBusy] = useState(false); // State to track if a redirect is in progress

  useEffect(() => { // Side effect that runs after the component mounts
    if (!loading && user && !busy) { // If not loading, user is logged in, and no redirect is in progress
      setBusy(true); // Mark as busy to prevent multiple redirects
      ensureInitialWorkspace(user.uid) // Ensure the user has an initial workspace and page
        .then(({ workspaceId, pageId }) => router.replace(`/w/${workspaceId}/p/${pageId}`)) // Redirect to the workspace's page
        .catch((err) => { // Handle errors if the workspace creation fails
          console.error("[home] bootstrap failed", err);
          setBusy(false); // Reset busy state if error occurs
        });
    }
  }, [loading, user, busy, router]); // Dependencies: re-run the effect when loading, user, or busy states change

  if (loading) return <main className="p-8">Loading…</main>; // Show loading message while checking authentication state

  if (!user) { // If user is not logged in, show the login screen
    return (
      <main className="min-h-screen grid place-items-center">
        <div className="p-8 rounded-2xl shadow space-y-4 text-center">
          <div className="text-2xl font-semibold">Welcome to the Hub</div>
          <LoginButton /> {/* Show the login button for authentication */}
        </div>
      </main>
    );
  }

  // If user is logged in, show user info and redirect them immediately after login
  return (
    <main className="min-h-screen grid place-items-center">
      <div className="p-8 rounded-2xl shadow space-y-4 text-center">
        <div className="text-xl">Hi, {user.displayName ?? user.email}</div> {/* Show user's name or email */}
        <LogoutButton /> {/* Show logout button for user to sign out */}
        <div className="text-xs text-gray-500">Redirecting…</div> {/* Show a message indicating the redirect is happening */}
      </div>
    </main>
  );
}


