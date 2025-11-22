"use client"

import { useTheme } from "next-themes"
import { Check, Monitor } from "lucide-react"
import { useEffect, useState } from "react"
import {
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const themes = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System theme" },
  ]

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="flex items-center gap-2">
        <Monitor className="size-4" strokeWidth={1.5} />
        <span>Theme</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          {themes.map((themeOption) => {
            const isActive = theme === themeOption.value

            return (
              <DropdownMenuItem
                key={themeOption.value}
                onClick={() => setTheme(themeOption.value)}
                className="flex items-center justify-between"
              >
                <span>{themeOption.label}</span>
                {isActive && <Check className="size-4" strokeWidth={1.5} />}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  )
}
