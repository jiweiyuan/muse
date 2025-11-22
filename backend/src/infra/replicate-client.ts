import Replicate from "replicate"
import pino from "pino"

/**
 * Replicate Client Configuration
 */
export interface ReplicateConfig {
  apiToken: string
  logger?: pino.Logger
}

/**
 * Replicate Client Wrapper
 * Provides AI-powered image processing operations
 */
export class ReplicateClient {
  private client: Replicate
  private logger: pino.Logger

  constructor(config: ReplicateConfig) {
    this.client = new Replicate({
      auth: config.apiToken,
    })
    this.logger = config.logger || pino({ name: "ReplicateClient" })
  }

  /**
   * Download file from URL and return as Buffer
   */
  private async downloadFile(url: string): Promise<Buffer> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(
        `Failed to download file from ${url}: ${response.statusText}`
      )
    }
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  /**
   * Convert Buffer to base64 data URL for Replicate API
   */
  private bufferToDataUrl(
    buffer: Buffer,
    contentType: string = "image/png"
  ): string {
    const base64 = buffer.toString("base64")
    return `data:${contentType};base64,${base64}`
  }

  /**
   * Upscale image using Bria's increase-resolution model
   * @param imageBuffer - Input image as Buffer
   * @param desiredIncrease - Resolution multiplier (2 or 4)
   * @param contentType - MIME type of the image
   * @returns Upscaled image as Buffer
   */
  async upscaleImage(
    imageBuffer: Buffer,
    desiredIncrease: 2 | 4,
    contentType: string = "image/png"
  ): Promise<Buffer> {
    // Convert buffer to data URL for Replicate
    const imageDataUrl = this.bufferToDataUrl(imageBuffer, contentType)

    const output = await this.client.run("bria/increase-resolution", {
      input: {
        image: imageDataUrl,
        desired_increase: desiredIncrease,
        preserve_alpha: true,
        sync: true,
        content_moderation: false,
      },
    })

    // In Replicate SDK v1.0+, output is a FileOutput object with url() method
    const url = typeof output === "string" ? output : (output as any).url()

    // Download the result
    const resultBuffer = await this.downloadFile(url)
    return resultBuffer
  }

  /**
   * Remove background from image using Bria's RMBG 2.0 model
   * @param imageBuffer - Input image as Buffer
   * @param contentType - MIME type of the image
   * @returns Image with background removed as Buffer
   */
  async removeBackground(
    imageBuffer: Buffer,
    contentType: string = "image/png"
  ): Promise<Buffer> {
    // Convert buffer to data URL for Replicate
    const imageDataUrl = this.bufferToDataUrl(imageBuffer, contentType)

    const output = await this.client.run("bria/remove-background", {
      input: {
        image: imageDataUrl,
        preserve_partial_alpha: true,
        content_moderation: false,
      },
    })

    // In Replicate SDK v1.0+, output is a FileOutput object with url() method
    const url = typeof output === "string" ? output : (output as any).url()

    // Download the result
    const resultBuffer = await this.downloadFile(url)
    return resultBuffer
  }

  /**
   * Generate image from text prompt using Google's Gemini 2.5 Flash Image model
   * @param prompt - Text description of the image to generate
   * @param options - Optional generation parameters
   * @returns Generated image as Buffer
   */
  async generateImage(
    prompt: string,
    options?: {
      aspectRatio?: string
      outputFormat?: string
    }
  ): Promise<Buffer> {
    const output = await this.client.run("google/nano-banana", {
      input: {
        prompt,
        aspect_ratio: options?.aspectRatio || "1:1",
        output_format: options?.outputFormat || "png",
      },
    })

    // In Replicate SDK v1.0+, output is a FileOutput object with url() method
    const url = typeof output === "string" ? output : (output as any).url()

    // Download the result
    const resultBuffer = await this.downloadFile(url)
    return resultBuffer
  }

  /**
   * Generate video from text prompt using ByteDance's Seedance 1 Pro Fast model
   * @param prompt - Text description of the video to generate
   * @param options - Optional generation parameters
   * @returns Generated video as Buffer
   */
  async generateVideo(
    prompt: string,
    options?: {
      aspectRatio?: string
      duration?: number
      resolution?: string
      fps?: number
    }
  ): Promise<Buffer> {
    const output = await this.client.run("bytedance/seedance-1-pro-fast", {
      input: {
        prompt,
        aspect_ratio: options?.aspectRatio || "16:9",
        duration: options?.duration || 5,
        resolution: options?.resolution || "720p",
        fps: options?.fps || 24,
        camera_fixed: false,
      },
    })

    // In Replicate SDK v1.0+, output is a FileOutput object with url() method
    const url = typeof output === "string" ? output : (output as any).url()

    // Download the result
    const resultBuffer = await this.downloadFile(url)
    return resultBuffer
  }

  /**
   * Generate image using ByteDance Seedream 4.0
   * Supports text-to-image and image-to-image with up to 4K resolution
   * @param params - Model-specific parameters matching Seedream4Params schema
   * @returns Generated image(s) as Buffer (first image if multiple)
   */
  async generateWithSeedream4(params: Record<string, any>): Promise<Buffer> {
    const output = await this.client.run("bytedance/seedream-4", {
      input: {
        prompt: params.prompt,
        size: params.size || "2K",
        aspect_ratio: params.aspect_ratio || "4:3",
        sequential_image_generation: params.sequential_image_generation || "disabled",
        max_images: params.max_images || 1,
        enhance_prompt: params.enhance_prompt ?? false,
        ...(params.image_input && { image_input: params.image_input }),
        ...(params.width && { width: params.width }),
        ...(params.height && { height: params.height }),
      },
    })

    // Output can be a single URL or array of URLs
    const urls = Array.isArray(output) ? output : [output]
    const firstUrl = typeof urls[0] === "string" ? urls[0] : (urls[0] as any).url()

    // Download the first image
    const resultBuffer = await this.downloadFile(firstUrl)
    return resultBuffer
  }

  /**
   * Generate image using Google Nano Banana (Gemini 2.5 Flash Image)
   * Optimized for conversational editing and multi-image fusion
   * @param params - Model-specific parameters matching NanoBananaParams schema
   * @returns Generated image as Buffer
   */
  async generateWithNanoBanana(params: Record<string, any>): Promise<Buffer> {
    const input = {
      prompt: params.prompt,
      aspect_ratio: params.aspect_ratio || "1:1",
      output_format: params.output_format || "png",
      ...(params.image_input && { image_input: params.image_input }),
    }

    this.logger.info({ input }, "generateWithNanoBanana - sending to Replicate API")

    const output = await this.client.run("google/nano-banana", { input })

    // In Replicate SDK v1.0+, output is a FileOutput object with url() method
    const url = typeof output === "string" ? output : (output as any).url()

    // Download the result
    const resultBuffer = await this.downloadFile(url)
    return resultBuffer
  }

  /**
   * Generate image using FLUX 1.1 Pro
   * Faster, better FLUX Pro with excellent image quality and prompt adherence
   * @param params - Model-specific parameters matching Flux11ProParams schema
   * @returns Generated image as Buffer
   */
  async generateWithFlux11Pro(params: Record<string, any>): Promise<Buffer> {
    const output = await this.client.run("black-forest-labs/flux-1.1-pro", {
      input: {
        prompt: params.prompt,
        aspect_ratio: params.aspect_ratio || "1:1",
        output_format: params.output_format || "webp",
        output_quality: params.output_quality ?? 80,
        safety_tolerance: params.safety_tolerance ?? 2,
        prompt_upsampling: params.prompt_upsampling ?? false,
        ...(params.width && { width: params.width }),
        ...(params.height && { height: params.height }),
        ...(params.image_prompt && { image_prompt: params.image_prompt }),
        ...(params.seed !== undefined && { seed: params.seed }),
      },
    })

    // In Replicate SDK v1.0+, output is a FileOutput object with url() method
    const url = typeof output === "string" ? output : (output as any).url()

    // Download the result
    const resultBuffer = await this.downloadFile(url)
    return resultBuffer
  }
}
