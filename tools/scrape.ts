import { tool } from "ai"
import { z } from "zod"

const MAX_CONTENT_LENGTH = 4000

export const scrapePage = tool({
  description:
    "Fetch a web page and return its readable content as markdown. Use to read the contents of a URL.",
  inputSchema: z.object({
    url: z.string().describe("The http(s) URL to fetch"),
  }),
  outputSchema: z.union([
    z.object({ error: z.string() }),
    z.object({
      url: z.string(),
      content: z.string(),
      truncated: z.boolean(),
    }),
  ]),
  execute: async ({ url }) => {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return { error: `Invalid URL: ${url}` }
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { error: `Unsupported URL scheme: ${parsed.protocol}` }
    }

    try {
      // Lightweight free scraper via Jina Reader (no API key required).
      // Swap for Firecrawl once an API key is configured.
      const res = await fetch(`https://r.jina.ai/${parsed.toString()}`, {
        headers: { Accept: "text/plain" },
        signal: AbortSignal.timeout(20_000),
      })
      if (!res.ok) {
        return { error: `Could not fetch ${url} (status ${res.status}).` }
      }
      const text = await res.text()
      const truncated = text.length > MAX_CONTENT_LENGTH
      return {
        url: parsed.toString(),
        content: text.slice(0, MAX_CONTENT_LENGTH),
        truncated,
      }
    } catch {
      return { error: `Could not fetch ${url}.` }
    }
  },
})
