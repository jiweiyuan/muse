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
 * Generate MV cover image using fal-ai/nano-banana-pro
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

    console.log("[Cover Generation] Generating cover with prompt:", params.prompt)

    const result = await fal.subscribe("fal-ai/nano-banana-pro", {
      input: {
        prompt: params.prompt,
        num_images: 1,
        aspect_ratio: params.aspectRatio || "1:1",
        output_format: "png",
        resolution: params.resolution || "2K",
      },
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
        width: number
        height: number
      }>
      description: string
    }

    if (!output.images || output.images.length === 0) {
      throw new Error("No image generated")
    }

    const image = output.images[0]

    console.log("[Cover Generation] Successfully generated cover:", image.url)

    return {
      imageUrl: image.url,
      width: image.width,
      height: image.height,
      description: output.description || "",
    }
  } catch (error) {
    console.error("[Cover Generation] Error generating cover:", error)
    throw new Error(
      `Failed to generate MV cover: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}
