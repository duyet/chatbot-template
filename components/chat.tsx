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
import { type GatewayModel } from "@/lib/models"
import { type ChatUIMessage } from "@/tools"
import { BROWSER_MODEL_ID, BROWSER_MODEL_NAME } from "@/lib/browser-model"
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

export function Chat({ models }: { models: GatewayModel[] }) {
  const [model, setModel] = React.useState(models[0]?.id ?? "")
  const { availability: browserAvailability } = useBrowserModel()

  const allModels = React.useMemo(
    () =>
      browserAvailability === "downloadable" ||
      browserAvailability === "downloading" ||
      browserAvailability === "available"
        ? [{ id: BROWSER_MODEL_ID, name: BROWSER_MODEL_NAME }, ...models]
        : models,
    [models, browserAvailability]
  )

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

  // Delegating transport: the browser model runs fully in-process (no
  // server round-trip), every other model goes through /api/chat as usual.
  // Built once so useChat doesn't re-init when the user switches models.
  const transport = React.useMemo(() => {
    const http = new DefaultChatTransport<ChatUIMessage>({ api: "/api/chat" })
    // The direct transport has no tools, so it can't be typed against
    // ChatUIMessage's tool-part union; it only ever handles plain text
    // replies for the browser model, so we bridge the two at the call site.
    let direct: DirectChatTransport | null = null
    const getDirect = () =>
      (direct ??= new DirectChatTransport({
        agent: new ToolLoopAgent({ model: browserAI() }),
      }))

    return {
      sendMessages: (options) =>
        modelRef.current === BROWSER_MODEL_ID
          ? getDirect().sendMessages(
              options as Parameters<DirectChatTransport["sendMessages"]>[0]
            )
          : http.sendMessages(options),
      // The direct transport has no persistent server-side stream to
      // reconnect to; only the HTTP transport supports this.
      reconnectToStream: (options) => http.reconnectToStream(options),
    } satisfies ChatTransport<ChatUIMessage>
  }, [])

  const { messages, sendMessage, status, stop, error, addToolOutput } =
    useChat<ChatUIMessage>({
      transport,
      // Resume the conversation automatically once the user has answered the
      // ask_user questionnaire.
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    })

  const isBusy = status === "submitted" || status === "streaming"

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
                onSelect={(prompt) =>
                  sendMessage(
                    { text: prompt },
                    { body: { model: resolvedModel } }
                  )
                }
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
                ? "Downloading on-device model…"
                : "The on-device model downloads on first message (Chrome desktop, large download)."}
            </p>
          )}
        <PromptForm
          models={allModels}
          model={resolvedModel}
          onModelChange={(next) => {
            userPickedModel.current = true
            setModel(next)
          }}
          isBusy={isBusy}
          onSubmit={(text) =>
            sendMessage({ text }, { body: { model: resolvedModel } })
          }
          onStop={() => stop()}
        />
      </div>
    </div>
  )
}
