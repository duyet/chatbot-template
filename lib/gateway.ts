import { createGateway } from "@ai-sdk/gateway"

let gatewayProvider: ReturnType<typeof createGateway> | undefined

export function getGateway() {
  if (!gatewayProvider) {
    gatewayProvider = createGateway({
      apiKey: process.env.AI_GATEWAY_API_KEY,
    })
  }
  return gatewayProvider
}
