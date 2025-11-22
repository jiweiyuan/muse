import type { FastifyInstance } from "fastify"
import fastifyPlugin from "fastify-plugin"
import { randomUUID } from "crypto"
import { resolveSessionUser } from "../../services/identity.js"
import { loadAsset, storeAsset } from "../../services/canvas/assets.js"
import { canUserAccessCanvas } from "../../services/canvas.js"

/**
 * Image processing tools using Replicate AI
 */
export const registerToolRoutes = fastifyPlugin(
  async (app: FastifyInstance) => {
    /**
     * Upscale image using Bria's increase-resolution model
     * POST /v1/tools/image/upscale
     */
    app.post<{
      Body: {
        assetId: string
        factor: 2 | 4
        canvasId: string
      }
    }>("/image/upscale", async (req, reply) => {
      const session = await resolveSessionUser(req)
      if (!session) {
        return reply.code(401).send({ error: "Unauthorized" })
      }

      const { assetId, factor, canvasId } = req.body
      const userId = session.id

      // Validate inputs
      if (!assetId || !factor || !canvasId) {
        return reply
          .code(400)
          .send({ error: "assetId, factor, and canvasId are required" })
      }

      if (factor !== 2 && factor !== 4) {
        return reply.code(400).send({ error: "factor must be 2 or 4" })
      }

      try {
        // Verify user has access to the canvas
        const hasAccess = await canUserAccessCanvas(canvasId, userId)
        if (!hasAccess) {
          return reply
            .code(403)
            .send({ error: "Forbidden: No access to canvas" })
        }

        // Check if file storage is configured
        if (!app.r2Storage) {
          return reply.code(503).send({ error: "File storage not configured" })
        }

        // Check if Replicate client is configured
        if (!app.replicateClient) {
          return reply
            .code(503)
            .send({ error: "Image processing service not configured" })
        }

        // Load the asset
        const asset = await loadAsset(app.r2Storage, assetId, userId)
        if (!asset) {
          return reply.code(404).send({ error: "Asset not found" })
        }

        // Validate it's an image
        if (!asset.contentType.startsWith("image/")) {
          return reply.code(400).send({ error: "Asset must be an image" })
        }

        app.log.info(
          `[Tools] Upscaling image ${assetId} by ${factor}x for user ${userId}`
        )

        // Process the image with Replicate
        const processedBuffer = await app.replicateClient.upscaleImage(
          asset.data,
          factor,
          asset.contentType
        )

        // Generate new asset ID (fresh UUID with operation prefix)
        const newAssetId = `upscale${factor}x-${randomUUID()}`

        // Store the processed image
        await storeAsset(
          app.r2Storage,
          newAssetId,
          userId,
          processedBuffer,
          "image/png", // Replicate returns PNG
          `upscaled-${factor}x.png`
        )

        // Construct proper URL with port (req.hostname doesn't include port)
        const host =
          req.headers.host || `${req.hostname}:${process.env.PORT || 8000}`
        const newAssetUrl = `${req.protocol}://${host}/v1/assets/${newAssetId}`

        app.log.info(`[Tools] Successfully upscaled image to ${newAssetId}`)

        return reply.send({
          assetId: newAssetId,
          assetUrl: newAssetUrl,
        })
      } catch (error) {
        app.log.error({ error }, "[Tools] Failed to upscale image:")

        // Check if it's a Replicate API error
        if (
          error instanceof Error &&
          error.message.includes("REPLICATE_API_TOKEN")
        ) {
          return reply
            .code(503)
            .send({ error: "Image processing service not configured" })
        }

        return reply.code(500).send({ error: "Failed to upscale image" })
      }
    })

    /**
     * Remove background from image using Bria's RMBG 2.0 model
     * POST /v1/tools/image/remove-background
     */
    app.post<{
      Body: {
        assetId: string
        canvasId: string
      }
    }>("/image/remove-background", async (req, reply) => {
      const session = await resolveSessionUser(req)
      if (!session) {
        return reply.code(401).send({ error: "Unauthorized" })
      }

      const { assetId, canvasId } = req.body
      const userId = session.id

      // Validate inputs
      if (!assetId || !canvasId) {
        return reply
          .code(400)
          .send({ error: "assetId and canvasId are required" })
      }

      try {
        // Verify user has access to the canvas
        const hasAccess = await canUserAccessCanvas(canvasId, userId)
        if (!hasAccess) {
          return reply
            .code(403)
            .send({ error: "Forbidden: No access to canvas" })
        }

        // Check if file storage is configured
        if (!app.r2Storage) {
          return reply.code(503).send({ error: "File storage not configured" })
        }

        // Check if Replicate client is configured
        if (!app.replicateClient) {
          return reply
            .code(503)
            .send({ error: "Image processing service not configured" })
        }

        // Load the asset
        const asset = await loadAsset(app.r2Storage, assetId, userId)
        if (!asset) {
          return reply.code(404).send({ error: "Asset not found" })
        }

        // Validate it's an image
        if (!asset.contentType.startsWith("image/")) {
          return reply.code(400).send({ error: "Asset must be an image" })
        }

        app.log.info(
          `[Tools] Removing background from image ${assetId} for user ${userId}`
        )

        // Process the image with Replicate
        const processedBuffer = await app.replicateClient.removeBackground(
          asset.data,
          asset.contentType
        )

        // Generate new asset ID (fresh UUID with operation prefix)
        const newAssetId = `nobg-${randomUUID()}`

        // Store the processed image
        await storeAsset(
          app.r2Storage,
          newAssetId,
          userId,
          processedBuffer,
          "image/png", // Replicate returns PNG with alpha channel
          "no-background.png"
        )

        // Construct proper URL with port (req.hostname doesn't include port)
        const host =
          req.headers.host || `${req.hostname}:${process.env.PORT || 8000}`
        const newAssetUrl = `${req.protocol}://${host}/v1/assets/${newAssetId}`

        app.log.info(`[Tools] Successfully removed background to ${newAssetId}`)

        return reply.send({
          assetId: newAssetId,
          assetUrl: newAssetUrl,
        })
      } catch (error) {
        app.log.error({ error }, "[Tools] Failed to remove background:")

        // Check if it's a Replicate API error
        if (
          error instanceof Error &&
          error.message.includes("REPLICATE_API_TOKEN")
        ) {
          return reply
            .code(503)
            .send({ error: "Image processing service not configured" })
        }

        return reply.code(500).send({ error: "Failed to remove background" })
      }
    })

    /**
     * Generate image from text prompt using AI
     * POST /v1/tools/image/generate
     */
    app.post<{
      Body: {
        prompt: string
        canvasId: string
        aspectRatio?: string
        outputFormat?: string
      }
    }>("/image/generate", async (req, reply) => {
      const session = await resolveSessionUser(req)
      if (!session) {
        return reply.code(401).send({ error: "Unauthorized" })
      }

      const { prompt, canvasId, aspectRatio, outputFormat } = req.body
      const userId = session.id

      // Validate inputs
      if (!prompt || !canvasId) {
        return reply
          .code(400)
          .send({ error: "prompt and canvasId are required" })
      }

      try {
        // Verify user has access to the canvas
        const hasAccess = await canUserAccessCanvas(canvasId, userId)
        if (!hasAccess) {
          return reply
            .code(403)
            .send({ error: "Forbidden: No access to canvas" })
        }

        // Check if file storage is configured
        if (!app.r2Storage) {
          return reply.code(503).send({ error: "File storage not configured" })
        }

        // Check if Replicate client is configured
        if (!app.replicateClient) {
          return reply
            .code(503)
            .send({ error: "Image generation service not configured" })
        }

        app.log.info(
          `[Tools] Generating image from prompt for user ${userId}: "${prompt}"`
        )

        // Generate the image with Replicate
        const generatedBuffer = await app.replicateClient.generateImage(
          prompt,
          {
            aspectRatio,
            outputFormat,
          }
        )

        // Generate asset ID
        const assetId = `generated-${randomUUID()}`

        // Store the generated image
        await storeAsset(
          app.r2Storage,
          assetId,
          userId,
          generatedBuffer,
          "image/png", // Replicate returns PNG
          `generated-${Date.now()}.png`
        )

        // Construct proper URL with port (req.hostname doesn't include port)
        const host =
          req.headers.host || `${req.hostname}:${process.env.PORT || 8000}`
        const assetUrl = `${req.protocol}://${host}/v1/assets/${assetId}`

        app.log.info(`[Tools] Successfully generated image: ${assetId}`)

        return reply.send({
          assetId,
          assetUrl,
        })
      } catch (error) {
        app.log.error({ error }, "[Tools] Failed to generate image:")

        // Check if it's a Replicate API error
        if (
          error instanceof Error &&
          error.message.includes("REPLICATE_API_TOKEN")
        ) {
          return reply
            .code(503)
            .send({ error: "Image generation service not configured" })
        }

        return reply.code(500).send({ error: "Failed to generate image" })
      }
    })

  },
  { encapsulate: true }
)
