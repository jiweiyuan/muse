import { defineConfig } from "drizzle-kit"
import { env } from "./src/config/env"

export default defineConfig({
  out: "drizzle/migrations",
  schema: "./src/db/schema.ts",
  driver: "pg",
  dbCredentials: {
    connectionString: env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
})
