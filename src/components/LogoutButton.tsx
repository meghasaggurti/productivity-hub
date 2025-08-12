// src/components/LogoutButton.tsx
"use client"; // Specifies that this file is intended to run on the client-side in Next.js

/**
 * Logout button that triggers sign-out using Firebase and redirects the user to the home/login page.
 * 
 * This component renders a button that, when clicked, performs the following:
 * - Signs the user out from Firebase using the `logout` function provided by the `useAuth` hook.
 * - Redirects the user to the home page (or login page) after successful logout using Next.js router.
 */
import { useRouter } from "next/navigation"; // Importing Next.js router to navigate programmatically
import { useAuth } from "./AuthProvider"; // Importing custom useAuth hook to access authentication data

export default function LogoutButton() { // The LogoutButton component
  const { logout } = useAuth(); // Destructuring the logout function from the useAuth hook
  const router = useRouter(); // Using the Next.js router to navigate programmatically

  // Logout handler function that signs out the user and redirects them
  const handleLogout = async () => {
    await logout(); // Trigger sign-out from Firebase
    router.replace("/"); // Redirect to home/login page after sign-out
  };

  return (
    <button onClick={handleLogout} className="px-4 py-2 rounded-xl border">
      Sign out
    </button> // Button that triggers the logout handler when clicked
  );
}




