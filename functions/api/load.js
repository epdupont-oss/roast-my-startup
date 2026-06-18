const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request, env }) {
  if (!env.ROASTS) {
    return new Response(JSON.stringify({ error: "KV not configured" }), { status: 500, headers: CORS });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: CORS });
  }
  const data = await env.ROASTS.get(id);
  if (!data) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: CORS });
  }
  return new Response(data, { status: 200, headers: CORS });
}
