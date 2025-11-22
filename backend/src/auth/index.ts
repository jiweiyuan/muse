import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { env } from "../config/env.js"
import { db, schema } from "../infra/db/index.js"

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/v1/auth",
  trustedOrigins:
    env.FRONTEND_ORIGIN?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
  },
  ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        socialProviders: {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        },
      }
    : {}),
})
