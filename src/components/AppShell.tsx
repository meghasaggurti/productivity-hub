'use client';

import Sidebar from './Sidebar';

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <div className="flex h-full">
        {/* Sidebar is uncontrolled (it collapses itself) */}
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
