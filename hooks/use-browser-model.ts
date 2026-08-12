"use client"

import * as React from "react"

import {
  downloadBrowserModel,
  getBrowserAIAvailability,
  type BrowserAIAvailability,
} from "@/lib/browser-model"

export function useBrowserModel() {
  const [availability, setAvailability] =
    React.useState<BrowserAIAvailability>("unsupported")
  const [downloadProgress, setDownloadProgress] = React.useState<
    number | null
  >(null)
  const mountedRef = React.useRef(true)
  const downloadingRef = React.useRef(false)
  const availabilityRef = React.useRef(availability)

  React.useEffect(() => {
    availabilityRef.current = availability
  }, [availability])

  React.useEffect(() => {
    mountedRef.current = true
    getBrowserAIAvailability().then((result) => {
      if (mountedRef.current) setAvailability(result)
    })
    return () => {
      mountedRef.current = false
    }
  }, [])

  const startDownload = React.useCallback(() => {
    if (downloadingRef.current || availabilityRef.current !== "downloadable")
      return
    downloadingRef.current = true
    setAvailability("downloading")
    setDownloadProgress(0)

    downloadBrowserModel((fraction) => {
      if (mountedRef.current) setDownloadProgress(fraction)
    })
      .then(() => getBrowserAIAvailability())
      .catch(() => getBrowserAIAvailability())
      .then((result) => {
        if (mountedRef.current) setAvailability(result)
      })
      .finally(() => {
        downloadingRef.current = false
        if (mountedRef.current) setDownloadProgress(null)
      })
  }, [])

  return { availability, downloadProgress, startDownload }
}
