const apiKey = process.env.ANYROUTER_API_KEY

if (!apiKey) {
  console.error("ANYROUTER_API_KEY is not set. Add it to .env.local and retry.")
  process.exit(1)
}

const res = await fetch("https://anyrouter.dev/api/v1/chat/completions", {
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
})

const data = await res.json()

console.log(`HTTP ${res.status}`)
console.log(data?.choices?.[0]?.message?.content ?? JSON.stringify(data))

if (!res.ok) {
  process.exit(1)
}
