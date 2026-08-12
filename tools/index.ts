import { type InferUITools, type UIDataTypes, type UIMessage } from "ai"

import { askUser } from "./ask_user"
import { getTime } from "./date_time"
import { githubRepo } from "./github_repo"
import { scrapePage } from "./scrape"
import { getWebSearch } from "./web_search"
import { getWeather } from "./weather"

const baseTools = {
  github_repo: githubRepo,
  ask_user: askUser,
  get_time: getTime,
  get_weather: getWeather,
  scrape_page: scrapePage,
}

export function getTools(modelId: string) {
  const webSearch = getWebSearch(modelId)
  return webSearch ? { ...baseTools, web_search: webSearch } : baseTools
}

export type ChatUIMessage = UIMessage<
  unknown,
  UIDataTypes,
  InferUITools<typeof baseTools> & {
    web_search: {
      input: { query?: string }
      output: unknown
    }
  }
>

export type ChatMessagePart = ChatUIMessage["parts"][number]

export type TextMessagePart = Extract<ChatMessagePart, { type: "text" }>

export type SourceUrlPart = Extract<ChatMessagePart, { type: "source-url" }>

export type GithubRepoToolPart = Extract<
  ChatMessagePart,
  { type: "tool-github_repo" }
>

export type AskUserToolPart = Extract<
  ChatMessagePart,
  { type: "tool-ask_user" }
>

export type WebSearchToolPart = Extract<
  ChatMessagePart,
  { type: "tool-web_search" }
>

export type GetTimeToolPart = Extract<ChatMessagePart, { type: "tool-get_time" }>

export type GetWeatherToolPart = Extract<
  ChatMessagePart,
  { type: "tool-get_weather" }
>

export type ScrapePageToolPart = Extract<
  ChatMessagePart,
  { type: "tool-scrape_page" }
>
