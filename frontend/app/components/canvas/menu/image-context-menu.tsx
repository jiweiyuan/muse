"use client"

import { useEditor, track, AssetRecordType, createShapeId, type TLShapeId, type TLAssetId } from "tldraw"
import { useState } from "react"
import { useCanvasStore } from "@/lib/canvas-store/provider"
import { useProjectStore } from "@/lib/project-store"
import { useUser } from "@/lib/user-store/provider"
import { updateProjectCover } from "@/lib/projects/api"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "@/components/ui/toast"
import { Image } from "lucide-react"
import { ReferenceIcon } from "@/components/icons/reference"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

// Light gray SVG as data URL for placeholder shapes during processing
// Using SVG ensures pure neutral gray without color shifts
const GRAY_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='%23f0f0f0'/%3E%3C/svg%3E"

type ProcessingOperation = "upscale-2x" | "upscale-4x" | "remove-bg" | null

/**
 * Floating context menu for selected image shapes
 */
export const ImageContextMenu = track(() => {
  const editor = useEditor()
  const {
    canvasId,
    imageGeneratorVisible,
    videoGeneratorVisible,
    addReferenceImage,
  } = useCanvasStore()
  const { activeProjectId } = useProjectStore()
  const { user } = useUser()
  const [processing, setProcessing] = useState<ProcessingOperation>(null)
  const [showUpscaleMenu, setShowUpscaleMenu] = useState(false)
  const [selectedScale, setSelectedScale] = useState<2 | 4 | 8>(2)
  const [morePopoverOpen, setMorePopoverOpen] = useState(false)

  const selectedShapes = editor.getSelectedShapes()

  // Only show for image shapes
  const imageShapes = selectedShapes.filter((shape) => shape.type === "image")

  // Don't show if no image shapes are selected or if user is editing
  if (imageShapes.length === 0 || editor.getEditingShapeId()) {
    return null
  }

  // Don't show if multiple different types are selected
  // (let the DefaultContextMenu handle it)
  const allTypes = new Set(selectedShapes.map((shape) => shape.type))
  if (allTypes.size > 1) {
    return null
  }

  // Only support single image selection for now
  if (imageShapes.length > 1) {
    return null
  }

  const firstShape = imageShapes[0]
  const bounds = editor.getShapePageBounds(firstShape.id)

  if (!bounds) return null

  // Convert page coordinates to screen coordinates
  // Convert both corners to properly handle zoom levels
  const topLeft = editor.pageToScreen({ x: bounds.x, y: bounds.y })
  const bottomRight = editor.pageToScreen({ x: bounds.x + bounds.width, y: bounds.y + bounds.height })

  // Calculate screen-space dimensions
  const screenWidth = bottomRight.x - topLeft.x

  // Position the menu above the selected image
  const menuX = topLeft.x + screenWidth / 2 - 40 // Center horizontally (approximate menu width)
  const menuY = topLeft.y - 58 // Position above the image (small extra space to avoid covering title)

  /**
   * Add image as reference to image/video generator
   */
  const handleAddReference = () => {
    try {
      // Get the asset from the selected image shape
      if (firstShape.type !== "image") {
        throw new Error("Selected shape is not an image")
      }
      const imageShape = firstShape as typeof firstShape & { props: { assetId: TLAssetId; w: number; h: number } }
      const asset = editor.getAsset(imageShape.props.assetId)
      if (!asset || asset.type !== "image") {
        throw new Error("Invalid image asset")
      }

      // Use the asset URL as the reference
      if (!asset.props.src) {
        throw new Error("Asset has no src")
      }

      // Get title from meta or use default
      const title = (typeof asset.meta?.title === 'string' ? asset.meta.title : null) || "Reference Image"

      // Create reference image object
      const referenceImage = {
        id: asset.id, // Use asset ID as unique identifier
        assetId: imageShape.props.assetId,
        src: asset.props.src,
        width: asset.props.w,
        height: asset.props.h,
        title,
      }

      // Add to store
      addReferenceImage(referenceImage)

      // Show success toast
      toast({
        title: "Reference image added",
        description: "The image has been added to the generator",
        status: "success"
      })
    } catch (error) {
      console.error("[ImageContextMenu] Failed to add reference:", error)
      toast({
        title: "Failed to add reference",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        status: "error"
      })
    }
  }

  /**
   * Set image as project cover
   */
  const setAsProjectCover = async () => {
    if (!activeProjectId || !user?.id) {
      toast({
        title: "Unable to set project cover",
        description: "No active project found",
        status: "error"
      })
      return
    }

    try {
      // Get the asset from the selected image shape
      if (firstShape.type !== "image") {
        throw new Error("Selected shape is not an image")
      }
      const imageShape = firstShape as typeof firstShape & { props: { assetId: TLAssetId } }
      const asset = editor.getAsset(imageShape.props.assetId)
      if (!asset || asset.type !== "image") {
        throw new Error("Invalid image asset")
      }

      // Use the asset URL as the cover
      if (!asset.props.src) {
        throw new Error("Asset has no src")
      }

      // Update the project cover
      await updateProjectCover(activeProjectId, user.id, asset.props.src)

      // Close the popover
      setMorePopoverOpen(false)

      // Show success toast
      toast({
        title: "The image has been set as the project cover",
        status: "success"
      })
    } catch (error) {
      console.error("[ImageContextMenu] Failed to set project cover:", error)
      toast({
        title: "Failed to set project cover",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        status: "error"
      })
    }
  }

  /**
   * Process image with AI
   */
  const processImage = async (operation: ProcessingOperation, scale?: 2 | 4 | 8) => {
    if (!operation || !canvasId) return

    setProcessing(operation)

    // Variable to store the placeholder shape ID for cleanup
    let newPlaceholderShapeId: TLShapeId | null = null

    try {
      // Get the asset ID from the image shape
      if (firstShape.type !== "image") {
        throw new Error("Selected shape is not an image")
      }
      const imageShape = firstShape as typeof firstShape & { props: { assetId: TLAssetId; w: number; h: number } }
      const asset = editor.getAsset(imageShape.props.assetId)
      if (!asset || asset.type !== "image") {
        throw new Error("Invalid image asset")
      }

      // Extract asset ID from the src URL
      // Format: http://localhost:8000/v1/assets/{assetId}
      if (!asset.props.src) {
        throw new Error("Asset has no src")
      }

      // Validate that the asset is stored on the backend (not a blob or data URI)
      // Match pattern: /v1/assets/{assetId} (with optional query params or trailing content)
      const backendUrlPattern = /\/v1\/assets\/([^/?#]+)/
      const match = asset.props.src.match(backendUrlPattern)

      if (!match || !match[1]) {
        throw new Error(
          "This image hasn't been uploaded to the server yet.\n\n" +
          "Uploaded images should automatically sync to the backend. " +
          "If you're seeing this, there may be an issue with the upload. " +
          "Try re-uploading the image or contact support."
        )
      }

      const assetId = match[1]

      // Create placeholder image to the right of the original
      const originalBounds = editor.getShapePageBounds(firstShape.id)
      if (!originalBounds) {
        throw new Error("Could not get shape bounds")
      }

      // Position the placeholder to the right with 50px spacing
      const placeholderX = originalBounds.x + originalBounds.width + 50
      const placeholderY = originalBounds.y

      // Create gray placeholder asset
      const grayAssetId = AssetRecordType.createId()
      editor.createAssets([
        {
          id: grayAssetId,
          type: "image",
          typeName: "asset",
          props: {
            name: "placeholder.png",
            src: GRAY_PLACEHOLDER,
            w: 1,
            h: 1,
            mimeType: "image/png",
            isAnimated: false,
          },
          meta: {},
        },
      ])

      // Create placeholder shape with gray asset for ProcessingOverlay
      newPlaceholderShapeId = createShapeId()
      editor.createShape({
        id: newPlaceholderShapeId,
        type: "image",
        x: placeholderX,
        y: placeholderY,
        props: {
          w: imageShape.props.w,
          h: imageShape.props.h,
          assetId: grayAssetId,
        },
        opacity: 1, // Visible gray placeholder with ProcessingOverlay on top
        meta: {
          isProcessing: true,
          operation,
          startTime: Date.now(),
        },
      })


      // Determine endpoint and payload
      let endpoint: string
      let payload: { assetId: string; canvasId: string; factor?: 2 | 4 }

      if (operation === "upscale-2x" || operation === "upscale-4x") {
        // Map scale to factor (8k not supported yet in Replicate model)
        const factor = scale === 8 ? 4 : (scale || 2)

        if (scale === 8) {
          throw new Error("8k upscale is not supported yet. Please use 2k or 4k.")
        }

        endpoint = `${BACKEND_URL}/v1/tools/image/upscale`
        payload = {
          assetId,
          canvasId,
          factor: factor as 2 | 4,
        }
      } else if (operation === "remove-bg") {
        endpoint = `${BACKEND_URL}/v1/tools/image/remove-background`
        payload = {
          assetId,
          canvasId,
        }
      } else {
        throw new Error("Unknown operation")
      }

      // Call the backend API
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to process image")
      }

      const result = await response.json()

      // Create new asset in tldraw with the processed image
      const newAssetId = AssetRecordType.createId()

      // Get original title to preserve it
      const originalTitle = (typeof asset.meta?.title === 'string' ? asset.meta.title : null) || "Untitled Image"

      // Create the asset exactly like tldraw does for uploaded images
      const newAsset = {
        id: newAssetId,
        type: "image" as const,
        typeName: "asset" as const,
        props: {
          name: `processed-${operation}.png`,
          src: result.assetUrl,
          w: asset.props.w,
          h: asset.props.h,
          mimeType: "image/png",
          isAnimated: false,
        },
        meta: {
          title: originalTitle,
        },
      }

      editor.createAssets([newAsset])

      // Update placeholder: first swap asset while keeping opacity at 0
      editor.updateShape({
        id: newPlaceholderShapeId,
        type: "image",
        props: {
          assetId: newAssetId,
        },
        meta: {
          isProcessing: false,
          processedAt: Date.now(),
        },
      })

      // Then set opacity to 1 to reveal the processed image
      editor.updateShape({
        id: newPlaceholderShapeId,
        type: "image",
        opacity: 1,
      })
    } catch (error) {
      console.error(`[ImageContextMenu] Failed to process image:`, error)

      // Clean up placeholder shape on error
      if (newPlaceholderShapeId) {
        try {
          editor.deleteShape(newPlaceholderShapeId)
        } catch (deleteError) {
          console.error("[ImageContextMenu] Failed to delete placeholder shape:", deleteError)
        }
      }

      // Show error toast to user
      toast({
        title: "Failed to process image",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        status: "error"
      })
    } finally {
      setProcessing(null)
    }
  }

  // Show upscale submenu or main menu
  if (showUpscaleMenu && !processing) {
    return (
      <div
        className="fixed z-[1001] box-border rounded-xl bg-white/95 backdrop-blur-2xl shadow-[0_0_0_0.5px_rgba(193,197,204,0.4),0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08),0_16px_32px_rgba(0,0,0,0.08)] p-1.5 outline outline-[0.5px] outline-[rgba(193,197,204,0.4)] outline-offset-[-0.5px] pointer-events-auto animate-[contextMenuFadeIn_0.15s_ease] min-w-[200px] dark:bg-[rgba(30,30,30,0.95)] dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.15),0_2px_4px_rgba(0,0,0,0.2),0_8px_16px_rgba(0,0,0,0.3),0_16px_32px_rgba(0,0,0,0.4)] dark:outline-[rgba(255,255,255,0.15)]"
        style={{
          left: `${menuX}px`,
          top: `${menuY}px`,
        }}
      >
        <div className="flex items-center gap-1.5 px-1 h-7">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="none"
            viewBox="0 0 24 24"
            className="text-[#2f3640] dark:text-[#e5e5e5]"
          >
            <path
              fill="currentColor"
              d="M19 2a3 3 0 0 1 3 3v14a3 3 0 0 1-2.846 2.996L19 22H5l-.154-.004a3 3 0 0 1-2.842-2.842L2 19V5a3 3 0 0 1 3-3zM5 3.5A1.5 1.5 0 0 0 3.5 5v14A1.5 1.5 0 0 0 5 20.5h14a1.5 1.5 0 0 0 1.5-1.5V5A1.5 1.5 0 0 0 19 3.5zm2.121 7.75H9.92V8.075h1.5v8h-1.5V12.75H7.121v3.325h-1.5v-8h1.5zm8.156-3.17c1.5.055 3.768.605 3.768 4.044s-2.333 3.903-3.78 3.947l-.277.004h-1.993v-8h1.993zm-.782 6.495h.493c.65 0 1.295-.079 1.754-.368.327-.206.803-.667.803-2.083 0-1.434-.472-1.929-.807-2.152-.45-.3-1.092-.397-1.75-.397h-.493z"
            />
          </svg>
          <span className="font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-xs font-normal text-[#2f3640] whitespace-nowrap ml-1 dark:text-[#e5e5e5]">Upscale</span>
          <button
            className="ml-auto w-6 h-6 flex items-center justify-center bg-transparent border-none rounded-md text-[#6b7280] cursor-pointer transition-colors duration-150 outline-none hover:bg-[rgba(47,54,64,0.08)] dark:text-[#9ca3af] dark:hover:bg-[rgba(255,255,255,0.08)]"
            onClick={() => setShowUpscaleMenu(false)}
            title="Back"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              fill="none"
              viewBox="0 0 12 12"
            >
              <path
                fill="currentColor"
                d="M9.445 2.154a.4.4 0 0 1 0 .567L3.798 8.368a.4.4 0 0 1-.566 0l-.424-.424a.4.4 0 0 1 0-.566L8.455 1.73a.4.4 0 0 1 .566 0z"
              />
              <path
                fill="currentColor"
                d="M2.808 3.632a.4.4 0 0 1 .566 0L9.02 9.279a.4.4 0 0 1 0 .566l-.424.424a.4.4 0 0 1-.566 0L2.384 4.622a.4.4 0 0 1 0-.566z"
              />
            </svg>
          </button>
        </div>

        <div className="h-px w-full bg-[#c1c5cc] my-2 dark:bg-[rgba(255,255,255,0.15)]" />

        {/* Resolution selector */}
        <div className="flex gap-2 py-0.5">
          <button
            className={`flex-1 flex items-center justify-center h-7 px-3 bg-transparent border border-[#c1c5cc] rounded-lg text-[#6b7280] cursor-pointer transition-all duration-150 outline-none font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] hover:bg-[rgba(47,54,64,0.04)] hover:border-[#9ca3af] dark:border-[rgba(255,255,255,0.2)] dark:text-[#6b7280] dark:hover:bg-[rgba(47,54,64,0.04)] dark:hover:border-[#9ca3af] ${selectedScale === 2 ? "bg-[rgba(47,54,64,0.08)] border-[#2f3640] text-[#2f3640] font-medium dark:bg-[rgba(255,255,255,0.12)] dark:border-[#e5e5e5] dark:text-[#e5e5e5]" : ""}`}
            onClick={() => setSelectedScale(2)}
          >
            <span className="text-xs font-inherit">2k</span>
          </button>
          <button
            className={`flex-1 flex items-center justify-center h-7 px-3 bg-transparent border border-[#c1c5cc] rounded-lg text-[#6b7280] cursor-pointer transition-all duration-150 outline-none font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] hover:bg-[rgba(47,54,64,0.04)] hover:border-[#9ca3af] dark:border-[rgba(255,255,255,0.2)] dark:text-[#6b7280] dark:hover:bg-[rgba(47,54,64,0.04)] dark:hover:border-[#9ca3af] ${selectedScale === 4 ? "bg-[rgba(47,54,64,0.08)] border-[#2f3640] text-[#2f3640] font-medium dark:bg-[rgba(255,255,255,0.12)] dark:border-[#e5e5e5] dark:text-[#e5e5e5]" : ""}`}
            onClick={() => setSelectedScale(4)}
          >
            <span className="text-xs font-inherit">4k</span>
          </button>
          <button
            className="flex-1 flex items-center justify-center h-7 px-3 bg-transparent border border-[#c1c5cc] rounded-lg text-[#6b7280] cursor-pointer transition-all duration-150 outline-none font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] opacity-40 cursor-not-allowed dark:border-[rgba(255,255,255,0.2)] dark:text-[#6b7280]"
            onClick={() => setSelectedScale(8)}
            disabled
            title="8k upscale coming soon"
          >
            <span className="text-xs font-inherit">8k</span>
          </button>
        </div>

        {/* Run button */}
        <div className="flex justify-center pt-1.5 pb-0.5">
          <button
            className="flex items-center justify-center gap-1.5 h-7 min-w-[80px] px-4 bg-[#2f3640] border-none rounded-lg text-white cursor-pointer transition-colors duration-150 outline-none font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] hover:bg-[#1a1d23] active:bg-[#0e1014] disabled:opacity-50 disabled:cursor-not-allowed dark:bg-[#e5e5e5] dark:text-[#0e1014] dark:hover:bg-[#f3f4f6] dark:active:bg-white"
            onClick={() => {
              setShowUpscaleMenu(false)
              processImage(selectedScale === 2 ? "upscale-2x" : "upscale-4x", selectedScale)
            }}
            disabled={!!processing || selectedScale === 8}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="10"
              height="12"
              fill="none"
              viewBox="0 0 8 10"
              className="w-2.5 h-3 flex-shrink-0"
            >
              <path
                fill="currentColor"
                d="M6.9 4.36H5.385V.76c0-.84-.447-1.01-.991-.38L4 .835.677 4.685c-.457.525-.265.955.422.955h1.517v3.6c0 .84.446 1.01.991.38L4 9.165l3.323-3.85c.456-.525.265-.955-.422-.955"
              />
            </svg>
            <span className="text-xs font-medium text-white dark:text-[#0e1014]">Run</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div
        className="fixed z-[1001] box-border rounded-xl bg-white/95 backdrop-blur-2xl shadow-[0_0_0_0.5px_rgba(193,197,204,0.4),0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08),0_16px_32px_rgba(0,0,0,0.08)] p-1.5 outline outline-[0.5px] outline-[rgba(193,197,204,0.4)] outline-offset-[-0.5px] pointer-events-auto animate-[contextMenuFadeIn_0.15s_ease] dark:bg-[rgba(30,30,30,0.95)] dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.15),0_2px_4px_rgba(0,0,0,0.2),0_8px_16px_rgba(0,0,0,0.3),0_16px_32px_rgba(0,0,0,0.4)] dark:outline-[rgba(255,255,255,0.15)]"
        style={{
          left: `${menuX}px`,
          top: `${menuY}px`,
        }}
      >
        <div className="flex items-center gap-1">
          {/* Upscale button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-lg text-[#2f3640] cursor-pointer transition-colors duration-150 outline-none hover:bg-[rgba(47,54,64,0.08)] active:bg-[rgba(47,54,64,0.12)] disabled:opacity-50 disabled:cursor-not-allowed dark:text-[#e5e5e5] dark:hover:bg-[rgba(255,255,255,0.08)] dark:active:bg-[rgba(255,255,255,0.12)]"
                onClick={() => setShowUpscaleMenu(true)}
                disabled={!!processing}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="w-[18px] h-[18px] flex-shrink-0 text-[#2f3640] dark:text-[#e5e5e5]"
                >
                  <path
                    fill="currentColor"
                    d="M19 2a3 3 0 0 1 3 3v14a3 3 0 0 1-2.846 2.996L19 22H5l-.154-.004a3 3 0 0 1-2.842-2.842L2 19V5a3 3 0 0 1 3-3zM5 3.5A1.5 1.5 0 0 0 3.5 5v14A1.5 1.5 0 0 0 5 20.5h14a1.5 1.5 0 0 0 1.5-1.5V5A1.5 1.5 0 0 0 19 3.5zm2.121 7.75H9.92V8.075h1.5v8h-1.5V12.75H7.121v3.325h-1.5v-8h1.5zm8.156-3.17c1.5.055 3.768.605 3.768 4.044s-2.333 3.903-3.78 3.947l-.277.004h-1.993v-8h1.993zm-.782 6.495h.493c.65 0 1.295-.079 1.754-.368.327-.206.803-.667.803-2.083 0-1.434-.472-1.929-.807-2.152-.45-.3-1.092-.397-1.75-.397h-.493z"
                  />
                </svg>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={4}>
              Upscale
            </TooltipContent>
          </Tooltip>

          {/* Remove background button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-lg text-[#2f3640] cursor-pointer transition-colors duration-150 outline-none hover:bg-[rgba(47,54,64,0.08)] active:bg-[rgba(47,54,64,0.12)] disabled:opacity-50 disabled:cursor-not-allowed dark:text-[#e5e5e5] dark:hover:bg-[rgba(255,255,255,0.08)] dark:active:bg-[rgba(255,255,255,0.12)]"
                onClick={() => processImage("remove-bg")}
                disabled={!!processing}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="w-[18px] h-[18px] flex-shrink-0 text-[#2f3640] dark:text-[#e5e5e5]"
                >
                  <path
                    fill="currentColor"
                    d="M18.67 2A3.33 3.33 0 0 1 22 5.33v13.34A3.33 3.33 0 0 1 18.67 22H5.33l-.172-.004A3.33 3.33 0 0 1 2 18.67V5.33a3.33 3.33 0 0 1 3.158-3.326L5.33 2zm-5.83 12.18a1.675 1.675 0 0 0-2.33.038l-6.058 6.057c.26.143.56.225.878.225h13.34c.262 0 .511-.057.737-.156zm4.51 2.175 3.062 2.874q.087-.266.088-.56v-5.463zM3.5 13.067v5.603q0 .203.043.393l5.906-5.906q.161-.16.337-.294l-.009-.008 9.304-9.307a2 2 0 0 0-.411-.048h-5.603zm8.935-.749c.519.125 1.015.378 1.431.769l2.39 2.241 4.244-4.243V5.33c0-.312-.08-.605-.217-.862zM5.33 3.5c-1.01 0-1.83.82-1.83 1.83v5.616L10.946 3.5z"
                  />
                </svg>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={4}>
              Remove Background
            </TooltipContent>
          </Tooltip>

          {/* Reference button - Only show when image or video generator is open */}
          {(imageGeneratorVisible || videoGeneratorVisible) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-lg text-[#2f3640] cursor-pointer transition-colors duration-150 outline-none hover:bg-[rgba(47,54,64,0.08)] active:bg-[rgba(47,54,64,0.12)] disabled:opacity-50 disabled:cursor-not-allowed dark:text-[#e5e5e5] dark:hover:bg-[rgba(255,255,255,0.08)] dark:active:bg-[rgba(255,255,255,0.12)]"
                  onClick={handleAddReference}
                  disabled={!!processing}
                >
                  <ReferenceIcon className="text-[#2f3640] dark:text-[#e5e5e5]" size={18} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4}>
                Reference
              </TooltipContent>
            </Tooltip>
          )}

          {/* More button */}
          <Popover open={morePopoverOpen} onOpenChange={setMorePopoverOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    className="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-lg text-[#2f3640] cursor-pointer transition-colors duration-150 outline-none hover:bg-[rgba(47,54,64,0.08)] active:bg-[rgba(47,54,64,0.12)] disabled:opacity-50 disabled:cursor-not-allowed dark:text-[#e5e5e5] dark:hover:bg-[rgba(255,255,255,0.08)] dark:active:bg-[rgba(255,255,255,0.12)]"
                    disabled={!!processing}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      fill="none"
                      viewBox="0 0 24 24"
                      className="w-[18px] h-[18px] flex-shrink-0 text-[#2f3640] dark:text-[#e5e5e5]"
                    >
                      <path
                        fill="currentColor"
                        d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
                      />
                    </svg>
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4}>
                More
              </TooltipContent>
            </Tooltip>
            <PopoverContent
              side="bottom"
              align="start"
              className="w-56 p-0"
            >
              <div className="flex flex-col">
                <button
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#2f3640] hover:bg-[rgba(47,54,64,0.08)] transition-colors duration-150 outline-none border-none bg-transparent cursor-pointer text-left dark:text-[#e5e5e5] dark:hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={setAsProjectCover}
                  disabled={!activeProjectId || !user?.id}
                >
                  <Image size={16} className="flex-shrink-0" />
                  <span className="font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
                    Set as project cover
                  </span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </TooltipProvider>
  )
})
