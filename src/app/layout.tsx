// src/app/layout.tsx
import "./globals.css";
import GraphQLProvider from "@/components/GraphQLProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { spectral } from "./font";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={spectral.variable}>
      <body>
        <GraphQLProvider>
          <AuthProvider>{children}</AuthProvider>
        </GraphQLProvider>
      </body>
    </html>
  );
}




