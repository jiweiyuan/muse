"use client"

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import type { CanvasAsset } from "@/lib/canvas-utils"
import type { ProjectAsset } from "@/lib/projects/api"
import Image from "next/image"

interface AssetPreviewModalProps {
  asset: CanvasAsset | ProjectAsset | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssetPreviewModal({
  asset,
  open,
  onOpenChange,
}: AssetPreviewModalProps) {
  if (!asset) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
        <DialogTitle className="sr-only">Asset Preview</DialogTitle>
        <DialogDescription className="sr-only">
          Preview of {asset.type} asset from the canvas
        </DialogDescription>
        <div className="relative w-full h-full flex items-center justify-center bg-black/5 dark:bg-black/20">
          {asset.type === 'image' && (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <Image
                src={asset.url}
                alt="Asset preview"
                width={asset.width}
                height={asset.height}
                className="max-w-full max-h-[85vh] w-auto h-auto object-contain"
                unoptimized
              />
            </div>
          )}
          {/* Future: Add video and audio preview components */}
          {asset.type === 'video' && (
            <div className="p-4 text-center">
              <p className="text-muted-foreground">Video preview coming soon</p>
            </div>
          )}
          {asset.type === 'audio' && (
            <div className="p-4 text-center">
              <p className="text-muted-foreground">Audio preview coming soon</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
