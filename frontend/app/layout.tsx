import type { Metadata } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import "./globals.css"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ModelProvider } from "@/lib/model-store/provider"
import { ProjectsProvider } from "@/lib/projects/provider"
import { TanstackQueryProvider } from "@/lib/tanstack-query/tanstack-query-provider"
import { UserPreferencesProvider } from "@/lib/user-preference-store/provider"
import { UserProvider } from "@/lib/user-store/provider"
import { ThemeProvider } from "next-themes"
import Script from "next/script"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Muse",
  description:
    "Muse is the open-source interface for AI chat. Multi-model, BYOK-ready, and fully self-hostable. Use Claude, OpenAI, Gemini, local models, and more, all in one place.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const isDev = process.env.NODE_ENV === "development"
  const isOfficialDeployment = process.env.MUSE_OFFICIAL === "true"

  return (
    <html lang="en" suppressHydrationWarning>
      {isOfficialDeployment ? (
        <Script
          defer
          src="https://assets.onedollarstats.com/stonks.js"
          {...(isDev ? { "data-debug": "muse.com" } : {})}
        />
      ) : null}
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased`}
      >
        <TanstackQueryProvider>
          <UserProvider initialUser={null}>
            <ProjectsProvider>
              <ModelProvider>
                <UserPreferencesProvider>
                  <TooltipProvider
                    delayDuration={200}
                    skipDelayDuration={500}
                  >
                    <ThemeProvider
                      attribute="class"
                      defaultTheme="light"
                      enableSystem
                      disableTransitionOnChange
                    >
                      <SidebarProvider defaultOpen>
                        <Toaster position="top-center" />
                        {children}
                      </SidebarProvider>
                    </ThemeProvider>
                  </TooltipProvider>
                </UserPreferencesProvider>
              </ModelProvider>
            </ProjectsProvider>
          </UserProvider>
        </TanstackQueryProvider>
      </body>
    </html>
  )
}
