'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';

export default function WorkspaceHome() {
  const router = useRouter();
  const params = useParams() as { wsId?: string | string[] };
  const wsId = Array.isArray(params.wsId) ? params.wsId[0] : params.wsId || '';

  useEffect(() => {
    // If you want to redirect to the first page, you can do it here.
    // For now we keep a minimal placeholder:
  }, [wsId]);

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">Workspace</h1>
      <p className="opacity-70">Pick a page from the sidebar.</p>
    </div>
  );
}
