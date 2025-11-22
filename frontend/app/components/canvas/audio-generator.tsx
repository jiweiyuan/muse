"use client"

import { useState, useRef, useEffect } from "react"
import { type TLShapeId } from "tldraw"
import { Sparkles, ChevronRight, Mic, Music, Zap } from "lucide-react"
import { useCanvasStore } from "@/lib/canvas-store/provider"
import { useProjectStore } from "@/lib/project-store"
import { motion, AnimatePresence } from "framer-motion"
import { createAudioPlaceholderShape } from "@/lib/canvas-utils"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CollapseChatIcon } from "@/components/icons/collapse-chat"
import { AudioModelSelectorModal } from "./audio-model-selector-modal"
import { AudioModelParamsForm } from "./audio-model-params-form"
import type { AudioModelId, AudioType } from "@muse/shared-schemas"
import { getAudioModelConfig } from "@/lib/audio-models.config"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

interface AudioGeneratorProps {
  visible: boolean
  onClose: () => void
}

/**
 * Audio Generator with Multi-Type Support
 * - Text-to-Speech (TTS)
 * - Music Generation
 * - Sound Effects (SFX)
 */
export const AudioGenerator = ({ visible, onClose }: AudioGeneratorProps) => {
  const { editor, canvasId } = useCanvasStore()
  const { activeProjectId } = useProjectStore()

  // UI State
  const [activeTab, setActiveTab] = useState<AudioType>("tts")
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Model & Parameters State for each type
  const [selectedModels, setSelectedModels] = useState<Record<AudioType, AudioModelId>>({
    tts: "elevenlabs/tts",
    music: "meta/musicgen",
    sfx: "meta/audiogen",
  })
  const [modelParams, setModelParams] = useState<Record<string, any>>({})
  const [prompt, setPrompt] = useState("")

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasAutoFocused = useRef(false)

  // Get current model config based on active tab
  const selectedModelId = selectedModels[activeTab]
  const currentModel = getAudioModelConfig(selectedModelId)

  // Auto-focus on mount
  useEffect(() => {
    if (visible && !hasAutoFocused.current && textareaRef.current) {
      textareaRef.current.focus()
      hasAutoFocused.current = true
    }
    if (!visible) {
      hasAutoFocused.current = false
    }
  }, [visible])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [prompt])

  // Reset params when model changes
  useEffect(() => {
    setModelParams(currentModel.defaultParams)
  }, [selectedModelId])

  /**
   * Get placeholder text based on audio type
   */
  const getPlaceholderText = (): string => {
    switch (activeTab) {
      case "tts":
        return "Enter text to convert to speech..."
      case "music":
        return "Describe the music you want to create..."
      case "sfx":
        return "Describe the sound effect you need..."
      default:
        return "Enter your prompt..."
    }
  }

  /**
   * Get max length based on audio type and model
   */
  const getMaxLength = (): number => {
    if (activeTab === "tts") {
      return selectedModelId === "elevenlabs/tts" ? 5000 : 4096
    }
    if (activeTab === "music") {
      return selectedModelId === "suno/v3.5" ? 2000 : 1000
    }
    return 500 // SFX
  }

  /**
   * Handle model selection for current tab
   */
  const handleSelectModel = (modelId: AudioModelId) => {
    setSelectedModels({
      ...selectedModels,
      [activeTab]: modelId,
    })
  }

  /**
   * Generate audio using selected model
   */
  const handleGenerate = async () => {
    if (!prompt.trim() || !canvasId || !editor || isGenerating) return

    const userPrompt = prompt.trim()
    setPrompt("") // Clear input immediately
    setIsGenerating(true)

    let placeholderShapeId: TLShapeId | null = null
    let storageAssetId: string | null = null

    try {
      // Create placeholder audio shape using shared utility
      const result = createAudioPlaceholderShape(editor, {
        prompt: userPrompt,
        modelId: selectedModelId,
        audioType: activeTab,
        operation: "generate-audio",
      })

      placeholderShapeId = result.shapeId
      storageAssetId = result.storageAssetId

      if (!activeProjectId) {
        throw new Error("No active project")
      }

      // Prepare model params based on audio type
      const finalParams: Record<string, any> = { ...modelParams }

      // Add the prompt/text field based on model type
      if (activeTab === "tts") {
        finalParams.text = userPrompt
      } else {
        finalParams.prompt = userPrompt
      }

      // Create task for audio generation
      const taskResponse = await fetch(`${BACKEND_URL}/v1/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          taskType: "generate_audio",
          projectId: activeProjectId,
          shapeId: placeholderShapeId,
          body: {
            modelId: selectedModelId,
            modelParams: finalParams,
            storageAssetId: storageAssetId,
          },
        }),
      })

      if (!taskResponse.ok) {
        const error = await taskResponse.json()
        throw new Error(error.error || "Failed to create audio generation task")
      }

      const { taskId } = await taskResponse.json()
      console.log(`[AudioGenerator] Task created: ${taskId}`)

      setIsGenerating(false)
    } catch (err) {
      console.error("Failed to generate audio:", err)

      if (placeholderShapeId) {
        editor.deleteShape(placeholderShapeId)
      }

      setIsGenerating(false)
      alert(err instanceof Error ? err.message : "Failed to generate audio")
    }
  }

  /**
   * Handle Enter key to generate
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  }

  /**
   * Get icon for current audio type
   */
  const getTabIcon = (audioType: AudioType) => {
    switch (audioType) {
      case "tts":
        return <Mic size={14} />
      case "music":
        return <Music size={14} />
      case "sfx":
        return <Zap size={14} />
    }
  }

  if (!visible) return null

  const maxLength = getMaxLength()

  return (
    <>
      <div className="absolute z-[100] pointer-events-none" style={{ top: '8px', left: '8px', bottom: '8px' }}>
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="pointer-events-auto w-[480px] h-full rounded-lg bg-background border border-border flex flex-col"
            style={{ willChange: "transform, opacity" }}
          >
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as AudioType)}
              className="flex flex-col h-full"
            >
              {/* Header with Tabs */}
              <div className="shrink-0 px-4 pt-3 pb-3 space-y-3">
                <div className="h-10 flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">Audio Generator</h2>
                  <button
                    onClick={onClose}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-transparent text-gray-900 dark:text-gray-100 hover:bg-accent hover:text-accent-foreground active:bg-accent/80"
                    aria-label="Collapse audio generator"
                  >
                    <CollapseChatIcon className="h-4 w-4" />
                  </button>
                </div>
                <TabsList className="grid w-full grid-cols-3 h-12 border border-border">
                  <TabsTrigger value="tts" className="text-xs">
                    <Mic size={12} className="mr-1" />
                    Speech
                  </TabsTrigger>
                  <TabsTrigger value="music" className="text-xs">
                    <Music size={12} className="mr-1" />
                    Music
                  </TabsTrigger>
                  <TabsTrigger value="sfx" className="text-xs">
                    <Zap size={12} className="mr-1" />
                    SFX
                  </TabsTrigger>
                </TabsList>
                {/* Model Selector Dropdown */}
                <AudioModelSelectorModal
                  open={showModelSelector}
                  onOpenChange={setShowModelSelector}
                  currentModelId={selectedModelId}
                  onSelectModel={handleSelectModel}
                  audioType={activeTab}
                  trigger={
                    <button
                      disabled={isGenerating}
                      className="w-full h-12 flex items-center gap-2 rounded-lg border border-border px-3 transition-all disabled:opacity-50 hover:bg-accent"
                    >
                      <div className="w-6 h-6 rounded bg-muted bg-cover bg-center shrink-0 flex items-center justify-center">
                        {getTabIcon(activeTab)}
                      </div>
                      <span className="text-sm font-medium flex-1 text-left">{currentModel.name}</span>
                      <ChevronRight size={14} className="opacity-60" />
                    </button>
                  }
                />
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 scrollbar-hide">
                <TabsContent value="tts" className="mt-0 space-y-3">
                  {/* Prompt Card */}
                  <div className="rounded-xl border border-border bg-card p-3">
                    <textarea
                      ref={textareaRef}
                      placeholder={getPlaceholderText()}
                      className="w-full bg-transparent resize-none focus:outline-none text-sm min-h-[120px] mb-2 leading-relaxed"
                      maxLength={maxLength}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={!editor || isGenerating}
                    />
                    <div className="flex items-center justify-end">
                      <span className="text-xs text-muted-foreground">
                        {prompt.length}/{maxLength}
                      </span>
                    </div>
                  </div>

                  {/* Model-Specific Parameters */}
                  <AudioModelParamsForm
                    modelId={selectedModelId}
                    audioType={activeTab}
                    params={modelParams}
                    onChange={setModelParams}
                    disabled={isGenerating}
                  />
                </TabsContent>

                <TabsContent value="music" className="mt-0 space-y-3">
                  {/* Prompt Card */}
                  <div className="rounded-xl border border-border bg-card p-3">
                    <textarea
                      ref={textareaRef}
                      placeholder={getPlaceholderText()}
                      className="w-full bg-transparent resize-none focus:outline-none text-sm min-h-[120px] mb-2 leading-relaxed"
                      maxLength={maxLength}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={!editor || isGenerating}
                    />
                    <div className="flex items-center justify-end">
                      <span className="text-xs text-muted-foreground">
                        {prompt.length}/{maxLength}
                      </span>
                    </div>
                  </div>

                  {/* Model-Specific Parameters */}
                  <AudioModelParamsForm
                    modelId={selectedModelId}
                    audioType={activeTab}
                    params={modelParams}
                    onChange={setModelParams}
                    disabled={isGenerating}
                  />
                </TabsContent>

                <TabsContent value="sfx" className="mt-0 space-y-3">
                  {/* Prompt Card */}
                  <div className="rounded-xl border border-border bg-card p-3">
                    <textarea
                      ref={textareaRef}
                      placeholder={getPlaceholderText()}
                      className="w-full bg-transparent resize-none focus:outline-none text-sm min-h-[120px] mb-2 leading-relaxed"
                      maxLength={maxLength}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={!editor || isGenerating}
                    />
                    <div className="flex items-center justify-end">
                      <span className="text-xs text-muted-foreground">
                        {prompt.length}/{maxLength}
                      </span>
                    </div>
                  </div>

                  {/* Model-Specific Parameters */}
                  <AudioModelParamsForm
                    modelId={selectedModelId}
                    audioType={activeTab}
                    params={modelParams}
                    onChange={setModelParams}
                    disabled={isGenerating}
                  />
                </TabsContent>
              </div>

              {/* Fixed Footer - Generate Button */}
              <div className="shrink-0 p-4 bg-background rounded-b-lg">
                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || !editor || isGenerating}
                  className="w-full font-semibold"
                  size="lg"
                >
                  <Sparkles size={16} className="mr-2" />
                  {isGenerating ? "Generating..." : "Generate"}
                </Button>
              </div>
            </Tabs>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  )
}
