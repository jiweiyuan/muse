import Fastify, { FastifyInstance } from "fastify"
import fastifyCors from "@fastify/cors"
import fastifySensible from "@fastify/sensible"
import fastifyRateLimit from "@fastify/rate-limit"
import fastifyWebsocket from "@fastify/websocket"
import { env } from "./config/env.js"
import { registerV1Routes } from "./routes/v1/index.js"
import { registerBetterAuth } from "./plugins/betterAuth.js"
import { auth } from "./auth/index.js"
import { registerR2Storage } from "./plugins/r2Storage.js"
import { registerReplicate } from "./plugins/replicate.js"
import { registerCanvasRoutes } from "./routes/v1/canvas.js"
import { registerWorker } from "./plugins/worker.js"
import "./types.js"

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      transport:
        env.NODE_ENV === "development"
          ? {
              target: "pino-pretty",
              options: {
                translateTime: "HH:MM:ss",
                ignore: "pid,hostname",
              },
            }
          : undefined,
    },
  })

  // Register R2 storage plugin
  await app.register(registerR2Storage)

  // Register Replicate AI client plugin
  await app.register(registerReplicate)

  await app.register(fastifyCors, {
    origin: env.FRONTEND_ORIGIN || true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  })

  await app.register(fastifySensible)

  // Register content type parsers for binary assets (images, videos, audio)
  // These parsers leave the body unparsed on req.raw for streaming to storage
  const binaryContentTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "video/mp4",
    "video/webm",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/webm",
  ]

  for (const contentType of binaryContentTypes) {
    app.addContentTypeParser(
      contentType,
      { parseAs: "buffer" },
      (_req, body, done) => {
        done(null, body)
      }
    )
  }

  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: "1 minute",
  })

  // Register worker plugin (depends on replicate and r2Storage)
  await app.register(registerWorker)

  await app.register(registerV1Routes)
  await app.register(registerBetterAuth, { auth })
  // Register WebSocket support for tldraw sync
  await app.register(fastifyWebsocket)
  // Register canvas routes (includes WebSocket endpoint)
  await app.register(registerCanvasRoutes)

  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }))

  // Log all registered routes after app is ready
  await app.ready()
  app.log.info("=== Registered Routes ===")
  app.log.info(app.printRoutes({ commonPrefix: false }))

  return app
}
