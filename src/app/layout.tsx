// src/app/layout.tsx
import './globals.css';
import GraphQLProvider from '@/components/GraphQLProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { spectral } from './font'; // your font helper

export const metadata = {
  title: 'Productivity Hub',
  description: 'Your customizable hub for work, school, and life.',
};

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



