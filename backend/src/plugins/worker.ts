import { FastifyPluginAsync } from "fastify"
import fp from "fastify-plugin"
import { GenerativeAIWorker } from "../workers/generative-ai-worker.js"
import { env } from "../config/env.js"

/**
 * Generative AI Worker Plugin
 *
 * Integrates the worker into Fastify's lifecycle:
 * - Starts when server starts (onReady)
 * - Stops gracefully on shutdown (onClose)
 * - Depends on replicate and r2Storage plugins
 */
const workerPlugin: FastifyPluginAsync = async (fastify) => {
  // Validate dependencies
  if (!fastify.replicateClient) {
    fastify.log.warn(
      "[Worker Plugin] Replicate client not configured, worker disabled"
    )
    return
  }

  if (!fastify.r2Storage) {
    fastify.log.warn(
      "[Worker Plugin] R2 storage not configured, worker disabled"
    )
    return
  }

  // Initialize worker (but don't start yet)
  const worker = new GenerativeAIWorker({
    replicateClient: fastify.replicateClient,
    r2Storage: fastify.r2Storage,
    baseUrl: env.BACKEND_URL || `http://localhost:${env.PORT || 8000}`,
    pollInterval: 5000, // 5 seconds
    concurrency: 3, // Process 3 tasks concurrently
    replicateRateLimit: env.REPLICATE_RATE_LIMIT,
    logger: fastify.log.child({ component: "GenerativeAIWorker" }),
  })

  // Decorate Fastify instance with worker (for health checks, status, etc.)
  fastify.decorate("worker", worker)

  // Start worker when Fastify is ready
  fastify.addHook("onReady", async () => {
    fastify.log.info("[Worker Plugin] Starting generative AI worker...")

    // Start worker in background (non-blocking)
    // The worker.start() loop runs independently
    worker.start().catch((error) => {
      fastify.log.error("[Worker Plugin] Worker crashed unexpectedly:", error)
      // Note: Don't throw here - we don't want to crash the server
      // The worker is designed to restart on next poll cycle
    })

    fastify.log.info(
      `[Worker Plugin] Worker started (ID: ${worker.getStatus().workerId})`
    )
  })

  // Stop worker gracefully on shutdown
  fastify.addHook("onClose", async () => {
    fastify.log.info("[Worker Plugin] Shutting down generative AI worker...")
    worker.stop()
    fastify.log.info("[Worker Plugin] Worker stopped")
  })

  // Health check endpoint for worker status
  fastify.get("/worker/status", async () => {
    return worker.getStatus()
  })
}

// Export as fastify-plugin to ensure proper encapsulation
export const registerWorker = fp(workerPlugin, {
  name: "worker",
  dependencies: ["replicate", "r2Storage"], // Ensure dependencies are loaded first
})
