"use client"

import { useModel } from "@/lib/model-store/provider"
import { PROVIDERS } from "@/lib/providers"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { cn } from "@/lib/utils"
import { useMemo, useState } from "react"

export function ModelsSettings() {
  const { models } = useModel()
  const { isModelHidden, toggleModelVisibility } = useUserPreferences()
  const [searchQuery, setSearchQuery] = useState("")

  const filteredModels = useMemo(() => {
    return models
      .filter((model) =>
        model.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [models, searchQuery])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-lg font-medium">Models</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          Browse available models and hide any you don&apos;t need in the selector.
        </p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search models..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
        />
      </div>

      <div className="space-y-2">
        {filteredModels.map((model) => {
          const provider = PROVIDERS.find((p) => p.id === model.icon)
          const isHidden = isModelHidden(model.id)

          return (
            <div
              key={model.id}
              className={cn(
                "border-border flex items-center justify-between rounded-lg border bg-background p-3 transition-opacity",
                isHidden && "opacity-60"
              )}
            >
              <div className="flex items-center gap-3">
                {provider?.icon && <provider.icon className="size-5" />}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{model.name}</span>
                    <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 text-xs">
                      {model.provider}
                    </span>
                    {isHidden && (
                      <span className="text-muted-foreground text-xs">
                        Hidden
                      </span>
                    )}
                  </div>
                  {model.description && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {model.description}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleModelVisibility(model.id)}
                className="text-muted-foreground hover:text-foreground border-border rounded-md border px-2 py-1 text-xs transition-colors"
              >
                {isHidden ? "Show" : "Hide"}
              </button>
            </div>
          )
        })}
      </div>

      {filteredModels.length === 0 && (
        <div className="text-muted-foreground py-8 text-center text-sm">
          {searchQuery
            ? `No models found matching "${searchQuery}"`
            : "No models available."}
        </div>
      )}
    </div>
  )
}
