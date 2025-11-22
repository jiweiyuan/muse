import * as React from "react"
import type { SVGProps } from "react"

interface ImageUploadIconProps extends SVGProps<SVGSVGElement> {
  size?: number
}

export function ImageUploadIcon({ size = 16, ...props }: ImageUploadIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M54.9333 109H26.6667C23.8377 109 21.1246 107.876 19.1242 105.876C17.1238 103.875 16 101.162 16 98.3333V23.6667C16 20.8377 17.1238 18.1246 19.1242 16.1242C21.1246 14.1238 23.8377 13 26.6667 13H101.333C104.162 13 106.875 14.1238 108.876 16.1242C110.876 18.1246 112 20.8377 112 23.6667V77L95.4667 60.4667C93.4597 58.4996 90.7575 57.404 87.9473 57.418C85.1371 57.432 82.446 58.5544 80.4587 60.5413L32 109"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M74.6667 101L90.6667 85L106.667 101"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M90.6667 114.333V85"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M48 55.6667C53.891 55.6667 58.6667 50.8911 58.6667 45C58.6667 39.109 53.891 34.3334 48 34.3334C42.109 34.3334 37.3333 39.109 37.3333 45C37.3333 50.8911 42.109 55.6667 48 55.6667Z"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
