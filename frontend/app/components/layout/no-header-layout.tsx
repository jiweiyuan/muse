"use client"

export function NoHeaderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex h-dvh w-full overflow-hidden">
      <main className="@container relative h-dvh w-0 flex-shrink flex-grow overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
