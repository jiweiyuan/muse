"use client"

import { useEditor, track } from "tldraw"
import { useState } from "react"
import ELK from "elkjs/lib/elk.bundled.js"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/**
 * Floating context menu for multiple selected shapes
 * Provides alignment and distribution tools
 */
export const MultiSelectContextMenu = track(() => {
  const editor = useEditor()
  const [alignPopoverOpen, setAlignPopoverOpen] = useState(false)
  const [distributePopoverOpen, setDistributePopoverOpen] = useState(false)

  const selectedShapes = editor.getSelectedShapes()

  // Only show for multiple shape selection (2 or more)
  if (selectedShapes.length < 2) {
    return null
  }

  // Don't show if user is editing
  if (editor.getEditingShapeId()) {
    return null
  }

  // Get the bounds of all selected shapes to position the menu
  const commonBounds = editor.getSelectionPageBounds()
  if (!commonBounds) return null

  // Convert page coordinates to screen coordinates
  const topLeft = editor.pageToScreen({ x: commonBounds.x, y: commonBounds.y })
  const bottomRight = editor.pageToScreen({
    x: commonBounds.x + commonBounds.width,
    y: commonBounds.y + commonBounds.height
  })

  // Calculate screen-space dimensions
  const screenWidth = bottomRight.x - topLeft.x

  // Position the menu above the selection
  const menuX = topLeft.x + screenWidth / 2 - 50 // Center horizontally (approximate menu width / 2)
  const menuY = topLeft.y - 58 // Position above the selection

  /**
   * Align shapes
   */
  const handleAlign = (direction: 'left' | 'center-horizontal' | 'right' | 'top' | 'center-vertical' | 'bottom') => {
    editor.alignShapes(selectedShapes, direction)
    setAlignPopoverOpen(false)
  }

  /**
   * Distribute shapes
   */
  const handleDistribute = (direction: 'horizontal' | 'vertical') => {
    editor.distributeShapes(selectedShapes, direction)
    setDistributePopoverOpen(false)
  }

  /**
   * Smart layout - arranges shapes using elkjs box layout algorithm
   * Prefers horizontal (wider) layouts over vertical
   */
  const handleSmartLayout = async () => {
    if (selectedShapes.length < 2) return

    // Get bounds for all selected shapes
    const shapesWithBounds = selectedShapes.map(shape => ({
      shape,
      bounds: editor.getShapePageBounds(shape.id)!
    })).filter(item => item.bounds)

    if (shapesWithBounds.length === 0) return

    // Get the center point of the current selection
    const selectionBounds = editor.getSelectionPageBounds()
    if (!selectionBounds) return

    const centerX = selectionBounds.x + selectionBounds.width / 2
    const centerY = selectionBounds.y + selectionBounds.height / 2

    // Create elk instance
    const elk = new ELK()

    // Set desired aspect ratio based on content (prefer horizontal)
    // For horizontal layouts, we want width > height, so aspectRatio > 1
    // Higher values = wider/more horizontal layouts
    const desiredAspectRatio = Math.max(2.0, Math.sqrt(shapesWithBounds.length) * 0.6)

    // Prepare graph for elkjs box layout with horizontal preference
    const graph = {
      id: "root",
      layoutOptions: {
        'elk.algorithm': 'box',
        'elk.spacing.nodeNode': '50',
        'elk.box.packingMode': 'SIMPLE',
        // Set a wide aspect ratio to encourage horizontal layouts
        'elk.aspectRatio': String(desiredAspectRatio),
        // Set desired width much larger than height
        'org.eclipse.elk.aspectRatio': String(desiredAspectRatio)
      },
      children: shapesWithBounds.map((item, index) => ({
        id: `node${index}`,
        width: item.bounds.width,
        height: item.bounds.height
      }))
    }

    try {
      // Run layout algorithm
      const layout = await elk.layout(graph)

      if (!layout.children) return

      // Calculate the bounds of the laid out graph
      const layoutBounds = {
        minX: Math.min(...layout.children.map(n => n.x || 0)),
        minY: Math.min(...layout.children.map(n => n.y || 0)),
        maxX: Math.max(...layout.children.map(n => (n.x || 0) + (n.width || 0))),
        maxY: Math.max(...layout.children.map(n => (n.y || 0) + (n.height || 0)))
      }

      const layoutWidth = layoutBounds.maxX - layoutBounds.minX
      const layoutHeight = layoutBounds.maxY - layoutBounds.minY

      // Calculate offset to center the layout on the original selection center
      const offsetX = centerX - layoutWidth / 2 - layoutBounds.minX
      const offsetY = centerY - layoutHeight / 2 - layoutBounds.minY

      // Apply the layout to shapes
      layout.children.forEach((node, index) => {
        const item = shapesWithBounds[index]

        editor.updateShape({
          id: item.shape.id,
          type: item.shape.type,
          x: (node.x || 0) + offsetX,
          y: (node.y || 0) + offsetY
        })
      })

      setDistributePopoverOpen(false)
    } catch (error) {
      console.error('Layout error:', error)
      setDistributePopoverOpen(false)
    }
  }

  const alignmentOptions = [
    {
      icon: 'M3 3h2v18H3V3zm6 3h12v3H9V6zm0 5h9v3H9v-3zm0 5h12v3H9v-3z',
      label: 'Align Left',
      action: () => handleAlign('left')
    },
    {
      icon: 'M11 3h2v3h4v3h-4v3h6v3h-6v3h4v3h-4v3h-2v-3H7v-3h4v-3H5v-3h6V9H7V6h4V3z',
      label: 'Horizontal Center',
      action: () => handleAlign('center-horizontal')
    },
    {
      icon: 'M19 3h2v18h-2V3zM3 6h12v3H3V6zm6 5h9v3H9v-3zM3 16h12v3H3v-3z',
      label: 'Align Right',
      action: () => handleAlign('right')
    },
    {
      icon: 'M3 3h18v2H3V3zm3 6h3v12H6V9zm5 0h3v9h-3V9zm5 0h3v12h-3V9z',
      label: 'Align Top',
      action: () => handleAlign('top')
    },
    {
      icon: 'M3 11h3V7h3v4h3V5h3v6h3V7h3v4h3v2h-3v4h-3v-4h-3v6h-3v-6H9v4H6v-4H3v-2z',
      label: 'Vertical Center',
      action: () => handleAlign('center-vertical')
    },
    {
      icon: 'M3 19h18v2H3v-2zM6 3h3v12H6V3zm5 6h3v9h-3V9zm5-6h3v12h-3V3z',
      label: 'Align Bottom',
      action: () => handleAlign('bottom')
    }
  ]

  const distributeOptions = [
    {
      icon: 'M4 3h2v18H4V3zm5 4h4v10H9V7zm9-4h2v18h-2V3z',
      label: 'Distribute Horizontally',
      action: () => handleDistribute('horizontal')
    },
    {
      icon: 'M3 4h18v2H3V4zm4 5h10v4H7V9zm-4 9h18v2H3v-2z',
      label: 'Distribute Vertically',
      action: () => handleDistribute('vertical')
    },
    {
      icon: 'M3 3h4v4H3V3zm0 7h4v4H3v-4zm0 7h4v4H3v-4zm7-14h4v4h-4V3zm0 7h4v4h-4v-4zm0 7h4v4h-4v-4zm7-14h4v4h-4V3zm0 7h4v4h-4v-4zm0 7h4v4h-4v-4z',
      label: 'Smart Layout',
      action: handleSmartLayout
    }
  ]

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
          {/* Align button with dropdown */}
          <Popover open={alignPopoverOpen} onOpenChange={setAlignPopoverOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    className="flex items-center justify-center gap-0.5 h-8 px-2 bg-transparent border-none rounded-lg text-[#2f3640] cursor-pointer transition-colors duration-150 outline-none hover:bg-[rgba(47,54,64,0.08)] active:bg-[rgba(47,54,64,0.12)] dark:text-[#e5e5e5] dark:hover:bg-[rgba(255,255,255,0.08)] dark:active:bg-[rgba(255,255,255,0.12)]"
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
                        d="M3 3h2v18H3V3zm6 3h12v3H9V6zm0 5h9v3H9v-3zm0 5h12v3H9v-3z"
                      />
                    </svg>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      fill="none"
                      viewBox="0 0 24 24"
                      className="w-3 h-3 flex-shrink-0"
                    >
                      <path
                        fill="currentColor"
                        d="M7 10l5 5 5-5H7z"
                      />
                    </svg>
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4}>
                Align
              </TooltipContent>
            </Tooltip>
            <PopoverContent
              side="bottom"
              align="start"
              sideOffset={8}
              className="w-56 p-2 bg-white dark:bg-[#1e1e1e] rounded-xl shadow-[0_0_0_0.5px_rgba(0,0,0,0.08),0_4px_8px_rgba(0,0,0,0.08),0_12px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.15),0_4px_8px_rgba(0,0,0,0.3),0_12px_24px_rgba(0,0,0,0.4)]"
            >
              <div className="flex flex-col gap-0.5">
                {alignmentOptions.map((option) => (
                  <button
                    key={option.label}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-[#2f3640] dark:text-[#e5e5e5] hover:bg-[rgba(47,54,64,0.08)] dark:hover:bg-[rgba(255,255,255,0.08)] rounded-lg transition-colors duration-150 outline-none border-none bg-transparent cursor-pointer text-left"
                    onClick={option.action}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="none"
                      viewBox="0 0 24 24"
                      className="w-4 h-4 flex-shrink-0"
                    >
                      <path fill="currentColor" d={option.icon} />
                    </svg>
                    <span className="flex-1 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Divider */}
          <div className="w-px h-6 bg-[#c1c5cc] mx-1 dark:bg-[rgba(255,255,255,0.15)]" />

          {/* Distribute button with dropdown */}
          <Popover open={distributePopoverOpen} onOpenChange={setDistributePopoverOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    className="flex items-center justify-center gap-0.5 h-8 px-2 bg-transparent border-none rounded-lg text-[#2f3640] cursor-pointer transition-colors duration-150 outline-none hover:bg-[rgba(47,54,64,0.08)] active:bg-[rgba(47,54,64,0.12)] dark:text-[#e5e5e5] dark:hover:bg-[rgba(255,255,255,0.08)] dark:active:bg-[rgba(255,255,255,0.12)]"
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
                        d="M4 3h2v18H4V3zm5 4h4v10H9V7zm9-4h2v18h-2V3z"
                      />
                    </svg>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      fill="none"
                      viewBox="0 0 24 24"
                      className="w-3 h-3 flex-shrink-0"
                    >
                      <path
                        fill="currentColor"
                        d="M7 10l5 5 5-5H7z"
                      />
                    </svg>
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4}>
                Distribute
              </TooltipContent>
            </Tooltip>
            <PopoverContent
              side="bottom"
              align="start"
              sideOffset={8}
              className="w-56 p-2 bg-white dark:bg-[#1e1e1e] rounded-xl shadow-[0_0_0_0.5px_rgba(0,0,0,0.08),0_4px_8px_rgba(0,0,0,0.08),0_12px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.15),0_4px_8px_rgba(0,0,0,0.3),0_12px_24px_rgba(0,0,0,0.4)]"
            >
              <div className="flex flex-col gap-0.5">
                {distributeOptions.map((option) => (
                  <button
                    key={option.label}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-[#2f3640] dark:text-[#e5e5e5] hover:bg-[rgba(47,54,64,0.08)] dark:hover:bg-[rgba(255,255,255,0.08)] rounded-lg transition-colors duration-150 outline-none border-none bg-transparent cursor-pointer text-left"
                    onClick={option.action}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="none"
                      viewBox="0 0 24 24"
                      className="w-4 h-4 flex-shrink-0"
                    >
                      <path fill="currentColor" d={option.icon} />
                    </svg>
                    <span className="flex-1 font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </TooltipProvider>
  )
})
