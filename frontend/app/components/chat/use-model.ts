import { Chats } from "@/lib/chat-store/types"
import { MODEL_DEFAULT } from "@/lib/config"
import type { UserProfile } from "@/lib/user/types"
import { useCallback, useState } from "react"

interface UseModelProps {
  currentChat: Chats | null
  user: UserProfile | null
  chatId: string | null
}

/**
 * Hook to manage the current selected model with proper fallback logic
 * Handles model selection with local state only (no backend persistence)
 * @param currentChat - The current chat object
 * @param user - The current user object
 * @param chatId - The current chat ID
 * @returns Object containing selected model and handler function
 */
export function useModel({}: UseModelProps) {
  // Calculate the effective model with a simple fallback to the default
  const getEffectiveModel = useCallback(() => {
    return MODEL_DEFAULT
  }, [])

  // Use local state only for temporary overrides, derive base value from props
  const [localSelectedModel, setLocalSelectedModel] = useState<string | null>(
    null
  )

  // The actual selected model: local override or computed effective model
  const selectedModel = localSelectedModel || getEffectiveModel()

  // Function to handle model changes (local state only, no backend persistence)
  const handleModelChange = useCallback(
    async (newModel: string) => {
      // Update local state only - model changes are not persisted to backend
      setLocalSelectedModel(newModel)
    },
    []
  )

  return {
    selectedModel,
    handleModelChange,
  }
}
