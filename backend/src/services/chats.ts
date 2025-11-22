import { and, desc, eq } from "drizzle-orm"
import { db } from "../infra/db/index.js"
import { chats, canvases } from "../infra/db/schema.js"
import { touchProject } from "./projects.js"

export type CreateChatInput = {
  userId: string
  projectId: string
  title?: string
}

export async function createChat({ userId, projectId, title }: CreateChatInput) {
  const chatTitle = title || "New Chat"

  // Get the canvas for this project
  const [canvas] = await db
    .select()
    .from(canvases)
    .where(eq(canvases.projectId, projectId))
    .limit(1)

  if (!canvas) {
    throw new Error("Project canvas not found")
  }

  const [chat] = await db
    .insert(chats)
    .values({
      userId,
      projectId,
      title: chatTitle,
      canvasId: canvas.id,
      updatedAt: new Date(),
    })
    .returning()

  // Touch project to update lastEditAt
  await touchProject(projectId, userId)

  return chat
}

export async function listUserChats(userId: string) {
  const userChats = await db
    .select()
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt))

  return userChats
}

export async function listProjectChats(projectId: string, userId: string) {
  const projectChats = await db
    .select()
    .from(chats)
    .where(and(eq(chats.projectId, projectId), eq(chats.userId, userId)))
    .orderBy(desc(chats.updatedAt))

  return projectChats
}

export async function getChat(chatId: string, userId: string) {
  const [chat] = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .limit(1)

  return chat || null
}

export async function updateChatTitle(
  chatId: string,
  title: string,
  userId: string
) {
  const [chat] = await db
    .update(chats)
    .set({ title, updatedAt: new Date() })
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .returning()

  return chat || null
}

export async function deleteChat(chatId: string, userId: string) {
  const [deletedChat] = await db
    .delete(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .returning()

  return deletedChat || null
}

export async function updateChatStreamId(
  chatId: string,
  streamId: string | null
) {
  const [chat] = await db
    .update(chats)
    .set({ activeStreamId: streamId, updatedAt: new Date() })
    .where(eq(chats.id, chatId))
    .returning()

  return chat || null
}
