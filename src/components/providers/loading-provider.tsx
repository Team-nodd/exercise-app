"use client"
import React, { createContext, useContext, useState } from "react"

type LoadingContextType = {
  loading: boolean
  setLoading: (val: boolean) => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false)
  return (
    <LoadingContext.Provider value={{ loading, setLoading }}>
      {children}
    </LoadingContext.Provider>
  )
}

export function useGlobalLoading() {
  const ctx = useContext(LoadingContext)
  if (!ctx) throw new Error("useGlobalLoading must be used within LoadingProvider")
  return ctx
}