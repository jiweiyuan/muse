import Replicate from "replicate"
import { env } from "../config/env.js"

/**
 * Replicate service for AI-powered image operations
 */

// Initialize Replicate client
function getReplicateClient(): Replicate {
  if (!env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN is not configured")
  }
  return new Replicate({
    auth: env.REPLICATE_API_TOKEN,
  })
}

/**
 * Download file from URL and return as Buffer
 */
async function downloadFile(url: string): Promise<Buffer> {
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
function bufferToDataUrl(
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
export async function upscaleImage(
  imageBuffer: Buffer,
  desiredIncrease: 2 | 4,
  contentType: string = "image/png"
): Promise<Buffer> {
  const replicate = getReplicateClient()

  // Convert buffer to data URL for Replicate
  const imageDataUrl = bufferToDataUrl(imageBuffer, contentType)

  const output = (await replicate.run("bria/increase-resolution", {
    input: {
      image: imageDataUrl,
      desired_increase: desiredIncrease,
      preserve_alpha: true,
      sync: true,
      content_moderation: false,
    },
  })) as unknown as string

  // Download the result
  const resultBuffer = await downloadFile(output)
  return resultBuffer
}

/**
 * Remove background from image using Bria's RMBG 2.0 model
 * @param imageBuffer - Input image as Buffer
 * @param contentType - MIME type of the image
 * @returns Image with background removed as Buffer
 */
export async function removeBackground(
  imageBuffer: Buffer,
  contentType: string = "image/png"
): Promise<Buffer> {
  const replicate = getReplicateClient()

  // Convert buffer to data URL for Replicate
  const imageDataUrl = bufferToDataUrl(imageBuffer, contentType)

  const output = (await replicate.run("bria/remove-background", {
    input: {
      image: imageDataUrl,
      preserve_partial_alpha: true,
      content_moderation: false,
    },
  })) as unknown as string

  // Download the result
  const resultBuffer = await downloadFile(output)
  return resultBuffer
}

/**
 * Generate image from text prompt using Google's Gemini 2.5 Flash Image model
 * @param prompt - Text description of the image to generate
 * @param options - Optional generation parameters
 * @returns Generated image as Buffer
 */
export async function generateImage(
  prompt: string,
  options?: {
    aspectRatio?: string
    outputFormat?: string
  }
): Promise<Buffer> {
  const replicate = getReplicateClient()

  const output = (await replicate.run("google/nano-banana", {
    input: {
      prompt,
      aspect_ratio: options?.aspectRatio || "1:1",
      output_format: options?.outputFormat || "png",
    },
  })) as unknown as string

  // Download the result
  const resultBuffer = await downloadFile(output)
  return resultBuffer
}
