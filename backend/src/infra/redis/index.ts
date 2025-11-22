import { Redis } from "ioredis"
import { env } from "../../config/env.js"

let publisherClient: Redis | null = null
let subscriberClient: Redis | null = null

function createRedisClient(name: string): Redis {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
    lazyConnect: false,
    enableOfflineQueue: true,
  })

  client.on("error", (error: Error) => {
    console.error(`[Redis ${name}] Connection error:`, error)
  })

  client.on("connect", () => {
    console.log(`[Redis ${name}] Connected successfully`)
  })

  client.on("ready", () => {
    console.log(`[Redis ${name}] Ready to accept commands`)
  })

  client.on("close", () => {
    console.log(`[Redis ${name}] Connection closed`)
  })

  client.on("reconnecting", () => {
    console.log(`[Redis ${name}] Reconnecting...`)
  })

  return client
}

export function getRedisPublisher(): Redis {
  if (!publisherClient) {
    publisherClient = createRedisClient("Publisher")
  }
  return publisherClient
}

export function getRedisSubscriber(): Redis {
  if (!subscriberClient) {
    subscriberClient = createRedisClient("Subscriber")
  }
  return subscriberClient
}

export async function closeRedisClients(): Promise<void> {
  const closePromises: Promise<void>[] = []

  if (publisherClient) {
    closePromises.push(
      publisherClient.quit().then(() => {
        publisherClient = null
        console.log("[Redis Publisher] Client closed")
      })
    )
  }

  if (subscriberClient) {
    closePromises.push(
      subscriberClient.quit().then(() => {
        subscriberClient = null
        console.log("[Redis Subscriber] Client closed")
      })
    )
  }

  await Promise.all(closePromises)
}

export { Redis }
