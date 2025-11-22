import { Attachment } from "@ai-sdk/ui-utils"
import {
  UIMessage,
  convertToModelMessages,
  generateId,
  stepCountIs,
  streamText,
  tool,
} from "ai"
import { z } from "zod"
import { FastifyInstance } from "fastify"
import fastifyPlugin from "fastify-plugin"
import { createResumableStreamContext } from "resumable-stream/ioredis"
import { ZodError } from "zod"
import { createChatRequestSchema } from "@muse/shared-schemas"
import { SYSTEM_PROMPT_DEFAULT } from "../../config/constants.js"
import { openai, createOpenAI } from "@ai-sdk/openai"
import {
  getRedisPublisher,
  getRedisSubscriber,
} from "../../infra/redis/index.js"
import {
  resolveSessionUser,
  validateUserIdentity,
} from "../../services/identity.js"
import {
  getChatMessages,
  deleteChatMessages,
  logUserMessage,
  saveAssistantMessage,
} from "../../services/messages.js"
import { getEffectiveApiKey } from "../../services/userKeys.js"
import {
  createChat,
  getChat,
  updateChatTitle,
  deleteChat,
  updateChatStreamId,
  listProjectChats,
} from "../../services/chats.js"
import { generateChatTitle } from "../../services/title-generator.js"
import {
  generateMusicWithMiniMax,
  generateLyrics,
  fetchWebsiteContent,
  generateMVCover,
} from "../../services/music-generation/index.js"

/**
 * Validates that a chat belongs to a specific project
 */
async function validateChatBelongsToProject(
  chatId: string,
  projectId: string,
  userId: string
): Promise<boolean> {
  const chat = await getChat(chatId, userId)
  if (!chat || chat.projectId !== projectId) {
    return false
  }
  return true
}

/**
 * Routes for /v1/projects/:projectId/chats
 * All routes here are automatically prefixed with /:projectId/chats
 */
export const registerProjectChatRoutes = fastifyPlugin(
  async (app: FastifyInstance) => {
    /**
     * POST /v1/projects/:projectId/chats
     * Create a new chat within a project
     */
    app.post("/", async (request, reply) => {
      const { projectId } = request.params as { projectId: string }

      try {
        const body = request.body as { userId: string; title?: string }
        const validated = createChatRequestSchema.parse({
          ...body,
          projectId, // Ensure projectId from URL is used
        })

        await validateUserIdentity(request, { userId: validated.userId })

        const chat = await createChat({
          userId: validated.userId,
          projectId: projectId,
          ...(validated.title && { title: validated.title }),
        })

        return { chat }
      } catch (error) {
        if (error instanceof ZodError) {
          reply.status(400)
          return {
            error: "Validation failed",
            details: error.issues,
          }
        }
        throw error
      }
    })

    /**
     * GET /v1/projects/:projectId/chats
     * List all chats for a project
     */
    app.get("/", async (request, reply) => {
      const { projectId } = request.params as { projectId: string }
      const sessionUser = await resolveSessionUser(request)

      if (!sessionUser) {
        reply.status(401)
        return { error: "Unauthorized" }
      }

      const query = request.query as { userId?: string }
      const effectiveUserId = query.userId ?? sessionUser.id

      await validateUserIdentity(request, { userId: effectiveUserId })

      const chats = await listProjectChats(projectId, effectiveUserId)
      return { chats }
    })

    /**
     * GET /v1/projects/:projectId/chats/:chatId
     * Get a single chat (verify it belongs to project)
     */
    app.get("/:chatId", async (request, reply) => {
      const { projectId, chatId } = request.params as {
        projectId: string
        chatId: string
      }
      const sessionUser = await resolveSessionUser(request)

      if (!sessionUser) {
        reply.status(401)
        return { error: "Unauthorized" }
      }

      const query = request.query as { userId?: string }
      const effectiveUserId = query.userId ?? sessionUser.id

      await validateUserIdentity(request, { userId: effectiveUserId })

      const chat = await getChat(chatId, effectiveUserId)

      if (!chat) {
        reply.status(404)
        return { error: "Chat not found" }
      }

      // Verify chat belongs to this project
      if (chat.projectId !== projectId) {
        reply.status(403)
        return { error: "Chat does not belong to this project" }
      }

      return { chat }
    })

    /**
     * GET /v1/projects/:projectId/chats/:chatId/messages
     * Get messages for a chat (verify chat belongs to project)
     */
    app.get("/:chatId/messages", async (request, reply) => {
      const { projectId, chatId } = request.params as {
        projectId: string
        chatId: string
      }
      const sessionUser = await resolveSessionUser(request)

      if (!sessionUser) {
        reply.status(401)
        return { error: "Unauthorized" }
      }

      const query = request.query as { userId?: string }
      const effectiveUserId = query.userId ?? sessionUser.id

      await validateUserIdentity(request, { userId: effectiveUserId })

      // Verify chat belongs to project
      const isValid = await validateChatBelongsToProject(
        chatId,
        projectId,
        effectiveUserId
      )

      if (!isValid) {
        reply.status(404)
        return { error: "Chat not found or does not belong to this project" }
      }

      const messages = await getChatMessages(chatId)
      return { messages }
    })

    /**
     * GET /v1/projects/:projectId/chats/:chatId/stream
     * Resume existing stream for a chat
     */
    
    

    /**
     * POST /v1/projects/:projectId/chats/:chatId/stream
     * Start new stream for a chat
     */
    app.post("/:chatId/stream", async (request, reply) => {
      const { projectId, chatId } = request.params as {
        projectId: string
        chatId: string
      }

      try {
        const {
          messages,
          userId,
          model,
          message_group_id,
        } = request.body as {
          messages: UIMessage[]
          userId: string
          model: string
          message_group_id?: string
        }

        if (!messages || !Array.isArray(messages) || !userId || !model) {
          app.log.error(
            { messages: !!messages, userId, model },
            "[STREAM] Missing required fields"
          )
          reply.status(400)
          return { error: "Missing required fields" }
        }

        await validateUserIdentity(request, { userId })

        // Verify chat belongs to project
        const isValid = await validateChatBelongsToProject(
          chatId,
          projectId,
          userId
        )

        if (!isValid) {
          reply.status(404)
          return { error: "Chat not found or does not belong to this project" }
        }

        const userMessage = messages[messages.length - 1]
        const attachments =
          (
            userMessage as unknown as {
              experimental_attachments?: Attachment[]
            }
          )?.experimental_attachments || []

        if (userMessage?.role === "user") {
          const textParts = userMessage.parts.filter(
            (part) => part.type === "text"
          )
          const content = textParts.map((part) => part.text).join("")

          if (content) {
            await logUserMessage({
              userId,
              chatId,
              content,
              parts: userMessage.parts,
              attachments,
              messageGroupId: message_group_id,
            })
          }
        }

        const apiKey = await getEffectiveApiKey(userId, "openai")

        // Use openai.chat() directly for GPT-5
        const aiModel = apiKey
          ? createOpenAI({ apiKey }).chat("gpt-5")
          : openai.chat("gpt-5")

        // Clear any previous active stream before starting new one
        await updateChatStreamId(chatId, null)

        const result = streamText({
          model: aiModel,
          system: SYSTEM_PROMPT_DEFAULT,
          messages: convertToModelMessages(messages),
          stopWhen: stepCountIs(6), // Allow up to 5 consecutive tool call steps (e.g., writeLyrics → generateMusic)
          tools: {
            fetchWebsiteContent: tool({
              description:
                "Fetch and extract clean, structured content from a website URL. Use this when the user provides a URL to create music about a product, news article, or discussion.",
              inputSchema: z.object({
                url: z
                  .string()
                  .url()
                  .describe(
                    "The URL to fetch content from (must start with http:// or https://)"
                  ),
                extractType: z
                  .enum(["summary", "full"])
                  .optional()
                  .default("summary")
                  .describe(
                    'Type of extraction: "summary" for key points, "full" for complete content'
                  ),
              }),
              execute: async ({ url, extractType }) => {
                try {
                  const result = await fetchWebsiteContent({ url, extractType })
                  return {
                    title: result.title,
                    content: result.content,
                    description: result.description,
                    url: result.url,
                    sourceType: result.sourceType,
                    publicationDate: result.publicationDate,
                    summary: result.summary,
                    metadata: result.metadata,
                  }
                } catch (error) {
                  console.error("Error in fetchWebsiteContent tool:", error)
                  throw error
                }
              },
            }),
            writeLyrics: tool({
              description:
                "Write song lyrics based on a theme, genre, or description. This should be called first before generating music. IMPORTANT: Write concise lyrics suitable for 1-2 minute songs (approximately 8-16 lines total with compact verse-chorus structure).",
              inputSchema: z.object({
                theme: z
                  .string()
                  .describe(
                    "The theme or topic of the song (e.g., summer, love, adventure)"
                  ),
                genre: z
                  .string()
                  .describe("The music genre (e.g., pop, rock, jazz, hip-hop)"),
                mood: z
                  .string()
                  .describe(
                    "The mood or emotion (e.g., happy, sad, energetic, calm)"
                  ),
                structure: z
                  .string()
                  .optional()
                  .describe('Song structure like "verse-chorus-verse" (optional)'),
              }),
              execute: async ({ theme, genre, mood, structure }) => {
                try {
                  const result = await generateLyrics({
                    theme,
                    genre,
                    mood,
                    structure,
                  })
                  return {
                    lyrics: result.lyrics,
                    metadata: result.metadata,
                  }
                } catch (error) {
                  console.error("Error in writeLyrics tool:", error)
                  throw error
                }
              },
            }),
            generateMusic: tool({
              description:
                "Generate music from lyrics using MiniMax Music 2.0. This should be called after lyrics have been written.",
              inputSchema: z.object({
                lyrics: z
                  .string()
                  .min(10)
                  .max(3000)
                  .describe(
                    "The song lyrics to generate music for. Use \\n to separate lines. May include structure tags like [Intro], [Verse], [Chorus], [Bridge], [Outro]."
                  ),
                genre: z
                  .string()
                  .describe(
                    'The music genre and style description (e.g., "Indie folk, melancholic, introspective")'
                  ),
                mood: z
                  .string()
                  .optional()
                  .describe("Additional mood or scenario descriptors"),
              }),
              execute: async ({ lyrics, genre, mood }) => {
                try {
                  const result = await generateMusicWithMiniMax({
                    lyrics,
                    genre,
                    mood,
                  })
                  return {
                    audioUrl: result.audioUrl,
                    format: result.format,
                    metadata: result.metadata,
                    description: result.description,
                  }
                } catch (error) {
                  console.error("Error in generateMusic tool:", error)
                  throw error
                }
              },
            }),
            generateMVCover: tool({
              description:
                "Generate a cover image for the music video based on the lyrics, genre, and mood. Call this after generating music to create a visual representation.",
              inputSchema: z.object({
                prompt: z
                  .string()
                  .describe(
                    "A detailed visual description for the cover image. Should be based on the song's theme, mood, and genre. Be creative and vivid."
                  ),
                aspectRatio: z
                  .enum(["1:1", "16:9", "3:2", "4:3", "9:16"])
                  .optional()
                  .default("1:1")
                  .describe("The aspect ratio of the cover image"),
                resolution: z
                  .enum(["1K", "2K", "4K"])
                  .optional()
                  .default("2K")
                  .describe("The resolution of the generated image"),
              }),
              execute: async ({ prompt, aspectRatio, resolution }) => {
                try {
                  const result = await generateMVCover({
                    prompt,
                    aspectRatio,
                    resolution,
                  })
                  return {
                    imageUrl: result.imageUrl,
                    width: result.width,
                    height: result.height,
                    description: result.description,
                  }
                } catch (error) {
                  console.error("Error in generateMVCover tool:", error)
                  throw error
                }
              },
            }),
          },
          onFinish: async ({ response }) => {
            await saveAssistantMessage({
              chatId,
              messages:
                response.messages as unknown as import("../../types/messages.js").MessagePayload[],
              messageGroupId: message_group_id,
              model,
            })
            await updateChatStreamId(chatId, null)
          },
          onError: async (err) => {
            app.log.error({ err, chatId }, "[STREAM] Streaming error occurred")
            await updateChatStreamId(chatId, null)
          },
        })

        app.log.info(
          "[STREAM] Setting response headers for AI SDK data stream"
        )
        reply.header("X-Vercel-AI-Data-Stream", "v1")
        reply.header("Content-Type", "text/plain; charset=utf-8")

        const uiStreamResponse = result.toUIMessageStreamResponse({
          async consumeSseStream({ stream }) {
            const streamId = generateId()
            app.log.info(
              { streamId, chatId },
              "[STREAM] Creating resumable stream"
            )

            try {
              const publisher = getRedisPublisher()
              const subscriber = getRedisSubscriber()

              const streamContext = createResumableStreamContext({
                waitUntil: null,
                subscriber,
                publisher,
              })

              await streamContext.createNewResumableStream(
                streamId,
                () => stream
              )
              await updateChatStreamId(chatId, streamId)
              app.log.info(
                { streamId, chatId },
                "[STREAM] Resumable stream created and tracked"
              )
            } catch (error) {
              app.log.error(
                { error, streamId, chatId },
                "[STREAM] Failed to create resumable stream"
              )
            }
          },
        })

        return reply.send(uiStreamResponse)
      } catch (error) {
        app.log.error(
          { error },
          "[STREAM] FATAL ERROR: Unhandled exception in stream endpoint"
        )
        reply.status(500)
        return { error: "Internal server error" }
      }
    })

    /**
     * POST /v1/projects/:projectId/chats/:chatId/generate-title
     * Generate title for a chat
     */
    app.post("/:chatId/generate-title", async (request, reply) => {
      const { projectId, chatId } = request.params as {
        projectId: string
        chatId: string
      }
      const { userId, message } = request.body as {
        userId: string
        message: string
      }

      if (!userId || !message) {
        reply.status(400)
        return { error: "Missing userId or message" }
      }

      await validateUserIdentity(request, { userId })

      try {
        // Verify chat belongs to project
        const isValid = await validateChatBelongsToProject(
          chatId,
          projectId,
          userId
        )

        if (!isValid) {
          reply.status(404)
          return { error: "Chat not found or does not belong to this project" }
        }

        const chat = await getChat(chatId, userId)
        if (!chat) {
          reply.status(404)
          return { error: "Chat not found" }
        }

        const apiKey = await getEffectiveApiKey(userId, "openai")
        const generatedTitle = await generateChatTitle(
          message,
          apiKey || undefined
        )

        await updateChatTitle(chatId, generatedTitle, userId)

        return { title: generatedTitle }
      } catch (error) {
        app.log.error(
          { error },
          "[GENERATE-TITLE] Failed to generate chat title"
        )
        reply.status(500)
        return { error: "Failed to generate chat title" }
      }
    })

    /**
     * PATCH /v1/projects/:projectId/chats/:chatId
     * Update chat (title, etc.)
     */
    app.patch("/:chatId", async (request, reply) => {
      const { projectId, chatId } = request.params as {
        projectId: string
        chatId: string
      }
      const { userId, title } = request.body as {
        userId?: string
        title?: string
      }

      if (!title) {
        reply.status(400)
        return { error: "Missing title" }
      }

      const sessionUser = await resolveSessionUser(request)
      if (!sessionUser) {
        reply.status(401)
        return { error: "Unauthorized" }
      }

      const effectiveUserId = userId ?? sessionUser.id

      await validateUserIdentity(request, { userId: effectiveUserId })

      // Verify chat belongs to project
      const isValid = await validateChatBelongsToProject(
        chatId,
        projectId,
        effectiveUserId
      )

      if (!isValid) {
        reply.status(404)
        return { error: "Chat not found or does not belong to this project" }
      }

      const chat = await updateChatTitle(chatId, title, effectiveUserId)

      if (!chat) {
        reply.status(404)
        return { error: "Chat not found" }
      }

      return { chat }
    })

    /**
     * DELETE /v1/projects/:projectId/chats/:chatId
     * Delete chat and messages (verify it belongs to project)
     */
    app.delete("/:chatId", async (request, reply) => {
      const { projectId, chatId } = request.params as {
        projectId: string
        chatId: string
      }
      const { userId } = request.body as { userId?: string }

      const sessionUser = await resolveSessionUser(request)
      if (!sessionUser) {
        reply.status(401)
        return { error: "Unauthorized" }
      }

      const effectiveUserId = userId ?? sessionUser.id

      await validateUserIdentity(request, { userId: effectiveUserId })

      // Verify chat belongs to project
      const isValid = await validateChatBelongsToProject(
        chatId,
        projectId,
        effectiveUserId
      )

      if (!isValid) {
        reply.status(404)
        return { error: "Chat not found or does not belong to this project" }
      }

      // Delete messages first
      await deleteChatMessages(chatId)

      // Then delete the chat
      const deletedChat = await deleteChat(chatId, effectiveUserId)

      if (!deletedChat) {
        reply.status(404)
        return { error: "Chat not found" }
      }

      return { success: true }
    })
  },
  { encapsulate: true }
)
