"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import { useGlobalLoading } from "@/components/providers/loading-provider"

export function LoadingResetOnRouteChange() {
  const pathname = usePathname()
  const { setLoading } = useGlobalLoading()
  const prevPath = useRef(pathname)

  useEffect(() => {
    if (prevPath.current !== pathname) {
      setLoading(false)
      prevPath.current = pathname
    }
  }, [pathname, setLoading])

  return null
}