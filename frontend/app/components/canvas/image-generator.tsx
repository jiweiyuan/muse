"use client"

import { useState, useRef, useEffect } from "react"
import { AssetRecordType, createShapeId, uniqueId, type TLShapeId } from "tldraw"
import { Sparkles, ChevronRight, Image as ImageIcon, X } from "lucide-react"
import { ReferenceIcon } from "@/components/icons/reference"
import { useCanvasStore } from "@/lib/canvas-store/provider"
import { useProjectStore } from "@/lib/project-store"
import { motion, AnimatePresence } from "framer-motion"
import { findNewAssetPosition, panAndZoomToImage } from "@/lib/canvas-utils"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { CollapseChatIcon } from "@/components/icons/collapse-chat"
import { ModelSelectorModal } from "./model-selector-modal"
import { ModelParamsForm } from "./model-params-form"
import { ReferenceAsset, type ImageAsset } from "./reference-asset"
import type { ImageModelId } from "@muse/shared-schemas"
import { getModelConfig } from "@/lib/image-models.config"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

interface ImageGeneratorProps {
  visible: boolean
  onClose: () => void
}

/**
 * Refactored Image Generator with Multi-Model Support
 * - Supports both text-to-image and image-to-image workflows
 * - Dynamic model selection with different parameters per model
 * - Configuration-driven UI
 */
export const ImageGenerator = ({ visible, onClose }: ImageGeneratorProps) => {
  const { editor, canvasId, referenceImages, removeReferenceImage, addReferenceImage } = useCanvasStore()
  const { activeProjectId } = useProjectStore()

  // UI State
  const [activeTab, setActiveTab] = useState<"text-to-image" | "image-to-image">("text-to-image")
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [showReferenceAsset, setShowReferenceAsset] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Model & Parameters State
  const [selectedModelId, setSelectedModelId] = useState<ImageModelId>("google/nano-banana")
  const [modelParams, setModelParams] = useState<Record<string, any>>({})
  const [prompt, setPrompt] = useState("")

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasAutoFocused = useRef(false)

  // Get current model config
  const currentModel = getModelConfig(selectedModelId)

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
   * Handle asset selection from Reference Asset modal
   */
  const handleAssetSelect = (asset: ImageAsset) => {
    addReferenceImage({
      id: asset.id,
      assetId: asset.id,
      src: asset.url,
      width: asset.width || 512,
      height: asset.height || 512,
      title: asset.name,
    })
  }

  /**
   * Calculate image dimensions based on aspect ratio
   */
  const calculateImageDimensions = (aspectRatio: string) => {
    const baseWidth = 256
    const [widthRatio, heightRatio] = aspectRatio.split(":").map(Number)
    const width = baseWidth
    const height = Math.round((baseWidth * heightRatio) / widthRatio)
    return { width, height }
  }

  /**
   * Generate image using selected model
   */
  const handleGenerate = async () => {
    if (!prompt.trim() || !canvasId || !editor || isGenerating) return

    const userPrompt = prompt.trim()
    setPrompt("") // Clear input immediately
    setIsGenerating(true)

    let placeholderShapeId: TLShapeId | null = null

    try {
      // Get aspect ratio from model params or use default
      const aspectRatio = modelParams.aspect_ratio || "1:1"
      const { width: imageWidth, height: imageHeight } = calculateImageDimensions(aspectRatio)
      const position = findNewAssetPosition(editor, imageWidth, imageHeight)
      const storageAssetId = `${uniqueId()}-ai-${Date.now()}.png`

      // Create placeholder shape
      placeholderShapeId = createShapeId()
      editor.createShape({
        id: placeholderShapeId,
        type: "image",
        x: position.x,
        y: position.y,
        props: {
          w: imageWidth,
          h: imageHeight,
          assetId: AssetRecordType.createId(),
        },
        opacity: 1,
        meta: {
          isProcessing: true,
          operation: "generate",
          startTime: Date.now(),
          prompt: userPrompt,
          modelId: selectedModelId,
        },
      })

      panAndZoomToImage(editor, position.x, position.y, imageWidth, imageHeight)

      if (!activeProjectId) {
        throw new Error("No active project")
      }

      // Create task with new multi-model schema
      const taskResponse = await fetch(`${BACKEND_URL}/v1/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          taskType: "generate_image",
          projectId: activeProjectId,
          shapeId: placeholderShapeId,
          body: {
            modelId: selectedModelId,
            modelParams: {
              prompt: userPrompt,
              ...modelParams,
            },
            storageAssetId: storageAssetId,
          },
        }),
      })

      if (!taskResponse.ok) {
        const error = await taskResponse.json()
        throw new Error(error.error || "Failed to create generation task")
      }

      const { taskId } = await taskResponse.json()
      console.log(`[ImageGenerator] Task created: ${taskId}`)

      setIsGenerating(false)
    } catch (err) {
      console.error("Failed to generate image:", err)

      if (placeholderShapeId) {
        editor.deleteShape(placeholderShapeId)
      }

      setIsGenerating(false)
      alert(err instanceof Error ? err.message : "Failed to generate image")
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
                  <h2 className="text-lg font-semibold">Image Generator</h2>
                  <button
                    onClick={onClose}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-transparent text-gray-900 dark:text-gray-100 hover:bg-accent hover:text-accent-foreground active:bg-accent/80"
                    aria-label="Collapse image generator"
                  >
                    <CollapseChatIcon className="h-4 w-4" />
                  </button>
                </div>
                <TabsList className="grid w-full grid-cols-2 h-12 border border-border">
                  <TabsTrigger value="image-to-image">Image to Image</TabsTrigger>
                  <TabsTrigger value="text-to-image">Text to Image</TabsTrigger>
                </TabsList>
                {/* Model Selector Dropdown */}
                <ModelSelectorModal
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
                <TabsContent value="image-to-image" className="mt-0 space-y-3">
                  {/* Reference Images */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">
                        Reference Images
                        {currentModel.capabilities.maxInputImages && currentModel.capabilities.maxInputImages > 0 && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({referenceImages.length}/{currentModel.capabilities.maxInputImages})
                          </span>
                        )}
                      </label>
                    </div>

                    {referenceImages.length === 0 ? (
                      <ReferenceAsset
                        open={showReferenceAsset}
                        onOpenChange={setShowReferenceAsset}
                        projectId={activeProjectId || ""}
                        onAssetSelect={handleAssetSelect}
                        maxImages={currentModel.capabilities.maxInputImages}
                        currentCount={referenceImages.length}
                        trigger={
                          <button
                            disabled={isGenerating || !activeProjectId}
                            className="w-full border border-dashed border-border rounded-md p-8 text-center hover:bg-accent hover:border-accent-foreground/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ReferenceIcon className="mx-auto mb-2 text-muted-foreground" size={32} />
                            <p className="text-sm text-muted-foreground mb-1">Add Reference</p>
                            <p className="text-xs text-muted-foreground">(optional)</p>
                          </button>
                        }
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {referenceImages.map((img) => (
                          <div
                            key={img.id}
                            className="relative group w-[calc((100%-1rem)/3)] h-32 rounded-md overflow-hidden border border-border"
                          >
                            <img
                              src={img.src}
                              alt={img.title || "Reference"}
                              className="w-full h-full object-contain"
                            />
                            <button
                              onClick={() => removeReferenceImage(img.id)}
                              className="absolute top-1 right-1 p-1 bg-background/80 hover:bg-background rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                              disabled={isGenerating}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        {/* Add More button - only show if under max limit */}
                        {(!currentModel.capabilities.maxInputImages ||
                          referenceImages.length < currentModel.capabilities.maxInputImages) && (
                          <ReferenceAsset
                            open={showReferenceAsset}
                            onOpenChange={setShowReferenceAsset}
                            projectId={activeProjectId || ""}
                            onAssetSelect={handleAssetSelect}
                            maxImages={currentModel.capabilities.maxInputImages}
                            currentCount={referenceImages.length}
                            trigger={
                              <button
                                disabled={isGenerating || !activeProjectId}
                                className="flex-1 h-32 rounded-md border border-dashed border-border hover:bg-accent hover:border-accent-foreground/20 transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <ReferenceIcon className="text-muted-foreground" size={24} />
                                <span className="text-xs text-muted-foreground">Add</span>
                              </button>
                            }
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Prompt Card */}
                  <div className="rounded-md border border-border bg-card p-3">
                    <Textarea
                      ref={textareaRef}
                      placeholder="Describe your image, or add References to begin"
                      className="w-full bg-transparent resize-none border-none shadow-none focus-visible:ring-0 text-sm min-h-[100px] mb-2 leading-relaxed p-0"
                      maxLength={2500}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={!editor || isGenerating}
                    />
                    <div className="flex items-center justify-between">
                      <Button variant="ghost" size="sm" disabled={isGenerating} className="text-xs">
                        <Sparkles size={14} className="mr-1" />
                        Enhance prompt
                      </Button>
                      <span className="text-xs text-muted-foreground">{prompt.length}/2500</span>
                    </div>
                  </div>

                  {/* Model-Specific Parameters */}
                  <ModelParamsForm
                    modelId={selectedModelId}
                    mode="image-to-image"
                    params={modelParams}
                    onChange={setModelParams}
                    disabled={isGenerating}
                  />
                </TabsContent>

                <TabsContent value="text-to-image" className="mt-0 space-y-3">
                  {/* Prompt Card */}
                  <div className="rounded-md border border-border bg-card p-3">
                    <Textarea
                      ref={textareaRef}
                      placeholder="Describe your image..."
                      className="w-full bg-transparent resize-none border-none shadow-none focus-visible:ring-0 text-sm min-h-[100px] mb-2 leading-relaxed p-0"
                      maxLength={2500}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={!editor || isGenerating}
                    />
                    <div className="flex items-center justify-between">
                      <Button variant="ghost" size="sm" disabled={isGenerating} className="text-xs">
                        <Sparkles size={14} className="mr-1" />
                        Enhance prompt
                      </Button>
                      <span className="text-xs text-muted-foreground">{prompt.length}/2500</span>
                    </div>
                  </div>

                  {/* Model-Specific Parameters */}
                  <ModelParamsForm
                    modelId={selectedModelId}
                    mode="text-to-image"
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
