import { and, eq } from "drizzle-orm"
import { db } from "../infra/db/index.js"
import { userKeys } from "../infra/db/schema.js"
import { encryptKey, decryptKey } from "./encryption.js"
import { Provider } from "../types/providers.js"
import { env } from "../config/env.js"

export async function upsertUserKey(
  userId: string,
  provider: Provider,
  apiKey: string
) {
  const { encrypted, iv } = encryptKey(apiKey)

  await db
    .insert(userKeys)
    .values({
      userId,
      provider,
      encryptedKey: encrypted,
      iv,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [userKeys.userId, userKeys.provider],
      set: {
        encryptedKey: encrypted,
        iv,
        updatedAt: new Date(),
      },
    })
}

export async function deleteUserKey(userId: string, provider: Provider) {
  await db
    .delete(userKeys)
    .where(and(eq(userKeys.userId, userId), eq(userKeys.provider, provider)))
}

export async function getUserKey(userId: string, provider: Provider) {
  const [record] = await db
    .select()
    .from(userKeys)
    .where(and(eq(userKeys.userId, userId), eq(userKeys.provider, provider)))
    .limit(1)

  if (!record) return null

  return decryptKey(record.encryptedKey, record.iv)
}

export async function listUserProviders(userId: string) {
  const rows = await db
    .select({ provider: userKeys.provider })
    .from(userKeys)
    .where(eq(userKeys.userId, userId))

  return rows.map((row) => row.provider)
}

const envKeyMap: Record<Provider, string | undefined> = {
  openai: env.OPENAI_API_KEY,
  google: env.GOOGLE_GENERATIVE_AI_API_KEY,
  anthropic: env.ANTHROPIC_API_KEY,
  openrouter: env.OPENROUTER_API_KEY,
}

export async function getEffectiveApiKey(
  userId: string | null,
  provider: Provider
) {
  if (userId) {
    const userKey = await getUserKey(userId, provider)
    if (userKey) return userKey
  }

  return envKeyMap[provider] || null
}

export async function hasUserKey(userId: string, provider: Provider) {
  const [record] = await db
    .select({ provider: userKeys.provider })
    .from(userKeys)
    .where(and(eq(userKeys.userId, userId), eq(userKeys.provider, provider)))
    .limit(1)

  return Boolean(record)
}
