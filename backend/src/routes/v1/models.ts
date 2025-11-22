import { FastifyInstance } from "fastify"
import fastifyPlugin from "fastify-plugin"
import { ZodError } from "zod"
import {
  listModelsRequestSchema,
} from "@muse/shared-schemas"
import {
  getAllModels,
  getModelsForUserProviders,
  getModelsWithAccessFlags,
  refreshModelsCache,
} from "../../domain/models/index.js"
import {
  resolveSessionUser,
  validateUserIdentity,
} from "../../services/identity.js"
import { listUserProviders } from "../../services/userKeys.js"

export const registerModelRoutes = fastifyPlugin(
  async (app: FastifyInstance) => {
    app.get("/", async (request, reply) => {
      try {
        // Validate query parameters using shared schema
        const validated = listModelsRequestSchema.parse(request.query)

        const sessionUser = await resolveSessionUser(request)
        if (!sessionUser) {
          const models = await getModelsWithAccessFlags()
          return { models }
        }

        const userId = validated.userId ?? sessionUser.id

        await validateUserIdentity(request, {
          userId,
        })

        const providers = await listUserProviders(userId)

        if (providers.length === 0) {
          const models = await getModelsWithAccessFlags()
          return { models }
        }

        const models = await getModelsForUserProviders(providers)

        return { models }
      } catch (error) {
        if (error instanceof ZodError) {
          reply.status(400)
          return {
            error: "Validation failed",
            details: error.issues,
          }
        }
        app.log.error({ error }, "Error fetching models")
        reply.status(500)
        return { error: "Failed to fetch models" }
      }
    })

    app.post("/refresh", async (_request, reply) => {
      try {
        refreshModelsCache()
        const models = await getAllModels()

        return {
          message: "Models cache refreshed",
          models,
          timestamp: new Date().toISOString(),
          count: models.length,
        }
      } catch (error) {
        app.log.error({ error }, "Failed to refresh models")
        reply.status(500)
        return { error: "Failed to refresh models" }
      }
    })
  },
  { encapsulate: true }
)
