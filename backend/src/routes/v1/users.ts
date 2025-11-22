import { FastifyInstance } from "fastify"
import fastifyPlugin from "fastify-plugin"
import {
  deleteUserKey,
  getEffectiveApiKey,
  hasUserKey,
  listUserProviders,
  upsertUserKey,
} from "../../services/userKeys.js"
import {
  resolveSessionUser,
  validateUserIdentity,
} from "../../services/identity.js"
import { Provider } from "../../types/providers.js"
import { getUserPreferences } from "../../services/preferences.js"
import { mapUserRecord, updateUserProfile } from "../../services/users.js"

const SUPPORTED_PROVIDERS: Provider[] = [
  "openrouter",
  "openai",
  "google",
  "anthropic",
]

export const registerUserRoutes = fastifyPlugin(
  async (app: FastifyInstance) => {
    app.get("/me", async (request, reply) => {
      const sessionUser = await resolveSessionUser(request)

      if (!sessionUser) {
        return {
          user: null,
          preferences: null,
        }
      }

      const userRecord = await validateUserIdentity(request, {
        userId: sessionUser.id,
      })

      const preferences = await getUserPreferences(sessionUser.id)

      return {
        user: mapUserRecord(userRecord),
        preferences,
      }
    })

    app.patch("/me", async (request, reply) => {
      const sessionUser = await resolveSessionUser(request)
      if (!sessionUser) {
        reply.status(401)
        return { error: "Unauthorized" }
      }

      await validateUserIdentity(request, {
        userId: sessionUser.id,
      })

      const { name, displayName, image, profileImage } = request.body as {
        name?: string | null
        displayName?: string | null
        image?: string | null
        profileImage?: string | null
      }

      const updates: {
        name?: string | null
        image?: string | null
      } = {}

      if (displayName !== undefined || name !== undefined) {
        updates.name = displayName ?? name ?? null
      }

      if (profileImage !== undefined || image !== undefined) {
        updates.image = profileImage ?? image ?? null
      }

      const result = await updateUserProfile(sessionUser.id, updates)

      if (!result) {
        reply.status(404)
        return { error: "User not found" }
      }

      return result
    })

    app.post("/keys", async (request, reply) => {
      const { userId, provider, apiKey } = request.body as {
        userId: string
        provider: Provider
        apiKey: string
      }

      if (!userId || !provider || !apiKey) {
        reply.status(400)
        return { error: "Provider, apiKey, and userId are required" }
      }

      const sessionUser = await resolveSessionUser(request)
      if (!sessionUser) {
        reply.status(401)
        return { error: "Unauthorized" }
      }

      await validateUserIdentity(request, {
        userId,
      })

      const existing = await hasUserKey(userId, provider)

      await upsertUserKey(userId, provider, apiKey)

      return {
        success: true,
        isNewKey: !existing,
        message: existing ? "API key updated" : "API key saved",
      }
    })

    app.delete("/keys", async (request, reply) => {
      const { userId, provider } = request.body as {
        userId: string
        provider: Provider
      }

      if (!userId || !provider) {
        reply.status(400)
        return { error: "Provider and userId are required" }
      }

      const sessionUser = await resolveSessionUser(request)
      if (!sessionUser) {
        reply.status(401)
        return { error: "Unauthorized" }
      }

      await validateUserIdentity(request, {
        userId,
      })

      await deleteUserKey(userId, provider)

      return { success: true }
    })

    app.get("/keys/status", async (request, reply) => {
      try {
        const sessionUser = await resolveSessionUser(request)
        if (!sessionUser) {
          reply.status(401)
          return { error: "Unauthorized" }
        }

        const userIdHeader = request.headers["x-user-id"]
        const userId =
          typeof userIdHeader === "string" ? userIdHeader : sessionUser.id

        await validateUserIdentity(request, {
          userId,
        })

        const userProviders = await listUserProviders(userId)

        const providerStatus = SUPPORTED_PROVIDERS.reduce(
          (acc, provider) => {
            acc[provider] = userProviders.includes(provider)
            return acc
          },
          {} as Record<string, boolean>
        )

        return providerStatus
      } catch (error) {
        app.log.error({ error }, "Key status error")
        reply.status(500)
        return { error: "Internal server error" }
      }
    })

    app.post("/providers/check", async (request, reply) => {
      try {
        const { userId, provider } = request.body as {
          userId: string
          provider: Provider
        }

        if (!userId || !provider) {
          reply.status(400)
          return { error: "Missing provider or userId" }
        }

        const sessionUser = await resolveSessionUser(request)
        if (!sessionUser) {
          reply.status(401)
          return { error: "Unauthorized" }
        }

        await validateUserIdentity(request, {
          userId,
        })

        const apiKey = await getEffectiveApiKey(userId, provider)

        return {
          provider,
          hasUserKey: Boolean(apiKey),
        }
      } catch (error) {
        app.log.error({ error }, "Provider check error")
        reply.status(500)
        return { error: "Internal server error" }
      }
    })
  },
  { encapsulate: true }
)
