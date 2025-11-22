import type { R2Storage } from "./infra/r2-storage.js"
import type { ReplicateClient } from "./infra/replicate-client.js"
import type { auth } from "./auth/index.js"
import type { GenerativeAIWorker } from "./workers/generative-ai-worker.js"

/**
 * Extend Fastify types to include custom decorators
 */
declare module "fastify" {
  interface FastifyInstance {
    r2Storage: R2Storage | null
    replicateClient: ReplicateClient | null
    auth: typeof auth
    worker: GenerativeAIWorker
  }
}
