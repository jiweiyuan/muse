"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronRight, Volume2, Film } from "lucide-react"
import type { VideoModelId } from "@muse/shared-schemas"
import { getAllVideoModels, type VideoModelConfig } from "@/lib/video-models.config"

interface VideoModelSelectorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentModelId: VideoModelId
  onSelectModel: (modelId: VideoModelId) => void
  mode: "text-to-video" | "image-to-video"
  trigger: React.ReactNode
}

/**
 * Dropdown for selecting video generation models
 * Filters models based on current mode (text-to-video vs image-to-video)
 */
export function VideoModelSelectorModal({
  open,
  onOpenChange,
  currentModelId,
  onSelectModel,
  mode,
  trigger,
}: VideoModelSelectorModalProps) {
  const allModels = getAllVideoModels()

  // Filter models based on mode
  const availableModels = allModels.filter((model) => {
    if (mode === "image-to-video") {
      return model.capabilities.supportsImageToVideo
    }
    return model.capabilities.supportsTextToVideo
  })

  const handleSelectModel = (modelId: VideoModelId) => {
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
        sideOffset={24}
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
  model: VideoModelConfig
  isSelected: boolean
  onSelect: () => void
}

function ModelCard({ model, isSelected, onSelect }: ModelCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border p-3 transition-all hover:bg-accent ${isSelected ? "border-primary bg-primary/5" : "border-border"
        }`}
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
            <span className="text-sm font-medium truncate">{model.name}</span>
            <ChevronRight size={14} className="ml-auto opacity-60" />
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {model.description}
          </p>

          {/* Capability Badges */}
          <div className="flex gap-1.5 flex-wrap">
            {model.capabilities.supportsAudioGeneration && (
              <Badge
                icon={<Volume2 size={10} />}
                text="Audio Support"
              />
            )}
            {model.capabilities.supportsEndFrame && (
              <Badge
                icon={<Film size={10} />}
                text="End Frame"
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
    <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
      {icon}
      {text}
    </span>
  )
}
