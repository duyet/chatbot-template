"use client"

import * as React from "react"

import {
  getBrowserAIAvailability,
  type BrowserAIAvailability,
} from "@/lib/browser-model"

export function useBrowserModel() {
  const [availability, setAvailability] =
    React.useState<BrowserAIAvailability>("unsupported")

  React.useEffect(() => {
    let cancelled = false
    getBrowserAIAvailability().then((result) => {
      if (!cancelled) setAvailability(result)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { availability }
}
