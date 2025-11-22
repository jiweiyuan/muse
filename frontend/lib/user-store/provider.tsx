// app/providers/user-provider.tsx
"use client"

import {
  fetchUserProfile,
  signOutUser,
  updateUserProfile,
} from "@/lib/user-store/api"
import type { UserProfile } from "@/lib/user/types"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

type UserContextType = {
  user: UserProfile | null
  isLoading: boolean
  updateUser: (updates: Partial<UserProfile>) => Promise<void>
  refreshUser: () => Promise<void>
  signOut: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode
  initialUser: UserProfile | null
}) {
  const [user, setUser] = useState<UserProfile | null>(initialUser)
  const [isLoading, setIsLoading] = useState(() => (initialUser ? false : true))

  useEffect(() => {
    if (initialUser) {
      return
    }

    let isActive = true

    const initialize = async () => {
      setIsLoading(true)
      try {
        const fetchedUser = await fetchUserProfile()
        if (isActive) {
          setUser(fetchedUser)
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    initialize()

    return () => {
      isActive = false
    }
  }, [initialUser])

  const refreshUser = useCallback(async () => {
    setIsLoading(true)
    try {
      const updatedUser = await fetchUserProfile()
      setUser(updatedUser)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateUser = useCallback(async (updates: Partial<UserProfile>) => {
    setIsLoading(true)
    try {
      const updatedUser = await updateUserProfile(updates)
      if (updatedUser) {
        setUser(updatedUser)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    setIsLoading(true)
    try {
      const success = await signOutUser()
      if (success) setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const value = useMemo(
    () => ({ user, isLoading, updateUser, refreshUser, signOut }),
    [user, isLoading, updateUser, refreshUser, signOut]
  )

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

// Custom hook to use the user context
export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
