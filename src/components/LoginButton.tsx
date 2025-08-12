// src/components/LoginButton.tsx
"use client"; // Specifies that this file is intended to run on the client-side in Next.js

/**
 * Login button using Firebase GoogleAuthProvider and a popup.
 * 
 * This component renders a login button that, when clicked, triggers the Google login flow using Firebase Authentication.
 * - The login flow is handled via a popup using the `signInWithPopup` method and `GoogleAuthProvider`.
 * - The button requests access to the user's email and profile information.
 */
import { auth } from "@/lib/firebaseAuthClient"; // Importing the Firebase auth instance for managing authentication
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"; // Importing Firebase Authentication methods

export default function LoginButton() { // The LoginButton component
  const login = async () => { // Function to initiate Google login using Firebase Auth
    const provider = new GoogleAuthProvider(); // Initialize GoogleAuthProvider for Google login
    provider.addScope("email"); // Request access to the user's email address
    provider.addScope("profile"); // Request access to the user's basic profile information
    await signInWithPopup(auth, provider); // Sign in using the popup and Firebase Auth
  };

  return (
    <button onClick={login} className="px-4 py-2 rounded-xl border">
      Sign in with Google Account
    </button> // Button that triggers the login function when clicked
  );
}




