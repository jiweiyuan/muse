/**
 * Chat and Message types - now imported from shared schemas
 * This ensures type consistency between frontend and backend
 */
import type { ChatSchema, MessageSchema } from "@muse/shared-schemas"

export type Chat = ChatSchema
export type Message = MessageSchema
export type Chats = Chat
