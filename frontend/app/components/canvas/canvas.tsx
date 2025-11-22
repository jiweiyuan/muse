"use client"

import {
  Tldraw,
  AssetRecordType,
  getHashForString,
  uniqueId,
  type TLBookmarkAsset,
  type TLAsset,
  type Editor,
  type TLComponents,
  DefaultFontStyle,
  defaultShapeUtils,
} from "tldraw"
import { useSync } from "@tldraw/sync"
import "tldraw/tldraw.css"
import { useCanvasStore } from "@/lib/canvas-store/provider"
import { useMemo, useCallback, useEffect, useRef } from "react"
import { CanvasCustomUi } from "./canvas-custom-ui"
import { textOptions as richTextOptions, extensionFontFamilies } from "./extensions/text-editor-config"
import { toast } from "@/components/ui/toast"
import { AudioShapeUtil } from "./shapes/audio-shape"
import { customTLSchema } from "@muse/shared-schemas"
import { findNewAssetPosition } from "@/lib/canvas-utils"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
const WS_URL = BACKEND_URL.replace(/^http/, "ws")

// Create asset store for blob storage
const createAssetStore = (canvasId: string) => ({
  async upload(_asset: TLAsset, file: File) {
    // Create a unique, clean asset ID without special characters
    const id = uniqueId()
    const assetId = `${id}-${file.name}`.replace(/[^a-zA-Z0-9.]/g, "-")

    console.log("[Canvas] Uploading asset", {
      assetId,
      fileName: file.name,
      contentType: file.type,
      endpoint: `${BACKEND_URL}/v1/assets/${assetId}`,
    })

    const response = await fetch(
      `${BACKEND_URL}/v1/assets/${assetId}?canvasId=${canvasId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
        credentials: "include",
      }
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => null)
      console.error("[Canvas] Asset upload failed", {
        assetId,
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      })

      // Show user-friendly error messages
      let errorMessage = "Failed to upload file"
      if (response.status === 413) {
        errorMessage = "File is too large (max 256MB)"
      } else if (response.status === 400 && errorText?.includes("content type")) {
        errorMessage = "File type not supported"
      } else if (response.status === 401) {
        errorMessage = "You must be logged in to upload files"
      } else if (response.status === 403) {
        errorMessage = "You don't have permission to upload to this canvas"
      }

      toast({
        title: "Upload failed",
        description: errorMessage,
        status: "error",
      })

      throw new Error(errorMessage)
    }

    // Extract clean filename without extension for title
    // If it's a pasted/default file (tldrawFile), use appropriate media type
    let cleanFileName = file.name.replace(/\.[^/.]+$/, "") || "Untitled Media"
    if (cleanFileName === 'tldrawFile' || cleanFileName.startsWith('tldraw')) {
      // Determine if it's an image or video
      cleanFileName = file.type.startsWith('video/') ? 'Video' : 'Image'
    }

    console.log("[Canvas] Asset upload succeeded", {
      assetId,
      src: `${BACKEND_URL}/v1/assets/${assetId}`,
    })

    // Return object with src and metadata as per v3.8.0+ API
    return {
      src: `${BACKEND_URL}/v1/assets/${assetId}`,
      meta: {
        title: cleanFileName
      }
    }
  },

  resolve(asset: TLAsset) {
    // Assets are already stored with full URLs
    return asset.props.src
  },

  async remove(assetIds: string[]) {
    // Clean up assets from storage when deleted from canvas
    await Promise.all(
      assetIds.map(async (assetId) => {
        try {
          const response = await fetch(`${BACKEND_URL}/v1/assets/${assetId}`, {
            method: "DELETE",
            credentials: "include",
          })

          if (!response.ok) {
            console.error(`Failed to delete asset ${assetId}`)
          }
        } catch (error) {
          console.error(`Error deleting asset ${assetId}:`, error)
        }
      })
    )
  },
})

interface CanvasProps {
  canvasId: string
  chatVisible: boolean
}

// ============================================================================
// FILE UPLOAD ARCHITECTURE
// ============================================================================
//
// This module uses the Strategy Pattern + Template Method Pattern for file uploads:
//
// 1. Template Method Pattern: MediaUploadStrategy provides common upload flow
//    - All media uploads go through the same backend upload process
//    - Subclasses implement specific asset creation and shape creation logic
//
// 2. Strategy Pattern: Each file type has its own upload strategy
//    - AudioUploadStrategy: Handles audio files → creates audio shapes
//    - ImageUploadStrategy: Handles image files → creates image shapes
//    - VideoUploadStrategy: Handles video files → creates video shapes
//
// 3. Factory Pattern: FileUploadManager selects the right strategy
//    - Iterates through registered strategies
//    - Returns the first strategy that can handle the file
//
// Benefits:
//    ✓ Easy to add new file types (extend MediaUploadStrategy)
//    ✓ Each strategy is isolated and testable
//    ✓ Common upload logic is centralized in MediaUploadStrategy
//    ✓ No reliance on tldraw's default asset upload (we control the flow)
//    ✓ Open/Closed Principle: Open for extension, closed for modification
//
// Flow Diagram:
//    User uploads files
//         ↓
//    FileUploadManager.uploadFiles()
//         ↓
//    For each file:
//         ├─ ImageUploadStrategy.canHandle(file)?
//         │   ├─ Yes → MediaUploadStrategy.upload()
//         │   │          ├─ Upload to backend
//         │   │          ├─ ImageUploadStrategy.createAssetRecord()
//         │   │          └─ ImageUploadStrategy.createShape()
//         │   └─ No → Try next strategy
//         ├─ VideoUploadStrategy.canHandle(file)?
//         ├─ AudioUploadStrategy.canHandle(file)?
//         └─ No match → Show error toast
//
// Usage:
//    const manager = new FileUploadManager(canvasId)
//    await manager.uploadFiles(editor, files)
//
// ============================================================================

/**
 * File Upload Strategy Pattern
 * Each file type has its own upload strategy
 */
interface FileUploadStrategy {
  canHandle(file: File): boolean
  upload(editor: Editor, file: File, point?: { x: number; y: number }): Promise<void>
}

/**
 * Base class for media upload strategies
 * Provides common upload functionality for audio, image, and video files
 */
abstract class MediaUploadStrategy implements FileUploadStrategy {
  constructor(protected canvasId: string) {}

  abstract canHandle(file: File): boolean
  abstract createShape(editor: Editor, assetRecord: TLAsset, file: File, point?: { x: number; y: number }): void

  async upload(editor: Editor, file: File, point?: { x: number; y: number }): Promise<void> {
    try {
      console.log("[Canvas] Uploading media file", { fileName: file.name, type: file.type })

      // Create unique asset ID
      const id = uniqueId()
      const assetId = `${id}-${file.name}`.replace(/[^a-zA-Z0-9.]/g, "-")

      // Upload to backend with canvasId
      const response = await fetch(
        `${BACKEND_URL}/v1/assets/${assetId}?canvasId=${this.canvasId}`,
        {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
          credentials: "include",
        }
      )

      if (!response.ok) {
        const errorText = await response.text().catch(() => null)
        console.error("[Canvas] Media upload failed", { assetId, status: response.status, body: errorText })

        let errorMessage = "Failed to upload file"
        if (response.status === 413) {
          errorMessage = "File is too large (max 256MB)"
        } else if (response.status === 400 && errorText?.includes("content type")) {
          errorMessage = "File type not supported"
        } else if (response.status === 401) {
          errorMessage = "You must be logged in to upload files"
        } else if (response.status === 403) {
          errorMessage = "You don't have permission to upload to this canvas"
        }

        toast({
          title: "Upload failed",
          description: errorMessage,
          status: "error",
        })
        throw new Error(errorMessage)
      }

      console.log("[Canvas] Media uploaded successfully", { assetId })

      // Create asset record based on file type
      const assetRecord = await this.createAssetRecord(file, assetId)
      editor.createAssets([assetRecord])

      // Create shape using the subclass implementation
      this.createShape(editor, assetRecord, file, point)

      console.log("[Canvas] Media shape created", { assetId: assetRecord.id })
    } catch (error) {
      console.error("[Canvas] Failed to process media file", { fileName: file.name, error })
      toast({
        title: "Upload failed",
        description: `Failed to upload ${file.name}`,
        status: "error",
      })
      throw error
    }
  }

  protected async createAssetRecord(_file: File, _assetId: string): Promise<TLAsset> {
    // To be implemented by subclasses
    throw new Error("createAssetRecord must be implemented by subclass")
  }
}

/**
 * Audio File Upload Strategy
 * Handles audio files by creating custom audio shapes
 */
class AudioUploadStrategy extends MediaUploadStrategy {
  private readonly audioWidth = 320
  private readonly audioHeight = 160

  canHandle(file: File): boolean {
    return file.type.startsWith('audio/')
  }

  protected async createAssetRecord(file: File, assetId: string): Promise<TLAsset> {
    // tldraw uses video assets for audio
    return AssetRecordType.create({
      id: AssetRecordType.createId(getHashForString(assetId)),
      type: 'video',
      props: {
        src: `${BACKEND_URL}/v1/assets/${assetId}`,
        name: file.name,
        w: this.audioWidth,
        h: this.audioHeight,
        mimeType: file.type,
        isAnimated: false,
      }
    })
  }

  createShape(editor: Editor, assetRecord: TLAsset, file: File, point?: { x: number; y: number }): void {
    // Calculate position: use provided point (from drag-drop) or find new position
    const position = point ?? findNewAssetPosition(editor, this.audioWidth, this.audioHeight)

    editor.createShape({
      type: 'audio',
      x: position.x,
      y: position.y,
      props: {
        w: this.audioWidth,
        h: this.audioHeight,
        assetId: assetRecord.id,
      }
    })
  }
}

/**
 * Image File Upload Strategy
 * Handles image files by creating image shapes with proper dimensions
 */
class ImageUploadStrategy extends MediaUploadStrategy {
  canHandle(file: File): boolean {
    return file.type.startsWith('image/')
  }

  protected async createAssetRecord(file: File, assetId: string): Promise<TLAsset> {
    // Get image dimensions
    const img = await this.loadImage(file)

    return AssetRecordType.create({
      id: AssetRecordType.createId(getHashForString(assetId)),
      type: 'image',
      props: {
        src: `${BACKEND_URL}/v1/assets/${assetId}`,
        name: file.name,
        w: img.width,
        h: img.height,
        mimeType: file.type,
        isAnimated: false,
      }
    })
  }

  createShape(editor: Editor, assetRecord: TLAsset, file: File, point?: { x: number; y: number }): void {
    const asset = assetRecord as Extract<TLAsset, { type: 'image' }>

    // Calculate position: use provided point (from drag-drop) or find new position
    const position = point ?? findNewAssetPosition(editor, asset.props.w, asset.props.h)

    editor.createShape({
      type: 'image',
      x: position.x,
      y: position.y,
      props: {
        w: asset.props.w,
        h: asset.props.h,
        assetId: assetRecord.id,
      }
    })
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }
}

/**
 * Video File Upload Strategy
 * Handles video files by creating video shapes with proper dimensions
 */
class VideoUploadStrategy extends MediaUploadStrategy {
  canHandle(file: File): boolean {
    return file.type.startsWith('video/')
  }

  protected async createAssetRecord(file: File, assetId: string): Promise<TLAsset> {
    // Get video dimensions
    const video = await this.loadVideo(file)

    return AssetRecordType.create({
      id: AssetRecordType.createId(getHashForString(assetId)),
      type: 'video',
      props: {
        src: `${BACKEND_URL}/v1/assets/${assetId}`,
        name: file.name,
        w: video.videoWidth,
        h: video.videoHeight,
        mimeType: file.type,
        isAnimated: false,
      }
    })
  }

  createShape(editor: Editor, assetRecord: TLAsset, file: File, point?: { x: number; y: number }): void {
    const asset = assetRecord as Extract<TLAsset, { type: 'video' }>

    // Calculate position: use provided point (from drag-drop) or find new position
    const position = point ?? findNewAssetPosition(editor, asset.props.w, asset.props.h)

    editor.createShape({
      type: 'video',
      x: position.x,
      y: position.y,
      props: {
        w: asset.props.w,
        h: asset.props.h,
        assetId: assetRecord.id,
      }
    })
  }

  private loadVideo(file: File): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.onloadedmetadata = () => resolve(video)
      video.onerror = reject
      video.src = URL.createObjectURL(file)
      video.load()
    })
  }
}

/**
 * File Upload Manager (Factory Pattern)
 * Coordinates file uploads using the appropriate strategy
 *
 * All media files (audio, image, video) now use explicit upload strategies
 * that handle the upload to the backend and create the appropriate shapes.
 *
 * To add a new file type:
 * 1. Create a new class extending MediaUploadStrategy
 * 2. Add it to the constructor
 *
 * Example:
 *   class PDFUploadStrategy extends MediaUploadStrategy {
 *     canHandle(file: File) { return file.type === 'application/pdf' }
 *     protected async createAssetRecord(editor, file, assetId) { ... }
 *     createShape(editor, assetRecord, file, point) { ... }
 *   }
 *
 *   constructor(canvasId: string) {
 *     this.strategies.push(new AudioUploadStrategy(canvasId))
 *     this.strategies.push(new ImageUploadStrategy(canvasId))
 *     this.strategies.push(new VideoUploadStrategy(canvasId))
 *     this.strategies.push(new PDFUploadStrategy(canvasId))  // <-- Add here
 *   }
 */
class FileUploadManager {
  private strategies: FileUploadStrategy[] = []

  constructor(canvasId: string) {
    // Register all media upload strategies
    this.strategies.push(new AudioUploadStrategy(canvasId))
    this.strategies.push(new ImageUploadStrategy(canvasId))
    this.strategies.push(new VideoUploadStrategy(canvasId))
  }

  getStrategy(file: File): FileUploadStrategy | null {
    return this.strategies.find(s => s.canHandle(file)) ?? null
  }

  async uploadFiles(
    editor: Editor,
    files: File[],
    point?: { x: number; y: number }
  ): Promise<{ handled: File[], unhandled: File[] }> {
    const handled: File[] = []
    const unhandled: File[] = []

    for (const file of files) {
      const strategy = this.getStrategy(file)

      if (strategy) {
        // All recognized media files are handled by their respective strategies
        // Pass point directly - if undefined, strategy will calculate smart position
        await strategy.upload(editor, file, point)
        handled.push(file)
      } else {
        // Unknown file types are not supported
        console.warn("[Canvas] No upload strategy found for file type", { fileName: file.name, type: file.type })
        unhandled.push(file)
        toast({
          title: "File type not supported",
          description: `Cannot upload ${file.name}`,
          status: "error",
        })
      }
    }

    return { handled, unhandled }
  }
}

export function Canvas({ canvasId, chatVisible }: CanvasProps) {
  const { editor, setEditor, setIsReady, setCanvasId } = useCanvasStore()
  const hasZoomedRef = useRef(false)

  // Create asset store for this canvas
  const assetStore = useMemo(() => createAssetStore(canvasId), [canvasId])

  // Memoize shapeUtils to prevent re-renders
  const shapeUtils = useMemo(() => [...defaultShapeUtils, AudioShapeUtil], [])

  const storeWithStatus = useSync({
    uri: `${WS_URL}/ws/canvas/${canvasId}`,
    assets: assetStore,
    shapeUtils,
    schema: customTLSchema,
  })

  // Handle editor mount
  const handleMount = useCallback(
    (editor: Editor) => {
      setEditor(editor)
      setIsReady(true)

      // Set camera options - allow zoom from 10% to 800%
      editor.setCameraOptions({
        zoomSteps: [0.1, 0.25, 0.5, 1, 1.5, 2, 4, 8],
        zoomSpeed: 1,
        panSpeed: 1,
      })

      // Register bookmark unfurl handler
      editor.registerExternalAssetHandler("url", unfurlBookmarkUrl)

      // Create file upload manager with canvasId
      const uploadManager = new FileUploadManager(canvasId)

      // Register external content handler for files
      editor.registerExternalContentHandler('files', async (content) => {
        console.log("[Canvas] Files handler called", {
          hasFiles: 'files' in content,
          fileCount: 'files' in content ? (content.files as File[]).length : 0
        })

        // Validate content has files
        if (!('files' in content) || !content.files || content.files.length === 0) {
          return undefined
        }

        const files = content.files as File[]

        // Use the upload manager to process all files
        await uploadManager.uploadFiles(editor, files, content.point)

        // All files are now handled by our custom strategies
        // Return void to signal that we've handled everything
        return void 0
      })

      // Preload custom fonts
      const fontFaces = Object.values(extensionFontFamilies)
        .map((fontFamily) => Object.values(fontFamily))
        .flat()
        .map((fontStyle) => Object.values(fontStyle))
        .flat()
      editor.fonts.requestFonts(fontFaces)

      // Set default font style for text
      editor.setStyleForNextShapes(DefaultFontStyle, "sans")

      // For debugging
      if (typeof window !== "undefined") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).editor = editor
      }
    },
    [setEditor, setIsReady, canvasId]
  )

  // Zoom to fit content when editor is ready, with maximum 100% zoom
  useEffect(() => {
    if (!editor) return

    // Use requestAnimationFrame to ensure editor is fully initialized
    requestAnimationFrame(() => {
      const shapes = editor.getCurrentPageShapes()
      if (shapes.length > 0 && !hasZoomedRef.current) {
        // First zoom to fit the content
        editor.zoomToFit({ animation: { duration: 0 } })

        // Then check if zoom is above 100%, if so reset to 100%
        const currentZoom = editor.getZoomLevel()
        if (currentZoom > 1) {
          editor.setCamera(
            { ...editor.getCamera(), z: 1 },
            { animation: { duration: 300 } }
          )
        }
        hasZoomedRef.current = true
      }
    })
  }, [editor])

  // Reset state when canvasId changes or component unmounts
  useEffect(() => {
    setCanvasId(canvasId)
    setIsReady(false)
    hasZoomedRef.current = false

    return () => {
      setIsReady(false)
      setEditor(null)
      setCanvasId(null)
      hasZoomedRef.current = false
    }
  }, [canvasId, setIsReady, setEditor, setCanvasId])

  // Custom components for tldraw - defined before early returns
  const components: TLComponents = useMemo(() => ({
    RichTextToolbar: null, // Disabled - using TextContextMenu instead
    ContextMenu: null, // Disable default context menu
  }), [])

  // Show loading state while syncing
  if (storeWithStatus.status === "loading") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-muted-foreground">Connecting to canvas...</div>
      </div>
    )
  }

  // Show error state if sync failed
  if (storeWithStatus.status === "error") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-destructive">Failed to connect to canvas</div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <Tldraw
        store={storeWithStatus.store}
        onMount={handleMount}
        hideUi
        components={components}
        shapeUtils={shapeUtils}
        // @ts-expect-error - Type conflict between tldraw's internal @tiptap/core v2.26.4 and our v3.8.0
        textOptions={richTextOptions}
      >
        <CanvasCustomUi chatVisible={chatVisible} />
      </Tldraw>
    </div>
  )
}

// Bookmark unfurling function
async function unfurlBookmarkUrl({ url }: { url: string }): Promise<TLBookmarkAsset> {
  const asset: TLBookmarkAsset = {
    id: AssetRecordType.createId(getHashForString(url)),
    typeName: "asset",
    type: "bookmark",
    meta: {},
    props: {
      src: url,
      description: "",
      image: "",
      favicon: "",
      title: "",
    },
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}/v1/canvas/unfurl?url=${encodeURIComponent(url)}`,
      {
        credentials: "include",
      }
    )

    if (response.ok) {
      const data = await response.json()
      asset.props.description = data?.description ?? ""
      asset.props.image = data?.image ?? ""
      asset.props.favicon = data?.favicon ?? ""
      asset.props.title = data?.title ?? ""
    }
  } catch (error) {
    console.error("Failed to unfurl bookmark:", error)
  }

  return asset
}
