import { auth } from "./auth-client"
import { fetchClient } from "./fetch"
import { API_BASE } from "./routes"

export type EmailSignUpInput = {
  email: string
  password: string
  name?: string
  image?: string
  callbackURL?: string
  rememberMe?: boolean
}

export async function signUpWithEmail(input: EmailSignUpInput) {
  const { data, error } = await auth.signUp.email({
    ...input,
    name: input.name || "",
  })

  if (error) {
    throw new Error(error.message || "Failed to sign up")
  }

  return data
}

export type EmailSignInInput = {
  email: string
  password: string
  rememberMe?: boolean
  callbackURL?: string
}

export async function signInWithEmail(input: EmailSignInInput) {
  const { data, error } = await auth.signIn.email(input)

  if (error) {
    throw new Error(error.message || "Invalid email or password")
  }

  return data
}

export async function signOutUserSession() {
  const { error } = await auth.signOut()

  if (error) {
    throw new Error(error.message || "Failed to sign out")
  }

  return true
}

export async function generateChatTitle(
  projectId: string,
  chatId: string,
  userId: string,
  message: string
): Promise<string> {
  try {
    const res = await fetchClient(
      `${API_BASE}/v1/projects/${projectId}/chats/${chatId}/generate-title`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message }),
      }
    )

    const responseData = await res.json()

    if (!res.ok) {
      throw new Error(
        responseData.error ||
          `Failed to generate chat title: ${res.status} ${res.statusText}`
      )
    }

    return responseData.title
  } catch (error) {
    console.error("Error generating chat title:", error)
    // Return a fallback title if generation fails
    return "New Chat"
  }
}
