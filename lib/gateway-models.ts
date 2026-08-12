// Client-safe helpers for Vercel AI Gateway model ids. No server imports
// here — the provider itself lives in lib/gateway.ts.

export const GATEWAY_ID_PREFIX = "gateway/"

export function isGatewayModelId(id: string) {
  return id.startsWith(GATEWAY_ID_PREFIX)
}

export function stripGatewayPrefix(id: string) {
  return isGatewayModelId(id) ? id.slice(GATEWAY_ID_PREFIX.length) : id
}
