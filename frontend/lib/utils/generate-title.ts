import { generateChatTitle } from "@/lib/api"
import { useProjectStore } from "@/lib/project-store"

/**
 * Generates and updates chat title using AI
 * Should be called after sending the first message in a chat
 *
 * @param projectId - The project ID the chat belongs to
 * @param chatId - The chat ID to update
 * @param userId - The user ID who owns the chat
 * @param message - The first message content to generate title from
 * @param updateTitleFn - Function to update the title in the store
 * @param isStillActiveFn - Optional function to check if this chat is still active before updating
 */
export async function generateAndUpdateChatTitle(
  projectId: string,
  chatId: string,
  userId: string,
  message: string,
  updateTitleFn?: (projectId: string, chatId: string, title: string) => void | Promise<void>,
  isStillActiveFn?: (chatId: string) => boolean
): Promise<void> {
  try {
    const generatedTitle = await generateChatTitle(projectId, chatId, userId, message)

    // Only update if the chat is still active (prevents race condition)
    if (isStillActiveFn && !isStillActiveFn(chatId)) {
      console.log(`Skipping title update for chat ${chatId} - no longer active`)
      return
    }

    // Update Zustand store immediately for UI responsiveness
    const { activeChatId, updateActiveChatTitle } = useProjectStore.getState()
    if (activeChatId === chatId) {
      updateActiveChatTitle(generatedTitle)
    }

    if (updateTitleFn) {
      await updateTitleFn(projectId, chatId, generatedTitle)
    }
  } catch (error) {
    console.error("Failed to generate chat title:", error)
    // Don't throw - title generation is a nice-to-have feature
  }
}
