"use client"

import { useEditor, track, type TLAssetId } from "tldraw"
import { useState } from "react"
import { useCanvasStore } from "@/lib/canvas-store/provider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/**
 * Floating context menu for selected video shapes
 */
export const VideoContextMenu = track(() => {
  const editor = useEditor()
  const { canvasId } = useCanvasStore()
  const [morePopoverOpen, setMorePopoverOpen] = useState(false)

  const selectedShapes = editor.getSelectedShapes()

  // Only show for video shapes
  const videoShapes = selectedShapes.filter((shape) => shape.type === "video")

  // Don't show if no video shapes are selected or if user is editing
  if (videoShapes.length === 0 || editor.getEditingShapeId()) {
    return null
  }

  // Don't show if multiple different types are selected
  const allTypes = new Set(selectedShapes.map((shape) => shape.type))
  if (allTypes.size > 1) {
    return null
  }

  // Only support single video selection for now
  if (videoShapes.length > 1) {
    return null
  }

  const firstShape = videoShapes[0]
  const bounds = editor.getShapePageBounds(firstShape.id)

  if (!bounds) return null

  // Convert page coordinates to screen coordinates
  const topLeft = editor.pageToScreen({ x: bounds.x, y: bounds.y })
  const bottomRight = editor.pageToScreen({ x: bounds.x + bounds.width, y: bounds.y + bounds.height })

  // Calculate screen-space dimensions
  const screenWidth = bottomRight.x - topLeft.x

  // Position the menu above the selected video
  const menuX = topLeft.x + screenWidth / 2 - 60 // Center horizontally
  const menuY = topLeft.y - 58 // Position above the video

  /**
   * Toggle video playback
   */
  const togglePlayback = () => {
    if (firstShape.type !== "video") return

    const videoShape = firstShape as typeof firstShape & { props: { playing: boolean } }

    editor.updateShape({
      id: firstShape.id,
      type: 'video',
      props: {
        playing: !videoShape.props.playing,
      }
    })
  }

  /**
   * Reset video to beginning
   */
  const resetVideo = () => {
    if (firstShape.type !== "video") return

    editor.updateShape({
      id: firstShape.id,
      type: 'video',
      props: {
        time: 0,
        playing: false,
      }
    })
  }

  /**
   * Download video
   */
  const downloadVideo = () => {
    if (firstShape.type !== "video") return

    const videoShape = firstShape as typeof firstShape & { props: { assetId: TLAssetId } }
    const asset = editor.getAsset(videoShape.props.assetId)

    if (!asset || asset.type !== "video" || !asset.props.src) {
      console.error("Invalid video asset")
      return
    }

    // Create a temporary link and trigger download
    const link = document.createElement('a')
    link.href = asset.props.src
    link.download = asset.props.name || 'video.mp4'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setMorePopoverOpen(false)
  }

  /**
   * Delete video
   */
  const deleteVideo = () => {
    editor.deleteShape(firstShape.id)
    setMorePopoverOpen(false)
  }

  // Get video playing state
  const videoShape = firstShape as typeof firstShape & { props: { playing: boolean } }
  const isPlaying = videoShape.props.playing

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
          {/* Play/Pause button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-lg text-[#2f3640] cursor-pointer transition-colors duration-150 outline-none hover:bg-[rgba(47,54,64,0.08)] active:bg-[rgba(47,54,64,0.12)] dark:text-[#e5e5e5] dark:hover:bg-[rgba(255,255,255,0.08)] dark:active:bg-[rgba(255,255,255,0.12)]"
                onClick={togglePlayback}
              >
                {isPlaying ? (
                  // Pause icon
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
                      d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"
                    />
                  </svg>
                ) : (
                  // Play icon
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
                      d="M8 5v14l11-7z"
                    />
                  </svg>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={4}>
              {isPlaying ? "Pause" : "Play"}
            </TooltipContent>
          </Tooltip>

          {/* Reset button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-lg text-[#2f3640] cursor-pointer transition-colors duration-150 outline-none hover:bg-[rgba(47,54,64,0.08)] active:bg-[rgba(47,54,64,0.12)] dark:text-[#e5e5e5] dark:hover:bg-[rgba(255,255,255,0.08)] dark:active:bg-[rgba(255,255,255,0.12)]"
                onClick={resetVideo}
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
                    d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"
                  />
                </svg>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={4}>
              Reset
            </TooltipContent>
          </Tooltip>

          {/* More button */}
          <Popover open={morePopoverOpen} onOpenChange={setMorePopoverOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    className="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-lg text-[#2f3640] cursor-pointer transition-colors duration-150 outline-none hover:bg-[rgba(47,54,64,0.08)] active:bg-[rgba(47,54,64,0.12)] dark:text-[#e5e5e5] dark:hover:bg-[rgba(255,255,255,0.08)] dark:active:bg-[rgba(255,255,255,0.12)]"
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
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#2f3640] hover:bg-[rgba(47,54,64,0.08)] transition-colors duration-150 outline-none border-none bg-transparent cursor-pointer text-left dark:text-[#e5e5e5] dark:hover:bg-[rgba(255,255,255,0.08)]"
                  onClick={downloadVideo}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="w-4 h-4 flex-shrink-0"
                  >
                    <path
                      fill="currentColor"
                      d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"
                    />
                  </svg>
                  <span className="font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
                    Download video
                  </span>
                </button>
                <div className="h-px w-full bg-[#c1c5cc] dark:bg-[rgba(255,255,255,0.15)]" />
                <button
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150 outline-none border-none bg-transparent cursor-pointer text-left dark:text-red-400 dark:hover:bg-red-900/20"
                  onClick={deleteVideo}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="w-4 h-4 flex-shrink-0"
                  >
                    <path
                      fill="currentColor"
                      d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                    />
                  </svg>
                  <span className="font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
                    Delete video
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
