// src/lib/firebaseAuthClient.ts
"use client";

import { getAuth } from "firebase/auth";
import { app } from "./firebaseApp";

export const auth = getAuth(app);
