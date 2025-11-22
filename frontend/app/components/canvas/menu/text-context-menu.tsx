"use client"

import { useEditor, DefaultColorStyle, renderPlaintextFromRichText, track, useValue } from "tldraw"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { ChevronDown, Copy } from "lucide-react"
import { CUSTOM_FONT_OPTIONS, FONT_SIZE_OPTIONS, LINE_HEIGHT_OPTIONS, LETTER_SPACING_OPTIONS } from "../extensions/shared-font-constants"

const SUBMENU_OPTIONS = {
  fonts: [
    { id: "draw", label: "Draw", font: "draw" as const },
    { id: "sans", label: "Sans", font: "sans" as const },
    { id: "serif", label: "Serif", font: "serif" as const },
    { id: "mono", label: "Mono", font: "mono" as const },
  ],
  customFonts: CUSTOM_FONT_OPTIONS,
  fontSizes: FONT_SIZE_OPTIONS,
  lineHeights: LINE_HEIGHT_OPTIONS,
  letterSpacings: LETTER_SPACING_OPTIONS,
  colors: [
    { id: "black", label: "Black", color: "black" as const, hex: "#1d1d1d" },
    { id: "grey", label: "Grey", color: "grey" as const, hex: "#9fa8b2" },
    { id: "light-violet", label: "Light Violet", color: "light-violet" as const, hex: "#e085f4" },
    { id: "violet", label: "Violet", color: "violet" as const, hex: "#ae3ec9" },
    { id: "blue", label: "Blue", color: "blue" as const, hex: "#4465e9" },
    { id: "light-blue", label: "Light Blue", color: "light-blue" as const, hex: "#4ba1f1" },
    { id: "yellow", label: "Yellow", color: "yellow" as const, hex: "#f1ac4b" },
    { id: "orange", label: "Orange", color: "orange" as const, hex: "#e16919" },
    { id: "green", label: "Green", color: "green" as const, hex: "#099268" },
    { id: "light-green", label: "Light Green", color: "light-green" as const, hex: "#4cb05e" },
    { id: "light-red", label: "Light Red", color: "light-red" as const, hex: "#f87777" },
    { id: "red", label: "Red", color: "red" as const, hex: "#e03131" },
  ],
}

/**
 * Floating context menu for selected text shapes
 * Matches the unified-shape-context-menu design
 */
export const TextContextMenu = track(() => {
  const editor = useEditor()
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showFontStyleDropdown, setShowFontStyleDropdown] = useState(false)
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false)
  const [showLineHeightDropdown, setShowLineHeightDropdown] = useState(false)
  const [showLetterSpacingDropdown, setShowLetterSpacingDropdown] = useState(false)
  const textEditor = useValue('textEditor', () => editor.getRichTextEditor(), [editor])
  const [, setTextEditorState] = useState(textEditor?.state ?? null)

  // Store current font family, size, line height, and letter spacing from TipTap when available
  const [storedFontFamily, setStoredFontFamily] = useState<string>('Inter')
  const [storedFontSize, setStoredFontSize] = useState<number>(16)
  const [storedLineHeight, setStoredLineHeight] = useState<number>(1.5)
  const [storedLetterSpacing, setStoredLetterSpacing] = useState<number>(0)

  // Track if we're currently applying changes to prevent re-render loops
  const isApplyingRef = useRef(false)
  // Track if we're programmatically editing (not user-initiated)
  const isProgrammaticEditRef = useRef(false)

  const selectedShapes = editor.getSelectedShapes()

  // Only show for text shapes - memoize to stabilize references
  const textShapes = useMemo(() =>
    selectedShapes.filter((shape) => shape.type === "text"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedShapes.map(s => s.id).join(',')]
  )

  // Listen to TipTap editor transaction events and capture font family/size
  useEffect(() => {
    if (!textEditor) {
      setTextEditorState(null)
      return
    }

    const handleTransaction = () => {
      // Skip state updates if we're currently applying changes to prevent re-render loops
      if (isApplyingRef.current) {
        return
      }

      // Update state to trigger re-render when text editor formatting changes
      setTextEditorState(textEditor.state)

      // Capture current font family and size from textStyle
      const textStyleAttrs = textEditor.getAttributes('textStyle')
      const fontFamily = textStyleAttrs.fontFamily
      const fontSize = textStyleAttrs.fontSize

      // Capture line height and letter spacing from paragraph
      const paragraphAttrs = textEditor.getAttributes('paragraph')
      const lineHeight = paragraphAttrs.lineHeight
      const letterSpacing = paragraphAttrs.letterSpacing

      if (fontFamily !== undefined && fontFamily !== null) {
        setStoredFontFamily(fontFamily || 'Inter')
      }
      if (fontSize !== undefined && fontSize !== null) {
        const sizeNum = parseInt(String(fontSize).replace('px', ''))
        if (!isNaN(sizeNum)) {
          setStoredFontSize(sizeNum)
        }
      }
      if (lineHeight !== undefined && lineHeight !== null) {
        const heightNum = parseFloat(String(lineHeight))
        if (!isNaN(heightNum)) {
          setStoredLineHeight(heightNum)
        }
      }
      if (letterSpacing !== undefined && letterSpacing !== null) {
        // Letter spacing stored as percentage value (e.g., "5%", "-5%", or "0.05em")
        const spacingStr = String(letterSpacing)
        if (spacingStr.includes('%')) {
          // Parse percentage format: "5%" -> 5
          const spacingNum = parseFloat(spacingStr.replace('%', ''))
          if (!isNaN(spacingNum)) {
            setStoredLetterSpacing(spacingNum)
          }
        } else if (spacingStr.includes('em')) {
          // Parse em format: "0.05em" -> 5 (convert to percentage)
          const spacingNum = parseFloat(spacingStr.replace('em', ''))
          if (!isNaN(spacingNum)) {
            setStoredLetterSpacing(spacingNum * 100)
          }
        } else {
          // Parse raw number
          const spacingNum = parseFloat(spacingStr)
          if (!isNaN(spacingNum)) {
            setStoredLetterSpacing(spacingNum)
          }
        }
      }
    }

    // Initial read
    handleTransaction()

    textEditor.on('transaction', handleTransaction)
    return () => {
      textEditor.off('transaction', handleTransaction)
      setTextEditorState(null)
    }
  }, [textEditor])

  // Lazy initialization: Only enter edit mode when user interacts with formatting controls
  // This prevents the automatic edit mode trigger that was causing selection issues
  const initializeTipTapEditor = useCallback(() => {
    if (textShapes.length > 0 && !editor.getEditingShapeId() && !textEditor) {
      const firstShape = textShapes[0]

      // Briefly enter edit mode to initialize TipTap editor
      editor.setEditingShape(firstShape.id)

      // Exit after a short delay to let TipTap initialize
      setTimeout(() => {
        if (editor.getEditingShapeId() === firstShape.id) {
          editor.setEditingShape(null)
          // Restore selection
          editor.setSelectedShapes(textShapes.map(s => s.id))
        }
      }, 50)
    }
  }, [editor, textShapes, textEditor])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.text-context-menu')) {
        setShowColorPicker(false)
        setShowFontStyleDropdown(false)
        setShowFontSizeDropdown(false)
        setShowLineHeightDropdown(false)
        setShowLetterSpacingDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Helper function to apply line height changes
  const applyLineHeight = useCallback((newHeight: number) => {
    isApplyingRef.current = true
    isProgrammaticEditRef.current = true

    let processedCount = 0
    const shapes = editor.getSelectedShapes().filter(s => s.type === "text")
    const totalShapes = shapes.length

    shapes.forEach((shape) => {
      editor.setEditingShape(shape.id)
      setTimeout(() => {
        const currentTextEditor = editor.getRichTextEditor()
        if (currentTextEditor) {
          // Select all text and apply line height to all paragraphs
          currentTextEditor.commands.selectAll()
          // @ts-expect-error - Custom TipTap extension command not in base type
          currentTextEditor.commands.setLineHeight(String(newHeight))

          processedCount++

          // Exit editing mode after all shapes are processed
          if (processedCount === totalShapes) {
            setTimeout(() => {
              editor.setEditingShape(null)
              editor.setSelectedShapes(shapes.map(s => s.id))
              isApplyingRef.current = false
              isProgrammaticEditRef.current = false
            }, 200)
          }
        }
      }, 50)
    })
  }, [editor])

  // Helper function to apply letter spacing changes
  const applyLetterSpacing = useCallback((newValue: number) => {
    isApplyingRef.current = true
    isProgrammaticEditRef.current = true

    let processedCount = 0
    const shapes = editor.getSelectedShapes().filter(s => s.type === "text")
    const totalShapes = shapes.length

    // Convert percentage value to em (e.g., 5% = 0.05em, -5% = -0.05em)
    const emValue = newValue / 100

    shapes.forEach((shape) => {
      editor.setEditingShape(shape.id)
      setTimeout(() => {
        const currentTextEditor = editor.getRichTextEditor()
        if (currentTextEditor) {
          // Select all text and apply letter spacing to all paragraphs
          currentTextEditor.commands.selectAll()
          // @ts-expect-error - Custom TipTap extension command not in base type
          currentTextEditor.commands.setLetterSpacing(`${emValue}em`)

          processedCount++

          // Exit editing mode after all shapes are processed
          if (processedCount === totalShapes) {
            setTimeout(() => {
              editor.setEditingShape(null)
              editor.setSelectedShapes(shapes.map(s => s.id))
              isApplyingRef.current = false
              isProgrammaticEditRef.current = false
            }, 200)
          }
        }
      }, 50)
    })
  }, [editor])

  // Don't show if no text shapes are selected
  if (textShapes.length === 0) {
    return null
  }

  // Don't show if multiple different types are selected
  const allTypes = new Set(selectedShapes.map((shape) => shape.type))
  if (allTypes.size > 1) {
    return null
  }

  // Get the first text shape's bounding box to position the menu
  const firstShape = textShapes[0]
  const bounds = editor.getShapePageBounds(firstShape.id)

  if (!bounds) return null

  // Convert page coordinates to screen coordinates
  const topLeft = editor.pageToScreen({ x: bounds.x, y: bounds.y })
  const bottomRight = editor.pageToScreen({ x: bounds.x + bounds.width, y: bounds.y + bounds.height })

  // Calculate screen-space dimensions
  const screenWidth = bottomRight.x - topLeft.x

  // Position the menu above the selected text
  const estimatedMenuWidth = 450 // Approximate menu width
  const menuX = topLeft.x + screenWidth / 2 - estimatedMenuWidth / 2
  const menuY = topLeft.y - 60 // Position above the text

  // Get current styles
  const currentColor = editor.getSharedStyles().get(DefaultColorStyle)

  const currentColorValue = currentColor?.type === "shared" ? currentColor.value : "black"

  const currentColorOption = SUBMENU_OPTIONS.colors.find(c => c.color === currentColorValue)

  // Use stored values from TipTap (captured when user was last editing)
  const customFontFamily = storedFontFamily
  const customFontSize = storedFontSize
  const customLineHeight = storedLineHeight
  const customLetterSpacing = storedLetterSpacing

  const currentCustomFontOption = SUBMENU_OPTIONS.customFonts.find(f => f.value === customFontFamily)
  const currentLineHeightOption = SUBMENU_OPTIONS.lineHeights.find(lh => lh.value === customLineHeight)
  const currentLetterSpacingOption = SUBMENU_OPTIONS.letterSpacings.find(ls => ls.value === customLetterSpacing)

  return (
    <div
      className="text-context-menu fixed pointer-events-auto box-border rounded-xl bg-white/95 dark:bg-[rgba(30,30,30,0.95)] backdrop-blur-lg shadow-[0_0_0_0.5px_rgba(0,0,0,0.08),0_4px_8px_rgba(0,0,0,0.08),0_12px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.15),0_4px_8px_rgba(0,0,0,0.3),0_12px_24px_rgba(0,0,0,0.4)] flex w-max flex-shrink-0 flex-nowrap items-center gap-1.5 p-1.5 text-xs z-[1001]"
      style={{
        left: `${menuX}px`,
        top: `${menuY}px`,
      }}
    >
      {/* Font family dropdown - Custom fonts via TipTap */}
      <div className="relative">
        <button
          className="flex h-7 items-center gap-1 rounded-md px-2 hover:bg-black/5 dark:hover:bg-white/10 min-w-[100px] justify-between"
          onClick={() => {
            initializeTipTapEditor() // Lazy load TipTap editor on first interaction
            setShowFontStyleDropdown(!showFontStyleDropdown)
            setShowColorPicker(false)
            setShowFontSizeDropdown(false)
            setShowLineHeightDropdown(false)
            setShowLetterSpacingDropdown(false)
          }}
        >
          <span className="text-xs font-medium truncate" style={{ fontFamily: customFontFamily }}>
            {currentCustomFontOption?.label || 'Inter'}
          </span>
          <ChevronDown size={12} className={`transition-transform ${showFontStyleDropdown ? "rotate-180" : ""}`} />
        </button>

        {showFontStyleDropdown && (
          <div className="absolute left-0 top-full mt-2 flex min-w-[160px] flex-col rounded-lg border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-800 dark:bg-[#1e1e1e] z-[1002] max-h-[300px] overflow-y-auto">
            {SUBMENU_OPTIONS.customFonts.map((fontOption) => (
              <button
                key={fontOption.id}
                className={`flex items-center gap-2 rounded px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap text-left ${
                  customFontFamily === fontOption.value ? "bg-black/5 dark:bg-white/10" : ""
                }`}
                onClick={() => {
                  // Enter edit mode and use TipTap to change font
                  let processedCount = 0
                  const totalShapes = textShapes.length

                  textShapes.forEach((shape) => {
                    editor.setEditingShape(shape.id)

                    setTimeout(() => {
                      const currentTextEditor = editor.getRichTextEditor()
                      if (currentTextEditor) {
                        // Select all text and apply font
                        currentTextEditor.commands.selectAll()
                        // @ts-expect-error - Custom TipTap extension command not in base type
                        currentTextEditor.chain().focus().setFontFamily(fontOption.value).run()

                        processedCount++

                        // Exit editing mode after all shapes are processed
                        if (processedCount === totalShapes) {
                          setTimeout(() => {
                            editor.setEditingShape(null)
                            editor.setSelectedShapes(textShapes.map(s => s.id))
                          }, 200) // Wait for TipTap to save changes to shape HTML
                        }
                      }
                    }, 50)
                  })

                  setShowFontStyleDropdown(false)
                }}
              >
                <span className="text-sm" style={{ fontFamily: fontOption.value }}>
                  {fontOption.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Font size dropdown */}
      <div className="relative">
        <button
          className="flex h-7 items-center gap-1 rounded-md px-2 hover:bg-black/5 dark:hover:bg-white/10 min-w-[60px] justify-between"
          onClick={() => {
            initializeTipTapEditor() // Lazy load TipTap editor on first interaction
            setShowFontSizeDropdown(!showFontSizeDropdown)
            setShowColorPicker(false)
            setShowFontStyleDropdown(false)
            setShowLineHeightDropdown(false)
            setShowLetterSpacingDropdown(false)
          }}
        >
          <span className="text-xs font-medium">{customFontSize}</span>
          <ChevronDown size={12} className={`transition-transform ${showFontSizeDropdown ? "rotate-180" : ""}`} />
        </button>

        {showFontSizeDropdown && (
          <div className="absolute left-0 top-full mt-2 flex min-w-[140px] flex-col rounded-lg border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-800 dark:bg-[#1e1e1e] z-[1002]">
            {SUBMENU_OPTIONS.fontSizes.map((sizeOption) => (
              <button
                key={sizeOption.value}
                className={`flex items-center justify-between gap-2 rounded px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap text-left ${
                  customFontSize === sizeOption.value ? "bg-black/5 dark:bg-white/10" : ""
                }`}
                onClick={() => {
                  // Enter edit mode and use TipTap to change font size
                  let processedCount = 0
                  const totalShapes = textShapes.length

                  textShapes.forEach((shape) => {
                    editor.setEditingShape(shape.id)

                    setTimeout(() => {
                      const currentTextEditor = editor.getRichTextEditor()
                      if (currentTextEditor) {
                        // Select all text and apply font size
                        currentTextEditor.commands.selectAll()
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        ;(currentTextEditor.chain().focus() as any).setFontSize(`${sizeOption.value}px`).run()

                        processedCount++

                        // Exit editing mode after all shapes are processed
                        if (processedCount === totalShapes) {
                          setTimeout(() => {
                            editor.setEditingShape(null)
                            editor.setSelectedShapes(textShapes.map(s => s.id))
                          }, 200) // Wait for TipTap to save changes to shape HTML
                        }
                      }
                    }, 50)
                  })

                  setShowFontSizeDropdown(false)
                }}
              >
                <span className="text-sm">{sizeOption.label}</span>
                <span className="text-xs opacity-60">{sizeOption.value}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Line height dropdown */}
      <div className="relative">
        <button
          className="flex h-7 items-center gap-1 rounded-md px-2 hover:bg-black/5 dark:hover:bg-white/10 min-w-[80px] justify-between"
          onClick={() => {
            initializeTipTapEditor() // Lazy load TipTap editor on first interaction
            setShowLineHeightDropdown(!showLineHeightDropdown)
            setShowColorPicker(false)
            setShowFontStyleDropdown(false)
            setShowFontSizeDropdown(false)
            setShowLetterSpacingDropdown(false)
          }}
        >
          <div className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 14 14" className="shrink-0">
              <path fill="currentColor" d="M13.52 12.769H.73v-1.051h12.79zm-2.994-2.112H9.384l-.818-1.896H5.724l-.817 1.896H3.764l3.102-7.196h.559zM6.177 7.711h1.936l-.968-2.247zm7.385-5.45H.772V1.21h12.79z"></path>
            </svg>
            <span className="text-xs font-medium">{currentLineHeightOption?.label || 'Normal'}</span>
          </div>
          <ChevronDown size={12} className={`transition-transform ${showLineHeightDropdown ? "rotate-180" : ""}`} />
        </button>

        {showLineHeightDropdown && (
          <div className="absolute left-0 top-full mt-2 flex min-w-[160px] flex-col rounded-lg border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-800 dark:bg-[#1e1e1e] z-[1002]">
            {SUBMENU_OPTIONS.lineHeights.map((lineHeightOption) => (
              <button
                key={lineHeightOption.value}
                className={`flex items-center justify-between gap-2 rounded px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap text-left ${
                  customLineHeight === lineHeightOption.value ? "bg-black/5 dark:bg-white/10" : ""
                }`}
                onClick={() => {
                  applyLineHeight(lineHeightOption.value)
                  setShowLineHeightDropdown(false)
                }}
              >
                <span className="text-sm">{lineHeightOption.label}</span>
                <span className="text-xs opacity-60">{lineHeightOption.value}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Letter spacing dropdown */}
      <div className="relative">
        <button
          className="flex h-7 items-center gap-1 rounded-md px-2 hover:bg-black/5 dark:hover:bg-white/10 min-w-[80px] justify-between"
          onClick={() => {
            initializeTipTapEditor() // Lazy load TipTap editor on first interaction
            setShowLetterSpacingDropdown(!showLetterSpacingDropdown)
            setShowColorPicker(false)
            setShowFontStyleDropdown(false)
            setShowFontSizeDropdown(false)
            setShowLineHeightDropdown(false)
          }}
        >
          <div className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 14 14" className="shrink-0">
              <path fill="currentColor" d="M12.775 13.418h-1.05V.627h1.05zm-10.5-.043h-1.05V.584h1.05zm8.11-2.718H9.244l-.818-1.896H5.584l-.817 1.896H3.624l3.1-7.196h.56zM6.038 7.71h1.936l-.968-2.246z"></path>
            </svg>
            <span className="text-xs font-medium">{currentLetterSpacingOption?.label || 'Normal'}</span>
          </div>
          <ChevronDown size={12} className={`transition-transform ${showLetterSpacingDropdown ? "rotate-180" : ""}`} />
        </button>

        {showLetterSpacingDropdown && (
          <div className="absolute left-0 top-full mt-2 flex min-w-[160px] flex-col rounded-lg border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-800 dark:bg-[#1e1e1e] z-[1002]">
            {SUBMENU_OPTIONS.letterSpacings.map((letterSpacingOption) => (
              <button
                key={letterSpacingOption.value}
                className={`flex items-center justify-between gap-2 rounded px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap text-left ${
                  customLetterSpacing === letterSpacingOption.value ? "bg-black/5 dark:bg-white/10" : ""
                }`}
                onClick={() => {
                  applyLetterSpacing(letterSpacingOption.value)
                  setShowLetterSpacingDropdown(false)
                }}
              >
                <span className="text-sm">{letterSpacingOption.label}</span>
                <span className="text-xs opacity-60">{letterSpacingOption.value >= 0 ? `+${letterSpacingOption.value}` : letterSpacingOption.value}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-6 w-[0.5px] bg-[#C1C5CC] dark:bg-white/20" />

      {/* Color picker button */}
      <div className="relative">
        <button
          type="button"
          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          onClick={() => {
            setShowColorPicker(!showColorPicker)
            setShowFontStyleDropdown(false)
            setShowFontSizeDropdown(false)
            setShowLineHeightDropdown(false)
            setShowLetterSpacingDropdown(false)
          }}
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E5E6EC] dark:bg-[#4A535F]">
            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: currentColorOption?.hex || "#1d1d1d" }} />
          </div>
        </button>

        {showColorPicker && (
          <div className="absolute top-[calc(100%+16px)] left-0 z-[1003] p-3 bg-white/95 dark:bg-[rgba(30,30,30,0.95)] backdrop-blur-lg rounded-lg shadow-lg w-[240px]">
            {/* Color Grid */}
            <div className="grid grid-cols-6 gap-2">
              {SUBMENU_OPTIONS.colors.map((color) => (
                <button
                  key={color.id}
                  title={color.label}
                  className={`w-7 h-7 rounded-full hover:scale-110 transition-all flex items-center justify-center ${
                    currentColorValue === color.color ? "bg-[#e5e7eb] dark:bg-white/15 p-1" : "p-0"
                  }`}
                  onClick={() => {
                    editor.updateShapes(
                      textShapes.map((shape) => ({
                        id: shape.id,
                        type: shape.type,
                        props: { color: color.color },
                      }))
                    )
                    editor.setStyleForNextShapes(DefaultColorStyle, color.color)
                    setShowColorPicker(false)
                  }}
                >
                  <div
                    className={`rounded-full border border-white/20 ${currentColorValue === color.color ? "w-full h-full" : "w-4 h-4"}`}
                    style={{ backgroundColor: color.hex }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="h-6 w-[0.5px] bg-[#C1C5CC] dark:bg-white/20" />

      {/* Copy button */}
      <button
        type="button"
        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        onClick={async () => {
          try {
            const allText = textShapes
              .map((shape) => {
                if ('richText' in shape.props && shape.props.richText) {
                  // Use tldraw helper to convert TipTap rich text to plain text
                  return renderPlaintextFromRichText(editor, shape.props.richText)
                }

                if ('text' in shape.props && typeof shape.props.text === 'string') {
                  const tempDiv = document.createElement('div')
                  tempDiv.innerHTML = shape.props.text
                  return tempDiv.textContent || tempDiv.innerText || ''
                }
                return ''
              })
              .filter((text) => text.trim().length > 0)
              .join('\n')

            if (allText) {
              await navigator.clipboard.writeText(allText)
              console.info('✅ Text copied to clipboard')
            } else {
              console.warn('⚠️ No text to copy')
            }
          } catch (err) {
            console.error('❌ Failed to copy text:', err)
          }
        }}
        title="Copy text"
      >
        <Copy size={14} strokeWidth={2} className="text-[#2F3640] dark:text-[#e5e5e5]" />
      </button>
    </div>
  )
})
