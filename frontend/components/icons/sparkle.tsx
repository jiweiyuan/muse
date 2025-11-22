import * as React from "react"
import type { SVGProps } from "react"

export function SparkleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={19}
      height={19}
      viewBox="0 0 19 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath="url(#clip0_3453_22220)">
        <path
          d="M9.9342 0.874756C9.9342 5.19117 13.4333 8.69096 17.7496 8.69116V9.55933C13.4333 9.55953 9.93434 13.0585 9.9342 17.3748H9.06604L9.0553 16.9734C8.84605 12.8437 5.43133 9.55933 1.24963 9.55933V8.69116C5.56617 8.69116 9.06604 5.19129 9.06604 0.874756H9.9342Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_3453_22220">
          <rect
            width={18}
            height={18}
            fill="white"
            transform="translate(0.5 0.125)"
          />
        </clipPath>
      </defs>
    </svg>
  )
}
