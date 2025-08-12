// src/lib/firebaseApp.ts
/**
 * Creates/returns a single Firebase App instance.
 * This module is safe on both client and server.
 * 
 * The purpose of this module is to ensure that the Firebase App is only initialized once, even if this script is imported multiple times.
 * It either returns an existing Firebase App instance or initializes a new one using the configuration provided.
 */
import { initializeApp, getApp, getApps } from "firebase/app"; // Import Firebase functions to initialize and manage Firebase apps

// Firebase configuration object, using environment variables to securely store the configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, // Firebase API key for authentication
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, // Firebase authentication domain
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, // Firebase project ID
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, // Firebase storage bucket URL
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, // Firebase messaging sender ID
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID, // Firebase app ID
};

// Check if any Firebase apps have been initialized
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig); 
// If no Firebase app is initialized, initialize a new one with the provided config. Otherwise, use the existing Firebase app.


