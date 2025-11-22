import { fetchClient } from "@/lib/fetch"
import { signOutUserSession } from "@/lib/api"
import {
  convertFromApiFormat,
  defaultPreferences,
} from "@/lib/user-preference-store/utils"
import type { UserProfile } from "@/lib/user/types"
import { API_ROUTE_USER_ME } from "@/lib/routes"

type UserApiPayload = {
  id: string
  email?: string | null
  name?: string | null
  image?: string | null
  systemPrompt?: string | null
  isAnonymous?: boolean
}

type UserApiResponse = {
  user?: UserApiPayload | null
  preferences?: Parameters<typeof convertFromApiFormat>[0]
}

function mapUpdatedUser(response: UserApiResponse): UserProfile | null {
  if (!response?.user) return null

  const {
    id,
    email,
    name,
    image,
    systemPrompt,
    isAnonymous,
  } = response.user

  if (isAnonymous) {
    return null
  }

  return {
    id,
    email: email ?? "",
    display_name: name ?? "",
    profile_image: image ?? "",
    system_prompt: systemPrompt ?? null,
    preferences: response.preferences
      ? convertFromApiFormat(response.preferences)
      : defaultPreferences,
  }
}

export async function fetchUserProfile(): Promise<UserProfile | null> {
  try {
    const res = await fetchClient(API_ROUTE_USER_ME, {
      method: "GET",
    })

    if (!res.ok) {
      return null
    }

    const data = await res.json()
    return mapUpdatedUser(data)
  } catch (error) {
    console.error("Failed to fetch user profile:", error)
    return null
  }
}

export async function updateUserProfile(
  updates: Partial<UserProfile>
): Promise<UserProfile | null> {
  try {
    const payload: Record<string, unknown> = {}

    if ("display_name" in updates) {
      payload.displayName = updates.display_name
    }

    if ("profile_image" in updates) {
      payload.profileImage = updates.profile_image
    }

    if ("system_prompt" in updates) {
      payload.systemPrompt = updates.system_prompt
    }

    const res = await fetchClient(API_ROUTE_USER_ME, {
      method: "PATCH",
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      console.error("Failed to update user profile:", error)
      return null
    }

    const data = await res.json()
    return mapUpdatedUser(data)
  } catch (error) {
    console.error("Error updating user profile:", error)
    return null
  }
}

export async function signOutUser(): Promise<boolean> {
  try {
    await signOutUserSession()
    return true
  } catch (error) {
    console.error("Failed to sign out:", error)
    return false
  }
}

export function subscribeToUserUpdates(
  _userId: string,
  _onUpdate: (newData: Partial<UserProfile>) => void
) {
  void _userId
  void _onUpdate
  // Realtime user updates are not yet supported.
  return () => {}
}
