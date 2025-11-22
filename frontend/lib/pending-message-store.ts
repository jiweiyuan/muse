import { create } from "zustand"

interface PendingMessageState {
  input: string
  files: File[]
  model: string
  enableSearch: boolean
  setPendingMessage: (
    input: string,
    files: File[],
    model: string,
    enableSearch: boolean
  ) => void
  clearPendingMessage: () => void
  hasPendingMessage: () => boolean
}

export const usePendingMessageStore = create<PendingMessageState>((set, get) => ({
  input: "",
  files: [],
  model: "",
  enableSearch: false,

  setPendingMessage: (input, files, model, enableSearch) => {
    set({ input, files, model, enableSearch })
  },

  clearPendingMessage: () => {
    set({ input: "", files: [], model: "", enableSearch: false })
  },

  hasPendingMessage: () => {
    const state = get()
    return state.input.trim().length > 0 || state.files.length > 0
  },
}))
