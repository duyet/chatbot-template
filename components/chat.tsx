"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import {
  DefaultChatTransport,
  DirectChatTransport,
  ToolLoopAgent,
  lastAssistantMessageIsCompleteWithToolCalls,
  type ChatTransport,
} from "ai"
import { browserAI } from "@browser-ai/core"
import { type WebLLMLanguageModel } from "@browser-ai/web-llm"
import { type GatewayModel } from "@/lib/models"
import { type ChatUIMessage } from "@/tools"
import { BROWSER_MODEL_ID, BROWSER_MODEL_NAME } from "@/lib/browser-model"
import {
  WEBLLM_MODELS,
  getWebLLMModel,
  isWebLLMModelId,
  supportsWebLLMModels,
} from "@/lib/webllm-models"
import { useBrowserModel } from "@/hooks/use-browser-model"
import { ChatMessage } from "@/components/chat-message"
import { PromptForm } from "@/components/prompt-form"
import { QuestionCard } from "@/components/question-card"
import { Suggestions } from "@/components/suggestions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"

type WebLLMStatus = "idle" | "loading" | "ready" | "failed"

// @browser-ai/web-llm pulls in the WebLLM/tvmjs runtime, which is several
// megabytes. Load it lazily (and once) so visitors who never touch a WebLLM
// model never pay for it.
let webLLMModulePromise: Promise<typeof import("@browser-ai/web-llm")> | null =
  null
function loadWebLLMModule() {
  return (webLLMModulePromise ??= import("@browser-ai/web-llm"))
}

export function Chat({ models }: { models: GatewayModel[] }) {
  const [model, setModel] = React.useState(models[0]?.id ?? "")
  const {
    availability: browserAvailability,
    downloadProgress,
    startDownload,
  } = useBrowserModel()

  // WebGPU + shader-f16 support is only knowable on the client, and needs an
  // async adapter probe — start from `false` (matching the server render) and
  // let the real value take over after hydration.
  const [gpuSupported, setGpuSupported] = React.useState(false)
  React.useEffect(() => {
    let cancelled = false
    supportsWebLLMModels().then((supported) => {
      if (!cancelled) setGpuSupported(supported)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const [webllmStatus, setWebllmStatus] = React.useState<
    Record<string, WebLLMStatus>
  >({})
  const [webllmProgress, setWebllmProgress] = React.useState<
    Record<string, number>
  >({})
  const webllmStatusRef = React.useRef<Record<string, WebLLMStatus>>({})

  // One WebLLMLanguageModel instance per registry id, created only once the
  // (lazily loaded) module resolves.
  const webllmModelsRef = React.useRef(
    new Map<string, Promise<WebLLMLanguageModel>>()
  )
  const getWebLLMLanguageModel = React.useCallback((registryId: string) => {
    let instance = webllmModelsRef.current.get(registryId)
    if (!instance) {
      instance = loadWebLLMModule().then((mod) => mod.webLLM(registryId))
      webllmModelsRef.current.set(registryId, instance)
    }
    return instance
  }, [])

  const startWebLLMDownload = React.useCallback(
    (id: string) => {
      const current = webllmStatusRef.current[id] ?? "idle"
      if (current === "loading" || current === "ready") return
      const webllmModel = getWebLLMModel(id)
      if (!webllmModel) return

      webllmStatusRef.current[id] = "loading"
      setWebllmStatus((prev) => ({ ...prev, [id]: "loading" }))
      setWebllmProgress((prev) => ({ ...prev, [id]: 0 }))

      getWebLLMLanguageModel(webllmModel.registryId)
        .then((model) =>
          model.createSessionWithProgress((fraction) => {
            setWebllmProgress((prev) => ({ ...prev, [id]: fraction }))
          })
        )
        .then(() => {
          webllmStatusRef.current[id] = "ready"
          setWebllmStatus((prev) => ({ ...prev, [id]: "ready" }))
        })
        .catch(() => {
          webllmStatusRef.current[id] = "failed"
          setWebllmStatus((prev) => ({ ...prev, [id]: "failed" }))
        })
        .finally(() => {
          setWebllmProgress((prev) => {
            const next = { ...prev }
            delete next[id]
            return next
          })
        })
    },
    [getWebLLMLanguageModel]
  )

  const browserModelLabel =
    browserAvailability === "downloadable"
      ? `${BROWSER_MODEL_NAME} — download`
      : browserAvailability === "downloading"
        ? `${BROWSER_MODEL_NAME} — downloading…`
        : BROWSER_MODEL_NAME

  const allModels = React.useMemo(() => {
    const chromeEntry =
      browserAvailability === "downloadable" ||
      browserAvailability === "downloading" ||
      browserAvailability === "available"
        ? [{ id: BROWSER_MODEL_ID, name: browserModelLabel }]
        : []

    const webllmEntries = gpuSupported
      ? WEBLLM_MODELS.map((webllmModel) => {
          const status = webllmStatus[webllmModel.id] ?? "idle"
          const name =
            status === "loading"
              ? `${webllmModel.name} — downloading…`
              : status === "failed"
                ? `${webllmModel.name} — failed`
                : status === "idle"
                  ? `${webllmModel.name} — download`
                  : webllmModel.name
          return { id: webllmModel.id, name }
        })
      : []

    return [...chromeEntry, ...webllmEntries, ...models]
  }, [
    models,
    browserAvailability,
    browserModelLabel,
    gpuSupported,
    webllmStatus,
  ])

  // Default to the on-device model once it reports ready, unless the user
  // has already picked a model themselves. "downloadable" is deliberately
  // excluded — defaulting to it would trigger a multi-GB download on the
  // first message.
  const userPickedModel = React.useRef(false)
  React.useEffect(() => {
    if (!userPickedModel.current && browserAvailability === "available") {
      setModel(BROWSER_MODEL_ID)
    }
  }, [browserAvailability])

  const resolvedModel = allModels.some((m) => m.id === model)
    ? model
    : (models[0]?.id ?? "")

  const modelRef = React.useRef(resolvedModel)
  React.useEffect(() => {
    modelRef.current = resolvedModel
  }, [resolvedModel])

  // Delegating transport: on-device models (Chrome built-in, WebLLM) run
  // fully in-process (no server round-trip), every other model goes through
  // /api/chat as usual. Built once so useChat doesn't re-init when the user
  // switches models.
  const transport = React.useMemo(() => {
    const http = new DefaultChatTransport<ChatUIMessage>({ api: "/api/chat" })
    // The direct transports have no tools, so they can't be typed against
    // ChatUIMessage's tool-part union; they only ever handle plain text
    // replies for on-device models, so we bridge the two at the call site.
    let direct: DirectChatTransport | null = null
    const getDirect = () =>
      (direct ??= new DirectChatTransport({
        agent: new ToolLoopAgent({ model: browserAI() }),
      }))

    // One DirectChatTransport (and its ToolLoopAgent) per WebLLM model id,
    // so switching between them doesn't rebuild the agent each time. Built
    // lazily since constructing it needs the (dynamically imported) model.
    const webllmTransports = new Map<string, Promise<DirectChatTransport>>()
    const getWebLLMTransport = (id: string) => {
      let webllmTransport = webllmTransports.get(id)
      if (!webllmTransport) {
        const webllmModel = getWebLLMModel(id)
        if (!webllmModel) return null
        webllmTransport = getWebLLMLanguageModel(webllmModel.registryId).then(
          (model) =>
            new DirectChatTransport({ agent: new ToolLoopAgent({ model }) })
        )
        webllmTransports.set(id, webllmTransport)
      }
      return webllmTransport
    }

    // The on-device agents have no tools, so DirectChatTransport rejects
    // history containing tool parts (e.g. from earlier hosted-model turns).
    // Keep only text parts when handing a conversation to them.
    const toDirectOptions = (
      options: Parameters<ChatTransport<ChatUIMessage>["sendMessages"]>[0]
    ) =>
      ({
        ...options,
        messages: options.messages
          .map((message) => ({
            ...message,
            parts: message.parts.filter((part) => part.type === "text"),
          }))
          .filter((message) => message.parts.length > 0),
      }) as Parameters<DirectChatTransport["sendMessages"]>[0]

    return {
      sendMessages: async (options) => {
        if (modelRef.current === BROWSER_MODEL_ID) {
          return getDirect().sendMessages(toDirectOptions(options))
        }
        if (isWebLLMModelId(modelRef.current)) {
          const webllmTransport = getWebLLMTransport(modelRef.current)
          if (webllmTransport) {
            return (await webllmTransport).sendMessages(toDirectOptions(options))
          }
        }
        return http.sendMessages(options)
      },
      // The direct transports have no persistent server-side stream to
      // reconnect to; only the HTTP transport supports this.
      reconnectToStream: (options) => http.reconnectToStream(options),
    } satisfies ChatTransport<ChatUIMessage>
  }, [getWebLLMLanguageModel])

  const { messages, sendMessage, status, stop, error, addToolOutput } =
    useChat<ChatUIMessage>({
      transport,
      // Resume the conversation automatically once the user has answered the
      // ask_user questionnaire.
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    })

  const isBusy = status === "submitted" || status === "streaming"
  const isDownloadingSelectedModel =
    (resolvedModel === BROWSER_MODEL_ID &&
      browserAvailability === "downloading") ||
    (isWebLLMModelId(resolvedModel) &&
      webllmStatus[resolvedModel] === "loading")

  const lastMessage = messages.at(-1)
  const pendingQuestion =
    lastMessage?.role === "assistant"
      ? lastMessage.parts.find(
          (part): part is Extract<typeof part, { type: "tool-ask_user" }> =>
            part.type === "tool-ask_user" &&
            (part.state === "input-streaming" ||
              part.state === "input-available")
        )
      : undefined

  return (
    <div className="mx-auto flex min-h-0 w-full flex-1 flex-col">
      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>What can I help with?</EmptyTitle>
              <EmptyDescription>
                Pick a model and start chatting. Responses stream through
                AnyRouter.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Suggestions
                onSelect={(prompt) => {
                  if (isDownloadingSelectedModel) return
                  sendMessage(
                    { text: prompt },
                    { body: { model: resolvedModel } }
                  )
                }}
              />
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <MessageScrollerProvider>
          <MessageScroller className="flex-1">
            <MessageScrollerViewport>
              <MessageScrollerContent className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-6">
                {messages.map((message) => (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                    scrollAnchor={message.role === "user"}
                  >
                    <ChatMessage
                      message={message}
                      isStreaming={isBusy && message.id === lastMessage?.id}
                    />
                  </MessageScrollerItem>
                ))}
                {status === "submitted" && (
                  <MessageScrollerItem messageId="thinking">
                    <div className="flex shimmer items-center gap-2 px-3 text-sm text-muted-foreground">
                      Thinking…
                    </div>
                  </MessageScrollerItem>
                )}
              </MessageScrollerContent>
              {pendingQuestion && (
                <QuestionCard
                  part={pendingQuestion}
                  onAnswer={(toolCallId, answer) =>
                    addToolOutput({
                      tool: "ask_user",
                      toolCallId,
                      output: answer,
                      options: { body: { model: resolvedModel } },
                    })
                  }
                />
              )}
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      )}

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-6 pb-6">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Request failed</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        {resolvedModel === BROWSER_MODEL_ID &&
          (browserAvailability === "downloadable" ||
            browserAvailability === "downloading") && (
            <p className="text-xs text-muted-foreground">
              {browserAvailability === "downloading"
                ? `Downloading on-device model… ${Math.round((downloadProgress ?? 0) * 100)}%`
                : "The on-device model downloads when selected (Chrome desktop, large download)."}
            </p>
          )}
        {isWebLLMModelId(resolvedModel) &&
          webllmStatus[resolvedModel] === "loading" && (
            <p className="text-xs text-muted-foreground">
              {`Downloading ${getWebLLMModel(resolvedModel)?.name ?? resolvedModel}… ${Math.round((webllmProgress[resolvedModel] ?? 0) * 100)}%`}
            </p>
          )}
        {isWebLLMModelId(resolvedModel) &&
          webllmStatus[resolvedModel] === "failed" && (
            <p className="text-xs text-destructive">
              {`Failed to load ${getWebLLMModel(resolvedModel)?.name ?? resolvedModel}. `}
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => startWebLLMDownload(resolvedModel)}
              >
                Retry
              </button>
            </p>
          )}
        <PromptForm
          models={allModels}
          model={resolvedModel}
          onModelChange={(next) => {
            userPickedModel.current = true
            setModel(next)
            if (
              next === BROWSER_MODEL_ID &&
              browserAvailability === "downloadable"
            ) {
              startDownload()
            } else if (isWebLLMModelId(next)) {
              startWebLLMDownload(next)
            }
          }}
          isBusy={isBusy}
          disabled={isDownloadingSelectedModel}
          onSubmit={(text) =>
            sendMessage({ text }, { body: { model: resolvedModel } })
          }
          onStop={() => stop()}
        />
      </div>
    </div>
  )
}
