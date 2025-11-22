import { env } from "./config/env.js"
import { buildApp } from "./app.js"

async function start() {
  const app = await buildApp()

  // Prevent crashes from unhandled promise rejections
  process.on("unhandledRejection", (reason) => {
    app.log.error({ reason }, "Unhandled Promise Rejection")
  })

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" })
    app.log.info(`🚀 Server listening on port ${env.PORT}`)
  } catch (error) {
    app.log.error(error, "Failed to start server")
    process.exit(1)
  }
}

void start()
