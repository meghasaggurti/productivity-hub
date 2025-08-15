// src/app/w/[wsId]/layout.tsx
'use client';

import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import SettingsPanel from '@/components/panels/SettingsPanel';
import PermissionsPanel from '@/components/panels/PermissionsPanel';
import TrashPanel from '@/components/panels/TrashPanel';

type PanelName = 'settings' | 'permissions' | 'trash' | null;

function getParam(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] ?? '';
  return val ?? '';
}

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams() as { wsId?: string | string[] };

  // Robust, SSR-safe normalization
  const wsId = getParam(params.wsId);

  const sp = useSearchParams();
  const panel = (sp.get('panel') as PanelName) ?? null;

  const openPanel = (name: Exclude<PanelName, null>) => {
    if (!wsId) return;
    router.push(`/w/${wsId}?panel=${name}`);
  };

  const closePanel = () => {
    if (!wsId) return;
    router.push(`/w/${wsId}`);
  };

  return (
    <div className="min-h-screen flex font-sans text-[13px]">
      {/* Sidebar stays visible & clickable */}
      <Sidebar
        currentWorkspaceId={wsId}
        onOpenSettings={() => openPanel('settings')}
        onOpenPermissions={() => openPanel('permissions')}
        onOpenTrash={() => openPanel('trash')}
      />

      {/* Main content area + overlay slot */}
      <section className="relative flex-1 h-screen overflow-hidden">
        <main className="h-full overflow-y-auto">{children}</main>

        {panel && (
          <div className="absolute inset-0 z-40">
            {panel === 'settings' && <SettingsPanel wsId={wsId} onClose={closePanel} />}
            {panel === 'permissions' && <PermissionsPanel wsId={wsId} onClose={closePanel} />}
            {panel === 'trash' && <TrashPanel wsId={wsId} onClose={closePanel} />}
          </div>
        )}
      </section>
    </div>
  );
}



