// src/components/AuthProvider.tsx
"use client"; // Specifies that this file is intended to run on the client-side in Next.js

/**
 * AuthProvider:
 * - Subscribes to Firebase Auth state
 * - Exposes { user, loading, logout } via React context
 *
 * This component provides authentication-related context for the application:
 * - It listens to Firebase's authentication state changes and updates the `user` and `loading` states accordingly.
 * - It exposes authentication details (`user`, `loading`, and `logout`) to the rest of the app via React's context API.
 * - It includes a `logout` function that triggers Firebase's sign-out process.
 */
import { createContext, useContext, useEffect, useState } from "react"; // Import necessary React hooks and context functions
import { auth } from "@/lib/firebaseAuthClient"; // Firebase authentication instance for managing user auth
import { onAuthStateChanged, signOut, User } from "firebase/auth"; // Firebase auth methods: listen to state changes and sign out

// Define the shape of the AuthContext (user, loading, logout)
type AuthContextType = {
  user: User | null; // Current authenticated user or null if not authenticated
  loading: boolean; // Loading state while checking authentication status
  logout: () => Promise<void>; // Logout function to sign the user out
};

// Create the AuthContext with a default value
const AuthContext = createContext<AuthContextType>({
  user: null, // Initially, no user is logged in
  loading: true, // Initially, loading is true while checking auth state
  logout: async () => {}, // Default logout function does nothing
});

// AuthProvider component to provide authentication context to the rest of the app
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null); // State to store the current user
  const [loading, setLoading] = useState(true); // State to track loading status

  useEffect(() => {
    // Set up an authentication state listener
    const unsub = onAuthStateChanged(auth, (current) => {
      setUser(current ?? null); // Update user state if there's a logged-in user or set null if no user is logged in
      setLoading(false); // Once the auth state is determined, set loading to false
    });

    // Clean up the listener on component unmount
    return () => unsub();
  }, []); // Empty dependency array ensures this runs only once when the component mounts

  // Logout function to sign the user out
  const logout = async () => {
    await signOut(auth); // Trigger Firebase sign-out
  };

  return (
    // Provide the auth context value to the children components
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to access the authentication context data
export function useAuth() {
  return useContext(AuthContext); // Access the auth context using useContext
}






