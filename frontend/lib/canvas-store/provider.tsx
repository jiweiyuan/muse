"use client"

import { create } from "zustand"
import type { Editor } from "tldraw"

export interface ReferenceImage {
  id: string // Unique identifier
  assetId: string // TLDraw asset ID
  src: string // Image URL
  width: number
  height: number
  title?: string // Optional title from meta
}

interface CanvasStore {
  canvasId: string | null
  setCanvasId: (id: string | null) => void

  editor: Editor | null
  setEditor: (editor: Editor | null) => void

  isReady: boolean
  setIsReady: (ready: boolean) => void

  chatVisible: boolean
  setChatVisible: (visible: boolean) => void
  toggleChatVisible: () => void

  imageGeneratorVisible: boolean
  setImageGeneratorVisible: (visible: boolean) => void
  toggleImageGeneratorVisible: () => void

  videoGeneratorVisible: boolean
  setVideoGeneratorVisible: (visible: boolean) => void
  toggleVideoGeneratorVisible: () => void

  audioGeneratorVisible: boolean
  setAudioGeneratorVisible: (visible: boolean) => void
  toggleAudioGeneratorVisible: () => void

  assetsDrawerVisible: boolean
  setAssetsDrawerVisible: (visible: boolean) => void
  toggleAssetsDrawerVisible: () => void

  // Reference images for image/video generators
  referenceImages: ReferenceImage[]
  addReferenceImage: (image: ReferenceImage) => void
  removeReferenceImage: (id: string) => void
  clearReferenceImages: () => void
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  canvasId: null,
  setCanvasId: (id) => set({ canvasId: id }),

  editor: null,
  setEditor: (editor) => set({ editor }),

  isReady: false,
  setIsReady: (ready) => set({ isReady: ready }),

  chatVisible: true,
  setChatVisible: (visible) => set({
    chatVisible: visible,
    // Close generators when opening chat
    ...(visible && { imageGeneratorVisible: false, videoGeneratorVisible: false, audioGeneratorVisible: false })
  }),
  toggleChatVisible: () => set((state) => ({
    chatVisible: !state.chatVisible,
    // Close generators when opening chat
    imageGeneratorVisible: !state.chatVisible ? false : state.imageGeneratorVisible,
    videoGeneratorVisible: !state.chatVisible ? false : state.videoGeneratorVisible,
    audioGeneratorVisible: !state.chatVisible ? false : state.audioGeneratorVisible
  })),

  imageGeneratorVisible: false,
  setImageGeneratorVisible: (visible) => set((state) => ({
    imageGeneratorVisible: visible,
    // Close chat and other generators when opening image generator
    ...(visible && { chatVisible: false }),
    ...(visible && { videoGeneratorVisible: false }),
    ...(visible && { audioGeneratorVisible: false })
  })),
  toggleImageGeneratorVisible: () => set((state) => ({
    imageGeneratorVisible: !state.imageGeneratorVisible,
    // Close chat and other generators when opening image generator
    ...(!state.imageGeneratorVisible && { chatVisible: false }),
    ...(!state.imageGeneratorVisible && { videoGeneratorVisible: false }),
    ...(!state.imageGeneratorVisible && { audioGeneratorVisible: false })
  })),

  videoGeneratorVisible: false,
  setVideoGeneratorVisible: (visible) => set((state) => ({
    videoGeneratorVisible: visible,
    // Close chat and other generators when opening video generator
    ...(visible && { chatVisible: false }),
    ...(visible && { imageGeneratorVisible: false }),
    ...(visible && { audioGeneratorVisible: false })
  })),
  toggleVideoGeneratorVisible: () => set((state) => ({
    videoGeneratorVisible: !state.videoGeneratorVisible,
    // Close chat and other generators when opening video generator
    ...(!state.videoGeneratorVisible && { chatVisible: false }),
    ...(!state.videoGeneratorVisible && { imageGeneratorVisible: false }),
    ...(!state.videoGeneratorVisible && { audioGeneratorVisible: false })
  })),

  audioGeneratorVisible: false,
  setAudioGeneratorVisible: (visible) => set((state) => ({
    audioGeneratorVisible: visible,
    // Close chat and other generators when opening audio generator
    ...(visible && { chatVisible: false }),
    ...(visible && { imageGeneratorVisible: false }),
    ...(visible && { videoGeneratorVisible: false })
  })),
  toggleAudioGeneratorVisible: () => set((state) => ({
    audioGeneratorVisible: !state.audioGeneratorVisible,
    // Close chat and other generators when opening audio generator
    ...(!state.audioGeneratorVisible && { chatVisible: false }),
    ...(!state.audioGeneratorVisible && { imageGeneratorVisible: false }),
    ...(!state.audioGeneratorVisible && { videoGeneratorVisible: false })
  })),

  assetsDrawerVisible: false,
  setAssetsDrawerVisible: (visible) => set({
    assetsDrawerVisible: visible
  }),
  toggleAssetsDrawerVisible: () => set((state) => ({
    assetsDrawerVisible: !state.assetsDrawerVisible
  })),

  // Reference images management
  referenceImages: [],
  addReferenceImage: (image) => set((state) => {
    // Check if image already exists (by assetId)
    const exists = state.referenceImages.some(img => img.assetId === image.assetId)
    if (exists) {
      return state // Don't add duplicates
    }
    return {
      referenceImages: [...state.referenceImages, image]
    }
  }),
  removeReferenceImage: (id) => set((state) => ({
    referenceImages: state.referenceImages.filter(img => img.id !== id)
  })),
  clearReferenceImages: () => set({
    referenceImages: []
  }),
}))
