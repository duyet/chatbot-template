# chatbot-template

A minimal chatbot template built with Next.js, the [AI SDK](https://ai-sdk.dev), [shadcn/ui](https://ui.shadcn.com), [shadcn/react](https://ui.shadcn.com/docs/react/message-scroller), [shadcn/typeset](https://ui.shadcn.com/docs/typeset) and [AnyRouter](https://anyrouter.dev).

<p>
  <a href="https://github.com/shadcn-ui/chatbot-template/stargazers"><img src="https://shieldcn.dev/github/stars/shadcn-ui/chatbot-template.svg?variant=secondary&size=xs" alt="GitHub stars" /></a>
  <a href="https://github.com/shadcn-ui/chatbot-template/forks"><img src="https://shieldcn.dev/github/forks/shadcn-ui/chatbot-template.svg?variant=secondary&size=xs" alt="GitHub forks" /></a>
  <a href="https://github.com/shadcn-ui/chatbot-template/blob/main/LICENSE"><img src="https://shieldcn.dev/github/license/shadcn-ui/chatbot-template.svg?variant=secondary&size=xs" alt="License" /></a>
</p>

## Features

- Streaming chat with markdown rendering and shadcn/typeset
- Tool calling example
- Web search via each provider's built-in search tool
- Human-in-the-loop questionnaire. The model can ask clarifying questions, answered with the shadcn questionnaire component
- On desktop Chrome with built-in AI available, a "Chrome built-in (Gemini Nano)" on-device model option appears in the picker and runs fully client-side (no API key, no server calls). On WebGPU-capable browsers, curated WebLLM models (Llama 3.2 3B, Qwen 2.5 1.5B, SmolLM2 1.7B) are also available on-device

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fshadcn-ui%2Fchatbot-template&project-name=chatbot-template&repository-name=chatbot-template)

After deploying, set the `ANYROUTER_API_KEY` environment variable in your Vercel project settings — usage runs on your [AnyRouter](https://anyrouter.dev) credits.

## Local development

```bash
pnpm install
```

Then give the app an [AnyRouter](https://anyrouter.dev) API key:

```bash
cp .env.example .env.local
# then set ANYROUTER_API_KEY=...
```

Start the dev server:

```bash
pnpm dev
```

## Configuration

| Env var             | Required | Description                                                                                      |
| ------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `ANYROUTER_API_KEY` | Yes      | [AnyRouter](https://anyrouter.dev) API key (prefix `sk-ar-`), used to call and rank chat models. |

The model list is fetched from the AnyRouter catalog in [lib/models.ts](lib/models.ts), ranked by usage and cached for one hour — `anyrouter/free` is always the default. If the catalog API is unreachable, a static fallback list is used instead.

Run `pnpm smoke` to verify your `ANYROUTER_API_KEY` works end to end (sends a real chat completion request).

## Security

The `/api/chat` route is **public and unauthenticated** — every request spends your AnyRouter credits. That's fine for a personal demo, but before putting it in front of real traffic you should:

- **Rate limit it.** Add [Vercel Firewall / WAF](https://vercel.com/docs/security/vercel-waf) rules or [`@upstash/ratelimit`](https://github.com/upstash/ratelimit-js) so a single client can't drain your credits (denial-of-wallet).
- **Cap spend.** Set an AnyRouter spend limit as a backstop.
- **Add auth** if the chatbot isn't meant to be public.

The route already validates the request body, restricts models to [lib/models.ts](lib/models.ts), caps output tokens and step count, and aborts generation on client disconnect — but those bound a single request, not overall volume.

## How it works

- [app/api/chat/route.ts](app/api/chat/route.ts) streams responses with `streamText`
- [components/chat.tsx](components/chat.tsx) renders the conversation with `useChat` and shadcn chat primitives.
- [tools/](tools) defines the tools — one file per tool (the filename is the model-facing tool name), composed in [tools/index.ts](tools/index.ts): a server-executed GitHub repo lookup, the interactive `ask_user` questionnaire, and provider-native web search.

## Tool parts

Assistant messages are a list of typed parts. [components/chat-message.tsx](components/chat-message.tsx) switches on `part.type` and delegates each one to a component in [components/parts/](components/parts):

| Part type          | Component                                                     | Renders                                                                                                                                      |
| ------------------ | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`             | [text-part.tsx](components/parts/text-part.tsx)               | Markdown via react-markdown and shadcn/typeset.                                                                                              |
| `tool-github_repo` | [github-repo-part.tsx](components/parts/github-repo-part.tsx) | A spinner while the lookup runs, then a linked stat line (stars, forks, language).                                                           |
| `tool-web_search`  | [web-search-part.tsx](components/parts/web-search-part.tsx)   | A "Searching the web…" status while the search runs, then a persistent "Searched the web" line per search.                                   |
| `tool-ask_user`    | [ask-user-part.tsx](components/parts/ask-user-part.tsx)       | The answered questions inline. Pending questions render in [question-card.tsx](components/question-card.tsx), pinned to the scroller bottom. |
| `source-url`       | [sources-part.tsx](components/parts/sources-part.tsx)         | Web search citations, deduped into a "Searched N websites" drawer once the message finishes streaming.                                       |

Tool parts move through states as the stream progresses — `input-streaming` → `input-available` → `output-available` (or `output-error`) — and each component switches on `part.state` to show progress, results, and failures.

### Adding your own tool

1. Create `tools/<name>.ts` (the filename is the model-facing tool name) exporting a `tool()` with a `description`, an `inputSchema`, and an `execute` function (omit `execute` for tools the user answers in the UI, like `ask_user`), then register it in [tools/index.ts](tools/index.ts).
2. Add a part component in [components/parts/](components/parts) and a `case "tool-<name>"` in [chat-message.tsx](components/chat-message.tsx).

Message types are inferred from the tool definitions via `InferUITools`, so `part.input` and `part.output` are fully typed in your part component — renaming a tool field is a build error, not a silent `undefined`.

## Adding components

```bash
npx shadcn@latest add button
```

## License

MIT — see [LICENSE](LICENSE).
