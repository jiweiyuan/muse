import { fetchClient } from "@/lib/fetch"
import {
  convertFromApiFormat,
  defaultPreferences,
  type UserPreferencesApi,
} from "@/lib/user-preference-store/utils"
import type { UserProfile } from "./types"
import { API_ROUTE_USER_ME } from "@/lib/routes"

type UserProfileResponse = {
  user: {
    id: string
    email: string
    name?: string | null
    image?: string | null
    systemPrompt?: string | null
    isAnonymous: boolean
  } | null
  preferences?: UserPreferencesApi | null
}

export function mapUserProfile(response: UserProfileResponse): UserProfile | null {
  const { user, preferences } = response

  if (!user || user.isAnonymous) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    display_name: user.name ?? "",
    profile_image: user.image ?? "",
    system_prompt: user.systemPrompt ?? null,
    preferences: preferences
      ? convertFromApiFormat(preferences)
      : defaultPreferences,
  }
}

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const res = await fetchClient(API_ROUTE_USER_ME, {
      method: "GET",
    })

    if (res.status === 401) {
      return null
    }

    if (!res.ok) {
      console.error("Failed to fetch user profile:", res.statusText)
      return null
    }

    const data = (await res.json()) as UserProfileResponse
    return mapUserProfile(data)
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return null
  }
}
