import {
  AssetRecordType,
  type TLAssetId,
  type TLImageAsset,
  type TLImageShape,
} from "@tldraw/tlschema"
import { v4 as uuidv4 } from "uuid"
import { SimpleRateLimiter } from "./simple-rate-limiter.js"
import {
  claimTasks,
  updateTask,
  getCanvasIdByProjectId,
  type Task,
  type TaskResult,
} from "../services/tasks.js"
import { storeAsset, loadAsset } from "../services/canvas/assets.js"
import { makeOrLoadRoom } from "../services/canvas/rooms.js"
import { generateTitleFromPrompt } from "../services/title-generator.js"
import type { ReplicateClient } from "../infra/replicate-client.js"
import type { R2Storage } from "../infra/r2-storage.js"

/**
 * Generative AI Worker Configuration
 */
export interface WorkerConfig {
  replicateClient: ReplicateClient
  r2Storage: R2Storage
  baseUrl: string
  pollInterval?: number // milliseconds between queue polls (default: 5000)
  concurrency?: number // max concurrent tasks (default: 3)
  replicateRateLimit?: number // requests per second (default: 50)
  logger?: any // optional logger (e.g., fastify.log.child)
}

/**
 * Generative AI Worker
 * Processes async tasks for image generation, upscaling, and background removal
 */
export class GenerativeAIWorker {
  private workerId: string
  private replicateClient: ReplicateClient
  private r2Storage: R2Storage
  private baseUrl: string
  private pollInterval: number
  private concurrency: number
  private rateLimiter: SimpleRateLimiter
  private isRunning = false
  private currentTasks = 0

  constructor(config: WorkerConfig) {
    this.workerId = uuidv4()
    this.replicateClient = config.replicateClient
    this.r2Storage = config.r2Storage
    this.baseUrl = config.baseUrl
    this.pollInterval = config.pollInterval || 5000
    this.concurrency = config.concurrency || 3
    this.rateLimiter = new SimpleRateLimiter(config.replicateRateLimit || 50)

    console.log(`[Worker] Initialized worker ${this.workerId}`)
    console.log(
      `[Worker] Rate limit: ${config.replicateRateLimit || 50} req/sec`
    )
  }

  /**
   * Start the worker process
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn("[Worker] Worker already running")
      return
    }

    this.isRunning = true
    console.log(`[Worker] Starting worker ${this.workerId}`)

    while (this.isRunning) {
      try {
        // Calculate how many tasks we can claim
        const availableSlots = this.concurrency - this.currentTasks

        if (availableSlots > 0) {
          // Claim tasks from queue
          const tasks = await claimTasks(this.workerId, availableSlots)

          if (tasks.length > 0) {
            console.log(`[Worker] Claimed ${tasks.length} task(s)`)

            // Process tasks in parallel (fire and forget)
            tasks.forEach((task) => this.processTask(task))
          }
        }

        // Wait before next poll
        await this.sleep(this.pollInterval)
      } catch (error) {
        console.error("[Worker] Error in main loop:", error)
        // Back off on error
        await this.sleep(this.pollInterval * 2)
      }
    }

    console.log(`[Worker] Worker ${this.workerId} stopped`)
  }

  /**
   * Stop the worker process
   */
  stop(): void {
    console.log(`[Worker] Stopping worker ${this.workerId}`)
    this.isRunning = false
  }

  /**
   * Process a single task
   */
  private async processTask(task: Task): Promise<void> {
    this.currentTasks++
    const startTime = Date.now()

    try {
      console.log(`[Worker] Processing task ${task.id} (${task.taskType})`)

      // Process based on task type
      let result: TaskResult
      switch (task.taskType) {
        case "generate_image":
          result = await this.processGenerateImage(task)
          break
        case "image_upscale":
          result = await this.processUpscaleImage(task)
          break
        case "image_remove_background":
          result = await this.processRemoveBackground(task)
          break
        default:
          throw new Error(`Unknown task type: ${task.taskType}`)
      }

      // Update canvas if shapeId provided
      if (task.shapeId) {
        const canvasId = await getCanvasIdByProjectId(task.projectId)
        if (canvasId) {
          await this.updateCanvas(
            canvasId,
            task.shapeId,
            result.assetId!,
            result.assetUrl!,
            result.metadata
          )
        } else {
          console.warn(
            `[Worker] Project ${task.projectId} has no canvas, skipping shape update`
          )
        }
      }

      // Mark task as completed with result
      const processingTime = (Date.now() - startTime) / 1000
      await updateTask(task.id, {
        status: "completed",
        result: {
          ...result,
          metadata: {
            ...result.metadata,
            processingTime,
          },
        },
        completedAt: new Date(),
      })

      console.log(
        `[Worker] Task ${task.id} completed in ${processingTime.toFixed(2)}s`
      )
    } catch (error: any) {
      console.error(`[Worker] Task ${task.id} failed:`, error)

      // Check if this is a 429 rate limit error
      if (this.is429Error(error)) {
        console.log(
          `[Worker] Task ${task.id} hit rate limit, retrying without penalty`
        )
        // Reset to pending WITHOUT incrementing retry_count
        await updateTask(task.id, {
          status: "pending",
          workerId: null,
          claimedAt: null,
        })
      } else {
        // Normal failure - check retry count
        if (task.retryCount < task.maxRetries) {
          console.log(
            `[Worker] Task ${task.id} retry ${task.retryCount + 1}/${task.maxRetries}`
          )
          await updateTask(task.id, {
            status: "pending",
            retryCount: task.retryCount + 1,
            workerId: null,
            claimedAt: null,
          })
        } else {
          // Max retries reached - mark as failed
          console.error(
            `[Worker] Task ${task.id} failed permanently after ${task.retryCount} retries`
          )
          await updateTask(task.id, {
            status: "failed",
            result: {
              errorMessage: error.message || "Unknown error",
              errorCode: error.code || "UNKNOWN_ERROR",
              errorDetails: {
                attempts: task.retryCount + 1,
                lastError: error.message,
              },
            },
            completedAt: new Date(),
          })
        }
      }
    } finally {
      this.currentTasks--
    }
  }

  /**
   * Calculate image dimensions from aspect ratio string
   * @param aspectRatio - Aspect ratio string like "1:1", "9:16", "16:9", etc.
   * @param baseSize - Base dimension to calculate from (default: 1024)
   * @returns { width, height } object with calculated dimensions
   */
  private calculateDimensionsFromAspectRatio(
    aspectRatio: string,
    baseSize: number = 1024
  ): { width: number; height: number } {
    const [widthRatio, heightRatio] = aspectRatio.split(":").map(Number)

    if (!widthRatio || !heightRatio || widthRatio <= 0 || heightRatio <= 0) {
      // Fallback to square if invalid aspect ratio
      return { width: baseSize, height: baseSize }
    }

    // For landscape (width > height), use baseSize for width
    if (widthRatio >= heightRatio) {
      const width = baseSize
      const height = Math.round((baseSize * heightRatio) / widthRatio)
      return { width, height }
    }

    // For portrait (height > width), use baseSize for height
    const height = baseSize
    const width = Math.round((baseSize * widthRatio) / heightRatio)
    return { width, height }
  }

  /**
   * Process generate_image task
   */
  private async processGenerateImage(task: Task): Promise<TaskResult> {
    const { modelId, modelParams, storageAssetId } = task.body
    const { prompt } = modelParams || {}

    if (!prompt) {
      throw new Error("Missing prompt in task body")
    }

    if (!storageAssetId) {
      throw new Error("Missing storageAssetId in task body")
    }

    if (!modelId) {
      throw new Error("Missing modelId in task body")
    }

    console.log(`[Worker] Generating image with model ${modelId}`, {
      modelParams,
    })

    // Generate title from prompt (with fallback)
    const title = await generateTitleFromPrompt(prompt, task.userId).catch(
      (error) => {
        console.warn(
          `[Worker] Failed to generate title for task ${task.id}:`,
          error
        )
        // Fallback to truncated prompt
        return prompt.length > 50 ? prompt.substring(0, 47) + "..." : prompt
      }
    )

    // Acquire rate limit token BEFORE external API call
    await this.rateLimiter.acquire()

    // Generate image via Replicate using model-specific method
    let imageBuffer: Buffer

    switch (modelId) {
      case "google/nano-banana":
        imageBuffer = await this.replicateClient.generateWithNanoBanana(modelParams)
        break
      case "bytedance/seedream-4":
        imageBuffer = await this.replicateClient.generateWithSeedream4(modelParams)
        break
      case "black-forest-labs/flux-1.1-pro":
        imageBuffer = await this.replicateClient.generateWithFlux11Pro(modelParams)
        break
      default:
        throw new Error(`Unknown or unsupported image model: ${modelId}`)
    }

    // Use storage ID provided by frontend (unified uniqueId-filename format)
    await storeAsset(
      this.r2Storage,
      storageAssetId,
      task.userId,
      imageBuffer,
      "image/png"
    )

    // Construct asset URL
    const assetUrl = `${this.baseUrl}/v1/assets/${storageAssetId}`

    // Calculate dimensions from aspect ratio or custom dimensions
    let width: number
    let height: number

    if (modelParams?.width && modelParams?.height) {
      // Use custom dimensions if provided (e.g., Flux custom mode)
      width = modelParams.width
      height = modelParams.height
    } else {
      // Calculate from aspect ratio
      const aspectRatio = modelParams?.aspect_ratio || "1:1"
      const dimensions = this.calculateDimensionsFromAspectRatio(aspectRatio)
      width = dimensions.width
      height = dimensions.height
    }

    return {
      assetId: storageAssetId,
      assetUrl,
      metadata: {
        width,
        height,
        fileSize: imageBuffer.length,
        title, // Include generated title
      },
    }
  }


  /**
   * Process image_upscale task
   */
  private async processUpscaleImage(task: Task): Promise<TaskResult> {
    const { sourceAssetId, factor } = task.body

    if (!sourceAssetId) {
      throw new Error("Missing sourceAssetId in task body")
    }

    // Validate factor
    const upscaleFactor: 2 | 4 = factor === 2 ? 2 : 4

    // Load source asset
    const asset = await loadAsset(this.r2Storage, sourceAssetId, task.userId)
    if (!asset) {
      throw new Error(`Source asset not found: ${sourceAssetId}`)
    }

    // Acquire rate limit token BEFORE external API call
    await this.rateLimiter.acquire()

    // Upscale via Replicate
    const processedBuffer = await this.replicateClient.upscaleImage(
      asset.data,
      upscaleFactor,
      asset.contentType
    )

    // Store as asset (use TL-compliant ID)
    const assetId = AssetRecordType.createId()
    await storeAsset(
      this.r2Storage,
      assetId,
      task.userId,
      processedBuffer,
      "image/png"
    )

    const assetUrl = `${this.baseUrl}/v1/assets/${assetId}`

    return {
      assetId,
      assetUrl,
      metadata: {
        fileSize: processedBuffer.length,
        sourceAssetId,
        factor: upscaleFactor,
      },
    }
  }

  /**
   * Process image_remove_background task
   */
  private async processRemoveBackground(task: Task): Promise<TaskResult> {
    const { sourceAssetId } = task.body

    if (!sourceAssetId) {
      throw new Error("Missing sourceAssetId in task body")
    }

    // Load source asset
    const asset = await loadAsset(this.r2Storage, sourceAssetId, task.userId)
    if (!asset) {
      throw new Error(`Source asset not found: ${sourceAssetId}`)
    }

    // Acquire rate limit token BEFORE external API call
    await this.rateLimiter.acquire()

    // Remove background via Replicate
    const processedBuffer = await this.replicateClient.removeBackground(
      asset.data,
      asset.contentType
    )

    // Store as asset (use TL-compliant ID)
    const assetId = AssetRecordType.createId()
    await storeAsset(
      this.r2Storage,
      assetId,
      task.userId,
      processedBuffer,
      "image/png"
    )

    const assetUrl = `${this.baseUrl}/v1/assets/${assetId}`

    return {
      assetId,
      assetUrl,
      metadata: {
        fileSize: processedBuffer.length,
        sourceAssetId,
      },
    }
  }


  /**
   * Update canvas with generated asset
   *
   * Uses
   *  for atomic server-side updates that sync to all clients.
   * The transaction ensures proper tldraw versioning and automatic persistence.
   */
  private async updateCanvas(
    canvasId: string,
    shapeId: string,
    storageAssetId: string,
    assetUrl: string,
    metadata?: TaskResult["metadata"]
  ): Promise<void> {
    try {
      const room = await makeOrLoadRoom(canvasId)

      await room.updateStore((store) => {
        const shape = store.get(shapeId) as TLImageShape | any

        if (!shape) {
          console.warn(
            `[Worker] Shape ${shapeId} not found in ${canvasId}`
          )
          return
        }

        // Handle different shape types
        if (shape.type === "image") {
          this.updateImageShape(store, shape, storageAssetId, assetUrl, metadata)
        } else {
          console.warn(
            `[Worker] Shape ${shapeId} has unsupported type ${shape.type}`
          )
        }
      })

      console.log(
        `[Worker] Canvas ${canvasId} updated: shape ${shapeId} -> asset ${storageAssetId}`
      )
    } catch (error) {
      console.error(`[Worker] Failed to update canvas ${canvasId}:`, error)
      // Don't throw - task should still complete successfully
    }
  }

  /**
   * Update image shape with generated asset
   */
  private updateImageShape(
    store: any,
    shape: TLImageShape,
    storageAssetId: string,
    assetUrl: string,
    metadata?: TaskResult["metadata"]
  ): void {
    // Get dimensions with fallbacks
    const width = metadata?.width ?? shape.props.w
    const height = metadata?.height ?? shape.props.h
    const title = metadata?.title

    // Normalize asset ID to TL format (asset:xxxx)
    const assetId: TLAssetId =
      storageAssetId.startsWith("asset:") && storageAssetId.length > 6
        ? (storageAssetId as TLAssetId)
        : AssetRecordType.createId()

    const existingAsset = store.get(assetId) as TLImageAsset | undefined

    // Create asset record
    const assetRecord = AssetRecordType.create({
      id: assetId,
      type: "image",
      props: {
        w: width,
        h: height,
        name: title ? `${title}.png` : "generated-image.png",
        isAnimated: false,
        mimeType: "image/png",
        src: assetUrl,
        ...(metadata?.fileSize && { fileSize: metadata.fileSize }),
      },
      meta: {
        ...existingAsset?.meta,
        storageAssetId,
        ...(title && { title }),
      },
    }) as TLImageAsset

    // Create updated shape (immutable - don't mutate the original)
    const updatedShape: TLImageShape = {
      ...shape,
      props: {
        ...shape.props,
        assetId,
        url: assetUrl,
        w: width,
        h: height,
      },
      meta: {
        ...shape.meta,
        isGenerating: false,
        isProcessing: false,
        generatedAt: Date.now(),
        storageAssetId,
        ...(title && { title }),
      },
    }

    // Put records individually (store.put accepts single record, not array)
    store.put(assetRecord)
    store.put(updatedShape)
  }


  /**
   * Check if error is a 429 rate limit error
   */
  private is429Error(error: any): boolean {
    return (
      error.message?.includes("429") ||
      error.message?.includes("rate limit") ||
      error.statusCode === 429 ||
      error.status === 429
    )
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Get worker status
   */
  getStatus() {
    return {
      workerId: this.workerId,
      isRunning: this.isRunning,
      currentTasks: this.currentTasks,
      concurrency: this.concurrency,
      rateLimit: this.rateLimiter.getRate(),
    }
  }
}
