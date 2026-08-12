const apiKey = process.env.ANYROUTER_API_KEY

if (!apiKey) {
  console.error("ANYROUTER_API_KEY is not set. Add it to .env.local and retry.")
  process.exit(1)
}

let res
try {
  res = await fetch("https://anyrouter.dev/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "anyrouter/free",
      messages: [
        {
          role: "user",
          content: "Reply with one short sentence: hello from the smoke test.",
        },
      ],
      max_tokens: 100,
    }),
    signal: AbortSignal.timeout(30_000),
  })
} catch (err) {
  console.error(
    err?.name === "TimeoutError"
      ? "Request timed out after 30s."
      : `Network error: ${err?.message ?? err}`
  )
  process.exit(1)
}

const data = await res.json()

console.log(`HTTP ${res.status}`)

const content = data?.choices?.[0]?.message?.content

if (!res.ok) {
  console.log(content ?? JSON.stringify(data))
  process.exit(1)
}

if (typeof content !== "string" || content.trim() === "") {
  console.error("No content in response:", JSON.stringify(data))
  process.exit(1)
}

console.log(content)
