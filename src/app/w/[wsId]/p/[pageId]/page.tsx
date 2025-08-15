'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import WorkspaceNav from '@/components/WorkspaceNav';

export default function WorkspacePage() {
  const params = useParams() as { wsId?: string | string[]; pageId?: string | string[] };
  const wsId = useMemo(() => (Array.isArray(params.wsId) ? params.wsId[0] : params.wsId) ?? '', [params.wsId]);
  const pageId = useMemo(() => (Array.isArray(params.pageId) ? params.pageId[0] : params.pageId) ?? '', [params.pageId]);

  if (!wsId || !pageId) {
    return <div className="p-6">Choose a workspace/page.</div>;
  }

  return (
    <div className="min-h-full flex flex-col">
      <WorkspaceNav workspaceId={wsId} currentPageId={pageId} />
      <div className="p-4">
        {/* Your editor/content */}
      </div>
    </div>
  );
}




