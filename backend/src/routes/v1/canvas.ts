import type { FastifyInstance, FastifyRequest } from "fastify"
import type WebSocket from "ws"
import type { RawData } from "ws"
import "../../types.js"
import {
  makeOrLoadRoom,
  startPersistenceJob,
  getRoomStats,
} from "../../services/canvas/rooms.js"
import {
  createCanvas,
  getCanvasById,
  deleteCanvas,
  canUserAccessCanvas,
  saveCanvasSnapshot,
} from "../../services/canvas.js"
import {
  storeAsset,
  loadAsset,
  isValidContentType,
  deleteAsset,
} from "../../services/canvas/assets.js"
import { unfurlUrl, isValidUrl } from "../../services/canvas/unfurl.js"
import { resolveSessionUser } from "../../services/identity.js"

/**
 * Register canvas routes
 */
export async function registerCanvasRoutes(app: FastifyInstance) {
  // Start the persistence job when the server starts
  const stopPersistence = startPersistenceJob(2000)

  // Clean up on server shutdown
  app.addHook("onClose", async () => {
    stopPersistence()
  })

  /**
   * WebSocket endpoint for tldraw sync
   * GET /ws/canvas/:canvasId
   */
  app.get(
    "/ws/canvas/:canvasId",
    { websocket: true },
    async (
      socket: WebSocket,
      req: FastifyRequest<{
        Params: { canvasId: string }
        Querystring: { sessionId: string }
      }>
    ) => {
      const { canvasId } = req.params
      const { sessionId } = req.query

      // Collect messages that come in before the room is loaded.
      // Fastify recommends attaching at least one listener before async work.
      const caughtMessages: RawData[] = []
      const collectMessagesListener = (message: RawData) => {
        caughtMessages.push(message)
      }

      socket.on("message", collectMessagesListener)

      const cleanupAndClose = (code: number, reason: string) => {
        socket.off("message", collectMessagesListener)
        socket.close(code, reason)
      }

      // Authenticate user
      const session = await resolveSessionUser(req)
      if (!session) {
        cleanupAndClose(1008, "Unauthorized")
        return
      }

      const userId = session.id

      // Check if user has access to this canvas
      const hasAccess = await canUserAccessCanvas(canvasId, userId)
      if (!hasAccess) {
        cleanupAndClose(1008, "Forbidden")
        return
      }

      try {
        // Get or create the TLSocketRoom
        const room = await makeOrLoadRoom(canvasId)

        // Connect the raw socket to the room
        room.handleSocketConnect({ sessionId, socket })

        // Remove the temporary listener
        socket.off("message", collectMessagesListener)

        // Replay any caught messages
        for (const message of caughtMessages) {
          socket.emit("message", message)
        }

        app.log.info(
          `[Canvas] Client connected: ${sessionId} to ${canvasId}`
        )
      } catch (error) {
        app.log.error(
          { error },
          `[Canvas] Failed to connect client to room:`
        )
        cleanupAndClose(1011, "Internal server error")
      }
    }
  )

  /**
   * Create a new canvas
   * POST /v1/canvases
   * Note: Canvases are typically created automatically with projects.
   * This endpoint exists for legacy compatibility.
   */
  app.post<{
    Body: { projectId: string }
  }>("/v1/canvases", async (req, reply) => {
    const session = await resolveSessionUser(req)
    if (!session) {
      return reply.code(401).send({ error: "Unauthorized" })
    }

    const { projectId } = req.body

    if (!projectId) {
      return reply.code(400).send({ error: "projectId is required" })
    }

    try {
      const canvas = await createCanvas(projectId)

      return reply.code(201).send(canvas)
    } catch (error) {
      app.log.error({ error }, "[Canvas] Failed to create canvas:")
      return reply.code(500).send({ error: "Failed to create canvas" })
    }
  })

  /**
   * Get canvas by ID
   * GET /v1/canvases/:canvasId
   */
  app.get<{
    Params: { canvasId: string }
  }>("/v1/canvases/:canvasId", async (req, reply) => {
    const session = await resolveSessionUser(req)
    if (!session) {
      return reply.code(401).send({ error: "Unauthorized" })
    }

    const { canvasId } = req.params
    const userId = session.id

    try {
      const hasAccess = await canUserAccessCanvas(canvasId, userId)
      if (!hasAccess) {
        return reply.code(403).send({ error: "Forbidden" })
      }

      const canvas = await getCanvasById(canvasId)
      if (!canvas) {
        return reply.code(404).send({ error: "Canvas not found" })
      }

      return reply.send(canvas)
    } catch (error) {
      app.log.error({ error }, "[Canvas] Failed to get canvas:")
      return reply.code(500).send({ error: "Failed to get canvas" })
    }
  })

  /**
   * Update canvas snapshot
   * PUT /v1/canvases/:canvasId
   */
  app.put<{
    Params: { canvasId: string }
    Body: { snapshot: any }
  }>("/v1/canvases/:canvasId", async (req, reply) => {
    const session = await resolveSessionUser(req)
    if (!session) {
      return reply.code(401).send({ error: "Unauthorized" })
    }

    const { canvasId } = req.params
    const { snapshot } = req.body
    const userId = session.id

    if (!snapshot) {
      return reply.code(400).send({ error: "snapshot is required" })
    }

    try {
      const hasAccess = await canUserAccessCanvas(canvasId, userId)
      if (!hasAccess) {
        return reply.code(403).send({ error: "Forbidden" })
      }

      const canvas = await getCanvasById(canvasId)
      if (!canvas) {
        return reply.code(404).send({ error: "Canvas not found" })
      }

      await saveCanvasSnapshot(canvasId, snapshot)
      app.log.info(`[Canvas] Saved snapshot for ${canvasId}`)

      return reply.send({ ok: true })
    } catch (error) {
      app.log.error(
        { error },
        "[Canvas] Failed to update canvas snapshot:"
      )
      return reply.code(500).send({ error: "Failed to update canvas" })
    }
  })

  /**
   * Delete canvas
   * DELETE /v1/canvases/:canvasId
   */
  app.delete<{
    Params: { canvasId: string }
  }>("/v1/canvases/:canvasId", async (req, reply) => {
    const session = await resolveSessionUser(req)
    if (!session) {
      return reply.code(401).send({ error: "Unauthorized" })
    }

    const { canvasId } = req.params
    const userId = session.id

    try {
      const hasAccess = await canUserAccessCanvas(canvasId, userId)
      if (!hasAccess) {
        return reply.code(403).send({ error: "Forbidden" })
      }

      await deleteCanvas(canvasId)
      return reply.code(204).send()
    } catch (error) {
      app.log.error({ error }, "[Canvas] Failed to delete canvas:")
      return reply.code(500).send({ error: "Failed to delete canvas" })
    }
  })

  /**
   * Upload asset
   * PUT /v1/assets/:assetId
   */
  app.put<{
    Params: { assetId: string }
    Querystring: { canvasId?: string }
  }>(
    "/v1/assets/:assetId",
    {
      bodyLimit: 256 * 1024 * 1024, // 256MB limit (aligned with storage limit)
    },
    async (req, reply) => {
      const session = await resolveSessionUser(req)
      if (!session) {
        return reply.code(401).send({ error: "Unauthorized" })
      }

      const { assetId } = req.params
      const { canvasId } = req.query
      const userId = session.id

      try {
        if (!app.r2Storage) {
          return reply.code(503).send({ error: "File storage not configured" })
        }

        // If canvasId is provided, verify user has access to that canvas
        if (canvasId) {
          const hasAccess = await canUserAccessCanvas(canvasId, userId)
          if (!hasAccess) {
            return reply.code(403).send({ error: "Forbidden" })
          }
        }

        const contentType =
          req.headers["content-type"] || "application/octet-stream"

        if (!isValidContentType(contentType)) {
          return reply.code(400).send({ error: "Invalid content type" })
        }

        // Use req.body which contains the parsed buffer (from content type parser)
        await storeAsset(
          app.r2Storage,
          assetId,
          userId,
          req.body as Buffer,
          contentType
        )

        return reply.send({ ok: true })
      } catch (error) {
        app.log.error({ error }, "[Canvas] Failed to upload asset:")
        return reply.code(500).send({ error: "Failed to upload asset" })
      }
    }
  )

  /**
   * Download asset
   * GET /v1/assets/:assetId
   *
   * Note: This endpoint is public (no auth required) because:
   * 1. Asset IDs are UUIDs (unguessable)
   * 2. Security is enforced at upload time (user must have canvas access)
   * 3. Allows <img> tags to load cross-origin assets without credentials
   */
  app.get<{
    Params: { assetId: string }
  }>("/v1/assets/:assetId", async (req, reply) => {
    const { assetId } = req.params

    try {
      if (!app.r2Storage) {
        return reply.code(503).send({ error: "File storage not configured" })
      }

      // Load asset without user check (public access by asset ID)
      const asset = await loadAsset(app.r2Storage, assetId)

      if (!asset) {
        return reply.code(404).send({ error: "Asset not found" })
      }

      reply.header("Content-Type", asset.contentType)
      reply.header("Content-Length", asset.fileSize)
      reply.header("Cache-Control", "public, max-age=31536000, immutable")
      reply.header("Access-Control-Allow-Origin", "*")

      return reply.send(asset.data)
    } catch (error) {
      app.log.error({ error }, "[Canvas] Failed to load asset:")
      return reply.code(500).send({ error: "Failed to load asset" })
    }
  })

  /**
   * Delete asset
   * DELETE /v1/assets/:assetId
   */
  app.delete<{
    Params: { assetId: string }
  }>("/v1/assets/:assetId", async (req, reply) => {
    const session = await resolveSessionUser(req)
    if (!session) {
      return reply.code(401).send({ error: "Unauthorized" })
    }

    const { assetId } = req.params
    const userId = session.id

    try {
      if (!app.r2Storage) {
        return reply.code(503).send({ error: "File storage not configured" })
      }

      // Delete asset with user authorization check
      await deleteAsset(app.r2Storage, assetId, userId)
      return reply.code(204).send()
    } catch (error) {
      // Check if it's an authorization error
      if (error instanceof Error && error.message.includes("Unauthorized")) {
        return reply.code(403).send({ error: "Forbidden" })
      }

      app.log.error({ error }, "[Canvas] Failed to delete asset:")
      return reply.code(500).send({ error: "Failed to delete asset" })
    }
  })

  /**
   * Unfurl bookmark URL
   * GET /v1/canvas/unfurl?url=...
   */
  app.get<{
    Querystring: { url: string }
  }>("/v1/canvas/unfurl", async (req, reply) => {
    const { url } = req.query

    if (!url) {
      return reply.code(400).send({ error: "url query parameter is required" })
    }

    if (!isValidUrl(url)) {
      return reply.code(400).send({ error: "Invalid URL" })
    }

    try {
      const result = await unfurlUrl(url)
      return reply.send(result)
    } catch (error) {
      app.log.error({ error }, "[Canvas] Failed to unfurl URL:")
      return reply.code(500).send({ error: "Failed to unfurl URL" })
    }
  })

  /**
   * Get room stats (for debugging)
   * GET /v1/canvas/stats
   */
  app.get("/v1/canvas/stats", async (req, reply) => {
    const session = await resolveSessionUser(req)
    if (!session) {
      return reply.code(401).send({ error: "Unauthorized" })
    }

    const stats = getRoomStats()
    return reply.send(stats)
  })
}
