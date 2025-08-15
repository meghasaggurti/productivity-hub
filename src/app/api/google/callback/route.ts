// src/app/api/google/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
// import { google } from "googleapis";
// import { encryptJson } from "@/lib/crypto";
// import { dbAdmin } from "@/lib/firebaseAdmin"; // if you set up Firebase Admin

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) return new NextResponse("Missing code", { status: 400 });

  // TODO: exchange code for tokens with googleapis OAuth2Client
  // const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
  // const { tokens } = await oauth2.getToken(code);
  // const enc = await encryptJson(tokens);
  // await dbAdmin.collection("tokens").doc(<userId_google>).set({ ...enc, provider: "google", createdAt: Date.now() });

  // For now, just redirect back to app with a success flag
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.redirect(`${appUrl}?google=connected`);
}
