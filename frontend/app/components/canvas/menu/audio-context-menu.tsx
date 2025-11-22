"use client"

import { track, useEditor } from "tldraw"
import { Download, Trash2, Copy } from "lucide-react"
import type { AudioShape } from "../shapes/audio-shape"

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

  const viewportPageBounds = editor.getViewportPageBounds()
  const zoom = editor.getZoomLevel()

  // Position menu above the shape
  const menuX = (shapePageBounds.center.x - viewportPageBounds.x) * zoom
  const menuY = (shapePageBounds.minY - viewportPageBounds.y) * zoom - 50 // 50px above

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

  const handleDuplicate = () => {
    editor.duplicateShapes([audioShape.id])
  }

  const handleDelete = () => {
    editor.deleteShapes([audioShape.id])
  }

  return (
    <div
      style={{
        position: "absolute",
        left: `${menuX}px`,
        top: `${menuY}px`,
        transform: "translateX(-50%)",
        zIndex: 1000,
        pointerEvents: "auto",
      }}
      onClick={(e) => {
        // Prevent clicks from deselecting the shape
        e.stopPropagation()
      }}
    >
      <div className="flex items-center gap-1 px-2 py-1.5 bg-white/95 dark:bg-[rgba(30,30,30,0.95)] rounded-lg shadow-[0_0_0_0.5px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2),0_8px_16px_rgba(0,0,0,0.3)] backdrop-blur-[16px]">
        {/* Download button */}
        <button
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#374151] dark:text-[#e5e7eb] bg-transparent hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:bg-black/[0.08] dark:active:bg-white/[0.1] rounded-md transition-colors cursor-pointer border-none outline-none disabled:opacity-50"
          onClick={handleDownload}
          title="Download audio"
          disabled={!audioUrl}
        >
          <Download size={14} strokeWidth={2} />
          <span>Download</span>
        </button>

        {/* Duplicate button */}
        <button
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#374151] dark:text-[#e5e7eb] bg-transparent hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:bg-black/[0.08] dark:active:bg-white/[0.1] rounded-md transition-colors cursor-pointer border-none outline-none"
          onClick={handleDuplicate}
          title="Duplicate audio"
        >
          <Copy size={14} strokeWidth={2} />
          <span>Duplicate</span>
        </button>

        {/* Delete button */}
        <button
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#ef4444] dark:text-[#f87171] bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 dark:active:bg-red-900/30 rounded-md transition-colors cursor-pointer border-none outline-none"
          onClick={handleDelete}
          title="Delete audio"
        >
          <Trash2 size={14} strokeWidth={2} />
          <span>Delete</span>
        </button>
      </div>
    </div>
  )
})
