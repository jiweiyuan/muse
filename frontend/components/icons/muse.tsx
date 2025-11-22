import * as React from "react"
import Image from "next/image"

interface MuseIconProps {
  className?: string
  width?: number
  height?: number
}

export function MuseIcon({ className, width, height }: MuseIconProps) {
  // Extract dimensions from className if provided (e.g., "w-16 h-16")
  const size = width || height || 24

  return (
    <Image
      src="/muse-icon.svg"
      alt="Muse"
      width={size}
      height={size}
      className={className}
      priority
    />
  )
}
