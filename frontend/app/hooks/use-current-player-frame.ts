import { CallbackListener, PlayerRef } from '@remotion/player'
import { useCallback, useSyncExternalStore } from 'react'

/**
 * Hook to get the current frame from a Remotion Player using React's useSyncExternalStore.
 * This provides reactive updates without polling.
 *
 * @param ref - React ref to the PlayerRef
 * @returns The current frame number, or 0 if player is not available
 */
export const useCurrentPlayerFrame = (
  ref: React.RefObject<PlayerRef> | null
): number => {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const { current } = ref || {}
      if (!current) return () => undefined

      const updater: CallbackListener<'frameupdate'> = () => {
        onStoreChange()
      }

      current.addEventListener('frameupdate', updater)
      return () => current.removeEventListener('frameupdate', updater)
    },
    [ref]
  )

  const getSnapshot = useCallback(() => {
    return ref?.current?.getCurrentFrame() ?? 0
  }, [ref])

  const getServerSnapshot = useCallback(() => {
    return 0
  }, [])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
