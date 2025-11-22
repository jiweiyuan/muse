export type LayoutType = "sidebar" | "fullscreen"

export type UserPreferences = {
  layout: LayoutType
  promptSuggestions: boolean
  showToolInvocations: boolean
  showConversationPreviews: boolean
  hiddenModels: string[]
}

export const defaultPreferences: UserPreferences = {
  layout: "fullscreen",
  promptSuggestions: true,
  showToolInvocations: true,
  showConversationPreviews: true,
  hiddenModels: [],
}

export type UserPreferencesApi = {
  layout?: LayoutType
  prompt_suggestions?: boolean
  show_tool_invocations?: boolean
  show_conversation_previews?: boolean
  hidden_models?: string[]
}

// Helper functions to convert between API format (snake_case) and frontend format (camelCase)
export function convertFromApiFormat(
  apiData: UserPreferencesApi | null | undefined
): UserPreferences {
  return {
    layout: apiData?.layout || "fullscreen",
    promptSuggestions: apiData?.prompt_suggestions ?? true,
    showToolInvocations: apiData?.show_tool_invocations ?? true,
    showConversationPreviews: apiData?.show_conversation_previews ?? true,
    hiddenModels: apiData?.hidden_models || [],
  }
}

export function convertToApiFormat(
  preferences: Partial<UserPreferences>
): UserPreferencesApi {
  const apiData: UserPreferencesApi = {}
  if (preferences.layout !== undefined) apiData.layout = preferences.layout
  if (preferences.promptSuggestions !== undefined)
    apiData.prompt_suggestions = preferences.promptSuggestions
  if (preferences.showToolInvocations !== undefined)
    apiData.show_tool_invocations = preferences.showToolInvocations
  if (preferences.showConversationPreviews !== undefined)
    apiData.show_conversation_previews = preferences.showConversationPreviews
  if (preferences.hiddenModels !== undefined)
    apiData.hidden_models = preferences.hiddenModels
  return apiData
}
