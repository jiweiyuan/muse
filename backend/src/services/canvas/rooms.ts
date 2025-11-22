import { TLSocketRoom } from "@tldraw/sync-core"
import { customTLSchema } from "@muse/shared-schemas"
import { getCanvasSnapshot, saveCanvasSnapshot } from "../canvas.js"

/**
 * Room Management Service
 * Manages TLSocketRoom instances for real-time collaboration
 */

interface RoomState {
  room: TLSocketRoom<any, void>
  canvasId: string
  needsPersist: boolean
}

// In-memory map of active rooms
const rooms = new Map<string, RoomState>()

// Simple mutex using promise chaining to avoid race conditions
let mutex = Promise.resolve<null | Error>(null)

/**
 * Create or load a TLSocketRoom for a canvas
 */
export async function makeOrLoadRoom(
  canvasId: string
): Promise<TLSocketRoom<any, void>> {
  mutex = mutex
    .then(async () => {
      if (rooms.has(canvasId)) {
        const roomState = rooms.get(canvasId)!
        if (!roomState.room.isClosed()) {
          return null // Room already exists and is open
        }
      }

      console.log(`[Canvas] Loading room: ${canvasId}`)

      // Load initial snapshot from database
      const initialSnapshot = await getCanvasSnapshot(canvasId)

      const roomState: RoomState = {
        needsPersist: false,
        canvasId,
        room: new TLSocketRoom({
          schema: customTLSchema,
          initialSnapshot: initialSnapshot || undefined,
          onSessionRemoved(room, args) {
            console.log(
              `[Canvas] Client disconnected: ${args.sessionId} from ${canvasId}`
            )
            if (args.numSessionsRemaining === 0) {
              console.log(`[Canvas] Closing room: ${canvasId}`)
              room.close()
            }
          },
          onDataChange() {
            roomState.needsPersist = true
          },
        }),
      }

      rooms.set(canvasId, roomState)
      return null // Success
    })
    .catch((error) => {
      // Return errors as normal values to avoid stopping the mutex chain
      return error
    })

  const err = await mutex
  if (err) throw err

  return rooms.get(canvasId)!.room
}

/**
 * Get active room by canvas ID
 */
export function getRoom(
  canvasId: string
): TLSocketRoom<any, void> | undefined {
  return rooms.get(canvasId)?.room
}

/**
 * Close a room manually
 */
export function closeRoom(canvasId: string) {
  const roomState = rooms.get(canvasId)
  if (roomState) {
    console.log(`[Canvas] Manually closing room: ${canvasId}`)
    roomState.room.close()
    rooms.delete(canvasId)
  }
}

/**
 * Periodic persistence job
 * Saves snapshots to database and cleans up closed rooms
 */
export function startPersistenceJob(intervalMs: number = 2000) {
  const interval = setInterval(() => {
    for (const [canvasId, roomState] of rooms.entries()) {
      if (roomState.needsPersist && !roomState.room.isClosed()) {
        // Persist the snapshot
        roomState.needsPersist = false
        const snapshot = roomState.room.getCurrentSnapshot()
        console.log(`[Canvas] Saving snapshot: ${canvasId}`)
        saveCanvasSnapshot(canvasId, snapshot).catch((error) => {
          console.error(
            `[Canvas] Failed to save snapshot for ${canvasId}:`,
            error
          )
        })
      }

      if (roomState.room.isClosed()) {
        console.log(`[Canvas] Deleting closed room: ${canvasId}`)
        rooms.delete(canvasId)
      }
    }
  }, intervalMs)

  // Return cleanup function
  return () => clearInterval(interval)
}

/**
 * Get stats about active rooms
 */
export function getRoomStats() {
  return {
    activeRooms: rooms.size,
    rooms: Array.from(rooms.entries()).map(([canvasId, roomState]) => ({
      canvasId,
      isClosed: roomState.room.isClosed(),
      needsPersist: roomState.needsPersist,
    })),
  }
}
