"use client"

import { useState, useRef, useEffect } from "react"
import { AssetRecordType, createShapeId, uniqueId, type TLShapeId } from "tldraw"
import { Sparkles, Video as VideoIcon, ChevronRight } from "lucide-react"
import { useCanvasStore } from "@/lib/canvas-store/provider"
import { useProjectStore } from "@/lib/project-store"
import { motion, AnimatePresence } from "framer-motion"
import { findNewAssetPosition, panAndZoomToImage } from "@/lib/canvas-utils"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CollapseChatIcon } from "@/components/icons/collapse-chat"
import { VideoModelSelectorModal } from "./video-model-selector-modal"
import type { VideoModelId } from "@muse/shared-schemas"
import { getVideoModelConfig } from "@/lib/video-models.config"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

interface VideoGeneratorProps {
  visible: boolean
  onClose: () => void
}

/**
 * Video Generator with Multi-Mode Support
 * - Supports both text-to-video and image-to-video workflows
 * - Matches image generator design and layout
 */
export const VideoGenerator = ({ visible, onClose }: VideoGeneratorProps) => {
  const { editor, canvasId } = useCanvasStore()
  const { activeProjectId } = useProjectStore()

  // UI State
  const [activeTab, setActiveTab] = useState<"text-to-video" | "image-to-video">("text-to-video")
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Model & Parameters State
  const [selectedModelId, setSelectedModelId] = useState<VideoModelId>("openai/sora-2")
  const [modelParams, setModelParams] = useState<Record<string, any>>({})
  const [prompt, setPrompt] = useState("")
  const [aspectRatio, setAspectRatio] = useState("16:9")
  const [duration, setDuration] = useState("8")

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasAutoFocused = useRef(false)

  // Get current model config
  const currentModel = getVideoModelConfig(selectedModelId)

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
    const defaultDuration = currentModel.defaultParams.duration || "5"
    const defaultAspectRatio = currentModel.defaultParams.aspect_ratio || "16:9"
    setDuration(defaultDuration)
    setAspectRatio(defaultAspectRatio)
    setModelParams(currentModel.defaultParams)
  }, [selectedModelId])

  /**
   * Get available durations for current model
   */
  const getAvailableDurations = () => {
    const modelId = selectedModelId
    if (modelId === "openai/sora-2") {
      return ["4", "8", "12"]
    } else if (modelId === "google/veo-3") {
      return ["4", "6", "8"]
    } else if (modelId === "kuaishou/kling-2.5") {
      return ["5", "10"]
    }
    return ["5", "10"] // Default
  }

  /**
   * Get available resolutions for current model
   */
  const getAvailableResolutions = () => {
    return currentModel.capabilities.supportedResolutions
  }

  /**
   * Calculate video dimensions based on aspect ratio
   * Uses a base width and calculates height accordingly
   */
  const calculateVideoDimensions = (aspectRatio: string) => {
    const baseWidth = 512 // Base width for generated videos (larger than images)
    const [widthRatio, heightRatio] = aspectRatio.split(":").map(Number)

    const width = baseWidth
    const height = Math.round((baseWidth * heightRatio) / widthRatio)

    return { width, height }
  }

  /**
   * Generate video using AI (Async Task Queue)
   */
  const handleGenerate = async () => {
    if (!prompt.trim() || !canvasId || !editor || isGenerating) return

    const userPrompt = prompt.trim()
    setPrompt("") // Clear input immediately
    setIsGenerating(true)

    // Variable to store the placeholder shape ID for cleanup
    let placeholderShapeId: TLShapeId | null = null

    try {
      // Calculate video dimensions based on selected aspect ratio
      const { width: videoWidth, height: videoHeight } = calculateVideoDimensions(aspectRatio)

      // Use smart grid layout: first video at top-left, subsequent videos stack at bottom
      const position = findNewAssetPosition(editor, videoWidth, videoHeight)

      // Generate storage ID using the same format as manual uploads
      // Format: {uniqueId}-ai-video-{timestamp}.mp4
      const storageAssetId = `${uniqueId()}-ai-video-${Date.now()}.mp4`

      // Create visible placeholder video at the found position
      placeholderShapeId = createShapeId()
      editor.createShape({
        id: placeholderShapeId,
        type: "video",
        x: position.x,
        y: position.y,
        props: {
          w: videoWidth,
          h: videoHeight,
          assetId: AssetRecordType.createId(), // Temporary - will be replaced
          playing: false,
          autoplay: false,
          time: 0,
        },
        opacity: 1, // Visible to show placeholder
        meta: {
          isProcessing: true,
          operation: "generate-video",
          startTime: Date.now(),
          prompt: userPrompt, // Store prompt for reference
          aspectRatio: aspectRatio,
          duration: duration,
        },
      })

      // Pan and zoom to show the video at 100% zoom
      panAndZoomToImage(editor, position.x, position.y, videoWidth, videoHeight)

      // Get project ID from the project store
      if (!activeProjectId) {
        throw new Error("No active project")
      }

      // Create async task for video generation with multi-model support
      const taskResponse = await fetch(`${BACKEND_URL}/v1/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          taskType: "generate_video",
          projectId: activeProjectId,
          shapeId: placeholderShapeId,
          body: {
            modelId: selectedModelId,
            modelParams: {
              prompt: userPrompt,
              aspect_ratio: aspectRatio,
              duration: duration,
              ...modelParams,
            },
            storageAssetId: storageAssetId, // Pass storage ID to backend
          },
        }),
      })

      if (!taskResponse.ok) {
        const error = await taskResponse.json()
        throw new Error(error.error || "Failed to create video generation task")
      }

      const { taskId } = await taskResponse.json()
      console.log(`[VideoGenerator] Task created: ${taskId}`)

      // Canvas will be automatically updated by the worker via room.updateStore()
      setIsGenerating(false)

      console.log(`[VideoGenerator] Video generation started for shape ${placeholderShapeId}`)
    } catch (err) {
      console.error("[VideoGenerator] Failed to generate video:", err)
      setIsGenerating(false)

      // Clean up placeholder shape on error
      if (placeholderShapeId) {
        try {
          editor.deleteShape(placeholderShapeId)
        } catch (deleteError) {
          console.error("[VideoGenerator] Failed to delete placeholder shape:", deleteError)
        }
      }

      // Show error to user
      alert(err instanceof Error ? err.message : "Failed to generate video. Please try again.")
    }
  }

  /**
   * Handle Enter key to generate (Shift+Enter for new line)
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  }

  if (!visible) return null

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
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
              className="flex flex-col h-full"
            >
              {/* Header with Tabs */}
              <div className="shrink-0 px-4 pt-3 pb-3 space-y-3">
                <div className="h-10 flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">Video Generator</h2>
                  <button
                    onClick={onClose}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-transparent text-gray-900 dark:text-gray-100 hover:bg-accent hover:text-accent-foreground active:bg-accent/80"
                    aria-label="Collapse video generator"
                  >
                    <CollapseChatIcon className="h-4 w-4" />
                  </button>
                </div>
                <TabsList className="grid w-full grid-cols-2 h-12 border border-border">
                  <TabsTrigger value="text-to-video">Text to Video</TabsTrigger>
                  <TabsTrigger value="image-to-video">Image to Video</TabsTrigger>
                </TabsList>
                {/* Model Selector Dropdown */}
                <VideoModelSelectorModal
                  open={showModelSelector}
                  onOpenChange={setShowModelSelector}
                  currentModelId={selectedModelId}
                  onSelectModel={setSelectedModelId}
                  mode={activeTab}
                  trigger={
                    <button
                      disabled={isGenerating}
                      className="w-full h-12 flex items-center gap-2 rounded-lg border border-border px-3 transition-all disabled:opacity-50 hover:bg-accent"
                    >
                      <div
                        className="w-6 h-6 rounded bg-muted bg-contain bg-no-repeat bg-center shrink-0"
                        style={{ backgroundImage: `url(${currentModel.thumbnail})` }}
                      />
                      <span className="text-sm font-medium flex-1 text-left">{currentModel.name}</span>
                      <ChevronRight size={14} className="opacity-60" />
                    </button>
                  }
                />
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 scrollbar-hide">
                <TabsContent value="text-to-video" className="mt-0 space-y-3">
                  {/* Prompt Card */}
                  <div className="rounded-xl border border-border bg-card p-3">
                    <textarea
                      ref={textareaRef}
                      placeholder="Describe your video..."
                      className="w-full bg-transparent resize-none focus:outline-none text-sm min-h-[120px] mb-2 leading-relaxed"
                      maxLength={1800}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={!editor || isGenerating}
                    />
                    <div className="flex items-center justify-end">
                      <span className="text-xs text-muted-foreground">{prompt.length}/1800</span>
                    </div>
                  </div>

                  {/* Video Settings */}
                  <div className="space-y-3">
                    {/* Aspect Ratio */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground block">Aspect Ratio</label>
                      <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={isGenerating}>
                        <SelectTrigger className="w-full !hover:border-input !focus:border-input !focus-visible:border-input !data-[state=open]:border-input !ring-0 !focus:ring-0 !focus-visible:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"].map((ratio) => (
                            <SelectItem key={ratio} value={ratio}>
                              {ratio}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Duration */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground block">Duration</label>
                      <Select value={duration} onValueChange={setDuration} disabled={isGenerating}>
                        <SelectTrigger className="w-full !hover:border-input !focus:border-input !focus-visible:border-input !data-[state=open]:border-input !ring-0 !focus:ring-0 !focus-visible:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableDurations().map((dur) => (
                            <SelectItem key={dur} value={dur}>
                              {dur} {parseInt(dur) === 1 ? "second" : "seconds"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Resolution (if model supports multiple) */}
                    {getAvailableResolutions().length > 1 && (
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground block">Resolution</label>
                        <Select
                          value={modelParams.resolution || currentModel.defaultParams.resolution}
                          onValueChange={(value) => setModelParams({ ...modelParams, resolution: value })}
                          disabled={isGenerating}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableResolutions().map((res: string) => (
                              <SelectItem key={res} value={res}>
                                {res}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Motion Strength (Kling 2.5 only) */}
                    {selectedModelId === "kuaishou/kling-2.5" && (
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground block">Motion Strength</label>
                        <Select
                          value={modelParams.motion_strength || "medium"}
                          onValueChange={(value) => setModelParams({ ...modelParams, motion_strength: value })}
                          disabled={isGenerating}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Audio Generation Toggle (Sora 2 & Veo 3) */}
                    {currentModel.capabilities.supportsAudioGeneration && (
                      <div className="flex items-center justify-between py-2">
                        <label className="flex items-center justify-between w-full">
                          <span className="text-xs text-muted-foreground">Generate Audio</span>
                          <input
                            type="checkbox"
                            checked={modelParams.generate_audio !== false}
                            onChange={(e) => setModelParams({ ...modelParams, generate_audio: e.target.checked })}
                            disabled={isGenerating}
                            className="h-4 w-4"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="image-to-video" className="mt-0 space-y-3">
                  {/* Reference Image Upload */}
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                    <VideoIcon className="mx-auto mb-2 text-muted-foreground" size={32} />
                    <p className="text-sm text-muted-foreground mb-1">Add Reference Image</p>
                    <p className="text-xs text-muted-foreground">(Coming soon)</p>
                  </div>

                  {/* Prompt Card */}
                  <div className="rounded-xl border border-border bg-card p-3">
                    <textarea
                      ref={textareaRef}
                      placeholder="Describe how to animate your image..."
                      className="w-full bg-transparent resize-none focus:outline-none text-sm min-h-[80px] mb-2 leading-relaxed"
                      maxLength={1800}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={!editor || isGenerating}
                    />
                    <div className="flex items-center justify-end">
                      <span className="text-xs text-muted-foreground">{prompt.length}/1800</span>
                    </div>
                  </div>

                  {/* Video Settings */}
                  <div className="space-y-3">
                    {/* Aspect Ratio */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground block">Aspect Ratio</label>
                      <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={isGenerating}>
                        <SelectTrigger className="w-full !hover:border-input !focus:border-input !focus-visible:border-input !data-[state=open]:border-input !ring-0 !focus:ring-0 !focus-visible:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"].map((ratio) => (
                            <SelectItem key={ratio} value={ratio}>
                              {ratio}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Duration */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground block">Duration</label>
                      <Select value={duration} onValueChange={setDuration} disabled={isGenerating}>
                        <SelectTrigger className="w-full !hover:border-input !focus:border-input !focus-visible:border-input !data-[state=open]:border-input !ring-0 !focus:ring-0 !focus-visible:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableDurations().map((dur) => (
                            <SelectItem key={dur} value={dur}>
                              {dur} {parseInt(dur) === 1 ? "second" : "seconds"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Resolution (if model supports multiple) */}
                    {getAvailableResolutions().length > 1 && (
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground block">Resolution</label>
                        <Select
                          value={modelParams.resolution || currentModel.defaultParams.resolution}
                          onValueChange={(value) => setModelParams({ ...modelParams, resolution: value })}
                          disabled={isGenerating}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableResolutions().map((res: string) => (
                              <SelectItem key={res} value={res}>
                                {res}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Motion Strength (Kling 2.5 only) */}
                    {selectedModelId === "kuaishou/kling-2.5" && (
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground block">Motion Strength</label>
                        <Select
                          value={modelParams.motion_strength || "medium"}
                          onValueChange={(value) => setModelParams({ ...modelParams, motion_strength: value })}
                          disabled={isGenerating}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Audio Generation Toggle (Sora 2 & Veo 3) */}
                    {currentModel.capabilities.supportsAudioGeneration && (
                      <div className="flex items-center justify-between py-2">
                        <label className="flex items-center justify-between w-full">
                          <span className="text-xs text-muted-foreground">Generate Audio</span>
                          <input
                            type="checkbox"
                            checked={modelParams.generate_audio !== false}
                            onChange={(e) => setModelParams({ ...modelParams, generate_audio: e.target.checked })}
                            disabled={isGenerating}
                            className="h-4 w-4"
                          />
                        </label>
                      </div>
                    )}
                  </div>
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
