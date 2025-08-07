"use client"
import { useGlobalLoading } from "@/components/providers/loading-provider"
import { Loader2 } from "lucide-react"

export function GlobalLoadingIndicator() {
  const { loading } = useGlobalLoading()
  if (!loading) return null
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30">
      <Loader2 className="h-12 w-12 animate-spin text-white" />
    </div>
  )
}