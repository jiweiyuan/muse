// Simplified: Always use GPT-5
import { MODEL_DEFAULT } from "@/lib/config"

export function useModel() {
  return {
    selectedModel: MODEL_DEFAULT,
    handleModelChange: () => {}, // No-op: model is fixed
  }
}
