// Provider-native web-search tools (openai.tools.webSearch(), Anthropic's
// anthropic.tools.webSearch_20260209()) don't ride through AnyRouter's
// OpenAI-compatible endpoint — the Anthropic-provider tool shape would break
// requests to anthropic/* models routed via the OpenAI-compatible API. Web
// search is disabled until AnyRouter adds passthrough for provider-native
// tools.
export function getWebSearch(modelId: string) {
  void modelId
  return undefined
}
