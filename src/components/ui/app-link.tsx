// src/components/ui/app-link.tsx
"use client"
import { useRouter } from "next/navigation"
import { useGlobalLoading } from "@/components/providers/loading-provider"
import Link, { LinkProps } from "next/link"
import React from "react"

type AppLinkProps = React.PropsWithChildren<LinkProps> & {
  className?: string
  onClick?: React.MouseEventHandler<HTMLAnchorElement>
}

export function AppLink({ href, children, className, onClick, ...props }: AppLinkProps) {
  const router = useRouter()
  const { setLoading } = useGlobalLoading()

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    setLoading(true)
    onClick?.(e)
    // Let Next.js handle the navigation
  }

  return (
    <Link href={href} className={className} onClick={handleClick} {...props}>
      {children}
    </Link>
  )
}