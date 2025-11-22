import fastifyPlugin from "fastify-plugin"
import type { FastifyInstance } from "fastify"
import { R2Storage } from "../infra/r2-storage.js"
import { env } from "../config/env.js"

/**
 * Fastify plugin for Cloudflare R2 storage
 * Decorates the Fastify instance with a r2Storage property
 */
export const registerR2Storage = fastifyPlugin(
  async (app: FastifyInstance) => {
    if (
      env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET_NAME
    ) {
      const r2Storage = new R2Storage({
        accountId: env.R2_ACCOUNT_ID,
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        bucketName: env.R2_BUCKET_NAME,
      })

      app.decorate("r2Storage", r2Storage)
      app.log.info("✓ Cloudflare R2 storage initialized")
    } else {
      app.log.warn(
        "⚠ R2 storage not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME environment variables."
      )
      // Decorate with null to maintain consistent interface
      app.decorate("r2Storage", null)
    }
  },
  {
    name: "r2Storage",
  }
)
