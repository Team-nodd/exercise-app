import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/providers/auth-provider"
import { Navigation } from "@/components/layout/navigation"
import { Toaster } from "@/components/ui/sonner"
import { createServerClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "FitTracker Pro - Exercise Program Management",
  description: "Professional exercise program management system for coaches and athletes",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get initial session on the server
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-poppins antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider initialSession={session}>
            <div className="min-h-screen bg-background">
              <Navigation />
              <main>{children}</main>
            </div>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
