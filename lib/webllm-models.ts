// Client-safe helpers for the curated WebLLM on-device models (Llama, Qwen,
// SmolLM), running fully in-browser over WebGPU via @browser-ai/web-llm. No
// server imports here.

export interface WebLLMModel {
  /** Id surfaced to the model picker, e.g. "webllm/Llama-3.2-3B-Instruct-q4f16_1-MLC". */
  id: string
  /** Display label, including an approximate download size. */
  name: string
  /** The underlying WebLLM/MLC model registry id passed to the `webLLM()` provider. */
  registryId: string
}

const WEBLLM_ID_PREFIX = "webllm/"

// Sizes are approximate, derived from each model's `vram_required_MB` in the
// WebLLM prebuilt model registry (@mlc-ai/web-llm), which tracks quantized
// weight size closely enough for a user-facing hint.
export const WEBLLM_MODELS: WebLLMModel[] = [
  {
    id: `${WEBLLM_ID_PREFIX}Llama-3.2-3B-Instruct-q4f16_1-MLC`,
    name: "Llama 3.2 3B (~2.3GB)",
    registryId: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
  },
  {
    id: `${WEBLLM_ID_PREFIX}Qwen2.5-1.5B-Instruct-q4f16_1-MLC`,
    name: "Qwen 2.5 1.5B (~1.6GB)",
    registryId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
  },
  {
    id: `${WEBLLM_ID_PREFIX}SmolLM2-1.7B-Instruct-q4f16_1-MLC`,
    name: "SmolLM2 1.7B (~1.8GB)",
    registryId: "SmolLM2-1.7B-Instruct-q4f16_1-MLC",
  },
  {
    id: `${WEBLLM_ID_PREFIX}gemma-2-2b-it-q4f16_1-MLC`,
    name: "Gemma 2 2B (~1.9GB)",
    registryId: "gemma-2-2b-it-q4f16_1-MLC",
  },
]

export function isWebLLMModelId(id: string): boolean {
  return id.startsWith(WEBLLM_ID_PREFIX)
}

export function getWebLLMModel(id: string): WebLLMModel | undefined {
  return WEBLLM_MODELS.find((model) => model.id === id)
}

// Mirrors @browser-ai/web-llm's own `doesBrowserSupportWebLLM()` check.
export function supportsWebGPU(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator
}
