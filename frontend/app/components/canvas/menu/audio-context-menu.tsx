"use client"

import { track, useEditor } from "tldraw"
import { Download } from "lucide-react"
import type { AudioShape } from "../shapes/audio-shape"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * Audio Context Menu - Floating menu for selected audio shapes
 */
export const AudioContextMenu = track(() => {
  const editor = useEditor()

  // Get the currently selected shapes
  const selectedShapes = editor.getSelectedShapes()

  // Only show menu if exactly one audio shape is selected
  if (selectedShapes.length !== 1) return null
  const shape = selectedShapes[0]
  if (shape.type !== "audio") return null

  const audioShape = shape as AudioShape

  // Get the asset to access the audio URL
  const assetId = audioShape.props.assetId
  const asset = assetId ? editor.getAsset(assetId) : null
  const audioUrl = asset?.props?.src || ""
  const audioTitle =
    (asset?.type === 'video' ? asset.props.name : undefined) ||
    asset?.meta?.title ||
    "Audio"

  // Calculate menu position - centered above the shape
  const shapePageBounds = editor.getShapePageBounds(audioShape)
  if (!shapePageBounds) return null

  // Convert page coordinates to screen coordinates
  const topLeft = editor.pageToScreen({ x: shapePageBounds.x, y: shapePageBounds.y })
  const bottomRight = editor.pageToScreen({
    x: shapePageBounds.x + shapePageBounds.width,
    y: shapePageBounds.y + shapePageBounds.height
  })

  // Calculate screen-space dimensions
  const screenWidth = bottomRight.x - topLeft.x

  // Position the menu above the selected audio
  const menuX = topLeft.x + screenWidth / 2 - 20 // Center horizontally (approximate half menu width)
  const menuY = topLeft.y - 58 // Position above the audio

  const handleDownload = () => {
    if (!audioUrl) return

    // Create a temporary link element to trigger download
    const link = document.createElement("a")
    link.href = audioUrl
    link.download = String(audioTitle)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
          {/* Download button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-lg text-[#2f3640] cursor-pointer transition-colors duration-150 outline-none hover:bg-[rgba(47,54,64,0.08)] active:bg-[rgba(47,54,64,0.12)] disabled:opacity-50 disabled:cursor-not-allowed dark:text-[#e5e5e5] dark:hover:bg-[rgba(255,255,255,0.08)] dark:active:bg-[rgba(255,255,255,0.12)]"
                onClick={handleDownload}
                disabled={!audioUrl}
              >
                <Download size={18} strokeWidth={2} className="text-[#2f3640] dark:text-[#e5e5e5]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={4}>
              Download
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
})
