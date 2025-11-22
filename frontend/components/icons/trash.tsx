export function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
    >
      <path
        fill="currentColor"
        d="M10 2a1 1 0 0 0-1 1v1H4a1 1 0 0 0 0 2h1v13a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V6h1a1 1 0 1 0 0-2h-5V3a1 1 0 0 0-1-1h-4Zm0 2h4v1h-4V4ZM7 6h10v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V6Zm3 3a1 1 0 0 0-1 1v7a1 1 0 1 0 2 0v-7a1 1 0 0 0-1-1Zm4 0a1 1 0 0 0-1 1v7a1 1 0 1 0 2 0v-7a1 1 0 0 0-1-1Z"
      />
    </svg>
  )
}
