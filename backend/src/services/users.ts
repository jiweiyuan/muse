import { eq } from "drizzle-orm"
import { db } from "../infra/db/index.js"
import { users } from "../infra/db/schema.js"
import { getUserPreferences } from "./preferences.js"

export type UserRecord = typeof users.$inferSelect
type UserInsert = typeof users.$inferInsert

export function mapUserRecord(record: UserRecord) {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    image: record.image,
    lastActiveAt: record.lastActiveAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    emailVerified: record.emailVerified,
  }
}

export async function getUserRecord(userId: string) {
  const [record] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return record ?? null
}

export async function getUserProfile(userId: string) {
  const record = await getUserRecord(userId)
  if (!record) {
    return null
  }

  const preferences = await getUserPreferences(userId)

  return {
    user: mapUserRecord(record),
    preferences,
  }
}

export type UpdateUserProfileInput = {
  name?: string | null
  image?: string | null
}

export async function updateUserProfile(
  userId: string,
  updates: UpdateUserProfileInput
) {
  const payload: Partial<UserInsert> = {}

  if ("name" in updates) {
    payload.name = updates.name ?? null
  }

  if ("image" in updates) {
    payload.image = updates.image ?? null
  }

  if (Object.keys(payload).length === 0) {
    return await getUserProfile(userId)
  }

  const [updated] = await db
    .update(users)
    .set({
      ...payload,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning()

  if (!updated) {
    return null
  }

  const preferences = await getUserPreferences(userId)

  return {
    user: mapUserRecord(updated),
    preferences,
  }
}
