"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import { useUser } from "@/lib/user-store/provider"
import { getProjectAssets, type ProjectAsset } from "@/lib/projects/api"
import Image from "next/image"
import { Images, DotsThree, Download, Copy, X } from "@phosphor-icons/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"

export function ProjectAssetsView() {
  const params = useParams()
  const projectId = params.projectId as string
  const { user } = useUser()
  const [assets, setAssets] = useState<ProjectAsset[]>([])
  const [selectedAsset, setSelectedAsset] = useState<ProjectAsset | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [columnCount, setColumnCount] = useState(3)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  // Fetch assets from the backend API
  useEffect(() => {
    if (!projectId || !user?.id) return

    let isMounted = true

    const fetchAssets = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const fetchedAssets = await getProjectAssets(projectId, user.id)
        if (isMounted) {
          setAssets(fetchedAssets)
        }
      } catch (err) {
        console.error("Failed to fetch project assets:", err)
        if (isMounted) {
          setError("Failed to load assets")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchAssets()

    return () => {
      isMounted = false
    }
  }, [projectId, user?.id])

  // Update column count based on viewport width and selection state
  useEffect(() => {
    const updateColumnCount = () => {
      const width = window.innerWidth

      // If an asset is selected, use 1 column for the left grid
      if (selectedAsset) {
        setColumnCount(1) // 1 column when asset is selected (preview panel takes 75% width)
      } else {
        // Full grid when nothing is selected
        if (width >= 1536) {
          setColumnCount(6) // 2xl breakpoint: 6 columns
        } else if (width >= 1280) {
          setColumnCount(5) // xl breakpoint: 5 columns
        } else if (width >= 768) {
          setColumnCount(4) // md and lg breakpoint: 4 columns
        } else {
          setColumnCount(3) // default: 3 columns
        }
      }
    }

    // Set initial column count
    updateColumnCount()

    // Listen for window resize
    window.addEventListener('resize', updateColumnCount)

    return () => {
      window.removeEventListener('resize', updateColumnCount)
    }
  }, [selectedAsset])

  // Split assets into columns for masonry layout
  const columns = useMemo(() => {
    const cols: ProjectAsset[][] = Array.from({ length: columnCount }, () => [])

    assets.forEach((asset, index) => {
      const colIndex = index % columnCount
      cols[colIndex].push(asset)
    })

    return cols
  }, [assets, columnCount])

  const handleAssetClick = (asset: ProjectAsset) => {
    setSelectedAsset(asset)
  }

  const handleClosePreview = () => {
    setSelectedAsset(null)
  }

  const getAssetTitle = (asset: ProjectAsset): string | null => {
    try {
      const url = new URL(asset.url)
      const pathname = url.pathname
      const filename = pathname.split('/').pop() || null
      return filename
    } catch {
      return null
    }
  }

  const handleDownload = async (asset: ProjectAsset, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      const response = await fetch(asset.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = getAssetTitle(asset) || `asset-${asset.id}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download image:', error)
    }
  }

  const handleCopy = async (asset: ProjectAsset, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      const response = await fetch(asset.url)
      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ])
    } catch (error) {
      console.error('Failed to copy image:', error)
    }
  }

  return (
    <>
      <div className="h-full w-full p-4 pt-20 overflow-hidden relative z-0">
        <div className="h-full rounded-2xl bg-background/50 backdrop-blur-sm overflow-hidden flex flex-col">
          {/* Loading state */}
          {isLoading ? (
            <div className="flex items-center justify-center h-full w-full">
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <Images className="size-16 opacity-20 animate-pulse" />
                <p className="text-sm">Loading assets...</p>
              </div>
            </div>
          ) : error ? (
            /* Error state */
            <div className="flex items-center justify-center h-full w-full">
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <Images className="size-16 opacity-20" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          ) : assets.length === 0 ? (
            /* Empty state */
            <div className="flex items-center justify-center h-full w-full">
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <p className="text-sm">No assets on the canvas yet</p>
                <p className="text-xs">Add images to the canvas to see them here</p>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-hidden flex">
              {/* Left side: Assets Grid */}
              <div className={`h-full transition-all duration-300 ${selectedAsset ? 'w-[25%]' : 'w-full'}`}>
                <ScrollArea className="h-full">
                  <div className="p-6">
                    <div className={`grid gap-4 ${selectedAsset ? 'grid-cols-1' : 'grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'}`}>
                  {columns.map((column, colIndex) => (
                    <div key={colIndex} className="flex flex-col gap-4">
                      {column.map((asset) => {
                        const title = getAssetTitle(asset)
                        const isDropdownOpen = openDropdownId === asset.id
                        const isSelected = selectedAsset?.id === asset.id
                        return (
                          <div
                            key={asset.id}
                            className={`relative group isolate overflow-hidden transition-all duration-200 bg-muted/30 flex flex-col cursor-pointer ${isSelected ? 'ring-2 ring-primary' : ''}`}
                          >
                            {/* More button */}
                            <div className={`absolute top-2 right-2 z-10 pointer-events-auto transition-opacity ${isDropdownOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                              <DropdownMenu
                                open={isDropdownOpen}
                                onOpenChange={(open) => setOpenDropdownId(open ? asset.id : null)}
                              >
                                <DropdownMenuTrigger asChild>
                                  <button
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-2 rounded-md bg-background/80 backdrop-blur-sm"
                                  >
                                    <DotsThree className="size-6" weight="bold" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => handleDownload(asset, e)}>
                                    <Download className="size-4" />
                                    Download image
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => handleCopy(asset, e)}>
                                    <Copy className="size-4" />
                                    Copy image
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Image */}
                            {asset.type === 'image' && (
                              <div
                                onClick={() => handleAssetClick(asset)}
                                className="relative"
                              >
                                <Image
                                  src={asset.url}
                                  alt="Canvas asset"
                                  width={asset.width}
                                  height={asset.height}
                                  className="w-full h-auto object-cover"
                                  unoptimized
                                />
                                {/* Title */}
                                {title && (
                                  <div className="absolute bottom-0 left-0 right-0 px-3 py-2 text-xs text-white bg-gradient-to-t from-black/60 to-transparent truncate">
                                    {title}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                    </div>
                  </div>
                </ScrollArea>
              </div>

              {/* Right side: Preview Panel */}
              {selectedAsset && (
                <div className="w-[75%] h-full border-l border-border flex flex-col bg-background/30">
                  {/* Preview Header */}
                  <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium truncate">
                        {getAssetTitle(selectedAsset) || 'Untitled Asset'}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* More button for actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="p-2 rounded-md hover:bg-muted transition-colors"
                            aria-label="More actions"
                          >
                            <DotsThree className="size-5" weight="bold" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownload(selectedAsset)}>
                            <Download className="size-4" />
                            Download image
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopy(selectedAsset)}>
                            <Copy className="size-4" />
                            Copy image
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <button
                        onClick={handleClosePreview}
                        className="p-2 rounded-md hover:bg-muted transition-colors"
                        aria-label="Close preview"
                      >
                        <X className="size-5" />
                      </button>
                    </div>
                  </div>

                  {/* Preview Content */}
                  <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
                    <Image
                      src={selectedAsset.url}
                      alt="Preview"
                      width={selectedAsset.width}
                      height={selectedAsset.height}
                      className="max-w-full max-h-full w-auto h-auto object-contain"
                      unoptimized
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
