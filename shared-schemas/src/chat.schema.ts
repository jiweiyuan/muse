import { z } from "zod";
import { uuidSchema, userIdSchema, isoDateTimeSchema } from "./common.schema.js";

/**
 * Chat Schema Definitions
 * Chat and message related schemas
 */

// Message role enum
export const messageRoleSchema = z.enum([
  "user",
  "assistant",
  "system",
  "tool",
  "data",
]);

// Message schema
export const messageSchema = z.object({
  id: uuidSchema,
  chatId: uuidSchema,
  role: messageRoleSchema,
  content: z.string().nullable(),
  parts: z.unknown().optional(),
  experimental_attachments: z.unknown().optional(),
  messageGroupId: z.string().nullable(),
  model: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});

// Chat schema
export const chatSchema = z.object({
  id: uuidSchema,
  userId: userIdSchema,
  projectId: uuidSchema.nullable(),
  title: z.string().min(1).max(500),
  canvasId: uuidSchema.nullable(),
  activeStreamId: z.string().max(128).nullable(),
  systemPrompt: z.string().nullable().optional(),
  public: z.boolean().optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

// Chat with messages
export const chatWithMessagesSchema = chatSchema.extend({
  messages: z.array(messageSchema),
});

// Type exports
export type MessageRoleSchema = z.infer<typeof messageRoleSchema>;
export type MessageSchema = z.infer<typeof messageSchema>;
export type ChatSchema = z.infer<typeof chatSchema>;
export type ChatWithMessagesSchema = z.infer<typeof chatWithMessagesSchema>;
