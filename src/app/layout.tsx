// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { spectral } from "./font"; // <- uses your current file name
import GraphQLProvider from "@/components/GraphQLProvider";
import { AuthProvider } from "@/components/AuthProvider";
import ThemeListener from "@/components/ThemeListener";

export const metadata: Metadata = {
  title: "Productivity Hub",
  description: "Your customizable hub for work, school, and life.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={spectral.variable}>
      <body>
        <GraphQLProvider>
          <AuthProvider>
            {children}
            <ThemeListener />
          </AuthProvider>
        </GraphQLProvider>
      </body>
    </html>
  );
}




