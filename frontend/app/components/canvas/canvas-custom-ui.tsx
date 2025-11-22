"use client"

import { useEffect, useState } from "react"
import { track, useEditor, useMenuClipboardEvents, createShapeId, type Editor, DefaultFontStyle } from "tldraw"
import {
  MousePointer2,
  Hand,
  Type,
  Frame,
  Undo2,
  Redo2,
  Upload,
  Video,
  Music,
  Image as ImageIcon,
} from "lucide-react"
import { ZoomInIcon } from "@/components/icons/zoom-in"
import { ZoomOutIcon } from "@/components/icons/zoom-out"
import { useTheme } from "next-themes"
import { TextContextMenu } from "./menu/text-context-menu"
import { ImageContextMenu } from "./menu/image-context-menu"
import { VideoContextMenu } from "./menu/video-context-menu"
import { AudioContextMenu } from "./menu/audio-context-menu"
import { MultiSelectContextMenu } from "./menu/multi-select-context-menu"
import { CustomContextMenu } from "./menu/custom-context-menu"
import { UploadSubmenu } from "./menu/upload-submenu"
import { ProcessingOverlay } from "./processing-overlay"
import { useCanvasStore } from "@/lib/canvas-store/provider"
import { calculateNormalizedDimensions, findMultipleImagePositions } from "@/lib/canvas-utils"
import { toast } from "@/components/ui/toast"
import "./canvas-ui.css"

/**
 * Trigger media upload file picker (images, videos, and audio)
 */
export function triggerMediaUpload(editor: Editor) {
  const input = document.createElement("input")
  input.type = "file"
  input.accept = "image/*,video/*,audio/*"
  input.multiple = true

  input.onchange = async (e) => {
    const files = (e.target as HTMLInputElement).files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)

    // Validate file sizes before upload (256MB limit)
    const MAX_FILE_SIZE = 256 * 1024 * 1024 // 256MB
    const oversizedFiles = fileArray.filter(file => file.size > MAX_FILE_SIZE)

    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join(', ')
      toast({
        title: "File size limit exceeded",
        description: `The following files exceed the 256MB limit: ${fileNames}`,
        status: "error",
      })
      return
    }

    // For single media file: use putExternalContent but normalize size
    // Note: Audio files are handled in the multiple file section below
    if (fileArray.length === 1) {
      const file = fileArray[0]
      const isVideo = file.type.startsWith('video/')
      const isAudio = file.type.startsWith('audio/')

      if (isVideo) {
        // Load video to get dimensions
        const videoUrl = URL.createObjectURL(file)
        const video = document.createElement('video')
        video.preload = 'metadata'

        await new Promise((resolve, reject) => {
          video.onloadedmetadata = resolve
          video.onerror = reject
          video.src = videoUrl
        })

        // Calculate normalized dimensions (256px base width to match AI-generated images)
        const { width: displayWidth, height: displayHeight } = calculateNormalizedDimensions(
          video.videoWidth,
          video.videoHeight
        )

        // Clean up object URL
        URL.revokeObjectURL(videoUrl)

        // Get shapes before upload to identify newly created one
        const shapesBefore = new Set(editor.getCurrentPageShapeIds())

        // Use putExternalContent to trigger tldraw's upload mechanism
        await editor.putExternalContent({
          type: 'files',
          files: fileArray,
          // point removed - let upload strategy calculate smart position
          ignoreParent: false
        })

        // Wait for next frame to ensure shape is created
        await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

        // Find newly created shape and resize it
        const shapesAfter = editor.getCurrentPageShapeIds()
        const newShapeIds = Array.from(shapesAfter).filter(id => !shapesBefore.has(id))

        if (newShapeIds.length > 0) {
          const shapeId = newShapeIds[0]
          editor.updateShape({
            id: shapeId,
            type: 'video',
            props: {
              w: displayWidth,
              h: displayHeight,
            }
          })
        }

        return
      } else if (!isAudio) {
        // Handle single image file (audio falls through to multiple file handler)
        // Handle image files
        // Load image to get dimensions for normalization
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        const img = new Image()
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = dataUrl
        })

        // Calculate normalized dimensions (256px base width to match AI-generated images)
        const { width: displayWidth, height: displayHeight } = calculateNormalizedDimensions(img.width, img.height)

        // Get shapes before upload to identify newly created one
        const shapesBefore = new Set(editor.getCurrentPageShapeIds())

        // Use putExternalContent to trigger tldraw's upload mechanism
        await editor.putExternalContent({
          type: 'files',
          files: fileArray,
          // point removed - let upload strategy calculate smart position
          ignoreParent: false
        })

        // Wait for next frame to ensure shape is created
        await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

        // Find newly created shape and resize it
        const shapesAfter = editor.getCurrentPageShapeIds()
        const newShapeIds = Array.from(shapesAfter).filter(id => !shapesBefore.has(id))

        if (newShapeIds.length > 0) {
          const shapeId = newShapeIds[0]
          editor.updateShape({
            id: shapeId,
            type: 'image',
            props: {
              w: displayWidth,
              h: displayHeight,
            }
          })
        }

        return
      }
    }

    // For multiple media files: we need custom grid layout
    // First, load media files to get dimensions for grid calculation
    const mediaData: Array<{
      file: File
      displayWidth: number
      displayHeight: number
      mediaType: 'image' | 'video' | 'audio'
    }> = []

    for (const file of fileArray) {
      try {
        const isVideo = file.type.startsWith('video/')
        const isAudio = file.type.startsWith('audio/')

        if (isAudio) {
          // Audio files use fixed dimensions
          mediaData.push({
            file,
            displayWidth: 320,
            displayHeight: 160,
            mediaType: 'audio',
          })
        } else if (isVideo) {
          // Load video to get dimensions
          const videoUrl = URL.createObjectURL(file)
          const video = document.createElement('video')
          video.preload = 'metadata'

          await new Promise((resolve, reject) => {
            video.onloadedmetadata = resolve
            video.onerror = reject
            video.src = videoUrl
          })

          // Calculate normalized dimensions for display
          const { width: displayWidth, height: displayHeight } = calculateNormalizedDimensions(
            video.videoWidth,
            video.videoHeight
          )

          // Clean up object URL
          URL.revokeObjectURL(videoUrl)

          mediaData.push({
            file,
            displayWidth,
            displayHeight,
            mediaType: 'video',
          })
        } else {
          // Load the image to get dimensions (needed for grid layout)
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(file)
          })

          const img = new Image()
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            img.src = dataUrl
          })

          // Calculate normalized dimensions for display
          const { width: displayWidth, height: displayHeight } = calculateNormalizedDimensions(img.width, img.height)

          mediaData.push({
            file,
            displayWidth,
            displayHeight,
            mediaType: 'image',
          })
        }
      } catch (error) {
        console.error("Failed to load media file:", error)
      }
    }

    if (mediaData.length === 0) return

    // Calculate grid positions based on first media file's normalized dimensions
    const refMedia = mediaData[0]
    const positions = findMultipleImagePositions(
      editor,
      mediaData.length,
      refMedia.displayWidth,
      refMedia.displayHeight
    )

    // Get shapes before upload to identify newly created ones
    const shapesBefore = new Set(editor.getCurrentPageShapeIds())

    // Use putExternalContent to trigger tldraw's upload mechanism
    await editor.putExternalContent({
      type: 'files',
      files: fileArray,
      // point removed - let upload strategy calculate smart position
      ignoreParent: false
    })

    // Find newly created shapes
    const shapesAfter = editor.getCurrentPageShapeIds()
    const newShapeIds = Array.from(shapesAfter).filter(id => !shapesBefore.has(id))

    // Wait for next frame to ensure assets are created
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

    // Get all assets to find newly created ones
    const assetsAfter = editor.getAssets()

    // Reposition shapes according to our grid layout
    // Note: putExternalContent creates shapes in the same order as files array
    for (let i = 0; i < Math.min(newShapeIds.length, positions.length); i++) {
      const shapeId = newShapeIds[i]
      const position = positions[i]
      const data = mediaData[i]

      if (data.mediaType === 'audio') {
        // For audio files, we need to find the asset and create a custom audio shape
        // First delete the auto-created shape
        editor.deleteShape(shapeId)

        // Find the corresponding asset (tldraw creates video assets for audio files)
        const audioAsset = assetsAfter.find(asset =>
          asset.type === 'video' && asset.props.src && asset.props.name === data.file.name
        )

        if (audioAsset) {
          // Create custom audio shape
          const audioShapeId = createShapeId()
          editor.createShape({
            id: audioShapeId,
            type: 'audio',
            x: position.x,
            y: position.y,
            props: {
              w: data.displayWidth,
              h: data.displayHeight,
              assetId: audioAsset.id,
            }
          })
          // Update the shape ID for selection later
          newShapeIds[i] = audioShapeId
        }
      } else {
        // For images and videos, update existing shape
        editor.updateShape({
          id: shapeId,
          type: data.mediaType,
          x: position.x,
          y: position.y,
          props: {
            w: data.displayWidth,
            h: data.displayHeight,
          }
        })
      }
    }

    // Select all newly created shapes
    if (newShapeIds.length > 0) {
      editor.setSelectedShapes(newShapeIds)
    }
  }

  input.click()
}

/**
 * Trigger image upload file picker (images only)
 */
export function triggerImageUpload(editor: Editor) {
  const input = document.createElement("input")
  input.type = "file"
  input.accept = "image/*"
  input.multiple = true

  input.onchange = async (e) => {
    const files = (e.target as HTMLInputElement).files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)

    // Validate file sizes before upload (256MB limit)
    const MAX_FILE_SIZE = 256 * 1024 * 1024 // 256MB
    const oversizedFiles = fileArray.filter(file => file.size > MAX_FILE_SIZE)

    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join(', ')
      toast({
        title: "File size limit exceeded",
        description: `The following files exceed the 256MB limit: ${fileNames}`,
        status: "error",
      })
      return
    }

    // For single image file
    if (fileArray.length === 1) {
      const file = fileArray[0]

      // Load image to get dimensions for normalization
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = dataUrl
      })

      // Calculate normalized dimensions (256px base width to match AI-generated images)
      const { width: displayWidth, height: displayHeight } = calculateNormalizedDimensions(img.width, img.height)

      // Get shapes before upload to identify newly created one
      const shapesBefore = new Set(editor.getCurrentPageShapeIds())

      // Use putExternalContent to trigger tldraw's upload mechanism
      // Don't pass point - let the upload strategy calculate smart position
      await editor.putExternalContent({
        type: 'files',
        files: fileArray,
        ignoreParent: false
      })

      // Wait for next frame to ensure shape is created
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

      // Find newly created shape and resize it
      const shapesAfter = editor.getCurrentPageShapeIds()
      const newShapeIds = Array.from(shapesAfter).filter(id => !shapesBefore.has(id))

      if (newShapeIds.length > 0) {
        const shapeId = newShapeIds[0]
        editor.updateShape({
          id: shapeId,
          type: 'image',
          props: {
            w: displayWidth,
            h: displayHeight,
          }
        })
      }

      return
    }

    // For multiple image files: use custom grid layout
    const mediaData: Array<{
      file: File
      displayWidth: number
      displayHeight: number
      mediaType: 'image'
    }> = []

    for (const file of fileArray) {
      try {
        // Load the image to get dimensions (needed for grid layout)
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        const img = new Image()
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = dataUrl
        })

        // Calculate normalized dimensions for display
        const { width: displayWidth, height: displayHeight } = calculateNormalizedDimensions(img.width, img.height)

        mediaData.push({
          file,
          displayWidth,
          displayHeight,
          mediaType: 'image',
        })
      } catch (error) {
        console.error("Failed to load image file:", error)
      }
    }

    if (mediaData.length === 0) return

    // Calculate grid positions based on first image's normalized dimensions
    const refMedia = mediaData[0]
    const positions = findMultipleImagePositions(
      editor,
      mediaData.length,
      refMedia.displayWidth,
      refMedia.displayHeight
    )

    // Get shapes before upload to identify newly created ones
    const shapesBefore = new Set(editor.getCurrentPageShapeIds())

    // Use putExternalContent to trigger tldraw's upload mechanism
    await editor.putExternalContent({
      type: 'files',
      files: fileArray,
      // point removed - let upload strategy calculate smart position
      ignoreParent: false
    })

    // Find newly created shapes
    const shapesAfter = editor.getCurrentPageShapeIds()
    const newShapeIds = Array.from(shapesAfter).filter(id => !shapesBefore.has(id))

    // Wait for next frame to ensure assets are created
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

    // Reposition shapes according to our grid layout
    for (let i = 0; i < Math.min(newShapeIds.length, positions.length); i++) {
      const shapeId = newShapeIds[i]
      const position = positions[i]
      const data = mediaData[i]

      editor.updateShape({
        id: shapeId,
        type: 'image',
        x: position.x,
        y: position.y,
        props: {
          w: data.displayWidth,
          h: data.displayHeight,
        }
      })
    }

    // Select all newly created shapes
    if (newShapeIds.length > 0) {
      editor.setSelectedShapes(newShapeIds)
    }
  }

  input.click()
}

/**
 * Trigger video upload file picker (videos only)
 */
export function triggerVideoUpload(editor: Editor) {
  const input = document.createElement("input")
  input.type = "file"
  input.accept = "video/*"
  input.multiple = true

  input.onchange = async (e) => {
    const files = (e.target as HTMLInputElement).files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)

    // Validate file sizes before upload (256MB limit)
    const MAX_FILE_SIZE = 256 * 1024 * 1024 // 256MB
    const oversizedFiles = fileArray.filter(file => file.size > MAX_FILE_SIZE)

    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join(', ')
      toast({
        title: "File size limit exceeded",
        description: `The following files exceed the 256MB limit: ${fileNames}`,
        status: "error",
      })
      return
    }

    // For single video file
    if (fileArray.length === 1) {
      const file = fileArray[0]

      // Load video to get dimensions
      const videoUrl = URL.createObjectURL(file)
      const video = document.createElement('video')
      video.preload = 'metadata'

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve
        video.onerror = reject
        video.src = videoUrl
      })

      // Calculate normalized dimensions (256px base width to match AI-generated images)
      const { width: displayWidth, height: displayHeight } = calculateNormalizedDimensions(
        video.videoWidth,
        video.videoHeight
      )

      // Clean up object URL
      URL.revokeObjectURL(videoUrl)

      // Get shapes before upload to identify newly created one
      const shapesBefore = new Set(editor.getCurrentPageShapeIds())

      // Use putExternalContent to trigger tldraw's upload mechanism
      // Don't pass point - let the upload strategy calculate smart position
      await editor.putExternalContent({
        type: 'files',
        files: fileArray,
        ignoreParent: false
      })

      // Wait for next frame to ensure shape is created
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

      // Find newly created shape and resize it
      const shapesAfter = editor.getCurrentPageShapeIds()
      const newShapeIds = Array.from(shapesAfter).filter(id => !shapesBefore.has(id))

      if (newShapeIds.length > 0) {
        const shapeId = newShapeIds[0]
        editor.updateShape({
          id: shapeId,
          type: 'video',
          props: {
            w: displayWidth,
            h: displayHeight,
          }
        })
      }

      return
    }

    // For multiple video files: use custom grid layout
    const mediaData: Array<{
      file: File
      displayWidth: number
      displayHeight: number
      mediaType: 'video'
    }> = []

    for (const file of fileArray) {
      try {
        // Load video to get dimensions
        const videoUrl = URL.createObjectURL(file)
        const video = document.createElement('video')
        video.preload = 'metadata'

        await new Promise((resolve, reject) => {
          video.onloadedmetadata = resolve
          video.onerror = reject
          video.src = videoUrl
        })

        // Calculate normalized dimensions for display
        const { width: displayWidth, height: displayHeight } = calculateNormalizedDimensions(
          video.videoWidth,
          video.videoHeight
        )

        // Clean up object URL
        URL.revokeObjectURL(videoUrl)

        mediaData.push({
          file,
          displayWidth,
          displayHeight,
          mediaType: 'video',
        })
      } catch (error) {
        console.error("Failed to load video file:", error)
      }
    }

    if (mediaData.length === 0) return

    // Calculate grid positions based on first video's normalized dimensions
    const refMedia = mediaData[0]
    const positions = findMultipleImagePositions(
      editor,
      mediaData.length,
      refMedia.displayWidth,
      refMedia.displayHeight
    )

    // Get shapes before upload to identify newly created ones
    const shapesBefore = new Set(editor.getCurrentPageShapeIds())

    // Use putExternalContent to trigger tldraw's upload mechanism
    await editor.putExternalContent({
      type: 'files',
      files: fileArray,
      // point removed - let upload strategy calculate smart position
      ignoreParent: false
    })

    // Find newly created shapes
    const shapesAfter = editor.getCurrentPageShapeIds()
    const newShapeIds = Array.from(shapesAfter).filter(id => !shapesBefore.has(id))

    // Wait for next frame to ensure assets are created
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

    // Reposition shapes according to our grid layout
    for (let i = 0; i < Math.min(newShapeIds.length, positions.length); i++) {
      const shapeId = newShapeIds[i]
      const position = positions[i]
      const data = mediaData[i]

      editor.updateShape({
        id: shapeId,
        type: 'video',
        x: position.x,
        y: position.y,
        props: {
          w: data.displayWidth,
          h: data.displayHeight,
        }
      })
    }

    // Select all newly created shapes
    if (newShapeIds.length > 0) {
      editor.setSelectedShapes(newShapeIds)
    }
  }

  input.click()
}

/**
 * Trigger audio upload file picker (audio only)
 */
export function triggerAudioUpload(editor: Editor) {
  const input = document.createElement("input")
  input.type = "file"
  input.accept = "audio/*"
  input.multiple = true

  input.onchange = async (e) => {
    const files = (e.target as HTMLInputElement).files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)

    // Validate file sizes before upload (256MB limit)
    const MAX_FILE_SIZE = 256 * 1024 * 1024 // 256MB
    const oversizedFiles = fileArray.filter(file => file.size > MAX_FILE_SIZE)

    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join(', ')
      toast({
        title: "File size limit exceeded",
        description: `The following files exceed the 256MB limit: ${fileNames}`,
        status: "error",
      })
      return
    }

    console.log("[AudioUpload] Triggering audio upload", { fileCount: fileArray.length })

    // Use putExternalContent - the custom handler in canvas.tsx will handle audio files
    // Don't pass point - let the upload strategy calculate smart position
    await editor.putExternalContent({
      type: 'files',
      files: fileArray,
      ignoreParent: false
    })
  }

  input.click()
}

/**
 * Custom UI Component for tldraw canvas
 * Provides FigJam/Mira-style toolbar with essential drawing tools
 */
export const CanvasCustomUi = track(({ chatVisible }: { chatVisible: boolean }) => {
  const editor = useEditor()
  const { setImageGeneratorVisible, setVideoGeneratorVisible, setAudioGeneratorVisible } = useCanvasStore()
  const clipboardEvents = useMenuClipboardEvents()
  const { resolvedTheme } = useTheme()
  const isDarkMode = resolvedTheme === "dark"
  const [uploadSubmenuOpen, setUploadSubmenuOpen] = useState(false)

  useEffect(() => {
    if (!resolvedTheme) return
    const targetScheme = isDarkMode ? "dark" : "light"
    const currentScheme = editor.user.getIsDarkMode() ? "dark" : "light"
    if (currentScheme !== targetScheme) {
      editor.user.updateUserPreferences({ colorScheme: targetScheme })
    }
  }, [editor, resolvedTheme, isDarkMode])

  // Normalize pasted image sizes to base width (256px)
  useEffect(() => {
    const handleChange = () => {
      // Check all image shapes for size normalization
      const allShapes = editor.getCurrentPageShapes()
      for (const shape of allShapes) {
        if (shape.type === 'image' && !shape.meta.sizeNormalized) {
          // @ts-expect-error - tldraw type complexity
          const assetId = shape.props.assetId
          const asset = editor.getAsset(assetId)

          if (asset && asset.type === 'image' && asset.props.w && asset.props.h) {
            // Calculate normalized dimensions
            const { width: displayWidth, height: displayHeight } = calculateNormalizedDimensions(
              asset.props.w,
              asset.props.h
            )

            // Update shape with normalized size
            editor.updateShape({
              id: shape.id,
              type: 'image',
              props: {
                w: displayWidth,
                h: displayHeight,
              },
              meta: {
                ...shape.meta,
                sizeNormalized: true,
              }
            })
          }
        }
      }
    }

    // Listen for any changes
    const unsubscribe = editor.store.listen(handleChange, { scope: 'document' })

    return () => {
      unsubscribe()
    }
  }, [editor])


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in text
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      // Check if user is editing in a contentEditable element (tldraw text shapes)
      const target = e.target as HTMLElement
      if (target.isContentEditable || target.getAttribute("contenteditable") === "true") {
        return
      }

      // Check if tldraw is in editing state (user is editing text)
      const editingShapeId = editor.getEditingShapeId()
      if (editingShapeId) {
        return
      }

      // Handle clipboard shortcuts
      const isMod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()

      if (isMod) {
        switch (key) {
          case "c": {
            e.preventDefault()
            clipboardEvents.copy("unknown")
            break
          }
          case "v": {
            e.preventDefault()
            // Paste at viewport center with slight offset
            const viewportCenter = editor.getViewportPageBounds().center
            clipboardEvents.paste([], "unknown", viewportCenter)
            break
          }
          case "x": {
            e.preventDefault()
            clipboardEvents.cut("unknown")
            break
          }
          case "z": {
            e.preventDefault()
            if (e.shiftKey) {
              // Ctrl/Cmd + Shift + Z for redo
              editor.redo()
            } else {
              // Ctrl/Cmd + Z for undo
              editor.undo()
            }
            break
          }
          case "y": {
            // Ctrl/Cmd + Y for redo
            e.preventDefault()
            editor.redo()
            break
          }
        }
        return
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in text
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      // Check if user is editing in a contentEditable element (tldraw text shapes)
      const target = e.target as HTMLElement
      if (target.isContentEditable || target.getAttribute("contenteditable") === "true") {
        return
      }

      // Check if tldraw is in editing state (user is editing text)
      const editingShapeId = editor.getEditingShapeId()
      if (editingShapeId) {
        return
      }

      const key = e.key.toLowerCase()

      switch (key) {
        case "delete":
        case "backspace": {
          editor.deleteShapes(editor.getSelectedShapeIds())
          break
        }
        case "v": {
          editor.setCurrentTool("select")
          break
        }
        case "h": {
          editor.setCurrentTool("hand")
          break
        }
        case "t": {
          editor.setStyleForNextShapes(DefaultFontStyle, "sans")
          editor.setCurrentTool("text")
          break
        }
        case "f": {
          editor.setCurrentTool("frame")
          break
        }
        case "u": {
          // Upload media (images, videos, audio)
          triggerMediaUpload(editor)
          break
        }
        case "i": {
          // Open AI image generator
          setImageGeneratorVisible(true)
          break
        }
        case "g": {
          // Open AI video generator
          setVideoGeneratorVisible(true)
          break
        }
        case "a": {
          // Open AI audio generator
          setAudioGeneratorVisible(true)
          break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [editor, clipboardEvents, setImageGeneratorVisible, setVideoGeneratorVisible, setAudioGeneratorVisible])

  const currentTool = editor.getCurrentToolId()

  // Check if current tool starts with any of our tool IDs (e.g., 'text.idle' -> 'text')
  const isToolActive = (toolId: string) => {
    return currentTool === toolId || currentTool.startsWith(`${toolId}.`)
  }

  const tools = [
    {
      id: "text",
      icon: Type,
      label: "Text",
      shortcut: "T",
      type: "tool" as const,
    },
    {
      id: "frame",
      icon: Frame,
      label: "Frame",
      shortcut: "F",
      type: "tool" as const,
    },
  ]

  const navigationTools = [
    {
      id: "select",
      icon: MousePointer2,
      label: "Select",
      shortcut: "V",
      type: "tool" as const,
    },
    {
      id: "hand",
      icon: Hand,
      label: "Hand",
      shortcut: "H",
      type: "tool" as const,
    },
  ]

  const actions = [
    {
      id: "ai-image",
      icon: ImageIcon,
      label: "AI Image",
      shortcut: "I",
      type: "action" as const,
      onClick: () => setImageGeneratorVisible(true),
    },
    {
      id: "ai-video",
      icon: Video,
      label: "AI Video",
      shortcut: "G",
      type: "action" as const,
      onClick: () => setVideoGeneratorVisible(true),
    },
    {
      id: "ai-audio",
      icon: Music,
      label: "AI Audio",
      shortcut: "A",
      type: "action" as const,
      onClick: () => setAudioGeneratorVisible(true),
    },
    {
      id: "upload",
      icon: Upload,
      label: "Upload Media",
      shortcut: "U",
      type: "action" as const,
      onClick: () => setUploadSubmenuOpen(true),
    },
  ]

  return (
    <div className="relative w-full h-full font-['-apple-system',BlinkMacSystemFont,'Segoe_UI',Roboto,Helvetica,Arial,sans-serif] pointer-events-none" data-theme={isDarkMode ? "dark" : "light"}>
      {/* Toolbar - always visible */}
      <div
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2 py-3 px-2 bg-white/95 dark:bg-[rgba(30,30,30,0.95)] rounded-full shadow-[0_0_0_0.5px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_4px_8px_rgba(0,0,0,0.2),0_8px_16px_rgba(0,0,0,0.3)] backdrop-blur-[16px] pointer-events-auto outline-[0.5px] outline-transparent -outline-offset-[0.5px]"
        data-chat-visible={chatVisible}
      >
            {/* AI Actions Section */}
            <div className="flex flex-col items-center gap-2 p-0">
              {actions.filter(a => a.id !== "upload").map((action) => {
                const Icon = action.icon

                return (
                  <button
                    key={action.id}
                    className="relative flex items-center justify-center w-[38px] h-[38px] p-0 border-none rounded-full cursor-pointer transition-all duration-150 outline-none bg-transparent text-[#6b7280] dark:text-[#9ca3af] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:bg-black/[0.08] dark:active:bg-white/[0.1] active:scale-[0.96]"
                    onClick={action.onClick}
                    title={`${action.label} (${action.shortcut})`}
                  >
                    <Icon size={14} strokeWidth={2} />
                  </button>
                )
              })}
            </div>

            {/* Upload Section */}
            <div className="flex flex-col items-center gap-2 p-0">
              {actions.filter(a => a.id === "upload").map((action) => {
                const Icon = action.icon

                const button = (
                  <button
                    key={action.id}
                    className="relative flex items-center justify-center w-[38px] h-[38px] p-0 border-none rounded-full cursor-pointer transition-all duration-150 outline-none bg-[#0e1014] dark:bg-[#e5e5e5] text-white dark:text-[#0e1014] hover:bg-[#1a1d23] dark:hover:bg-[#f3f4f6] active:bg-[#2a2e35] dark:active:bg-white"
                    onClick={action.onClick}
                    title={`${action.label} (${action.shortcut})`}
                  >
                    <Icon size={14} strokeWidth={2} />
                  </button>
                )

                return (
                  <UploadSubmenu
                    key={action.id}
                    trigger={button}
                    open={uploadSubmenuOpen}
                    onOpenChange={setUploadSubmenuOpen}
                  />
                )
              })}
            </div>
          </div>

      {/* Controls - bottom left horizontal layout */}
      <div className="absolute bottom-3 left-6 z-[1000] flex items-center gap-2">
        {/* Zoom controls */}
        <div className="inline-flex items-center justify-center gap-1 h-8 px-2 bg-white/95 dark:bg-[rgba(30,30,30,0.95)] rounded-full shadow-[0_0_0_0.5px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2),0_8px_16px_rgba(0,0,0,0.3)] backdrop-blur-[16px] pointer-events-auto">
          <button
            className="flex items-center justify-center w-6 h-6 p-0 border-none rounded-full cursor-pointer transition-all duration-150 outline-none bg-transparent text-[#374151] dark:text-[#e5e7eb] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:bg-black/[0.08] dark:active:bg-white/[0.1] active:scale-[0.96]"
            onClick={() => editor.zoomOut()}
            title="Zoom out"
          >
            <ZoomOutIcon width={10} height={10} />
          </button>
          <span className="text-xs text-[#374151] dark:text-[#e5e7eb] cursor-pointer px-1 select-none" title="Reset zoom" onClick={() => editor.resetZoom()}>
            {Math.round(editor.getZoomLevel() * 100)}%
          </span>
          <button
            className="flex items-center justify-center w-6 h-6 p-0 border-none rounded-full cursor-pointer transition-all duration-150 outline-none bg-transparent text-[#374151] dark:text-[#e5e7eb] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:bg-black/[0.08] dark:active:bg-white/[0.1] active:scale-[0.96]"
            onClick={() => editor.zoomIn()}
            title="Zoom in"
          >
            <ZoomInIcon width={10} height={10} />
          </button>
        </div>

        {/* Undo/Redo controls */}
        <div className="inline-flex items-center gap-1 h-8 px-2 bg-white/95 dark:bg-[rgba(30,30,30,0.95)] rounded-full shadow-[0_0_0_0.5px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2),0_8px_16px_rgba(0,0,0,0.3)] backdrop-blur-[16px] pointer-events-auto">
          <button
            className="flex items-center justify-center w-6 h-6 p-0 border-none rounded-full cursor-pointer transition-all duration-150 outline-none bg-transparent text-[#374151] dark:text-[#e5e7eb] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:bg-black/[0.08] dark:active:bg-white/[0.1] active:scale-[0.96]"
            onClick={() => editor.undo()}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={10} strokeWidth={2} />
          </button>
          <button
            className="flex items-center justify-center w-6 h-6 p-0 border-none rounded-full cursor-pointer transition-all duration-150 outline-none bg-transparent text-[#374151] dark:text-[#e5e7eb] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:bg-black/[0.08] dark:active:bg-white/[0.1] active:scale-[0.96]"
            onClick={() => editor.redo()}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={10} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Navigation Tools - bottom center */}
      <div
        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2"
      >
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white/95 dark:bg-[rgba(30,30,30,0.95)] rounded-full shadow-[0_0_0_0.5px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2),0_8px_16px_rgba(0,0,0,0.3)] backdrop-blur-[16px] pointer-events-auto">
          {[...navigationTools, ...tools].map((tool) => {
            const Icon = tool.icon
            const isActive = isToolActive(tool.id)

            return (
              <button
                key={tool.id}
                className={`flex items-center justify-center w-[32px] h-[32px] p-0 border-none rounded-full cursor-pointer transition-all duration-150 outline-none
                  ${!isActive ? 'bg-transparent text-[#6b7280] dark:text-[#9ca3af] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:bg-black/[0.08] dark:active:bg-white/[0.1] active:scale-[0.96]' : ''}
                  ${isActive ? '!bg-[#0e1014] dark:!bg-[#e5e5e5] text-white dark:text-[#0e1014] hover:!bg-[#1a1d23] dark:hover:!bg-[#f3f4f6]' : ''}
                `}
                onClick={() => {
                  // Set default font style for text tool
                  if (tool.id === "text") {
                    editor.setStyleForNextShapes(DefaultFontStyle, "sans")
                  }
                  editor.setCurrentTool(tool.id)
                }}
                title={`${tool.label} (${tool.shortcut})`}
              >
                <Icon size={12} strokeWidth={2} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Floating context menus for selected shapes */}
      <TextContextMenu />
      <ImageContextMenu />
      <VideoContextMenu />
      <AudioContextMenu />
      <MultiSelectContextMenu />

      {/* Custom right-click context menu */}
      <CustomContextMenu />

      {/* Processing overlay for images being processed */}
      <ProcessingOverlay />
    </div>
  )
})
