import type { FastifyRequest } from "fastify"
import { eq } from "drizzle-orm"
import { db } from "../infra/db/index.js"
import { users } from "../infra/db/schema.js"
import { auth } from "../auth/index.js"

export type IdentityContext = {
  userId: string
}

type SessionUser = {
  id: string
  email?: string | null
  name?: string | null
  image?: string | null
}

const SESSION_USER_SYMBOL = Symbol.for("muse.betterAuthSessionUser")

function extractSessionUser(session: unknown): SessionUser | null {
  if (!session) return null

  const candidate =
    (session as { user?: SessionUser }).user ??
    (session as { session?: { user?: SessionUser } }).session?.user ??
    (session as { data?: { user?: SessionUser } }).data?.user ??
    null

  if (!candidate || typeof candidate.id !== "string") {
    return null
  }

  return {
    id: candidate.id,
    email: candidate.email ?? undefined,
    name: (candidate as { name?: string | null }).name ?? undefined,
    image: (candidate as { image?: string | null }).image ?? undefined,
  }
}

export async function resolveSessionUser(
  request: FastifyRequest
): Promise<SessionUser | null> {
  const store = request as unknown as {
    [SESSION_USER_SYMBOL]?: SessionUser | null
  }

  if (SESSION_USER_SYMBOL in store) {
    return store[SESSION_USER_SYMBOL] ?? null
  }

  // Convert Fastify headers to Headers object
  const headers = new Headers()
  for (const [key, value] of Object.entries(request.headers)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v))
      } else {
        headers.set(key, value)
      }
    }
  }

  const session = await auth.api.getSession({
    headers,
  })

  const sessionUser = extractSessionUser(session)
  store[SESSION_USER_SYMBOL] = sessionUser

  return sessionUser
}

export async function validateUserIdentity(
  request: FastifyRequest,
  { userId }: IdentityContext
) {
  if (!userId) {
    throw new Error("Missing userId")
  }

  const sessionUser = await resolveSessionUser(request)

  if (!sessionUser || sessionUser.id !== userId) {
    throw new Error("User ID does not match authenticated session")
  }

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (existing) {
    return existing
  }

  // Create new authenticated user
  const email = sessionUser.email || `${userId}@user.local`
  const [created] = await db
    .insert(users)
    .values({
      id: userId,
      email,
      name: sessionUser.name ?? null,
      image: sessionUser.image ?? null,
    })
    .returning()

  if (!created) {
    throw new Error("Failed to persist authenticated user")
  }

  return created
}
