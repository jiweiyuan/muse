import * as React from "react"
import type { SVGProps } from "react"

export function ZoomOutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      fill="none"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="currentColor"
        d="M19.649 12.6a.4.4 0 0 1-.4.4h-15.2a.4.4 0 0 1-.4-.4v-1.201c0-.22.179-.4.4-.4h15.2c.22 0 .4.18.4.4z"
      />
    </svg>
  )
}
