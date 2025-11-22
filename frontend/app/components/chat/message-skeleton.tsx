export function MessageSkeleton() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Canvas skeleton - Full background matching tldraw canvas */}
      <div className="absolute inset-0 z-0 bg-background">
        {/* tldraw uses a canvas element that fills the space - simulate with simple background */}
      </div>  
    </div>
  )
}
