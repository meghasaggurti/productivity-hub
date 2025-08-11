// src/lib/firebaseClient.ts

/*
  Firebase client initialization for the application.
  - Sets up Firebase configuration with environment variables.
  - Checks for missing environment variables and logs an error if any are missing.
  - Initializes Firebase app only on the client-side to prevent server-side rendering issues.
  - Exports `auth` for Firebase Authentication and `app` for the Firebase app instance.
*/


"use client"; // Specifies that this file is meant to run on the client-side in Next.js

import { initializeApp, getApps } from "firebase/app"; // Importing functions from Firebase to initialize the app and check existing apps
import { getAuth } from "firebase/auth"; // Importing the function to get Firebase authentication

// Firebase configuration object containing environment variables for Firebase setup
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, // Firebase API key
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, // Firebase authentication domain
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, // Firebase project ID
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, // Firebase storage bucket
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, // Firebase messaging sender ID
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID, // Firebase app ID
};

// Guard: surface a clear error if any var is missing
for (const [k, v] of Object.entries(firebaseConfig)) { // Iterating over each key-value pair in the firebaseConfig object
  if (!v) { // If the value is missing
    // This logs in the browser console during dev if an environment variable is missing
    console.error("Missing Firebase env var:", k); // Log an error with the missing environment variable name
  }
}

// Initialize Firebase app if no apps are already initialized
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig); // If Firebase apps are already initialized, use the first one; otherwise, initialize a new one with the config

// Make auth client-only to avoid SSR touching browser APIs
export const auth =
  typeof window !== "undefined" // Check if we are in a client-side (browser) environment
    ? getAuth(app) // Initialize Firebase Authentication in the client-side only
    : (undefined as unknown as ReturnType<typeof getAuth>); // Return undefined in SSR environment to avoid using browser APIs during server-side rendering

export { app }; // Export the Firebase app instance



