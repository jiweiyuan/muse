import { fal } from "@fal-ai/client"
import { env } from "../../config/env.js"

export interface MusicGenerationParams {
  lyrics: string
  genre: string
  mood?: string
  audioSettings?: {
    sampleRate?: "8000" | "16000" | "22050" | "24000" | "32000" | "44100"
    bitrate?: "32000" | "64000" | "128000" | "256000"
    format?: "mp3" | "pcm" | "flac"
  }
}

export interface MusicGenerationResult {
  audioUrl: string
  format: string
  metadata: {
    genre: string
    mood?: string
    sampleRate: number
    bitrate: number
    generatedAt: string
    requestId: string
  }
  description: string
}

export async function generateMusicWithMiniMax(
  params: MusicGenerationParams
): Promise<MusicGenerationResult> {
  if (!env.FAL_KEY) {
    throw new Error("FAL_KEY environment variable is not set")
  }

  // Configure fal client
  fal.config({
    credentials: env.FAL_KEY,
  })

  // Construct the prompt
  const prompt = params.mood ? `${params.genre}, ${params.mood}` : params.genre

  console.log("Generating music with MiniMax v2:", {
    prompt,
    lyricsLength: params.lyrics.length,
  })

  // Call fal-ai/minimax-music/v2
  const result = await fal.subscribe("fal-ai/minimax-music/v2", {
    input: {
      prompt: prompt,
      lyrics_prompt: params.lyrics,
      audio_setting: {
        sample_rate: parseInt(params.audioSettings?.sampleRate || "44100"),
        bitrate: parseInt(params.audioSettings?.bitrate || "256000"),
        format: params.audioSettings?.format || "mp3",
      },
    },
    logs: true,
    onQueueUpdate: (update: any) => {
      if (update.status === "IN_PROGRESS") {
        update.logs?.map((log: any) => log.message).forEach(console.log)
      }
    },
  }) as any

  console.log("Music generation completed:", result.requestId)

  return {
    audioUrl: result.data.audio.url,
    format: params.audioSettings?.format || "mp3",
    metadata: {
      genre: params.genre,
      mood: params.mood,
      sampleRate: parseInt(params.audioSettings?.sampleRate || "44100"),
      bitrate: parseInt(params.audioSettings?.bitrate || "256000"),
      generatedAt: new Date().toISOString(),
      requestId: result.requestId,
    },
    description: `Generated ${params.genre} music from lyrics`,
  }
}

export async function checkMusicGenerationStatus(requestId: string) {
  if (!env.FAL_KEY) {
    throw new Error("FAL_KEY environment variable is not set")
  }

  fal.config({
    credentials: env.FAL_KEY,
  })

  const status = await fal.queue.status("fal-ai/minimax-music/v2", {
    requestId,
    logs: true,
  })

  return status
}

export async function getMusicGenerationResult(requestId: string) {
  if (!env.FAL_KEY) {
    throw new Error("FAL_KEY environment variable is not set")
  }

  fal.config({
    credentials: env.FAL_KEY,
  })

  const result = await fal.queue.result("fal-ai/minimax-music/v2", {
    requestId,
  })

  return result
}
