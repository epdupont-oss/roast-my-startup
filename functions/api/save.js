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
  if (!env.ROASTS) {
    return new Response(JSON.stringify({ error: "KV not configured" }), { status: 500, headers: CORS });
  }
  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: CORS });
  }
  const id = Math.random().toString(36).slice(2, 10);
  await env.ROASTS.put(id, JSON.stringify(body), { expirationTtl: 60 * 60 * 24 * 90 });
  return new Response(JSON.stringify({ id }), { status: 200, headers: CORS });
}
