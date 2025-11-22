import { z } from "zod";
import { chatSchema, messageSchema, messageRoleSchema } from "./chat.schema.js";
import { uuidSchema, userIdSchema, paginationRequestSchema } from "./common.schema.js";

/**
 * Chat API Schema Definitions
 * API request/response schemas for chat-related endpoints
 */

// POST /v1/chats
export const createChatRequestSchema = z.object({
  userId: userIdSchema,
  projectId: uuidSchema.optional(),
  title: z.string().min(1).max(500).optional().default("New Chat"),
  canvasId: uuidSchema.optional(),
});

export const createChatResponseSchema = z.object({
  chat: chatSchema,
});

// GET /v1/chats
export const listChatsRequestSchema = paginationRequestSchema.extend({
  userId: userIdSchema,
  projectId: uuidSchema.optional(),
});

export const listChatsResponseSchema = z.object({
  chats: z.array(chatSchema),
});

// GET /v1/chats/:chatId
export const getChatRequestSchema = z.object({
  chatId: uuidSchema,
  userId: userIdSchema,
});

export const getChatResponseSchema = z.object({
  chat: chatSchema.nullable(),
});

// PATCH /v1/projects/:projectId/chats/:chatId
export const updateChatRequestSchema = z.object({
  projectId: uuidSchema,
  chatId: uuidSchema,
  userId: userIdSchema,
  title: z.string().min(1).max(500).optional(),
  systemPrompt: z.string().nullable().optional(),
  public: z.boolean().optional(),
});

export const updateChatResponseSchema = z.object({
  chat: chatSchema,
});

// DELETE /v1/projects/:projectId/chats/:chatId
export const deleteChatRequestSchema = z.object({
  projectId: uuidSchema,
  chatId: uuidSchema,
  userId: userIdSchema,
});

export const deleteChatResponseSchema = z.object({
  success: z.boolean(),
});

// GET /v1/projects/:projectId/chats/:chatId/messages
export const getChatMessagesRequestSchema = paginationRequestSchema.extend({
  projectId: uuidSchema,
  chatId: uuidSchema,
  userId: userIdSchema,
});

export const getChatMessagesResponseSchema = z.object({
  messages: z.array(messageSchema),
});

// POST /v1/chats/:chatId/messages
export const createMessageRequestSchema = z.object({
  chatId: uuidSchema,
  userId: userIdSchema,
  role: messageRoleSchema,
  content: z.string(),
  parts: z.unknown().optional(),
  experimental_attachments: z.unknown().optional(),
  messageGroupId: z.string().optional(),
  model: z.string().optional(),
});

export const createMessageResponseSchema = z.object({
  message: messageSchema,
});

// Type exports
export type CreateChatRequestSchema = z.infer<typeof createChatRequestSchema>;
export type CreateChatResponseSchema = z.infer<typeof createChatResponseSchema>;
export type ListChatsRequestSchema = z.infer<typeof listChatsRequestSchema>;
export type ListChatsResponseSchema = z.infer<typeof listChatsResponseSchema>;
export type GetChatRequestSchema = z.infer<typeof getChatRequestSchema>;
export type GetChatResponseSchema = z.infer<typeof getChatResponseSchema>;
export type UpdateChatRequestSchema = z.infer<typeof updateChatRequestSchema>;
export type UpdateChatResponseSchema = z.infer<typeof updateChatResponseSchema>;
export type DeleteChatRequestSchema = z.infer<typeof deleteChatRequestSchema>;
export type DeleteChatResponseSchema = z.infer<typeof deleteChatResponseSchema>;
export type GetChatMessagesRequestSchema = z.infer<typeof getChatMessagesRequestSchema>;
export type GetChatMessagesResponseSchema = z.infer<typeof getChatMessagesResponseSchema>;
export type CreateMessageRequestSchema = z.infer<typeof createMessageRequestSchema>;
export type CreateMessageResponseSchema = z.infer<typeof createMessageResponseSchema>;
