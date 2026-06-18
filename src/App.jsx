import { useState, useEffect, useRef } from "react";

// ── API caller ────────────────────────────────────────────────────────────────
// In production (Cloudflare Pages): calls /api/roast which proxies to Mistral
// In local dev: calls Anthropic directly with your key
const IS_PROD = window.location.hostname !== "localhost";

async function ask(system, user, task = "roast") {
  if (IS_PROD) {
    const r = await fetch("/api/roast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, system, userMessage: user }),
    });
    const d = await r.json();
    if (d.error) throw new Error(d.error);
    return d.text;
  } else {
    const key = import.meta.env.VITE_ANTHROPIC_KEY;
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: system + "\n\n" + user }],
      }),
    });
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    return d.content[0].text;
  }
}

const P_SKETCH = `You are a witty startup sketch artist. Given a startup idea, return EXACTLY 4 lines with no extra text:
Line 1: One emoji capturing the idea.
Line 2: What it does in plain English. Max 20 words.
Line 3: Who pays and why. Max 20 words.
Line 4: The core hidden assumption. Slightly wry. Max 20 words.`;

const P_CANVAS = `You are a startup analyst. Fill a Lean Canvas for this idea.
Return ONLY a raw JSON object. No markdown. No backticks. No explanation.
Use exactly these keys: problem, solution, uvp, unfair_advantage, customer_segments, channels, revenue, cost, metrics
Each value max 12 words. Use "Not specified" if unknown.`;

const P_ROAST = `You are a seasoned European startup evaluator. Your lens:
- Atomico State of European Tech: founders think too locally, under-raise. Push pan-European from day one.
- Paul Graham's 18 startup mistakes: no specific user, marginal niche, derivative idea, late launch.
- Swiss reality: CHF 3.2B invested 2024, great talent, but 8 million people is NOT market validation.
- Balderton/Index/Atomico criteria: European category leadership potential? Real moat? Scalable?
- Innosuisse trap: a grant is NOT product-market fit.

TONE: Dry, direct, precise. Zurich professor energy. Constructive. Wry, never cruel. No "10x" or "blitzscale". Never mention Marc Andreessen.

Respond with EXACTLY these 5 sections, headers included, nothing before the first:

🔥 THE HONEST DIAGNOSIS
2-3 specific critiques of THIS idea. No generic advice.

💡 WHAT YOU MIGHT BE ONTO
The best kernel in the idea, honestly. Say so if there is none.

🗺️ THE EUROPEAN REALITY CHECK
Swiss market trap check. Pan-European scale. Competitive timing.

🛠️ THREE THINGS TO DO NEXT WEEK
Three concrete cheap specific actions for next week.

🚉 VERDICT
One honest sentence.`;

function parseRoast(raw) {
  const get = (a, b) => {
    const s = raw.indexOf(a);
    if (s < 0) return "";
    const after = raw.slice(s + a.length);
    const e = b ? after.indexOf(b) : -1;
    return (e < 0 ? after : after.slice(0, e)).trim();
  };
  return {
    diagnosis: get("🔥 THE HONEST DIAGNOSIS", "💡"),
    onto:      get("💡 WHAT YOU MIGHT BE ONTO", "🗺️"),
    european:  get("🗺️ THE EUROPEAN REALITY CHECK", "🛠️"),
    next:      get("🛠️ THREE THINGS TO DO NEXT WEEK", "🚉"),
    verdict:   get("🚉 VERDICT", null),
  };
}

function compress(obj) {
  try {
    return btoa(encodeURIComponent(JSON.stringify(obj)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  } catch { return ""; }
}
function decompress(s) {
  try {
    const padded = s + "=".repeat((4 - s.length % 4) % 4);
    return JSON.parse(decodeURIComponent(atob(padded.replace(/-/g, "+").replace(/_/g, "/"))));
  } catch { return null; }
}

function FlipVerdict({ text }) {
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);
  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789· ";
  useEffect(() => {
    if (!text) return;
    setDone(false); setShown("");
    let i = 0;
    const target = text.toUpperCase();
    const iv = setInterval(() => {
      i++;
      const rev = Math.floor(i / 5);
      if (rev >= target.length) { setShown(target); setDone(true); clearInterval(iv); return; }
      setShown(target.slice(0, rev) + CHARS[Math.floor(Math.random() * CHARS.length)]);
    }, 40);
    return () => clearInterval(iv);
  }, [text]);
  return (
    <div style={{ background:"#0a0a0a", borderRadius:4, padding:"18px 22px", border:"1px solid #1f1f1f", marginTop:8 }}>
      <div style={{ fontFamily:"monospace", fontSize:10, color:"#3a3a3a", letterSpacing:"0.18em", marginBottom:10 }}>▶ ZURICH HB → EUROPE · TRACK 4 · VERDICT</div>
      <div style={{ fontFamily:"monospace", fontSize:"clamp(13px,2vw,15px)", color:done?"#f5c518":"#555", letterSpacing:"0.05em", lineHeight:1.6, wordBreak:"break-word", transition:"color 0.5s", minHeight:22 }}>
        {shown || "·"}
      </div>
    </div>
  );
}

function SketchCard({ text }) {
  const lines = text.trim().split("\n").filter(Boolean);
  const [what, who, risk] = lines.slice(1);
  return (
    <div style={{ background:"#18181b", borderRadius:6, padding:"28px 24px", textAlign:"center" }}>
      <div style={{ fontSize:"clamp(52px,10vw,72px)", lineHeight:1, marginBottom:18 }}>{lines[0] || "💡"}</div>
      {what && <p style={{ fontFamily:"Inter,system-ui,sans-serif", fontSize:16, color:"#f4f4f5", lineHeight:1.6, margin:"0 auto 10px", maxWidth:480 }}>{what}</p>}
      {who  && <p style={{ fontFamily:"Inter,system-ui,sans-serif", fontSize:14, color:"#a1a1aa", lineHeight:1.6, margin:"0 auto 10px", maxWidth:480 }}>{who}</p>}
      {risk && <p style={{ fontFamily:"Inter,system-ui,sans-serif", fontSize:13, color:"#71717a", fontStyle:"italic", lineHeight:1.6, margin:"0 auto 0", maxWidth:480 }}>{risk}</p>}
    </div>
  );
}

const CL = { problem:"Problem", solution:"Solution", uvp:"Unique Value Prop", unfair_advantage:"Unfair Advantage", customer_segments:"Customers", channels:"Channels", revenue:"Revenue", cost:"Cost Structure", metrics:"Key Metrics" };
const CC = { problem:"#fef9c3", customer_segments:"#fef9c3", solution:"#dbeafe", uvp:"#ede9fe", unfair_advantage:"#fce7f3", channels:"#dbeafe", revenue:"#dcfce7", cost:"#dcfce7", metrics:"#f4f4f5" };
const LAYOUT = [
  { k:"problem",           col:"1",     row:"1 / 3" },
  { k:"solution",          col:"2",     row:"1"     },
  { k:"uvp",               col:"3",     row:"1 / 3" },
  { k:"unfair_advantage",  col:"4",     row:"1"     },
  { k:"customer_segments", col:"5",     row:"1 / 3" },
  { k:"channels",          col:"2",     row:"2"     },
  { k:"metrics",           col:"4",     row:"2"     },
  { k:"cost",              col:"1 / 4", row:"3"     },
  { k:"revenue",           col:"3 / 6", row:"3"     },
];
function Canvas({ data }) {
  if (!data) return null;
  return (
    <>
      <style>{`.cm{display:none}.cd{display:grid}@media(max-width:600px){.cm{display:block!important}.cd{display:none!important}}`}</style>
      <div className="cd" style={{ gridTemplateColumns:"repeat(5,1fr)", gridTemplateRows:"auto auto auto", gap:5, fontSize:12 }}>
        {LAYOUT.map(({ k, col, row }) => (
          <div key={k} style={{ gridColumn:col, gridRow:row, background:CC[k]||"#f9fafb", border:"1px solid #e5e7eb", borderRadius:3, padding:10, minHeight:72 }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#6b7280", marginBottom:5 }}>{CL[k]}</div>
            <div style={{ color:"#1c2128", lineHeight:1.5 }}>{data[k] || <i style={{ color:"#aaa" }}>—</i>}</div>
          </div>
        ))}
      </div>
      <div className="cm">
        {Object.entries(CL).map(([k, label]) => (
          <div key={k} style={{ background:CC[k]||"#f9fafb", border:"1px solid #e5e7eb", borderRadius:4, padding:"10px 12px", marginBottom:7 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#6b7280", marginBottom:3 }}>{label}</div>
            <div style={{ fontSize:13, color:"#1c2128", lineHeight:1.5 }}>{data[k] || "—"}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function Hdr({ emoji, title }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid #e5e7eb", paddingBottom:10, marginBottom:12 }}>
      <span style={{ fontSize:18 }}>{emoji}</span>
      <span style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:"clamp(15px,2.5vw,18px)", color:"#1c2128" }}>{title}</span>
    </div>
  );
}
function Sec({ emoji, title, body }) {
  if (!body) return null;
  return (
    <div style={{ marginBottom:28 }}>
      <Hdr emoji={emoji} title={title} />
      <div style={{ fontFamily:"Inter,system-ui,sans-serif", fontSize:"clamp(14px,1.8vw,15px)", color:"#374151", lineHeight:1.8, whiteSpace:"pre-wrap" }}>{body}</div>
    </div>
  );
}
function ShareBtn({ snap }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => {
      try {
        const url = location.origin + location.pathname + "#i=" + compress(snap);
        navigator.clipboard.writeText(url);
        setOk(true); setTimeout(() => setOk(false), 2500);
      } catch {}
    }} style={{ display:"flex", alignItems:"center", gap:7, background:ok?"#16a34a":"#1c2128", color:"#fff", border:"none", borderRadius:3, padding:"9px 16px", fontFamily:"Inter,system-ui,sans-serif", fontSize:13, fontWeight:600, cursor:"pointer", transition:"background .2s" }}>
      {ok ? "✓ Copied!" : "↗ Share this roast"}
    </button>
  );
}

const STEPS = ["Sketching your idea…","Building the canvas…","Writing the diagnosis…","Finishing up…"];
function Loader({ step }) {
  const [d, setD] = useState(0);
  useEffect(() => { const iv = setInterval(() => setD(x=>(x+1)%4), 450); return ()=>clearInterval(iv); },[]);
  return (
    <div style={{ textAlign:"center", padding:"52px 0", fontFamily:"Inter,system-ui,sans-serif", color:"#6b7280" }}>
      <div style={{ fontSize:36, marginBottom:16 }}>🔍</div>
      <div style={{ fontSize:15, marginBottom:12 }}>{STEPS[step]}</div>
      <div style={{ fontSize:22, letterSpacing:6, color:"#9ca3af" }}>{"●".repeat(d+1)}{"○".repeat(3-d)}</div>
    </div>
  );
}

const IS = { width:"100%", fontFamily:"Inter,system-ui,sans-serif", fontSize:15, color:"#1c2128", background:"#fff", border:"1px solid #d1d5db", borderRadius:3, padding:"10px 13px", outline:"none", boxSizing:"border-box", resize:"none" };
const LS = { fontFamily:"Inter,system-ui,sans-serif", fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#6b7280", marginBottom:6, display:"block" };

export default function App() {
  const [idea,    setIdea]    = useState("");
  const [stage,   setStage]   = useState("");
  const [cust,    setCust]    = useState("");
  const [moat,    setMoat]    = useState("");
  const [loading, setLoading] = useState(false);
  const [step,    setStep]    = useState(0);
  const [err,     setErr]     = useState("");
  const [sketch,  setSketch]  = useState("");
  const [canvas,  setCanvas]  = useState(null);
  const [roast,   setRoast]   = useState(null);
  const [snap,        setSnap]        = useState(null);
  const [autoRunning, setAutoRunning] = useState(false);
  const ref = useRef(null);

  async function runWith(ideaVal, stageVal, custVal, moatVal) {
    if (!ideaVal.trim()) return;
    setLoading(true); setErr("");
    setSketch(""); setCanvas(null); setRoast(null); setSnap(null);
    location.hash = "";
    const m = [
      "Startup idea: " + ideaVal,
      stageVal ? "Stage: " + stageVal : "",
      custVal  ? "Target customer: " + custVal : "",
      moatVal  ? "Claimed advantage: " + moatVal : "",
    ].filter(Boolean).join("\n");
    try {
      setStep(0);
      const sk = await ask(P_SKETCH, m, "sketch");
      setSketch(sk);
      setStep(1);
      const cv = await ask(P_CANVAS, m, "canvas");
      try { setCanvas(JSON.parse(cv.replace(/```json|```/g,"").trim())); } catch {}
      setStep(2);
      const ro = await ask(P_ROAST, m, "roast");
      setRoast(parseRoast(ro));
      setSnap({ idea: ideaVal, stage: stageVal, cust: custVal, moat: moatVal });
      setStep(3);
      setTimeout(() => ref.current?.scrollIntoView({ behavior:"smooth" }), 100);
    } catch(e) {
      setErr(e.message);
    } finally {
      setLoading(false);
      setAutoRunning(false);
    }
  }

  function go() { runWith(idea, stage, cust, moat); }

  useEffect(() => {
    const m = location.hash.match(/[#&]i=([^&]+)/);
    if (!m) return;
    const p = decompress(m[1]);
    if (!p || !p.idea) return;
    setIdea(p.idea || "");
    setStage(p.stage || "");
    setCust(p.cust || "");
    setMoat(p.moat || "");
    setAutoRunning(true);
    runWith(p.idea, p.stage || "", p.cust || "", p.moat || "");
  }, []);

  return (
    <div style={{ minHeight:"100vh", background:"#f7f8fa", padding:"clamp(24px,5vw,56px) clamp(16px,4vw,36px)", boxSizing:"border-box" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;600&display=swap" rel="stylesheet" />
      <div style={{ maxWidth:720, margin:"0 auto" }}>
        <div style={{ marginBottom:44 }}>
          <div style={{ display:"inline-block", background:"#e8253a", color:"#fff", fontFamily:"Inter,system-ui,sans-serif", fontSize:11, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", padding:"3px 9px", borderRadius:2, marginBottom:16 }}>European Edition</div>
          <h1 style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:"clamp(30px,7vw,52px)", fontWeight:400, color:"#1c2128", margin:"0 0 12px", lineHeight:1.1 }}>Roast My<br/>Startup</h1>
          <p style={{ fontFamily:"Inter,system-ui,sans-serif", fontSize:"clamp(14px,2vw,16px)", color:"#6b7280", margin:0, lineHeight:1.65, maxWidth:460 }}>
            Honest feedback from a European lens — YC pattern-matching, Swiss market reality, and what Balderton or Atomico would actually say. No hype.
          </p>
        </div>
        {!snap && !autoRunning && (
          <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:4, padding:"clamp(18px,4vw,32px)", marginBottom:28 }}>
            <div style={{ marginBottom:18 }}>
              <label style={LS}>Your startup idea *</label>
              <textarea value={idea} onChange={e=>setIdea(e.target.value)}
                placeholder="Describe what you're building, who it's for, and the problem it solves." rows={5} style={IS} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
              <div>
                <label style={LS}>Stage</label>
                <input value={stage} onChange={e=>setStage(e.target.value)} placeholder="idea / prototype / revenue" style={IS} />
              </div>
              <div>
                <label style={LS}>First target customer</label>
                <input value={cust} onChange={e=>setCust(e.target.value)} placeholder="e.g. HR managers at Swiss SMEs" style={IS} />
              </div>
            </div>
            <div style={{ marginBottom:22 }}>
              <label style={LS}>Why can't a rival copy this in 6 months?</label>
              <input value={moat} onChange={e=>setMoat(e.target.value)} placeholder="Honest answer — 'AI' is not a moat" style={IS} />
            </div>
            <button onClick={go} disabled={loading||!idea.trim()} style={{
              width:"100%", background:loading||!idea.trim()?"#9ca3af":"#e8253a", color:"#fff",
              border:"none", borderRadius:3, padding:13, fontFamily:"Inter,system-ui,sans-serif",
              fontSize:15, fontWeight:600, cursor:loading||!idea.trim()?"not-allowed":"pointer", transition:"background .15s"
            }}>
              {loading ? STEPS[step] : "Get the honest feedback →"}
            </button>
            {err && (
              <div style={{ marginTop:12, padding:"10px 12px", background:"#fef2f2", border:"1px solid #fecaca", borderRadius:3, fontFamily:"monospace", fontSize:12, color:"#991b1b", wordBreak:"break-all" }}>
                {err}
              </div>
            )}
          </div>
        )}
        {loading && <Loader step={step} />}
        {(sketch||canvas||roast) && (
          <div ref={ref}>
            {sketch && (
              <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:4, padding:"clamp(18px,4vw,28px)", marginBottom:14 }}>
                <Hdr emoji="🗒️" title="What we understood" />
                <SketchCard text={sketch} />
              </div>
            )}
            {canvas && (
              <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:4, padding:"clamp(18px,4vw,28px)", marginBottom:14 }}>
                <Hdr emoji="📋" title="Lean Canvas" />
                <Canvas data={canvas} />
              </div>
            )}
            {roast && (
              <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:4, padding:"clamp(18px,4vw,32px)", marginBottom:14 }}>
                <Sec emoji="🔥" title="The Honest Diagnosis"         body={roast.diagnosis} />
                <Sec emoji="💡" title="What You Might Be Onto"       body={roast.onto}      />
                <Sec emoji="🗺️" title="The European Reality Check"   body={roast.european}  />
                <Sec emoji="🛠️" title="Three Things to Do Next Week" body={roast.next}      />
                {roast.verdict && <>
                  <Hdr emoji="🚉" title="Verdict" />
                  <FlipVerdict text={roast.verdict} />
                </>}
                <div style={{ marginTop:28, paddingTop:18, borderTop:"1px solid #f0f0f0", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
                  <div style={{ fontFamily:"Inter,system-ui,sans-serif", fontSize:11, color:"#9ca3af" }}>
                    Atomico State of European Tech · YC 18 startup mistakes · Swiss ecosystem 2024
                  </div>
                  <ShareBtn snap={snap} />
                </div>
              </div>
            )}
            {snap && idea && (
              <div style={{ textAlign:"center", paddingTop:8, paddingBottom:24 }}>
                <button onClick={() => { setSketch(""); setCanvas(null); setRoast(null); setSnap(null); }}
                  style={{ background:"none", border:"1px solid #d1d5db", borderRadius:3, padding:"9px 18px", cursor:"pointer", fontFamily:"Inter,system-ui,sans-serif", fontSize:14, color:"#6b7280" }}>
                  ← Roast another idea
                </button>
              </div>
            )}
          </div>
        )}
        <div style={{ marginTop:44, paddingTop:22, borderTop:"1px solid #e5e7eb", fontFamily:"Inter,system-ui,sans-serif", fontSize:11, color:"#9ca3af", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
          <span>Built with Claude · Cloudflare Pages</span>
          <span>🇨🇭 Swiss-aware · 🇪🇺 European scale mindset</span>
        </div>
      </div>
    </div>
  );
}
