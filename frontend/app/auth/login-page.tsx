"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toast"
import { signInWithEmail, signUpWithEmail } from "@/lib/api"
import { auth } from "@/lib/auth-client"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { HeaderGoBack } from "../components/header-go-back"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn")

  useEffect(() => {
    const modeParam = searchParams.get("mode")
    if (modeParam === "signUp") {
      setMode("signUp")
    }
  }, [searchParams])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formState, setFormState] = useState({
    email: "",
    password: "",
    name: "",
  })

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (mode === "signIn") {
        await signInWithEmail({
          email: formState.email,
          password: formState.password,
        })
      } else {
        await signUpWithEmail({
          email: formState.email,
          password: formState.password,
          name: formState.name || undefined,
        })
      }

      toast({
        title: mode === "signIn" ? "Welcome back" : "Account created",
        status: "success",
      })

      router.push("/")
      router.refresh()
    } catch (err) {
      console.error("Authentication error:", err)
      setError((err as Error).message || "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await auth.signIn.social({
        provider: "google",
        callbackURL: window.location.origin + "/",
      })
    } catch (err) {
      console.error("Google sign-in error:", err)
      setError((err as Error).message || "Unable to sign in with Google")
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-background flex h-dvh w-full flex-col">
      <HeaderGoBack href="/" />

      <main className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-foreground text-3xl font-medium tracking-tight sm:text-4xl">
              Welcome to Muse
            </h1>
            <p className="text-muted-foreground mt-3">
              {mode === "signIn"
                ? "Sign in below to increase your message limits."
                : "Create an account to unlock higher limits and saved chats."}
            </p>
          </div>
          <div className="border border-border rounded-lg p-6 space-y-6">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {error}
            </div>
          )}
          <form className="space-y-4" onSubmit={handleAuth}>
            {mode === "signUp" && (
              <div className="space-y-2 text-left">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ada Lovelace"
                  value={formState.name}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required={mode === "signUp"}
                />
              </div>
            )}
            <div className="space-y-2 text-left">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formState.email}
                onChange={handleInputChange}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2 text-left">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formState.password}
                onChange={handleInputChange}
                disabled={isLoading}
                required
                minLength={8}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading
                ? "Processing..."
                : mode === "signIn"
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background text-muted-foreground px-2">
                  Or continue with
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>
            <p className="text-muted-foreground text-center text-sm">
              {mode === "signIn" ? "Need an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                className="text-foreground underline"
                onClick={() => {
                  const newMode = mode === "signIn" ? "signUp" : "signIn"
                  setMode(newMode)
                  setError(null)
                  router.push(`/auth?mode=${newMode}`)
                }}
                disabled={isLoading}
              >
                {mode === "signIn" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
          </div>
        </div>
      </main>

      <footer className="text-muted-foreground py-6 text-center text-sm">
        {/* @todo */}
        <p>
          By continuing, you agree to our{" "}
          <Link href="/" className="text-foreground hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/" className="text-foreground hover:underline">
            Privacy Policy
          </Link>
        </p>
      </footer>
    </div>
  )
}
