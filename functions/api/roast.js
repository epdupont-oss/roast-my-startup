// Cloudflare Pages Function — proxies to Mistral API
const MISTRAL_API = "https://api.mistral.ai/v1/chat/completions";

const TASK_CONFIGS = {
  sketch: { max_tokens: 200, temperature: 0.7 },
  canvas: { max_tokens: 400, temperature: 0.2 },
  roast:  { max_tokens: 900, temperature: 0.6 },
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: CORS });
  }

  const { task, system, userMessage } = body;

  if (!task || !system || !userMessage) {
    return new Response(JSON.stringify({ error: "Missing task, system, or userMessage" }), { status: 400, headers: CORS });
  }

  const config = TASK_CONFIGS[task];
  if (!config) {
    return new Response(JSON.stringify({ error: "Unknown task: " + task }), { status: 400, headers: CORS });
  }

  const apiKey = env.MISTRAL_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "MISTRAL_API_KEY not configured" }), { status: 500, headers: CORS });
  }

  try {
    const res = await fetch(MISTRAL_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        max_tokens: config.max_tokens,
        temperature: config.temperature,
        messages: [
          { role: "system", content: system },
          { role: "user",   content: userMessage },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: "Mistral error", detail: err }), { status: 502, headers: CORS });
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ text }), { status: 200, headers: CORS });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
}
