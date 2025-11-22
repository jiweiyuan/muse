import { eq } from "drizzle-orm"
import { db } from "../infra/db/index.js"
import { canvases, chats, projects } from "../infra/db/schema.js"
import type { RoomSnapshot } from "@tldraw/sync-core"

/**
 * Canvas Service
 * Handles CRUD operations for canvases
 */

/**
 * Create a new canvas for a project
 */
export async function createCanvas(projectId: string) {
  const [canvas] = await db
    .insert(canvases)
    .values({
      projectId: projectId,
      snapshot: null, // Initialize with null snapshot
    })
    .returning()

  return canvas
}

/**
 * Get canvas by ID
 */
export async function getCanvasById(id: string) {
  const [canvas] = await db
    .select()
    .from(canvases)
    .where(eq(canvases.id, id))
  return canvas
}

/**
 * Delete canvas
 * This will cascade delete assets
 */
export async function deleteCanvas(id: string) {
  await db.delete(canvases).where(eq(canvases.id, id))
}

/**
 * Get canvas snapshot
 */
export async function getCanvasSnapshot(
  canvasId: string
): Promise<RoomSnapshot | null> {
  const [canvas] = await db
    .select({ snapshot: canvases.snapshot })
    .from(canvases)
    .where(eq(canvases.id, canvasId))

  return canvas?.snapshot ? (canvas.snapshot as RoomSnapshot) : null
}

/**
 * Save canvas snapshot
 */
export async function saveCanvasSnapshot(
  canvasId: string,
  snapshot: RoomSnapshot
) {
  await db
    .update(canvases)
    .set({
      snapshot: snapshot as any, // Cast to any for jsonb
      updatedAt: new Date(),
    })
    .where(eq(canvases.id, canvasId))
}

/**
 * Associate canvas with chat
 */
export async function associateCanvasWithChat(
  chatId: string,
  canvasId: string
) {
  const [chat] = await db
    .update(chats)
    .set({ canvasId })
    .where(eq(chats.id, chatId))
    .returning()

  return chat
}

/**
 * Get canvas by chat ID
 */
export async function getCanvasByChatId(chatId: string) {
  const [chat] = await db
    .select({
      canvasId: chats.canvasId,
    })
    .from(chats)
    .where(eq(chats.id, chatId))

  if (!chat || !chat.canvasId) {
    return null
  }

  return getCanvasById(chat.canvasId)
}

/**
 * Check if user has access to canvas
 * Checks if the user owns the project that the canvas belongs to
 */
export async function canUserAccessCanvas(
  canvasId: string,
  userId: string
): Promise<boolean> {
  const [result] = await db
    .select({
      projectUserId: projects.userId,
    })
    .from(canvases)
    .innerJoin(projects, eq(canvases.projectId, projects.id))
    .where(eq(canvases.id, canvasId))

  if (!result) {
    return false
  }

  // Allow access if the user owns the project
  // TODO: Add more sophisticated access control (e.g., shared canvases)
  return result.projectUserId === userId
}
