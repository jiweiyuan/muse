import { FastifyInstance } from "fastify"
import fastifyPlugin from "fastify-plugin"
import { ZodError } from "zod"
import {
  getPreferencesRequestSchema,
  updatePreferencesRequestSchema,
} from "@muse/shared-schemas"
import {
  getUserPreferences,
  upsertUserPreferences,
} from "../../services/preferences.js"
import {
  resolveSessionUser,
  validateUserIdentity,
} from "../../services/identity.js"

export const registerPreferenceRoutes = fastifyPlugin(
  async (app: FastifyInstance) => {
    app.get("/", async (request, reply) => {
      try {
        // Validate query parameters using shared schema
        const validated = getPreferencesRequestSchema.parse(request.query)

        const sessionUser = await resolveSessionUser(request)

        if (!sessionUser) {
          reply.status(401)
          return { error: "Unauthorized" }
        }

        const effectiveUserId = validated.userId ?? sessionUser.id

        await validateUserIdentity(request, {
          userId: effectiveUserId,
        })

        const preferences = await getUserPreferences(effectiveUserId)

        return preferences
      } catch (error) {
        if (error instanceof ZodError) {
          reply.status(400)
          return {
            error: "Validation failed",
            details: error.issues,
          }
        }
        app.log.error({ error }, "Error fetching user preferences")
        reply.status(500)
        return { error: "Failed to fetch user preferences" }
      }
    })

    app.put("/", async (request, reply) => {
      try {
        // Validate request body using shared schema
        const validated = updatePreferencesRequestSchema.parse(request.body)

        const sessionUser = await resolveSessionUser(request)
        if (!sessionUser) {
          reply.status(401)
          return { error: "Unauthorized" }
        }

        const effectiveUserId = validated.userId ?? sessionUser.id

        await validateUserIdentity(request, {
          userId: effectiveUserId,
        })

        const preferences = await upsertUserPreferences(effectiveUserId, {
          layout: validated.layout,
          promptSuggestions: validated.prompt_suggestions,
          showToolInvocations: validated.show_tool_invocations,
          showConversationPreviews: validated.show_conversation_previews,
          hiddenModels: validated.hidden_models,
        })

        return { success: true, ...preferences }
      } catch (error) {
        if (error instanceof ZodError) {
          reply.status(400)
          return {
            error: "Validation failed",
            details: error.issues,
          }
        }
        throw error
      }
    })
  },
  { encapsulate: true }
)
