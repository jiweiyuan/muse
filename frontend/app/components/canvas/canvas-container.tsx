"use client"

import { Canvas } from "./canvas"
import { CanvasProvider } from "./canvas-provider"
import { useCanvasStore } from "@/lib/canvas-store/provider"
import { motion } from "framer-motion"
import { Loader } from "@/components/prompt-kit/loader"
import { MuseIcon } from "@/components/icons/muse"
import { useLayoutEffect } from "react"
import { ImageGenerator } from "./image-generator"
import { VideoGenerator } from "./video-generator"
import { AudioGenerator } from "./audio-generator"
import { AssetsDrawer } from "./assets-drawer"
import { useProjectStore } from "@/lib/project-store"

interface CanvasContainerProps {
  canvasId: string
  children: React.ReactNode
}

export function CanvasContainer({
  canvasId,
  children,
}: CanvasContainerProps) {
  const {
    editor,
    isReady,
    chatVisible,
    toggleChatVisible,
    setIsReady,
    imageGeneratorVisible,
    setImageGeneratorVisible,
    videoGeneratorVisible,
    setVideoGeneratorVisible,
    audioGeneratorVisible,
    setAudioGeneratorVisible,
    assetsDrawerVisible,
    setAssetsDrawerVisible,
  } = useCanvasStore()
  const { activeProjectId } = useProjectStore()

  useLayoutEffect(() => {
    setIsReady(false)
    // Keep chat visibility state when navigating (don't force reset)
    // User preference should persist across canvas changes
  }, [canvasId, setIsReady])

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Canvas - Full size background */}
      <div className="absolute inset-0 z-0">
        <CanvasProvider editor={editor}>
          <Canvas canvasId={canvasId} chatVisible={chatVisible} />
        </CanvasProvider>
      </div>

      {/* Loading overlay - shown until tldraw is fully initialized */}
      {!isReady && (
        <div className="bg-background absolute inset-0 z-[100] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader />
            <div className="text-muted-foreground">Loading canvas...</div>
          </div>
        </div>
      )}

      {/* UI overlays - Only render after canvas is ready */}
      {isReady && (
        <>
          {/* Chat Panel - Left overlay with 8px padding - Always mounted to preserve state */}
          <motion.div
            initial={{ x: -500, opacity: 0 }}
            animate={{
              x: chatVisible ? 0 : -500,
              opacity: chatVisible ? 1 : 0
            }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute z-50 flex flex-col pointer-events-none"
            style={{
              top: '8px',
              left: '8px',
              right: '8px',
              bottom: '8px',
              visibility: chatVisible ? 'visible' : 'hidden',
            }}
          >
            {/* Chat container with backdrop */}
            <div className="h-full w-full bg-background backdrop-blur-sm rounded-lg border border-border flex flex-col overflow-hidden pointer-events-auto">
              {/* Chat content - let the conversation component handle its own header and layout */}
              {children}
            </div>
          </motion.div>

          {/* Toggle button (when chat is hidden) */}
          {!chatVisible && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={toggleChatVisible}
              className="absolute z-40 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity rounded-full border-2 border-border bg-background shadow-lg overflow-hidden"
              style={{
                top: '12px',
                left: '12px',
                width: '44px',
                height: '44px',
              }}
              aria-label="Open chat"
            >
              <MuseIcon width={44} height={44} />
            </motion.button>
          )}

          {/* Image Generator Panel */}
          <ImageGenerator
            visible={imageGeneratorVisible}
            onClose={() => setImageGeneratorVisible(false)}
          />

          {/* Video Generator Panel */}
          <VideoGenerator
            visible={videoGeneratorVisible}
            onClose={() => setVideoGeneratorVisible(false)}
          />

          {/* Audio Generator Panel */}
          <AudioGenerator
            visible={audioGeneratorVisible}
            onClose={() => setAudioGeneratorVisible(false)}
          />

          {/* Assets Drawer */}
          {activeProjectId && (
            <AssetsDrawer
              projectId={activeProjectId}
              open={assetsDrawerVisible}
              onOpenChange={setAssetsDrawerVisible}
            />
          )}
        </>
      )}
    </div>
  )
}
