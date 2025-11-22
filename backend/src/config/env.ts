import { config } from "dotenv"
import { z } from "zod"

config({ path: process.env.DOTENV_PATH || undefined })

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(8000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  BETTER_AUTH_URL: z
    .string()
    .url()
    .default(() => `http://localhost:${process.env.PORT ?? 8000}`),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "Better Auth secret must be at least 32 characters long"),
  ENCRYPTION_KEY: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  REPLICATE_API_TOKEN: z.string().optional(),
  REPLICATE_RATE_LIMIT: z.coerce.number().int().positive().default(50),
  FAL_KEY: z.string().optional(),
  VALYU_API_KEY: z.string().optional(),
  FRONTEND_ORIGIN: z.string().optional(),
  BACKEND_URL: z.string().url().optional(),
  // Cloudflare R2 Storage
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
})

export const env = envSchema.parse(process.env)
