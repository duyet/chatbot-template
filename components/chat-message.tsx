"use client"

import { type ChatUIMessage } from "@/tools"
import { AskUserPart } from "@/components/parts/ask-user-part"
import { GetTimePart } from "@/components/parts/get-time-part"
import { GithubRepoPart } from "@/components/parts/github-repo-part"
import { ScrapePart } from "@/components/parts/scrape-part"
import { SourcesPart } from "@/components/parts/sources-part"
import { TextPart } from "@/components/parts/text-part"
import { WeatherPart } from "@/components/parts/weather-part"
import { WebSearchPart } from "@/components/parts/web-search-part"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message, MessageContent } from "@/components/ui/message"

export function ChatMessage({
  message,
  isStreaming = false,
}: {
  message: ChatUIMessage
  isStreaming?: boolean
}) {
  if (message.role === "user") {
    return (
      <Message align="end">
        <MessageContent>
          <Bubble align="end" variant="muted">
            <BubbleContent>
              {message.parts
                .filter((part) => part.type === "text")
                .map((part) => part.text)
                .join("")}
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    )
  }

  return (
    <Message align="start">
      <MessageContent>
        {message.parts.map((part, index) => {
          switch (part.type) {
            case "text":
              return <TextPart key={index} part={part} />
            case "tool-github_repo":
              return <GithubRepoPart key={part.toolCallId} part={part} />
            case "tool-ask_user":
              return <AskUserPart key={part.toolCallId} part={part} />
            case "tool-web_search":
              return <WebSearchPart key={part.toolCallId} part={part} />
            case "tool-get_time":
              return <GetTimePart key={part.toolCallId} part={part} />
            case "tool-get_weather":
              return <WeatherPart key={part.toolCallId} part={part} />
            case "tool-scrape_page":
              return <ScrapePart key={part.toolCallId} part={part} />
            default:
              return null
          }
        })}
        {!isStreaming && <SourcesPart parts={message.parts} />}
      </MessageContent>
    </Message>
  )
}
