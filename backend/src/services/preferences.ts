import { eq } from "drizzle-orm"
import { db } from "../infra/db/index.js"
import { userPreferences } from "../infra/db/schema.js"

const DEFAULT_PREFERENCES = {
  layout: "fullscreen",
  promptSuggestions: true,
  showToolInvocations: true,
  showConversationPreviews: true,
  hiddenModels: [] as string[],
}

export async function getUserPreferences(userId: string) {
  const [preferences] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1)

  if (!preferences) {
    return DEFAULT_PREFERENCES
  }

  return {
    layout: preferences.layout,
    promptSuggestions: preferences.promptSuggestions,
    showToolInvocations: preferences.showToolInvocations,
    showConversationPreviews: preferences.showConversationPreviews,
    hiddenModels: (preferences.hiddenModels as string[]) || [],
  }
}

export async function upsertUserPreferences(
  userId: string,
  payload: Partial<typeof DEFAULT_PREFERENCES>
) {
  const record = {
    ...DEFAULT_PREFERENCES,
    ...payload,
  }

  const [updated] = await db
    .insert(userPreferences)
    .values({
      userId,
      layout: record.layout,
      promptSuggestions: record.promptSuggestions,
      showToolInvocations: record.showToolInvocations,
      showConversationPreviews: record.showConversationPreviews,
      hiddenModels: record.hiddenModels,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: {
        layout: record.layout,
        promptSuggestions: record.promptSuggestions,
        showToolInvocations: record.showToolInvocations,
        showConversationPreviews: record.showConversationPreviews,
        hiddenModels: record.hiddenModels,
        updatedAt: new Date(),
      },
    })
    .returning()

  return {
    layout: updated.layout,
    promptSuggestions: updated.promptSuggestions,
    showToolInvocations: updated.showToolInvocations,
    showConversationPreviews: updated.showConversationPreviews,
    hiddenModels: (updated.hiddenModels as string[]) || [],
  }
}
