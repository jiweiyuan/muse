import { FREE_MODELS_IDS } from "@/lib/config"
import { ModelConfig } from "@/lib/models/types"

/**
 * Utility function to filter and sort models based on search and visibility.
 * Free models appear first, followed by the rest in alphabetical order.
 */
export function filterAndSortModels(
  models: ModelConfig[],
  searchQuery: string,
  isModelHidden: (modelId: string) => boolean
): ModelConfig[] {
  return models
    .filter((model) => !isModelHidden(model.id))
    .filter((model) =>
      model.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aIsFree = FREE_MODELS_IDS.includes(a.id)
      const bIsFree = FREE_MODELS_IDS.includes(b.id)
      if (aIsFree !== bIsFree) {
        return aIsFree ? -1 : 1
      }

      return a.name.localeCompare(b.name)
    })
}
