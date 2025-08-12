// src/app/layout.tsx
/**
 * Root layout for the whole app.
 * - Loads global CSS
 * - Applies fonts
 * - Wraps everything in AuthProvider so useAuth() works anywhere
 *
 * This layout component is responsible for:
 * - Applying global styles (including CSS variables for fonts).
 * - Wrapping the entire application in the `AuthProvider` context provider,
 *   which makes authentication data (like user info and login state) available throughout the app via `useAuth()`.
 * - Defining metadata for the app, including the title and description.
 */
import type { Metadata } from "next"; // Importing the Metadata type from Next.js for page metadata configuration
import { Geist, Geist_Mono } from "next/font/google"; // Importing Geist font (sans-serif) and Geist_Mono font (monospace) from Google Fonts
import "@/app/globals.css"; // Importing global CSS for the app's styling
import { AuthProvider } from "@/components/AuthProvider"; // Importing the AuthProvider component to provide authentication context

// Initializing the Geist sans-serif and monospace fonts, applying custom CSS variable names for use in styles
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Defining metadata for the app (title and description)
export const metadata: Metadata = {
  title: "Productivity Hub", // Title of the app for the browser tab
  description: "Your customizable hub for work, school, and life.", // Description of the app
};

// Root layout component for the app
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* Apply font CSS variables for both sans and monospace fonts and enable antialiasing */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Provide auth context to all pages */}
        <AuthProvider>{children}</AuthProvider> {/* Wrap the entire app with AuthProvider so authentication context is available */}
      </body>
    </html>
  );
}




