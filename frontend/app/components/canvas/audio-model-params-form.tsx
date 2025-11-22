"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, ChevronUp, ChevronRight, Check } from "lucide-react"
import type { AudioModelId, AudioType } from "@muse/shared-schemas"
import { getAudioModelUIFields, type FieldConfig } from "@/lib/audio-models.config"

interface AudioModelParamsFormProps {
  modelId: AudioModelId
  audioType: AudioType
  params: Record<string, any>
  onChange: (params: Record<string, any>) => void
  disabled?: boolean
}

/**
 * Dynamic form component that renders audio model-specific parameters
 * based on the model configuration
 */
export function AudioModelParamsForm({
  modelId,
  audioType,
  params,
  onChange,
  disabled,
}: AudioModelParamsFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const allFields = getAudioModelUIFields(modelId)

  const handleFieldChange = (fieldName: string, value: any) => {
    onChange({
      ...params,
      [fieldName]: value,
    })
  }

  // Split fields into basic and advanced
  const basicFields = allFields.filter((f) => !f.advanced)
  const advancedFields = allFields.filter((f) => f.advanced)

  return (
    <div className="space-y-3">
      {/* Basic Fields */}
      {basicFields.map((field) => (
        <FieldRenderer
          key={field.name}
          field={field}
          value={params[field.name]}
          onChange={(value) => handleFieldChange(field.name, value)}
          disabled={disabled}
        />
      ))}

      {/* Advanced Config Section */}
      {advancedFields.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            disabled={disabled}
            className="flex items-center justify-between w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <span>Advanced Config</span>
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showAdvanced && (
            <div className="space-y-3 pl-3 border-l-2 border-border">
              {advancedFields.map((field) => (
                <FieldRenderer
                  key={field.name}
                  field={field}
                  value={params[field.name]}
                  onChange={(value) => handleFieldChange(field.name, value)}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface FieldRendererProps {
  field: FieldConfig
  value: any
  onChange: (value: any) => void
  disabled?: boolean
}

function FieldRenderer({ field, value, onChange, disabled }: FieldRendererProps) {
  const fieldValue = value ?? field.defaultValue ?? ""

  // Get the label for the selected value
  const getSelectedLabel = () => {
    const option = field.options?.find((opt) => opt.value.toString() === fieldValue.toString())
    return option?.label || `Select ${field.label}`
  }

  return (
    <div className="w-full">
      {field.type === "select" && (
        <div className="space-y-1.5 w-full">
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={disabled}
                className="w-full flex items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-accent transition-all disabled:opacity-50"
              >
                <span className="text-sm font-medium flex-1 text-left">{getSelectedLabel()}</span>
                <ChevronRight size={14} className="opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 max-h-60 overflow-y-auto" align="start" side="left" sideOffset={24}>
              {field.options?.map((option) => {
                const isSelected = option.value.toString() === fieldValue.toString()
                return (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className="cursor-pointer flex items-center justify-between"
                  >
                    <span className="text-xs">{option.label}</span>
                    {isSelected && <Check size={16} className="text-primary" />}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          {field.description && <p className="text-[10px] text-muted-foreground">{field.description}</p>}
        </div>
      )}

      {field.type === "number" && (
        <div className="space-y-1.5 w-full">
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
          <Input
            type="number"
            min={field.min}
            max={field.max}
            step={field.step}
            value={fieldValue}
            onChange={(e) => {
              const val = e.target.value ? parseFloat(e.target.value) : undefined
              onChange(val)
            }}
            disabled={disabled}
            className="h-9 w-full"
          />
          {field.description && <p className="text-[10px] text-muted-foreground">{field.description}</p>}
        </div>
      )}

      {field.type === "slider" && (
        <div className="space-y-2 w-full rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">{field.label}</Label>
            <span className="text-xs font-medium">{fieldValue}</span>
          </div>
          <Slider
            value={[fieldValue]}
            min={field.min}
            max={field.max}
            step={field.step}
            onValueChange={(vals) => onChange(vals[0])}
            disabled={disabled}
            className="w-full"
          />
          {field.description && <p className="text-[10px] text-muted-foreground mt-1">{field.description}</p>}
        </div>
      )}

      {field.type === "toggle" && (
        <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border w-full">
          <div className="flex-1">
            <Label className="text-sm font-medium">{field.label}</Label>
            {field.description && <p className="text-[10px] text-muted-foreground mt-0.5">{field.description}</p>}
          </div>
          <Switch checked={fieldValue} onCheckedChange={onChange} disabled={disabled} />
        </div>
      )}

      {field.type === "text" && (
        <div className="space-y-1.5 w-full">
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
          <Input
            type="text"
            value={fieldValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className="h-9 w-full"
          />
          {field.description && <p className="text-[10px] text-muted-foreground">{field.description}</p>}
        </div>
      )}

      {field.type === "textarea" && (
        <div className="space-y-1.5 w-full">
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
          <Textarea
            value={fieldValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            rows={field.rows || 3}
            className="w-full resize-none"
          />
          {field.description && <p className="text-[10px] text-muted-foreground">{field.description}</p>}
        </div>
      )}
    </div>
  )
}
