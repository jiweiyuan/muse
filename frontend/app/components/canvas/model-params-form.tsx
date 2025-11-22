"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, ChevronUp, ChevronRight, Check } from "lucide-react"
import type { ImageModelId } from "@muse/shared-schemas"
import { getModelUIFields, type FieldConfig } from "@/lib/image-models.config"

interface ModelParamsFormProps {
  modelId: ImageModelId
  mode: "text-to-image" | "image-to-image"
  params: Record<string, any>
  onChange: (params: Record<string, any>) => void
  disabled?: boolean
}

/**
 * Dynamic form component that renders model-specific parameters
 * based on the model configuration
 */
export function ModelParamsForm({ modelId, mode, params, onChange, disabled }: ModelParamsFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const allFields = getModelUIFields(modelId)

  const handleFieldChange = (fieldName: string, value: any) => {
    onChange({
      ...params,
      [fieldName]: value,
    })
  }

  const shouldShowField = (field: FieldConfig): boolean => {
    // Filter by mode
    if (field.modeOnly && field.modeOnly !== mode) {
      return false
    }

    // Filter by dependsOn
    if (field.dependsOn) {
      const dependentValue = params[field.dependsOn.field]
      return dependentValue === field.dependsOn.value
    }

    return true
  }

  // Split fields into basic and advanced
  const basicFields = allFields.filter((f) => !f.advanced && shouldShowField(f))
  const advancedFields = allFields.filter((f) => f.advanced && shouldShowField(f))

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
                className="w-full flex items-center gap-2 rounded-md border border-border px-3 py-2 hover:bg-accent transition-all disabled:opacity-50"
              >
                <span className="text-sm font-medium flex-1 text-left">{getSelectedLabel()}</span>
                <ChevronRight size={14} className="opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-48"
              align="start"
              side="left"
              sideOffset={24}
            >
              {field.options?.map((option) => {
                const isSelected = option.value.toString() === fieldValue.toString()
                return (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className="cursor-pointer flex items-center justify-between"
                  >
                    <span>{option.label}</span>
                    {isSelected && <Check size={16} className="text-primary" />}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          {field.description && (
            <p className="text-[10px] text-muted-foreground">{field.description}</p>
          )}
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
              const val = e.target.value ? parseInt(e.target.value, 10) : undefined
              onChange(val)
            }}
            disabled={disabled}
            className="h-9 w-full"
          />
          {field.description && (
            <p className="text-[10px] text-muted-foreground">{field.description}</p>
          )}
        </div>
      )}

      {field.type === "toggle" && (
        <div className="flex items-center justify-between py-2 px-3 rounded-md border border-border w-full">
          <div className="flex-1">
            <Label className="text-sm font-medium">{field.label}</Label>
            {field.description && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{field.description}</p>
            )}
          </div>
          <Switch
            checked={fieldValue}
            onCheckedChange={onChange}
            disabled={disabled}
          />
        </div>
      )}

    </div>
  )
}
