import { createOpenAI } from "@ai-sdk/openai"

export const ANYROUTER_BASE_URL = "https://anyrouter.dev/api/v1"

export const anyrouter = createOpenAI({
  baseURL: ANYROUTER_BASE_URL,
  apiKey: process.env.ANYROUTER_API_KEY,
})
