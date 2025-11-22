"use client"

import { useEffect, useState } from "react"
import { X, Image as ImageIcon, Video, Music } from "lucide-react"
import { getProjectAssets } from "@/lib/projects/api"
import { useUser } from "@/lib/user-store/provider"

interface AssetsDrawerProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssetSelect?: (asset: Asset) => void // Callback when an asset is selected
}

export interface Asset {
  id: string
  type: "image" | "video" | "audio"
  url: string
  name?: string
  thumbnailUrl?: string
  duration?: number
  width?: number
  height?: number
}

export function AssetsDrawer({ projectId, open, onOpenChange, onAssetSelect }: AssetsDrawerProps) {
  const { user } = useUser()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"image" | "video" | "audio">("image")

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
      setAssets(data || [])
    } catch (error) {
      console.error("Failed to load assets:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAssets = assets.filter(asset => asset.type === activeTab)

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-[100] pointer-events-auto"
        onClick={() => onOpenChange(false)}
      />

      {/* Drawer */}
      <div className="fixed left-0 top-0 bottom-0 w-80 bg-white dark:bg-[#1e1e1e] shadow-lg z-[101] flex flex-col pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Assets</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("image")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "image"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <ImageIcon size={16} />
            Image
          </button>
          <button
            onClick={() => setActiveTab("video")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "video"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <Video size={16} />
            Video
          </button>
          <button
            onClick={() => setActiveTab("audio")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "audio"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <Music size={16} />
            Audio
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading assets...</div>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                No {activeTab} assets found
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                  onClick={() => {
                    if (onAssetSelect) {
                      onAssetSelect(asset)
                    } else {
                      // TODO: Add asset to canvas (default behavior)
                      console.log("Add asset to canvas:", asset)
                    }
                  }}
                >
                  {asset.type === "image" || asset.type === "video" ? (
                    <img
                      src={asset.thumbnailUrl || asset.url}
                      alt={asset.name || "Asset"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music size={32} className="text-gray-400 dark:text-gray-600" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
