"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronRight, Mic, Music, Zap } from "lucide-react"
import type { AudioModelId, AudioType } from "@muse/shared-schemas"
import { getAllAudioModels, getAudioModelsByType, type AudioModelConfig } from "@/lib/audio-models.config"

interface AudioModelSelectorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentModelId: AudioModelId
  onSelectModel: (modelId: AudioModelId) => void
  audioType: AudioType
  trigger: React.ReactNode
}

/**
 * Dropdown for selecting audio generation models
 * Filters models based on audio type (TTS, Music, SFX)
 */
export function AudioModelSelectorModal({
  open,
  onOpenChange,
  currentModelId,
  onSelectModel,
  audioType,
  trigger,
}: AudioModelSelectorModalProps) {
  // Filter models based on audio type
  const availableModels = getAudioModelsByType(audioType)

  const handleSelectModel = (modelId: AudioModelId) => {
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
  model: AudioModelConfig
  isSelected: boolean
  onSelect: () => void
}

function ModelCard({ model, isSelected, onSelect }: ModelCardProps) {
  // Get icon based on audio type
  const getTypeIcon = (audioType: AudioType) => {
    switch (audioType) {
      case "tts":
        return <Mic size={10} />
      case "music":
        return <Music size={10} />
      case "sfx":
        return <Zap size={10} />
    }
  }

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border p-3 transition-all hover:bg-accent ${isSelected ? "border-primary bg-primary/5" : "border-border"
        }`}
    >
      <div className="flex gap-3">
        {/* Model Icon */}
        <div
          className="w-16 h-16 rounded-lg bg-muted bg-contain bg-no-repeat bg-center shrink-0 flex items-center justify-center"
          style={
            model.thumbnail
              ? { backgroundImage: `url(${model.thumbnail})` }
              : { backgroundColor: "#f0f0f0" }
          }
        >
          {!model.thumbnail && getTypeIcon(model.capabilities.audioType)}
        </div>

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
            {model.badges.slice(0, 3).map((badge, i) => (
              <Badge key={i} text={badge} icon={getTypeIcon(model.capabilities.audioType)} />
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
      {icon && <span className="shrink-0">{icon}</span>}
      {text}
    </span>
  )
}
