// src/app/w/[wsId]/p/[pageId]/page.tsx
"use client";

/**
 * Full page view:
 * - Left: collapsible sidebar (workspaces/pages + user panel with logout)
 * - Right: blocks canvas for the selected page
 */
import { useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import BlocksCanvas from "@/components/BlocksCanvas";

export default function WorkspacePage() {
  const { wsId, pageId } = useParams() as { wsId: string; pageId: string };

  return (
    <div className="min-h-screen grid grid-cols-[280px_1fr]">
      <Sidebar currentWorkspaceId={wsId} />
      <div className="p-4">
        <BlocksCanvas workspaceId={wsId} pageId={pageId} />
      </div>
    </div>
  );
}


