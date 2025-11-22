import { z } from "zod";
import { uuidSchema, userIdSchema, isoDateTimeSchema } from "./common.schema.js";

/**
 * Project Schema Definitions
 * Project-related domain entities
 */

// Project schema
export const projectSchema = z.object({
  id: uuidSchema,
  userId: userIdSchema,
  name: z.string().min(1).max(200).default("Untitled Project"),
  coverUrl: z.string().url().nullable(),
  canvasId: uuidSchema.optional().nullable(),
  chatId: uuidSchema.optional().nullable(),
  lastEditAt: isoDateTimeSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

// Project with associated data
export const projectWithChatsSchema = projectSchema.extend({
  chats: z.array(z.any()), // Will be properly typed when we have chat schema
});

// Type exports
export type ProjectSchema = z.infer<typeof projectSchema>;
export type ProjectWithChatsSchema = z.infer<typeof projectWithChatsSchema>;
