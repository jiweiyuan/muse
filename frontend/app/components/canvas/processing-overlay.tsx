"use client"

import { useEditor, track } from "tldraw"

/**
 * Advanced frosted glass overlay with irregular gradient shapes
 * Inspired by: https://github.com/chokcoco/iCSS/issues/157
 */
export const ProcessingOverlay = track(() => {
  const editor = useEditor()

  // Get all shapes that are currently processing
  const allShapes = editor.getCurrentPageShapes()
  const processingShapes = allShapes.filter(
    (shape) => shape.type === "image" && shape.meta.isProcessing === true
  )

  if (processingShapes.length === 0) {
    return null
  }

  return (
    <>
      {processingShapes.map((shape) => {
        const bounds = editor.getShapePageBounds(shape.id)
        if (!bounds) return null

        // Convert page coordinates to screen coordinates
        const topLeft = editor.pageToScreen({ x: bounds.x, y: bounds.y })
        const bottomRight = editor.pageToScreen({
          x: bounds.x + bounds.width,
          y: bounds.y + bounds.height,
        })

        // Calculate screen-space dimensions
        const screenWidth = bottomRight.x - topLeft.x
        const screenHeight = bottomRight.y - topLeft.y

        // Get operation type from metadata
        const operation = shape.meta.operation as string | undefined
        const getOperationLabel = () => {
          switch (operation) {
            case 'generate':
              return 'Generating...'
            case 'remove-bg':
              return 'Removing background...'
            case 'upscale-2x':
              return 'Upscaling 2x...'
            case 'upscale-4x':
              return 'Upscaling 4x...'
            default:
              return 'Processing...'
          }
        }

        return (
          <div
            key={shape.id}
            className="processing-overlay"
            style={{
              left: `${topLeft.x}px`,
              top: `${topLeft.y}px`,
              width: `${screenWidth}px`,
              height: `${screenHeight}px`,
            }}
          >
            {/* Animated gradient layer */}
            <div className="processing-gradient-layer" />

            {/* Frosted glass blur - THE KEY */}
            <div className="processing-glass-blur" />

            {/* Processing label at bottom */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[3] px-3 py-1.5 bg-black/60 text-white text-xs font-medium rounded backdrop-blur-sm whitespace-nowrap animate-in fade-in slide-in-from-bottom-1 duration-300">
              {getOperationLabel()}
            </div>
          </div>
        )
      })}
    </>
  )
})
