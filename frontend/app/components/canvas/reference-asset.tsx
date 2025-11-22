"use client"

import { useEffect, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Upload, X } from "lucide-react"
import { getProjectAssets } from "@/lib/projects/api"
import { useUser } from "@/lib/user-store/provider"
import type { ReferenceImage } from "@/lib/canvas-store/provider"

interface ReferenceAssetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onAssetSelect: (asset: ImageAsset) => void
  trigger: React.ReactNode
  maxImages?: number
  currentCount?: number
}

export interface ImageAsset {
  id: string
  url: string
  name?: string
  thumbnailUrl?: string
  width?: number
  height?: number
}

/**
 * Reference Asset selector - shows project images in a dropdown menu
 * Similar to Model Selector but for selecting reference images
 */
export function ReferenceAsset({
  open,
  onOpenChange,
  projectId,
  onAssetSelect,
  trigger,
  maxImages,
  currentCount = 0,
}: ReferenceAssetProps) {
  const { user } = useUser()
  const [assets, setAssets] = useState<ImageAsset[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && user?.id) {
      loadAssets()
    }
  }, [open, projectId, user?.id])

  const loadAssets = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      const data = await getProjectAssets(projectId, user.id)
      // Filter only image assets
      const imageAssets = (data || [])
        .filter((asset: any) => asset.type === "image")
        .map((asset: any) => ({
          id: asset.id,
          url: asset.url,
          name: asset.name,
          thumbnailUrl: asset.thumbnailUrl,
          width: asset.width,
          height: asset.height,
        }))
      setAssets(imageAssets)
    } catch (error) {
      console.error("Failed to load assets:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAsset = (asset: ImageAsset) => {
    onAssetSelect(asset)
    onOpenChange(false)
  }

  const canAddMore = !maxImages || currentCount < maxImages

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[440px] max-h-[70vh] overflow-y-auto p-4"
        align="start"
        side="left"
        sideOffset={32}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Select Reference Image</h3>
            {maxImages && (
              <span className="text-xs text-muted-foreground">
                {currentCount}/{maxImages}
              </span>
            )}
          </div>

          {/* Upload Section */}
          <button
            onClick={() => {
              // TODO: Implement upload
              console.log("Upload clicked")
            }}
            className="w-full border border-dashed border-border rounded-lg p-6 hover:bg-accent hover:border-accent-foreground/20 transition-colors flex flex-col items-center gap-2"
            disabled={!canAddMore}
          >
            <Upload className="text-muted-foreground" size={28} />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Upload Image</p>
              {!canAddMore && (
                <p className="text-xs text-destructive mt-1">Maximum limit reached</p>
              )}
            </div>
          </button>

          {/* Divider */}
          {assets.length > 0 && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">
                  Or select from existing
                </span>
              </div>
            </div>
          )}

          {/* Assets Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Loading images...</div>
            </div>
          ) : assets.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">No images found</div>
            </div>
          ) : (
            <div className="columns-3 gap-2 space-y-2">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => handleSelectAsset(asset)}
                  disabled={!canAddMore}
                  className="w-full mb-2 break-inside-avoid rounded-lg overflow-hidden bg-muted hover:opacity-75 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed block"
                >
                  <img
                    src={asset.thumbnailUrl || asset.url}
                    alt={asset.name || "Asset"}
                    className="w-full h-auto object-contain"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
