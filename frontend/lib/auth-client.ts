import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000",
  basePath: "/v1/auth",
  fetchOptions: {
    credentials: "include",
  },
})

export { authClient as auth }
