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
