import type { Editor, TLAssetId } from "tldraw"

/**
 * Find an empty position on the canvas to place an image
 * Checks if there are shapes at the target position and finds a free spot
 */
export function findEmptyPosition(
  editor: Editor,
  targetX: number,
  targetY: number,
  width: number,
  height: number
) {
  const shapes = editor.getCurrentPageShapes()
  const imageRect = {
    x: targetX,
    y: targetY,
    w: width,
    h: height,
  }

  // Check if the target position overlaps with any existing shapes
  const hasOverlap = shapes.some((shape) => {
    const bounds = editor.getShapePageBounds(shape)
    if (!bounds) return false

    // Check for rectangle intersection
    return !(
      imageRect.x + imageRect.w < bounds.x ||
      imageRect.x > bounds.x + bounds.w ||
      imageRect.y + imageRect.h < bounds.y ||
      imageRect.y > bounds.y + bounds.h
    )
  })

  // If no overlap, use the original position
  if (!hasOverlap) {
    return { x: targetX, y: targetY }
  }

  // Find an empty spot by trying different offsets
  const offsetStep = 100
  const maxAttempts = 20

  for (let attempt = 1; attempt < maxAttempts; attempt++) {
    // Try positions in a spiral pattern
    const angle = (attempt * 137.5 * Math.PI) / 180 // Golden angle for better distribution
    const distance = attempt * offsetStep
    const offsetX = Math.cos(angle) * distance
    const offsetY = Math.sin(angle) * distance

    const candidateRect = {
      x: targetX + offsetX,
      y: targetY + offsetY,
      w: width,
      h: height,
    }

    const hasOverlapAtCandidate = shapes.some((shape) => {
      const bounds = editor.getShapePageBounds(shape)
      if (!bounds) return false

      return !(
        candidateRect.x + candidateRect.w < bounds.x ||
        candidateRect.x > bounds.x + bounds.w ||
        candidateRect.y + candidateRect.h < bounds.y ||
        candidateRect.y > bounds.y + bounds.h
      )
    })

    if (!hasOverlapAtCandidate) {
      return { x: candidateRect.x, y: candidateRect.y }
    }
  }

  // If all attempts fail, place it with an offset to the right
  return { x: targetX + 600, y: targetY }
}

/**
 * Find the ideal position for a new asset (image/video/audio) on the canvas
 * Position at bottom-left: align with leftmost item, stack at bottom
 *
 * @param editor - The tldraw editor instance
 * @param assetWidth - Width of the asset to be placed
 * @param assetHeight - Height of the asset to be placed
 * @returns Position coordinates { x, y }
 */
export function findNewAssetPosition(
  editor: Editor,
  assetWidth: number,
  assetHeight: number
) {
  const allShapes = editor.getCurrentPageShapes()

  // Margins for first image: account for left sidebar (256px) + gap
  const SIDEBAR_WIDTH = 256  // Left sidebar is 16rem (256px)
  const leftMargin = SIDEBAR_WIDTH + 64  // 320px = sidebar + 64px gap
  const topMargin = 128  // Distance from top

  let targetX = leftMargin
  let targetY = topMargin

  if (allShapes.length > 0) {
    // Find leftmost X position
    const leftmostX = Math.min(
      ...allShapes
        .map((s) => {
          const bounds = editor.getShapePageBounds(s.id)
          return bounds ? bounds.x : Infinity
        })
        .filter((x) => x !== Infinity)
    )

    // Find bottom-most Y position (highest y + height)
    const bottommostY = Math.max(
      ...allShapes
        .map((s) => {
          const bounds = editor.getShapePageBounds(s.id)
          return bounds ? bounds.y + bounds.height : -Infinity
        })
        .filter((y) => y !== -Infinity)
    )

    targetX = leftmostX !== Infinity ? leftmostX : leftMargin
    targetY = bottommostY !== -Infinity ? bottommostY + 32 : topMargin // 32px margin between images
  }

  // Check for overlaps and find an empty position
  return findEmptyPosition(editor, targetX, targetY, assetWidth, assetHeight)
}

/**
 * Calculate normalized image dimensions based on original size
 * Uses a base width of 256px to match AI-generated images
 */
export function calculateNormalizedDimensions(
  originalWidth: number,
  originalHeight: number
) {
  const baseWidth = 256 // Base width for all images
  const aspectRatio = originalWidth / originalHeight

  const width = baseWidth
  const height = Math.round(baseWidth / aspectRatio)

  return { width, height }
}

/**
 * Calculate optimal grid layout dimensions based on number of images
 * - 1-5 images: Single row
 * - 6+ images: Multi-row grid with optimal distribution
 *
 * Examples:
 * - 6 images → 3 columns × 2 rows
 * - 7 images → 4 columns × 2 rows (4 on first row, 3 on second)
 * - 8 images → 4 columns × 2 rows
 * - 9 images → 3 columns × 3 rows
 */
export function calculateGridLayout(imageCount: number) {
  if (imageCount <= 5) {
    return { columns: imageCount, rows: 1 }
  }

  // For 6+, find optimal grid dimensions using square root approach
  const columns = Math.ceil(Math.sqrt(imageCount))
  const rows = Math.ceil(imageCount / columns)

  return { columns, rows }
}

/**
 * Find positions for multiple images in a grid layout
 * Position at bottom-left: align with leftmost item, arrange in grid
 *
 * @param editor - The tldraw editor instance
 * @param imageCount - Number of images to position
 * @param imageWidth - Width of each image
 * @param imageHeight - Height of each image
 * @returns Array of position coordinates
 */
export function findMultipleImagePositions(
  editor: Editor,
  imageCount: number,
  imageWidth: number,
  imageHeight: number
) {
  const allShapes = editor.getCurrentPageShapes()
  const horizontalSpacing = 32
  const verticalSpacing = 32

  // Margins for first image: account for left sidebar (256px) + gap
  const SIDEBAR_WIDTH = 256  // Left sidebar is 16rem (256px)
  const leftMargin = SIDEBAR_WIDTH + 64  // 320px = sidebar + 64px gap
  const topMargin = 128  // Distance from top

  // Find starting position (leftmost X, bottom Y)
  let startX = leftMargin
  let startY = topMargin

  if (allShapes.length > 0) {
    // Find leftmost X position
    const leftmostX = Math.min(
      ...allShapes
        .map((s) => {
          const bounds = editor.getShapePageBounds(s.id)
          return bounds ? bounds.x : Infinity
        })
        .filter((x) => x !== Infinity)
    )

    // Find bottom-most Y position (highest y + height)
    const bottommostY = Math.max(
      ...allShapes
        .map((s) => {
          const bounds = editor.getShapePageBounds(s.id)
          return bounds ? bounds.y + bounds.height : -Infinity
        })
        .filter((y) => y !== -Infinity)
    )

    startX = leftmostX !== Infinity ? leftmostX : leftMargin
    startY = bottommostY !== -Infinity ? bottommostY + verticalSpacing : topMargin
  }

  // Calculate grid layout
  const { columns } = calculateGridLayout(imageCount)

  // Generate positions for each image in the grid
  const positions: Array<{ x: number; y: number }> = []

  for (let i = 0; i < imageCount; i++) {
    const col = i % columns
    const row = Math.floor(i / columns)

    const x = startX + col * (imageWidth + horizontalSpacing)
    const y = startY + row * (imageHeight + verticalSpacing)

    positions.push({ x, y })
  }

  return positions
}

/**
 * Set zoom level to 100% (z = 1.0)
 */
export function setZoomTo100(editor: Editor) {
  const camera = editor.getCamera()
  editor.setCamera(
    { x: camera.x, y: camera.y, z: 1.0 },
    { animation: { duration: 300 } }
  )
}

/**
 * Pan and zoom to show an image at 100% zoom
 * Centers the viewport on the image and sets zoom to 1.0
 */
export function panAndZoomToImage(
  editor: Editor,
  x: number,
  y: number,
  width: number,
  height: number
) {
  // Use requestAnimationFrame to ensure render cycle completes
  requestAnimationFrame(() => {
    // Use tldraw's built-in zoomToBounds API
    // This handles all viewport/camera calculations automatically
    editor.zoomToBounds(
      { x, y, w: width, h: height },
      {
        animation: { duration: 300 },
        targetZoom: 1.0  // Set zoom to exactly 100%
      }
    )
  })
}

/**
 * Asset information extracted from the canvas
 */
export interface CanvasAsset {
  id: string
  type: 'image' | 'video' | 'audio'
  url: string
  width: number
  height: number
  x: number
  y: number
}

/**
 * Extract all assets (images, videos, audio) from the canvas canvas
 * Currently supports images, ready for future video/audio support
 *
 * @param editor - The tldraw editor instance
 * @returns Array of asset information
 */
export function extractCanvasAssets(editor: Editor): CanvasAsset[] {
  const shapes = editor.getCurrentPageShapes()
  const assets: CanvasAsset[] = []

  for (const shape of shapes) {
    // Check if shape is an image
    if (shape.type === 'image') {
      const bounds = editor.getShapePageBounds(shape.id)
      if (!bounds) continue

      // Get image props - tldraw stores image data in the shape's props
      const imageProps = shape.props as { assetId?: string }
      const assetId = imageProps.assetId

      if (assetId) {
        // Get the actual asset data from the editor's asset store
        const asset = editor.getAsset(assetId as TLAssetId)
        if (asset && asset.type === 'image' && asset.props.src) {
          assets.push({
            id: shape.id,
            type: 'image',
            url: asset.props.src,
            width: bounds.width,
            height: bounds.height,
            x: bounds.x,
            y: bounds.y,
          })
        }
      }
    }
    // Future: Add support for video and audio shapes
    // else if (shape.type === 'video') { ... }
    // else if (shape.type === 'audio') { ... }
  }

  // Sort by creation order (newer items first)
  return assets.reverse()
}
