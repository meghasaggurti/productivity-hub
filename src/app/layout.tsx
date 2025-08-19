import type { Metadata } from "next";
import "./globals.css";
import { spectral } from "./font";
import { AuthProvider } from "@/components/AuthProvider";
import ThemeListener from "@/components/ThemeListener";

//const spectral = Spectral({
  //subsets: ["latin"],
  //variable: "--font-spectral",
  //display: "swap",
//});

export const metadata: Metadata = {
  title: "Productivity Hub",
  description: "Your customizable hub for work, school, and life.",
};

// src/app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={spectral.variable}>
      <body>{children}</body>
    </html>
  );
}




