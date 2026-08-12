import { tool } from "ai"
import { z } from "zod"

export const getTime = tool({
  description:
    "Get the current date and time, optionally in a specific IANA timezone (e.g. \"America/New_York\", \"Asia/Tokyo\"). Defaults to UTC.",
  inputSchema: z.object({
    timezone: z
      .string()
      .optional()
      .describe('IANA timezone name, e.g. "Europe/London". Defaults to UTC.'),
  }),
  outputSchema: z.union([
    z.object({ error: z.string() }),
    z.object({
      iso: z.string(),
      formatted: z.string(),
      timezone: z.string(),
      unixSeconds: z.number(),
    }),
  ]),
  execute: async ({ timezone }) => {
    const now = new Date()
    const zone = timezone?.trim() || "UTC"

    let formatted: string
    try {
      formatted = new Intl.DateTimeFormat("en", {
        dateStyle: "full",
        timeStyle: "long",
        timeZone: zone,
      }).format(now)
    } catch {
      return { error: `Unknown timezone: ${zone}` }
    }

    return {
      iso: now.toISOString(),
      formatted,
      timezone: zone,
      unixSeconds: Math.floor(now.getTime() / 1000),
    }
  },
})
