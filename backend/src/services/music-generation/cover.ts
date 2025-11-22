import { fal } from "@fal-ai/client"
import { env } from "../../config/env.js"

export interface CoverGenerationParams {
  prompt: string
  aspectRatio?: "1:1" | "16:9" | "3:2" | "4:3" | "9:16"
  resolution?: "1K" | "2K" | "4K"
}

export interface CoverGenerationResult {
  imageUrl: string
  width: number
  height: number
  description: string
}

/**
 * Map aspect ratio and resolution to image size for Seedream 4
 */
function getImageSize(aspectRatio: string, resolution: string): { width: number; height: number } {
  // Seedream 4 supports predefined sizes or custom dimensions (1024-4096)
  const ratioMap: Record<string, string> = {
    "1:1": "square_hd",
    "16:9": "landscape_16_9",
    "4:3": "landscape_4_3",
    "3:2": "landscape_4_3",
    "9:16": "portrait_16_9",
  }

  const presetSize = ratioMap[aspectRatio]
  if (presetSize) {
    return presetSize as any
  }

  // Fallback to custom dimensions based on resolution
  const baseSize = resolution === "4K" ? 3840 : resolution === "2K" ? 2560 : 1920

  if (aspectRatio === "1:1") {
    return { width: baseSize, height: baseSize }
  } else if (aspectRatio === "16:9") {
    return { width: baseSize, height: Math.round(baseSize * 9 / 16) }
  } else if (aspectRatio === "4:3") {
    return { width: baseSize, height: Math.round(baseSize * 3 / 4) }
  } else if (aspectRatio === "9:16") {
    return { width: Math.round(baseSize * 9 / 16), height: baseSize }
  }

  return { width: 2048, height: 2048 }
}

/**
 * Generate MV cover image using fal-ai/bytedance/seedream/v4 (faster model)
 */
export async function generateMVCover(
  params: CoverGenerationParams
): Promise<CoverGenerationResult> {
  try {
    // Configure fal client with API key
    if (env.FAL_KEY) {
      fal.config({
        credentials: env.FAL_KEY,
      })
    }

    console.log("[Cover Generation] Generating cover with Seedream 4, prompt:", params.prompt)

    // Get image size based on aspect ratio and resolution
    const imageSize = getImageSize(
      params.aspectRatio || "1:1",
      params.resolution || "2K"
    )

    const result = await fal.subscribe("fal-ai/bytedance/seedream/v4/text-to-image", {
      input: {
        prompt: params.prompt,
        image_size: imageSize,
        num_images: 1,
        enable_safety_checker: true,
      } as any, // Type assertion needed for latest API fields
      logs: true,
      onQueueUpdate: (update: any) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log: any) => log.message).forEach(console.log)
        }
      },
    })

    const output = result.data as {
      images: Array<{
        url: string
        width?: number
        height?: number
      }>
      seed: number
    }

    if (!output.images || output.images.length === 0) {
      throw new Error("No image generated")
    }

    const image = output.images[0]

    console.log("[Cover Generation] Successfully generated cover with Seedream 4:", image.url)

    // Calculate dimensions if not provided (fallback to image_size)
    const width = image.width || (typeof imageSize === 'object' ? imageSize.width : 2048)
    const height = image.height || (typeof imageSize === 'object' ? imageSize.height : 2048)

    return {
      imageUrl: image.url,
      width,
      height,
      description: params.prompt, // Use the prompt as description since Seedream doesn't return one
    }
  } catch (error) {
    console.error("[Cover Generation] Error generating cover:", error)
    throw new Error(
      `Failed to generate MV cover: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}
