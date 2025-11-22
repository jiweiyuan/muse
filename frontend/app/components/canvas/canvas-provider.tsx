"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { Editor } from "tldraw"

interface CanvasContextValue {
  editor: Editor | null
}

const CanvasContext = createContext<CanvasContextValue | null>(null)

export function CanvasProvider({
  editor,
  children,
}: {
  editor: Editor | null
  children: ReactNode
}) {
  return <CanvasContext.Provider value={{ editor }}>{children}</CanvasContext.Provider>
}

export function useCanvasEditor() {
  const context = useContext(CanvasContext)
  if (!context) {
    throw new Error("useCanvasEditor must be used within CanvasProvider")
  }
  return context.editor
}
