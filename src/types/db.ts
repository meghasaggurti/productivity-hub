// src/types/db.ts
/**
 * This file defines the types and interfaces for the data structures used in the application,
 * including the Workspace, Page, Block, and related types. These are used to ensure consistent data 
 * structure throughout the application and facilitate type checking with TypeScript.
 */

// Role type defines the possible roles a user can have in a workspace
export type Role = "owner" | "editor" | "viewer"; // Role can be one of "owner", "editor", or "viewer"

// Workspace interface defines the structure of a workspace
export interface Workspace {
  id: string; // Unique identifier for the workspace
  name: string; // Name of the workspace
  ownerId: string; // ID of the user who owns the workspace
  members: Record<string, Role>; // A record mapping member IDs to their respective roles in the workspace
  memberIds: string[]; // An array of user IDs who are members of the workspace
  theme?: { // Optional theme configuration for the workspace
    fontFamily?: string; // Font family for the workspace (optional)
    fontSize?: number; // Font size for the workspace (optional)
    primary?: string; // Primary color for the workspace theme (optional)
    background?: string; // Background color for the workspace (optional)
  };
  createdAt: number; // Timestamp of when the workspace was created
  updatedAt: number; // Timestamp of when the workspace was last updated
}

// Page interface defines the structure of a page within a workspace
export interface Page {
  id: string; // Unique identifier for the page
  title: string; // Title of the page
  parentId: string | null; // The parent page ID, or null if it's a top-level page
  order: number; // The order in which the page appears (used for sorting)
  coverUrl?: string | null; // Optional cover image URL for the page
  createdAt: number; // Timestamp of when the page was created
  updatedAt: number; // Timestamp of when the page was last updated
}

// BlockType defines the possible types of blocks that can be added to a page (e.g., text, image, board, etc.)
export type BlockType = "text" | "image" | "board" | "table" | "chart" | "gantt" | "embed"; // List of block types

// Block interface defines the structure of a block in a page
export interface Block<T = any> {
  id: string; // Unique identifier for the block
  type: BlockType; // The type of block (e.g., "text", "image", etc.)
  order: number; // The order in which the block appears on the page
  data: T; // The data associated with the block, can be of any type depending on the block type
  createdAt: number; // Timestamp of when the block was created
  updatedAt: number; // Timestamp of when the block was last updated
}

// TextData interface defines the structure of data for a "text" block
export interface TextData {
  text: string; // The actual text content for a text block
}


