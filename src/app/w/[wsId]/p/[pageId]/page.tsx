// src/app/w/[wsId]/p/[pageId]/page.tsx
"use client";

/**
 * Workspace page layout:
 * - Left: Sidebar (collapsible + resizable, with context menus)
 * - Right: BlocksCanvas for the selected page
 *
 * Rename/Delete are handled via right-click in the Sidebar now.
 */
import { useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import BlocksCanvas from "@/components/BlocksCanvas";

export default function WorkspacePage() {
  const { wsId, pageId } = useParams() as { wsId: string; pageId: string };

  return (
    <div className="min-h-screen flex">
      <Sidebar currentWorkspaceId={wsId} />
      <div className="flex-1 p-4 overflow-y-auto">
        <BlocksCanvas workspaceId={wsId} pageId={pageId} />
      </div>
    </div>
  );
}






