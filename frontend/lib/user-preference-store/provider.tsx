"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createContext, ReactNode, useContext } from "react"
import { API_ROUTE_USER_PREFERENCES } from "@/lib/routes"
import { fetchClient } from "@/lib/fetch"
import { useUser } from "@/lib/user-store/provider"
import {
  convertFromApiFormat,
  convertToApiFormat,
  defaultPreferences,
  type LayoutType,
  type UserPreferences,
} from "./utils"

export {
  type LayoutType,
  type UserPreferences,
  convertFromApiFormat,
  convertToApiFormat,
}

const PREFERENCES_STORAGE_KEY = "user-preferences"
const LAYOUT_STORAGE_KEY = "preferred-layout"

interface UserPreferencesContextType {
  preferences: UserPreferences
  setLayout: (layout: LayoutType) => void
  setPromptSuggestions: (enabled: boolean) => void
  setShowToolInvocations: (enabled: boolean) => void
  setShowConversationPreviews: (enabled: boolean) => void
  toggleModelVisibility: (modelId: string) => void
  isModelHidden: (modelId: string) => boolean
  isLoading: boolean
}

const UserPreferencesContext = createContext<
  UserPreferencesContextType | undefined
>(undefined)

async function fetchUserPreferences(): Promise<UserPreferences> {
  const response = await fetchClient(API_ROUTE_USER_PREFERENCES)
  if (!response.ok) {
    throw new Error("Failed to fetch user preferences")
  }
  const data = await response.json()
  return convertFromApiFormat(data)
}

async function updateUserPreferences(
  update: Partial<UserPreferences>
): Promise<UserPreferences> {
  const response = await fetchClient(API_ROUTE_USER_PREFERENCES, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(convertToApiFormat(update)),
  })

  if (!response.ok) {
    throw new Error("Failed to update user preferences")
  }

  const data = await response.json()
  return convertFromApiFormat(data)
}

function getLocalStoragePreferences(): UserPreferences {
  if (typeof window === "undefined") return defaultPreferences

  const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      // fallback to legacy layout storage if JSON parsing fails
    }
  }

  const layout = localStorage.getItem(LAYOUT_STORAGE_KEY) as LayoutType | null
  return {
    ...defaultPreferences,
    ...(layout ? { layout } : {}),
  }
}

function saveToLocalStorage(preferences: UserPreferences) {
  if (typeof window === "undefined") return

  localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
  localStorage.setItem(LAYOUT_STORAGE_KEY, preferences.layout)
}

export function UserPreferencesProvider({
  children,
  userId,
  initialPreferences,
}: {
  children: ReactNode
  userId?: string
  initialPreferences?: UserPreferences
}) {
  const { user } = useUser()
  const resolvedUserId = userId ?? user?.id
  const resolvedInitialPreferences =
    initialPreferences ?? user?.preferences ?? undefined
  const isAuthenticated = !!resolvedUserId
  const queryClient = useQueryClient()

  // Merge initial preferences with defaults
  const getInitialData = (): UserPreferences => {
    if (resolvedInitialPreferences && isAuthenticated) {
      return resolvedInitialPreferences
    }

    if (!isAuthenticated) {
      return getLocalStoragePreferences()
    }

    return defaultPreferences
  }

  // Query for user preferences
  const { data: preferences = getInitialData(), isLoading } = useQuery<UserPreferences>({
    queryKey: ["user-preferences", resolvedUserId],
    queryFn: async () => {
      if (!isAuthenticated) {
        return getLocalStoragePreferences()
      }

      try {
        return await fetchUserPreferences()
      } catch (error) {
        console.error(
          "Failed to fetch user preferences, falling back to localStorage:",
          error
        )
        return getLocalStoragePreferences()
      }
    },
    enabled: typeof window !== "undefined",
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount) => {
      // Only retry for authenticated users and network errors
      return isAuthenticated && failureCount < 2
    },
    // Use initial data if available to avoid unnecessary API calls
    initialData:
      resolvedInitialPreferences && isAuthenticated
        ? getInitialData()
        : undefined,
  })

  // Mutation for updating preferences
  const mutation = useMutation({
    mutationFn: async (update: Partial<UserPreferences>) => {
      const updated = { ...preferences, ...update }

      if (!isAuthenticated) {
        saveToLocalStorage(updated)
        return updated
      }

      try {
        return await updateUserPreferences(update)
      } catch (error) {
        console.error(
          "Failed to update user preferences in database, falling back to localStorage:",
          error
        )
        saveToLocalStorage(updated)
        return updated
      }
    },
    onMutate: async (update) => {
      const queryKey = ["user-preferences", resolvedUserId]
      await queryClient.cancelQueries({ queryKey })

      const previous = queryClient.getQueryData<UserPreferences>(queryKey)
      const optimistic = { ...previous, ...update }
      queryClient.setQueryData(queryKey, optimistic)

      return { previous }
    },
    onError: (_err, _update, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["user-preferences", resolvedUserId],
          context.previous
        )
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["user-preferences", resolvedUserId], data)
    },
  })

  const updatePreferences = mutation.mutate

  const setLayout = (layout: LayoutType) => {
    if (isAuthenticated || layout === "fullscreen") {
      updatePreferences({ layout })
    }
  }

  const setPromptSuggestions = (enabled: boolean) => {
    updatePreferences({ promptSuggestions: enabled })
  }

  const setShowToolInvocations = (enabled: boolean) => {
    updatePreferences({ showToolInvocations: enabled })
  }

  const setShowConversationPreviews = (enabled: boolean) => {
    updatePreferences({ showConversationPreviews: enabled })
  }

  const toggleModelVisibility = (modelId: string) => {
    const currentHidden = preferences.hiddenModels || []
    const isHidden = currentHidden.includes(modelId)
    const newHidden = isHidden
      ? currentHidden.filter((id) => id !== modelId)
      : [...currentHidden, modelId]

    updatePreferences({ hiddenModels: newHidden })
  }

  const isModelHidden = (modelId: string) => {
    return (preferences.hiddenModels || []).includes(modelId)
  }

  return (
    <UserPreferencesContext.Provider
      value={{
        preferences,
        setLayout,
        setPromptSuggestions,
        setShowToolInvocations,
        setShowConversationPreviews,
        toggleModelVisibility,
        isModelHidden,
        isLoading,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  )
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext)
  if (!context) {
    throw new Error(
      "useUserPreferences must be used within UserPreferencesProvider"
    )
  }
  return context
}
