import * as React from "react"
import type { SVGProps } from "react"

export function ZoomInIcon(props: SVGProps<SVGSVGElement>) {
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
        d="M11.649 3.5c-.497 0-.9.476-.9 1.063V11.1H4.21c-.587 0-1.062.403-1.062.9s.475.9 1.062.9h6.537v6.538c0 .586.404 1.062.9 1.062.498 0 .901-.476.901-1.062V12.9h6.537c.587 0 1.063-.403 1.063-.9s-.476-.9-1.063-.9H12.55V4.563c0-.587-.403-1.063-.9-1.063"
      />
    </svg>
  )
}
