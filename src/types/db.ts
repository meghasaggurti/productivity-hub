/**
 * Canonical app data types.
 * Keep this file as the single source of truth and re-export from other type entrypoints.
 */

// ---- Roles ----
export type Role = "owner" | "editor" | "viewer";

// ---- Workspace ----
export interface Workspace {
  id: string;
  name: string;
  ownerId: string;

  /**
   * Quick membership checks and Firestore rules:
   * - `memberIds` is used for `array-contains` queries (fast, simple).
   * - `members` provides per-user role lookups.
   */
  memberIds: string[];
  members: Record<string, Role>;

  // Soft delete
  isDeleted: boolean;

  // Optional theme
  theme?: {
    fontFamily?: string;
    fontSize?: number;
    primary?: string;
    background?: string;
  };

  createdAt: number; // unix ms
  updatedAt: number; // unix ms
}

// ---- Page ----
export interface Page {
  id: string;
  title: string;
  parentId: string | null; // null for top-level
  order: number;           // sort key within siblings
  coverUrl?: string | null;

  // Soft delete (required by queries and rules)
  isDeleted: boolean;

  createdAt: number; // unix ms
  updatedAt: number; // unix ms
}

// ---- Blocks ----
export type BlockType = "text" | "image" | "board" | "table" | "chart" | "gantt" | "embed";

export interface Block<T = any> {
  id: string;
  type: BlockType;
  order: number;
  data: T;
  createdAt: number; // unix ms
  updatedAt: number; // unix ms
}

export interface TextData {
  text: string;
}



