import type React from "react"
import "./globals.css"
import type { Metadata, Viewport } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/providers/auth-provider"
import { Toaster } from "@/components/ui/sonner"
import { LoadingProvider } from "@/components/providers/loading-provider"
import { GlobalLoadingIndicator } from "@/components/ui/global-loading-indicator"
import { LoadingResetOnRouteChange } from "@/lib/loading/loading-reset-change"
import { Navigation } from "@/components/layout/navigation"
import { createServerClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "FitTracker Pro - Exercise Program Management",
  description: "Professional exercise program management system for coaches and athletes",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/brand/icons/app-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/brand/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "FitTracker Pro",
    statusBarStyle: "default",
  },
}

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Fetch initial session and profile data
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  let initialProfile = null
  if (session?.user) {
    const { data: profile } = await supabase
      .from("users")
      .select("id, name, email, role")
      .eq("id", session.user.id)
      .single()
    initialProfile = profile
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="font-poppins antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <LoadingProvider>
            <AuthProvider initialSession={session} initialProfile={initialProfile}>
              <div className="min-h-screen bg-background">
                <Navigation />
                <GlobalLoadingIndicator />
                <LoadingResetOnRouteChange />
                <main>{children}</main>
              </div>
              <Toaster />
            </AuthProvider>
          </LoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
