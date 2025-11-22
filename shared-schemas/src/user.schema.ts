import { z } from "zod";
import { userIdSchema, emailSchema, isoDateTimeSchema } from "./common.schema.js";

/**
 * User Schema Definitions
 * Core user and authentication related schemas
 */

// User preferences layout enum
export const layoutSchema = z.enum(["fullscreen", "split", "panel"]);

// User preferences
export const userPreferencesSchema = z.object({
  userId: userIdSchema,
  layout: layoutSchema.default("fullscreen"),
  promptSuggestions: z.boolean().default(true),
  showToolInvocations: z.boolean().default(true),
  showConversationPreviews: z.boolean().default(true),
  hiddenModels: z.array(z.string()).default([]),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

// Base user schema
export const userSchema = z.object({
  id: userIdSchema,
  name: z.string().nullable(),
  email: emailSchema,
  emailVerified: z.boolean().default(false),
  image: z.string().nullable(),
  lastActiveAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

// User profile (extended user with preferences)
export const userProfileSchema = userSchema.extend({
  display_name: z.string(),
  profile_image: z.string(),
  system_prompt: z.string().nullable(),
  preferences: userPreferencesSchema.optional(),
});

// User session
export const userSessionSchema = z.object({
  id: z.string(),
  userId: userIdSchema,
  token: z.string(),
  expiresAt: isoDateTimeSchema,
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

// OAuth providers
export const oAuthProviderSchema = z.enum(["google", "github", "discord"]);

// User account (OAuth)
export const userAccountSchema = z.object({
  id: z.string(),
  userId: userIdSchema,
  accountId: z.string(),
  providerId: z.string(),
  accessToken: z.string().nullable(),
  refreshToken: z.string().nullable(),
  accessTokenExpiresAt: isoDateTimeSchema.nullable(),
  refreshTokenExpiresAt: isoDateTimeSchema.nullable(),
  scope: z.string().nullable(),
  idToken: z.string().nullable(),
  password: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

// User API key (encrypted)
export const userKeySchema = z.object({
  userId: userIdSchema,
  provider: z.string(),
  encryptedKey: z.string(),
  iv: z.string(),
  updatedAt: isoDateTimeSchema,
});

// Type exports
export type LayoutSchema = z.infer<typeof layoutSchema>;
export type UserPreferencesSchema = z.infer<typeof userPreferencesSchema>;
export type UserSchema = z.infer<typeof userSchema>;
export type UserProfileSchema = z.infer<typeof userProfileSchema>;
export type UserSessionSchema = z.infer<typeof userSessionSchema>;
export type OAuthProviderSchema = z.infer<typeof oAuthProviderSchema>;
export type UserAccountSchema = z.infer<typeof userAccountSchema>;
export type UserKeySchema = z.infer<typeof userKeySchema>;
