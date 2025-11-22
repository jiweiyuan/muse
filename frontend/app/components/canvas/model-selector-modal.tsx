"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronRight, Images } from "lucide-react"
import type { ImageModelId } from "@muse/shared-schemas"
import { getAllModels, type ImageModelConfig } from "@/lib/image-models.config"

interface ModelSelectorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentModelId: ImageModelId
  onSelectModel: (modelId: ImageModelId) => void
  mode: "text-to-image" | "image-to-image"
  trigger: React.ReactNode
}

/**
 * Dropdown for selecting image generation models
 * Filters models based on current mode (text-to-image vs image-to-image)
 */
export function ModelSelectorModal({
  open,
  onOpenChange,
  currentModelId,
  onSelectModel,
  mode,
  trigger,
}: ModelSelectorModalProps) {
  const allModels = getAllModels()

  // Filter models based on mode
  const availableModels = allModels.filter((model) => {
    if (mode === "image-to-image") {
      return model.capabilities.supportsImageToImage
    }
    return model.capabilities.supportsTextToImage
  })

  const handleSelectModel = (modelId: ImageModelId) => {
    onSelectModel(modelId)
    onOpenChange(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[500px] max-h-[80vh] overflow-y-auto p-3"
        align="start"
        side="left"
        sideOffset={32}
      >
        <div className="space-y-3">
          {availableModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              isSelected={model.id === currentModelId}
              onSelect={() => handleSelectModel(model.id)}
            />
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface ModelCardProps {
  model: ImageModelConfig
  isSelected: boolean
  onSelect: () => void
}

function ModelCard({ model, isSelected, onSelect }: ModelCardProps) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left rounded-xl border border-border p-4 transition-all hover:bg-accent"
    >
      <div className="flex gap-3">
        {/* Model Icon */}
        <div
          className="w-16 h-16 rounded-lg bg-muted bg-contain bg-no-repeat bg-center shrink-0"
          style={{ backgroundImage: `url(${model.thumbnail})` }}
        />

        {/* Model Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base font-medium truncate">{model.name}</span>
          </div>

          <p className="text-xs text-foreground/70 line-clamp-2 mb-2">
            {model.description}
          </p>

          {/* Capability Badges */}
          <div className="flex gap-1.5 flex-wrap">
            {model.capabilities.supportsMultipleInputImages && (
              <Badge
                icon={<Images size={10} />}
                text={`${model.capabilities.maxInputImages} Images Input`}
              />
            )}
            {model.badges.slice(0, 2).map((badge, i) => (
              <Badge key={i} text={badge} />
            ))}
          </div>
        </div>
      </div>
    </button>
  )
}

interface BadgeProps {
  icon?: React.ReactNode
  text: string
}

function Badge({ icon, text }: BadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/20 text-foreground">
      {icon}
      {text}
    </span>
  )
}
