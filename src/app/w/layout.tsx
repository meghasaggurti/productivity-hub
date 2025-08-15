'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

/**
 * Wraps ALL /w routes. Nothing renders until we know the auth state.
 * - If signed out -> redirect to "/"
 * - If loading -> render nothing (prevents Firestore listeners from mounting)
 * - If signed in -> render children
 */
export default function WorkspaceSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // make sure we are not in a workspace route while logged out
      if (pathname?.startsWith('/w')) router.replace('/');
    }
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    // Render nothing so nested components don't attach Firestore listeners.
    return null;
  }

  return <>{children}</>;
}


