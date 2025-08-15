import type { Metadata } from "next";
import "@/app/globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import ThemeListener from "@/components/ThemeListener";

export const metadata: Metadata = {
  title: "Productivity Hub",
  description: "Your customizable hub for work, school, and life.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ThemeListener />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}




