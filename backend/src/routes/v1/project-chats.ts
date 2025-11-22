import { Attachment } from "@ai-sdk/ui-utils"
import {
  UIMessage,
  convertToModelMessages,
  generateId,
  streamText,
  UI_MESSAGE_STREAM_HEADERS,
} from "ai"
import { FastifyInstance } from "fastify"
import fastifyPlugin from "fastify-plugin"
import { createResumableStreamContext } from "resumable-stream/ioredis"
import { ZodError } from "zod"
import { createChatRequestSchema } from "@muse/shared-schemas"
import { SYSTEM_PROMPT_DEFAULT } from "../../config/constants.js"
import { getAllModels } from "../../domain/models/index.js"
import { getProviderForModel } from "../../domain/openproviders/provider-map.js"
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
    app.get("/:chatId/stream", async (request, reply) => {
      const { projectId, chatId } = request.params as {
        projectId: string
        chatId: string
      }
      const sessionUser = await resolveSessionUser(request)

      if (!sessionUser) {
        reply.status(401)
        return { error: "Unauthorized" }
      }

      // Verify chat belongs to project
      const isValid = await validateChatBelongsToProject(
        chatId,
        projectId,
        sessionUser.id
      )

      if (!isValid) {
        reply.status(404)
        return { error: "Chat not found or does not belong to this project" }
      }

      const chat = await getChat(chatId, sessionUser.id)
      if (!chat) {
        reply.status(404)
        return { error: "Chat not found" }
      }

      // Check if there's an active stream
      if (!chat.activeStreamId) {
        app.log.info(
          { chatId },
          "[STREAM RESUME] No active stream found, returning 204"
        )
        return reply.status(204).send()
      }

      app.log.info(
        { chatId, streamId: chat.activeStreamId },
        "[STREAM RESUME] Resuming existing stream"
      )

      try {
        const publisher = getRedisPublisher()
        const subscriber = getRedisSubscriber()

        const streamContext = createResumableStreamContext({
          waitUntil: null,
          subscriber,
          publisher,
        })

        const resumedStream = await streamContext.resumeExistingStream(
          chat.activeStreamId
        )

        Object.entries(UI_MESSAGE_STREAM_HEADERS).forEach(([key, value]) => {
          reply.header(key, value)
        })

        return reply.send(resumedStream)
      } catch (error) {
        app.log.error(
          { error, chatId, streamId: chat.activeStreamId },
          "[STREAM RESUME] Failed to resume stream"
        )
        await updateChatStreamId(chatId, null)
        return reply.status(204).send()
      }
    })

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
          enableSearch,
          message_group_id,
        } = request.body as {
          messages: UIMessage[]
          userId: string
          model: string
          enableSearch?: boolean
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

        const allModels = await getAllModels()
        const modelConfig = allModels.find((m) => m.id === model)

        if (!modelConfig || !modelConfig.apiSdk) {
          reply.status(404)
          return { error: `Model ${model} not found` }
        }

        const provider = getProviderForModel(
          model as import("../../domain/openproviders/types.js").SupportedModel
        )
        const apiKey = await getEffectiveApiKey(userId, provider)

        // Clear any previous active stream before starting new one
        await updateChatStreamId(chatId, null)

        const result = streamText({
          model: modelConfig.apiSdk(apiKey || undefined, { enableSearch }),
          system: SYSTEM_PROMPT_DEFAULT,
          messages: convertToModelMessages(messages),
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
