import { create } from "zustand"

interface ChatData {
  id: string
  title: string
  canvasId: string | null
}

interface ProjectStore {
  activeProjectId: string | null
  activeChatId: string | null
  activeChatData: ChatData | null
  activeCanvasId: string | null
  activeTab: 'canvas' | 'assets' | 'editor'
  setActiveProjectId: (projectId: string | null) => void
  setActiveChatId: (chatId: string | null) => void
  setActiveChatData: (chatData: ChatData | null) => void
  setActiveCanvasId: (canvasId: string | null) => void
  setActiveTab: (tab: 'canvas' | 'assets' | 'editor') => void
  // Helper to set both at once when entering a project
  setActiveProject: (projectId: string | null, chatId?: string | null, chatData?: ChatData | null, canvasId?: string | null) => void
  // Update just the title of the active chat
  updateActiveChatTitle: (title: string) => void
  // Switch to a different chat (handles all transition logic)
  switchToChat: (chatData: ChatData) => void
  // Clear all active state when leaving
  clearActiveProject: () => void
}

export const useProjectStore = create<ProjectStore>((set) => ({
  activeProjectId: null,
  activeChatId: null,
  activeChatData: null,
  activeCanvasId: null,
  activeTab: 'canvas',
  setActiveProjectId: (projectId) => set({ activeProjectId: projectId }),
  setActiveChatId: (chatId) => set({ activeChatId: chatId }),
  setActiveChatData: (chatData) => set({ activeChatData: chatData }),
  setActiveCanvasId: (canvasId) => set({ activeCanvasId: canvasId }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveProject: (projectId, chatId = null, chatData = null, canvasId = null) =>
    set({ activeProjectId: projectId, activeChatId: chatId, activeChatData: chatData, activeCanvasId: canvasId }),
  updateActiveChatTitle: (title) => set((state) => ({
    activeChatData: state.activeChatData ? { ...state.activeChatData, title } : null
  })),
  switchToChat: (chatData) => set({
    activeChatId: chatData.id,
    activeChatData: chatData,
  }),
  clearActiveProject: () => set({
    activeProjectId: null,
    activeChatId: null,
    activeChatData: null,
    activeCanvasId: null,
    activeTab: 'canvas'
  }),
}))
