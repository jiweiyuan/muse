import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
  "tool",
])
export const ossProviderEnum = pgEnum("oss_provider", ["cloudflare"])

// Generative AI task enums
export const taskTypeEnum = pgEnum("task_type_enum", [
  "generate_image",
  "generate_video",
  "image_upscale",
  "image_remove_background",
])
export const taskStatusEnum = pgEnum("task_status_enum", [
  "pending",
  "processing",
  "completed",
  "failed",
])

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Untitled Project"),
  coverUrl: text("cover_url"),
  lastEditAt: timestamp("last_edit_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const canvases = pgTable("canvases", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  snapshot: jsonb("snapshot"), // Merged from canvas_snapshots table
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetId: text("asset_id").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Object storage metadata (provider-agnostic)
  ossProvider: ossProviderEnum("oss_provider").notNull().default("cloudflare"),
  ossBucket: text("oss_bucket").notNull(),
  ossKey: text("oss_key").notNull(),
  ossEtag: text("oss_etag"),
  // File metadata
  contentType: text("content_type").notNull(),
  fileSize: integer("file_size").notNull(),
  originalFilename: text("original_filename"),
  // Timestamps
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const chats = pgTable("chats", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  canvasId: uuid("canvas_id").references(() => canvases.id, {
    onDelete: "set null",
  }), // Removed UNIQUE constraint
  activeStreamId: varchar("active_stream_id", { length: 128 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: uuid("chat_id").notNull(),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  parts: jsonb("parts"),
  experimentalAttachments: jsonb("experimental_attachments"),
  messageGroupId: varchar("message_group_id", { length: 128 }),
  model: text("model"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const userKeys = pgTable(
  "user_keys",
  {
    userId: text("user_id").notNull(),
    provider: text("provider").notNull(),
    encryptedKey: text("encrypted_key").notNull(),
    iv: text("iv").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.provider] }),
  })
)

export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id").primaryKey(),
  layout: text("layout").default("fullscreen").notNull(),
  promptSuggestions: boolean("prompt_suggestions").default(true).notNull(),
  showToolInvocations: boolean("show_tool_invocations").default(true).notNull(),
  showConversationPreviews: boolean("show_conversation_previews")
    .default(true)
    .notNull(),
  hiddenModels: jsonb("hidden_models").$type<string[]>().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const generativeAiTasks = pgTable("generative_ai_tasks", {
  // Primary identification
  id: uuid("id").primaryKey().defaultRandom(),

  // Task type
  taskType: taskTypeEnum("task_type").notNull(),

  // User and project context
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),

  // Optional shape context (for canvas updates)
  shapeId: text("shape_id"), // TLDraw shape ID (optional)

  // Flexible body for parameters
  body: jsonb("body").notNull().default({}),

  // Task state
  status: taskStatusEnum("status").notNull().default("pending"),

  // Results (populated on completion)
  result: jsonb("result"),

  // Retry mechanism
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),

  // Worker tracking
  workerId: text("worker_id"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})
