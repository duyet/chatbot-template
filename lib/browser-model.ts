// Client-safe helpers for the Chrome built-in on-device model (Gemini Nano,
// via the Prompt API). No server imports here.

export const BROWSER_MODEL_ID = "chrome/gemini-nano"
export const BROWSER_MODEL_NAME = "Chrome built-in (Gemini Nano)"

export type BrowserAIAvailability =
  | "unsupported"
  | "unavailable"
  | "downloadable"
  | "downloading"
  | "available"

declare global {
  // Minimal shape of Chrome's experimental Prompt API. Only what we use.
  const LanguageModel:
    | {
        availability(): Promise<string>
        create(options?: {
          monitor?: (m: EventTarget) => void
        }): Promise<{ destroy(): void }>
      }
    | undefined
}

export async function getBrowserAIAvailability(): Promise<BrowserAIAvailability> {
  if (typeof LanguageModel === "undefined") {
    return "unsupported"
  }

  try {
    const availability = await LanguageModel.availability()
    switch (availability) {
      case "unavailable":
      case "downloadable":
      case "downloading":
      case "available":
        return availability
      default:
        return "unsupported"
    }
  } catch {
    return "unsupported"
  }
}

// Chrome's downloadprogress event reports `loaded` as a 0..1 fraction in
// current builds, but earlier/other implementations may report bytes via
// `loaded`/`total`. Handle both defensively.
function normalizeProgress(event: {
  loaded?: number
  total?: number
}): number {
  const { loaded, total } = event
  if (typeof loaded !== "number") return 0
  if (typeof total === "number" && total > 1) {
    return Math.min(1, Math.max(0, loaded / total))
  }
  return Math.min(1, Math.max(0, loaded))
}

export async function downloadBrowserModel(
  onProgress: (fraction: number) => void
): Promise<void> {
  if (typeof LanguageModel === "undefined") {
    throw new Error("unsupported")
  }

  const session = await LanguageModel.create({
    monitor(m) {
      m.addEventListener("downloadprogress", (e) => {
        try {
          onProgress(normalizeProgress(e as unknown as ProgressEvent))
        } catch {
          // Listener errors must not break the download promise.
        }
      })
    },
  })
  session.destroy()
}
