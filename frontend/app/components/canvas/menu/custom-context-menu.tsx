"use client"

import { useEditor, track, useContainer, TLUiEventSource, useMenuClipboardEvents } from "tldraw"
import { useState, useEffect, useCallback } from "react"
import {
  Copy,
  Clipboard,
  Trash2,
  Lock,
  Unlock,
  SendToBack,
  BringToFront,
  Group,
  Ungroup,
  Scissors,
  SquareDashedMousePointer,
} from "lucide-react"

/**
 * Custom right-click context menu for tldraw
 */
export const CustomContextMenu = track(() => {
  const editor = useEditor()
  const container = useContainer()
  const clipboardEvents = useMenuClipboardEvents()
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [menuRef, setMenuRef] = useState<HTMLDivElement | null>(null)

  const selectedShapes = editor.getSelectedShapes()
  const hasSelection = selectedShapes.length > 0
  const canGroup = selectedShapes.length > 1

  // Define all callbacks BEFORE any conditional returns (hooks must be at top level)
  const handleCopy = useCallback(() => {
    clipboardEvents.copy("context-menu" as TLUiEventSource)
  }, [clipboardEvents])

  const handlePaste = useCallback(() => {
    // Convert screen position to page coordinates for paste location
    if (position) {
      const pagePoint = editor.screenToPage({ x: position.x, y: position.y })
      clipboardEvents.paste([], "context-menu" as TLUiEventSource, pagePoint)
    } else {
      clipboardEvents.paste([], "context-menu" as TLUiEventSource)
    }
  }, [clipboardEvents, editor, position])

  const handleCut = useCallback(() => {
    clipboardEvents.cut("context-menu" as TLUiEventSource)
  }, [clipboardEvents])

  const handleAction = useCallback(
    async (action: () => void | Promise<void>) => {
      await action()
      setPosition(null)
    },
    []
  )

  // Handle context menu open
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()

      // Get click position relative to viewport
      const x = e.clientX
      const y = e.clientY

      setPosition({ x, y })
    }

    container.addEventListener("contextmenu", handleContextMenu)
    return () => {
      container.removeEventListener("contextmenu", handleContextMenu)
    }
  }, [container])

  // Handle clicks outside to close menu
  useEffect(() => {
    if (!position) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef && !menuRef.contains(e.target as Node)) {
        setPosition(null)
      }
    }

    // Small delay to avoid immediate close
    setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside)
    }, 0)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [position, menuRef])

  // Adjust position if menu would overflow viewport
  useEffect(() => {
    if (!position || !menuRef) return

    const menuRect = menuRef.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let { x, y } = position

    // Adjust horizontal position
    if (x + menuRect.width > viewportWidth) {
      x = viewportWidth - menuRect.width - 10
    }

    // Adjust vertical position
    if (y + menuRect.height > viewportHeight) {
      y = viewportHeight - menuRect.height - 10
    }

    if (x !== position.x || y !== position.y) {
      setPosition({ x, y })
    }
  }, [position, menuRef])

  if (!position) return null

  const menuItems = [
    ...(hasSelection
      ? [
          {
            icon: Copy,
            label: "Copy",
            shortcut: "⌘C",
            action: handleCopy,
          },
          {
            icon: Scissors,
            label: "Cut",
            shortcut: "⌘X",
            action: handleCut,
          },
          {
            icon: Clipboard,
            label: "Duplicate",
            shortcut: "⌘D",
            action: () => {
              editor.duplicateShapes(editor.getSelectedShapeIds())
            },
          },
          { divider: true },
        ]
      : [
          {
            icon: Clipboard,
            label: "Paste",
            shortcut: "⌘V",
            action: handlePaste,
          },
          { divider: true },
          {
            icon: SquareDashedMousePointer,
            label: "Select all",
            shortcut: "⌘A",
            action: () => {
              editor.selectAll()
            },
          },
        ]),

    ...(hasSelection
      ? [
          {
            icon: BringToFront,
            label: "Bring to front",
            action: () => {
              editor.bringToFront(editor.getSelectedShapeIds())
            },
          },
          {
            icon: SendToBack,
            label: "Send to back",
            action: () => {
              editor.sendToBack(editor.getSelectedShapeIds())
            },
          },
          { divider: true },
        ]
      : []),

    ...(canGroup
      ? [
          {
            icon: Group,
            label: "Group",
            shortcut: "⌘G",
            action: () => {
              editor.groupShapes(editor.getSelectedShapeIds())
            },
          },
        ]
      : []),

    ...(hasSelection && selectedShapes.some((s) => s.type === "group")
      ? [
          {
            icon: Ungroup,
            label: "Ungroup",
            shortcut: "⌘⇧G",
            action: () => {
              editor.ungroupShapes(editor.getSelectedShapeIds())
            },
          },
          { divider: true },
        ]
      : canGroup
      ? [{ divider: true }]
      : []),

    ...(hasSelection
      ? [
          {
            icon: selectedShapes.some((shape) => editor.isShapeOrAncestorLocked(shape))
              ? Unlock
              : Lock,
            label: selectedShapes.some((shape) => editor.isShapeOrAncestorLocked(shape))
              ? "Unlock"
              : "Lock",
            shortcut: "⌘L",
            action: () => {
              const shapesToToggle = editor.getSelectedShapeIds()
              const allLocked = shapesToToggle.every((id) =>
                editor.isShapeOrAncestorLocked(editor.getShape(id)!)
              )
              editor.updateShapes(
                shapesToToggle.map((id) => ({
                  id,
                  type: editor.getShape(id)!.type,
                  isLocked: !allLocked,
                }))
              )
            },
          },
          { divider: true },
          {
            icon: Trash2,
            label: "Delete",
            shortcut: "⌫",
            action: () => {
              editor.deleteShapes(editor.getSelectedShapeIds())
            },
            danger: true,
          },
        ]
      : []),
  ]

  return (
    <div
      ref={setMenuRef}
      className="fixed z-[10000] min-w-[200px] rounded-lg bg-white dark:bg-[#1e1e1e] backdrop-blur-lg shadow-[0_0_0_0.5px_rgba(0,0,0,0.08),0_4px_8px_rgba(0,0,0,0.08),0_12px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.15),0_4px_8px_rgba(0,0,0,0.3),0_12px_24px_rgba(0,0,0,0.4)] py-1 pointer-events-auto"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {menuItems.map((item, index) => {
        if ("divider" in item) {
          return (
            <div
              key={`divider-${index}`}
              className="my-1 h-[0.5px] bg-[#e5e7eb] dark:bg-white/10"
            />
          )
        }

        const Icon = item.icon

        return (
          <button
            key={item.label}
            type="button"
            className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
              item.danger
                ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                : "text-[#2f3640] dark:text-[#e5e5e5] hover:bg-[#f3f4f6] dark:hover:bg-white/10"
            }`}
            onClick={(e) => {
              e.stopPropagation()
              handleAction(item.action)
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Icon size={16} className="flex-shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-[#6b7280] dark:text-[#9ca3af]">
                {item.shortcut}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
})
