"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dumbbell, Calendar, Users, TrendingUp, Settings, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

export function Navigation() {
  const { profile, signOut } = useAuth()
  const pathname = usePathname()

  if (!profile) return null

  const isCoach = profile.role === "coach"
  const baseUrl = isCoach ? "/coach" : "/dashboard"

  const navigationItems = isCoach
    ? [
        { href: "/coach/dashboard", label: "Dashboard", icon: TrendingUp },
        { href: "/coach/programs", label: "Programs", icon: Calendar },
        { href: "/coach/clients", label: "Clients", icon: Users },
        { href: "/coach/exercises", label: "Exercises", icon: Dumbbell },
      ]
    : [
        { href: "/dashboard", label: "Dashboard", icon: TrendingUp },
        { href: "/dashboard/programs", label: "My Programs", icon: Calendar },
        { href: "/dashboard/workouts", label: "Workouts", icon: Dumbbell },
      ]

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href={baseUrl} className="flex items-center space-x-2">
              <Dumbbell className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">FitTracker Pro</span>
            </Link>

            <div className="hidden md:flex items-center space-x-6">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary",
                      pathname === item.href ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {profile.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{profile.name}</p>
                    <p className="w-[200px] truncate text-sm text-muted-foreground">{profile.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
                  </div>
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  )
}
