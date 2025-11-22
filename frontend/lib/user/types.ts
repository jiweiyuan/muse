import type { UserPreferences } from "../user-preference-store/utils"

export type UserProfile = {
  id: string
  email: string
  display_name: string
  profile_image: string
  system_prompt: string | null
  preferences?: UserPreferences
}
