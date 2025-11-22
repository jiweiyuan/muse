import { useEffect, useRef } from "react"
import type { UIMessage } from "@ai-sdk/react"
import type { Editor, TLShapeId } from "tldraw"
import {
  createAudioPlaceholderShape,
  linkAudioUrlToShape,
} from "@/lib/canvas-utils"

// Tool parts in AI SDK 5.0 have types like "tool-{toolName}" or "dynamic-tool"
type ToolPart = Extract<
  NonNullable<UIMessage["parts"]>[number],
  { type: `tool-${string}` } | { type: "dynamic-tool" }
>

interface UseToolShapeCreatorProps {
  messages: UIMessage[]
  editor: Editor | null
  canvasId?: string
  projectId?: string
  enabled?: boolean
}

/**
 * Hook to automatically create canvas shapes when AI tools are invoked
 * Currently supports:
 * - generateMusic: Creates audio placeholder shape when tool is called
 */
export function useToolShapeCreator({
  messages,
  editor,
  canvasId,
  projectId,
  enabled = true,
}: UseToolShapeCreatorProps) {
  // Track which tool calls we've already processed
  const processedToolCallsRef = useRef<Set<string>>(new Set())

  // Track mapping of toolCallId to shapeId
  const toolCallToShapeMapRef = useRef<Map<string, TLShapeId>>(new Map())

  useEffect(() => {
    if (!enabled || !editor || !canvasId) {
      return
    }

    // Get all tool invocations from messages
    const toolInvocations = messages.flatMap((message) => {
      if (message.role !== "assistant" || !message.parts) {
        return []
      }

      return message.parts.filter(
        (part): part is ToolPart =>
          part.type.startsWith("tool-") || part.type === "dynamic-tool"
      )
    })

    // Process each tool invocation
    for (const tool of toolInvocations) {
      const toolCallId = tool.toolCallId
      const toolName =
        tool.type === "dynamic-tool"
          ? tool.toolName
          : tool.type.replace(/^tool-/, "")

      // Only process generateMusic tool
      if (toolName !== "generateMusic") {
        continue
      }

      // Check if this is a new tool call that we should process
      const isNewToolCall = !processedToolCallsRef.current.has(toolCallId)
      const isInputAvailable = tool.state === "input-available" || tool.state === "input-streaming"
      const isOutputAvailable = tool.state === "output-available"

      // Create placeholder shape when tool input is available
      if (isNewToolCall && isInputAvailable) {
        console.log(`[useToolShapeCreator] Creating placeholder for generateMusic (${toolCallId})`)

        try {
          // Extract tool input for metadata
          const toolInput = "input" in tool ? tool.input : undefined
          const lyrics = toolInput && typeof toolInput === "object" && "lyrics" in toolInput
            ? String(toolInput.lyrics)
            : undefined
          const genre = toolInput && typeof toolInput === "object" && "genre" in toolInput
            ? String(toolInput.genre)
            : undefined

          // Create placeholder audio shape
          const { shapeId } = createAudioPlaceholderShape(editor, {
            prompt: lyrics ? lyrics.substring(0, 100) + "..." : "Generating music...",
            modelId: "minimax/music-v2",
            audioType: "music",
            operation: "generate-music",
            toolCallId,
            genre,
          })

          // Store the mapping
          toolCallToShapeMapRef.current.set(toolCallId, shapeId)
          processedToolCallsRef.current.add(toolCallId)

          console.log(`[useToolShapeCreator] Created shape ${shapeId} for tool ${toolCallId}`)
        } catch (error) {
          console.error("[useToolShapeCreator] Failed to create placeholder shape:", error)
        }
      }

      // Link audio URL when tool output is available
      if (isOutputAvailable && toolCallToShapeMapRef.current.has(toolCallId)) {
        const shapeId = toolCallToShapeMapRef.current.get(toolCallId)!

        console.log(`[useToolShapeCreator] Linking audio to shape ${shapeId} for tool ${toolCallId}`)

        try {
          // Extract audio URL from tool output
          const output = "output" in tool ? tool.output : undefined

          let audioUrl: string | undefined

          // Handle different output formats
          if (typeof output === "string") {
            audioUrl = output
          } else if (output && typeof output === "object") {
            // Check for audioUrl in the output object
            if ("audioUrl" in output && typeof output.audioUrl === "string") {
              audioUrl = output.audioUrl
            }
            // Also check in content array format
            else if (
              "content" in output &&
              Array.isArray(output.content)
            ) {
              const textContent = output.content.find(
                (item: { type: string; text?: string }) => item.type === "text"
              )
              if (textContent?.text) {
                try {
                  const parsed = JSON.parse(textContent.text)
                  if (parsed.audioUrl) {
                    audioUrl = parsed.audioUrl
                  }
                } catch {
                  // Not JSON, use as-is
                  audioUrl = textContent.text
                }
              }
            }
          }

          if (audioUrl) {
            // Link the audio URL to the shape (async operation)
            linkAudioUrlToShape(editor, shapeId, audioUrl).catch((error) => {
              console.error("[useToolShapeCreator] Failed to link audio URL:", error)
            })

            console.log(`[useToolShapeCreator] Linked audio URL ${audioUrl} to shape ${shapeId}`)
          } else {
            console.warn("[useToolShapeCreator] No audio URL found in tool output")
          }
        } catch (error) {
          console.error("[useToolShapeCreator] Failed to link audio URL:", error)
        }
      }
    }
  }, [messages, editor, canvasId, projectId, enabled])

  return {
    // Return utility functions if needed in the future
    processedToolCalls: processedToolCallsRef.current.size,
  }
}
