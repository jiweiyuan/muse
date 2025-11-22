"use client"

import { useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/lib/user-store/provider"
import LoginPage from "./login-page"

export default function AuthPage() {
  const router = useRouter()
  const { user, isLoading } = useUser()

  useEffect(() => {
    if (isLoading) return
    if (user) {
      router.replace("/")
    }
  }, [isLoading, router, user])

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPage />
    </Suspense>
  )
}
