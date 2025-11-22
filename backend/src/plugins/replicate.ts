import fastifyPlugin from "fastify-plugin"
import type { FastifyInstance } from "fastify"
import { ReplicateClient } from "../infra/replicate-client.js"
import { env } from "../config/env.js"

/**
 * Fastify plugin for Replicate AI client
 * Decorates the Fastify instance with a replicateClient property
 */
export const registerReplicate = fastifyPlugin(
  async (app: FastifyInstance) => {
    if (env.REPLICATE_API_TOKEN) {
      const replicateClient = new ReplicateClient({
        apiToken: env.REPLICATE_API_TOKEN,
        logger: app.log.child({ component: "ReplicateClient" }) as any,
      })

      app.decorate("replicateClient", replicateClient)
      app.log.info("✓ Replicate AI client initialized")
    } else {
      app.log.warn(
        "⚠ Replicate not configured. Set REPLICATE_API_TOKEN environment variable to enable AI image processing."
      )
      // Decorate with null to maintain consistent interface
      app.decorate("replicateClient", null)
    }
  },
  {
    name: "replicate",
  }
)
