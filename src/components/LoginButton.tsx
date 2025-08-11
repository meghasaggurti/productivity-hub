"use client";

import { auth } from "@/lib/firebaseClient"; // or "../lib/firebaseClient" if alias isn't set
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

export default function LoginButton() {
  const login = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope("email");
    provider.addScope("profile");
    await signInWithPopup(auth, provider);
  };

  return (
    <button onClick={login} className="px-4 py-2 rounded-xl border">
      Sign in with Google
    </button>
  );
}

