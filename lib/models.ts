import { ANYROUTER_BASE_URL } from "@/lib/anyrouter"

export interface GatewayModel {
  id: string
  name: string
}

export const DEFAULT_MODEL = "anyrouter/free"

// Used when the AnyRouter catalog API is unreachable.
export const FALLBACK_MODELS: GatewayModel[] = [
  { id: "anyrouter/free", name: "AnyRouter Free" },
  { id: "anthropic/claude-sonnet-4.6", name: "Claude Sonnet 4.6" },
  { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5" },
  { id: "openai/gpt-5.4-mini", name: "GPT 5.4 Mini" },
  { id: "alibaba/qwen3-max", name: "Qwen3 Max" },
]

// Other anyrouter/* meta-models (byok, coding, agent, hermes, cowork, ...)
// aren't real chat models — exclude them from ranking. anyrouter/free is
// handled separately and always pinned first.
const EXCLUDED_ANYROUTER_IDS = new Set([
  "anyrouter/byok",
  "anyrouter/coding",
  "anyrouter/agent",
  "anyrouter/hermes",
  "anyrouter/cowork",
])

interface AnyRouterModel {
  id: string
  name: string
  category?: string
  capabilities?: string[]
  links?: { metrics?: string }
}

interface AnyRouterMetrics {
  model_id: string
  request_count?: number | null
}

async function fetchMetrics(model: AnyRouterModel): Promise<number> {
  try {
    const url = model.links?.metrics
      ? new URL(model.links.metrics, "https://anyrouter.dev").toString()
      : `${ANYROUTER_BASE_URL}/models/${encodeURIComponent(model.id)}/metrics`

    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return 0

    const data = (await res.json()) as AnyRouterMetrics
    return data.request_count ?? 0
  } catch {
    return 0
  }
}

export async function getModels(): Promise<GatewayModel[]> {
  try {
    const headers: Record<string, string> = {}
    if (process.env.ANYROUTER_API_KEY) {
      headers.Authorization = `Bearer ${process.env.ANYROUTER_API_KEY}`
    }

    const res = await fetch(`${ANYROUTER_BASE_URL}/models`, {
      headers,
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error(`AnyRouter models request failed: ${res.status}`)

    const { data } = (await res.json()) as { data: AnyRouterModel[] }

    const chatModels = data.filter(
      (m) =>
        m.category === "text" &&
        m.capabilities?.includes("chat") &&
        !EXCLUDED_ANYROUTER_IDS.has(m.id) &&
        m.id !== "anyrouter/free"
    )

    // Rank by usage: fetch each model's request count in batches so we don't
    // fire hundreds of concurrent requests against the metrics endpoint.
    const counts = new Map<string, number>()
    const BATCH_SIZE = 20
    for (let i = 0; i < chatModels.length; i += BATCH_SIZE) {
      const batch = chatModels.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(batch.map(fetchMetrics))
      results.forEach((result, idx) => {
        counts.set(
          batch[idx].id,
          result.status === "fulfilled" ? result.value : 0
        )
      })
    }

    const ranked = chatModels
      .map((m, index) => ({ m, index, count: counts.get(m.id) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.index - b.index)
      .slice(0, 10)
      .map(({ m }) => ({ id: m.id, name: m.name }))

    const models = [{ id: "anyrouter/free", name: "AnyRouter Free" }, ...ranked]
    return models.filter(
      (m, i) => models.findIndex((other) => other.id === m.id) === i
    )
  } catch {
    return FALLBACK_MODELS
  }
}

export function isModelAllowed(id: string, models: GatewayModel[]) {
  return models.some((model) => model.id === id)
}
