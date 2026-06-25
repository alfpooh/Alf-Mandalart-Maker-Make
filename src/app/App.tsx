import { useState, useRef, useEffect } from "react"
import bannerCover from "@/imports/mandalart-cover.png"
import {
  Check, Edit2, Save, Printer, FileText,
  Loader2, RotateCcw, ChevronRight, ArrowRight, Grid3x3,
  Settings, X, Eye, EyeOff, AlertCircle, ChevronDown,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────────────

interface MandalartCell {
  id: string
  content: string
  isConfirmed: boolean
  isEditing: boolean
}

interface MandalartData {
  mainGoal: MandalartCell
  subgoals: MandalartCell[]
  detailedActions: { [subgoalId: string]: MandalartCell[] }
}

type AppStep = "input" | "review-subgoals" | "generate-details" | "review-details" | "visualization"

type Provider = "mock" | "groq" | "openai" | "anthropic"

interface LLMConfig {
  provider: Provider
  apiKey: string
  model: string
}

// ─── Provider Definitions ──────────────────────────────────────────────────────

const PROVIDERS: { id: Provider; label: string; badge: string; badgeColor: string; models: { id: string; label: string }[]; placeholder: string; note?: string }[] = [
  {
    id: "mock",
    label: "Mock (No API Key)",
    badge: "Free",
    badgeColor: "bg-emerald-100 text-emerald-700",
    models: [{ id: "mock", label: "Built-in placeholder content" }],
    placeholder: "No API key required",
    note: "Generates fixed placeholder content. Use this to explore the app without any API key.",
  },
  {
    id: "groq",
    label: "Groq",
    badge: "Fast · Free tier",
    badgeColor: "bg-orange-100 text-orange-700",
    models: [
      { id: "llama-3.3-70b-versatile", label: "LLaMA 3.3 70B" },
      { id: "llama-3.1-8b-instant", label: "LLaMA 3.1 8B (fastest)" },
      { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
    ],
    placeholder: "gsk_…",
    note: "Get a free API key at console.groq.com",
  },
  {
    id: "openai",
    label: "OpenAI",
    badge: "GPT-4o",
    badgeColor: "bg-green-100 text-green-700",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o mini (recommended)" },
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    ],
    placeholder: "sk-…",
    note: "Requires an OpenAI account with billing enabled.",
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    badge: "Claude 3.5",
    badgeColor: "bg-violet-100 text-violet-700",
    models: [
      { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku (fastest)" },
      { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    ],
    placeholder: "sk-ant-…",
    note: "Note: Anthropic may block direct browser requests (CORS). Consider using Groq or OpenAI instead.",
  },
]

const DEFAULT_MODELS: Record<Provider, string> = {
  mock: "mock",
  groq: "llama-3.3-70b-versatile",
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-20241022",
}

const LS_KEY = "mandalart_llm_config"

function loadConfig(): LLMConfig {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { provider: "mock", apiKey: "", model: "mock" }
}

function saveConfig(cfg: LLMConfig) {
  localStorage.setItem(LS_KEY, JSON.stringify(cfg))
}

// ─── Color Schemes ────────────────────────────────────────────────────────────────

const COLORS = [
  { chip: "bg-rose-500 text-white",      cell: "bg-rose-50 text-rose-900 border border-rose-100",      dot: "#f43f5e" },
  { chip: "bg-orange-500 text-white",    cell: "bg-orange-50 text-orange-900 border border-orange-100", dot: "#f97316" },
  { chip: "bg-amber-400 text-amber-950", cell: "bg-amber-50 text-amber-900 border border-amber-100",    dot: "#f59e0b" },
  { chip: "bg-emerald-500 text-white",   cell: "bg-emerald-50 text-emerald-900 border border-emerald-100", dot: "#10b981" },
  { chip: "bg-cyan-500 text-white",      cell: "bg-cyan-50 text-cyan-900 border border-cyan-100",       dot: "#06b6d4" },
  { chip: "bg-violet-500 text-white",    cell: "bg-violet-50 text-violet-900 border border-violet-100", dot: "#8b5cf6" },
  { chip: "bg-fuchsia-500 text-white",   cell: "bg-fuchsia-50 text-fuchsia-900 border border-fuchsia-100", dot: "#d946ef" },
  { chip: "bg-teal-500 text-white",      cell: "bg-teal-50 text-teal-900 border border-teal-100",       dot: "#14b8a6" },
]

// ─── Mock Generation ────────────────────────────────────────────────────────────────

const DEFAULT_SUBGOALS = [
  "Research & Foundation",
  "Skill Development",
  "Build Your Network",
  "Daily Systems",
  "Resource Planning",
  "Track Progress",
  "Overcome Obstacles",
  "Launch & Iterate",
]

const DEFAULT_ACTIONS: string[][] = [
  ["Set clear milestones", "Read foundational books", "Define success metrics", "Create a timeline", "Identify key resources", "Study case studies", "Set weekly check-ins", "Document learnings"],
  ["Take focused courses", "Practice 30 min daily", "Find a mentor", "Join relevant communities", "Build sample projects", "Seek regular feedback", "Teach what you learn", "Earn certifications"],
  ["Join local groups", "Attend industry events", "Find accountability partner", "Share progress publicly", "Collaborate on projects", "Offer value first", "Follow up consistently", "Build deep relationships"],
  ["Establish morning ritual", "Create focus blocks", "Use habit tracking", "Eliminate distractions", "Batch similar tasks", "Review each evening", "Protect your energy", "Celebrate small wins"],
  ["Set a monthly budget", "Find free resources first", "Apply for opportunities", "Trade skills for tools", "Invest in essentials", "Use open-source tools", "Track all expenses", "Review ROI monthly"],
  ["Define weekly KPIs", "Build a simple dashboard", "Monthly retrospectives", "Compare to benchmarks", "Track your energy", "Log wins and losses", "Adjust based on data", "Share progress reports"],
  ["Identify blockers early", "Create contingency plans", "Build resilience habits", "Ask for help when stuck", "Reframe setbacks", "Analyze what failed", "Pivot when needed", "Stay consistent anyway"],
  ["Start with an MVP", "Get real user feedback", "Iterate rapidly", "Document everything", "Launch publicly", "Market consistently", "Scale what works", "Celebrate milestones"],
]

// ─── LLM API Calls ────────────────────────────────────────────────────────────────────

function parseJSONArray(text: string): string[] | null {
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return null
  try {
    const arr = JSON.parse(match[0])
    if (Array.isArray(arr) && arr.every((x) => typeof x === "string")) return arr
  } catch {}
  return null
}

async function callOpenAICompat(
  baseURL: string, apiKey: string, model: string, system: string, user: string,
): Promise<string> {
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })
  if (!res.ok) { const err = await res.text(); throw new Error(`API error ${res.status}: ${err}`) }
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ""
}

async function callAnthropic(apiKey: string, model: string, system: string, user: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model, max_tokens: 1024, system, messages: [{ role: "user", content: user }] }),
  })
  if (!res.ok) { const err = await res.text(); throw new Error(`Anthropic API error ${res.status}: ${err}`) }
  const data = await res.json()
  return data.content?.[0]?.text ?? ""
}

async function llmGenerateSubgoals(goal: string, config: LLMConfig): Promise<string[]> {
  if (config.provider === "mock") { await new Promise((r) => setTimeout(r, 1300)); return DEFAULT_SUBGOALS }
  const system = `You are a goal-setting expert using the Mandalart method.\nGenerate exactly 8 distinct, actionable subgoals for the given goal.\nRespond with ONLY a JSON array of exactly 8 strings. No explanation, no markdown.\nExample: ["Subgoal 1", "Subgoal 2", ..., "Subgoal 8"]`
  const user = `Main goal: "${goal}"\n\nGenerate 8 subgoals as a JSON array of strings.`
  let text = ""
  if (config.provider === "groq") text = await callOpenAICompat("https://api.groq.com/openai/v1", config.apiKey, config.model, system, user)
  else if (config.provider === "openai") text = await callOpenAICompat("https://api.openai.com/v1", config.apiKey, config.model, system, user)
  else if (config.provider === "anthropic") text = await callAnthropic(config.apiKey, config.model, system, user)
  const parsed = parseJSONArray(text)
  if (!parsed || parsed.length < 8) throw new Error("Failed to parse subgoals from API response.")
  return parsed.slice(0, 8)
}

async function llmGenerateActions(subgoal: string, goal: string, index: number, config: LLMConfig): Promise<string[]> {
  if (config.provider === "mock") { await new Promise((r) => setTimeout(r, 600 + Math.random() * 300)); return DEFAULT_ACTIONS[index % DEFAULT_ACTIONS.length] }
  const system = `You are a goal-setting expert using the Mandalart method.\nGenerate exactly 8 specific, concrete action items for the given subgoal.\nRespond with ONLY a JSON array of exactly 8 strings. No explanation, no markdown.\nKeep each action item concise (under 8 words).`
  const user = `Main goal: "${goal}"\nSubgoal: "${subgoal}"\n\nGenerate 8 action items as a JSON array of strings.`
  let text = ""
  if (config.provider === "groq") text = await callOpenAICompat("https://api.groq.com/openai/v1", config.apiKey, config.model, system, user)
  else if (config.provider === "openai") text = await callOpenAICompat("https://api.openai.com/v1", config.apiKey, config.model, system, user)
  else if (config.provider === "anthropic") text = await callAnthropic(config.apiKey, config.model, system, user)
  const parsed = parseJSONArray(text)
  if (!parsed || parsed.length < 8) throw new Error("Failed to parse actions from API response.")
  return parsed.slice(0, 8)
}

// ─── LLM Settings Modal ───────────────────────────────────────────────────────────────────

function LLMSettingsModal({ config, onSave, onClose }: { config: LLMConfig; onSave: (cfg: LLMConfig) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<LLMConfig>({ ...config })
  const [showKey, setShowKey] = useState(false)
  const providerDef = PROVIDERS.find((p) => p.id === draft.provider)!
  const handleProviderChange = (provider: Provider) => setDraft({ provider, apiKey: draft.apiKey, model: DEFAULT_MODELS[provider] })
  const handleSave = () => { onSave(draft); onClose() }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()} style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900" style={{ fontFamily: "'Outfit', sans-serif" }}>LLM API Settings</h2>
            <p className="text-xs text-gray-400 mt-0.5">Choose your AI provider and enter your API key</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Provider</label>
            <div className="space-y-2">
              {PROVIDERS.map((p) => (
                <button key={p.id} onClick={() => handleProviderChange(p.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    draft.provider === p.id ? "border-indigo-500 bg-indigo-50" : "border-gray-100 hover:border-gray-200 bg-white"
                  }`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    draft.provider === p.id ? "border-indigo-500" : "border-gray-300"
                  }`}>
                    {draft.provider === p.id && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{p.label}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.badgeColor}`}>{p.badge}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          {providerDef.note && (
            <div className="flex gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">{providerDef.note}</p>
            </div>
          )}
          {draft.provider !== "mock" && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">API Key</label>
              <div className="relative">
                <input type={showKey ? "text" : "password"} value={draft.apiKey}
                  onChange={(e) => setDraft((d) => ({ ...d, apiKey: e.target.value }))}
                  placeholder={providerDef.placeholder}
                  className="w-full h-10 px-4 pr-10 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-300"
                />
                <button onClick={() => setShowKey((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Stored locally in your browser. Never sent anywhere except the selected API.</p>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Model</label>
            <div className="relative">
              <select value={draft.model} onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))}
                className="w-full h-10 px-4 pr-8 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                {providerDef.models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button onClick={onClose} className="flex-1 h-10 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition">Cancel</button>
          <button onClick={handleSave} disabled={draft.provider !== "mock" && !draft.apiKey.trim()}
            className="flex-1 h-10 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-40">Save Settings</button>
        </div>
      </div>
    </div>
  )
}

// ─── Step Progress ────────────────────────────────────────────────────────────────────

const STEPS = [
  { key: "input",           label: "Goal" },
  { key: "review-subgoals", label: "Subgoals" },
  { key: "review-details",  label: "Actions" },
  { key: "visualization",   label: "Visualize" },
] as const

function StepProgress({ current }: { current: AppStep }) {
  const idx = STEPS.findIndex((s) => s.key === current || (current === "generate-details" && s.key === "review-details"))
  return (
    <div className="flex items-center justify-center gap-1 py-3 px-4">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1">
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
            i < idx ? "bg-indigo-100 text-indigo-700" : i === idx ? "bg-indigo-600 text-white shadow-sm shadow-indigo-300" : "bg-gray-100 text-gray-400"
          }`}>
            {i < idx && <Check className="w-3 h-3" />}
            {s.label}
          </div>
          {i < STEPS.length - 1 && <ChevronRight className={`w-3.5 h-3.5 ${i < idx ? "text-indigo-300" : "text-gray-200"}`} />}
        </div>
      ))}
    </div>
  )
}

function ProviderBadge({ config, onClick }: { config: LLMConfig; onClick: () => void }) {
  const def = PROVIDERS.find((p) => p.id === config.provider)!
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white text-xs font-semibold transition backdrop-blur-sm">
      <Settings className="w-3 h-3" />
      <span>{def.label}</span>
      {config.provider !== "mock" && config.apiKey && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
    </button>
  )
}

// ─── Goal Input Step ────────────────────────────────────────────────────────────────────

function GoalInputStep({ onSubmit, isLoading, config, onOpenSettings }: {
  onSubmit: (g: string) => void; isLoading: boolean; config: LLMConfig; onOpenSettings: () => void
}) {
  const [goal, setGoal] = useState("")
  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div className="relative text-white overflow-hidden" style={{ minHeight: "280px" }}>
        <img src={bannerCover} alt="Person planning goals with a Mandalart chart" className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/90 via-indigo-950/70 to-indigo-950/40" />
        <div className="absolute top-4 right-4 z-10"><ProviderBadge config={config} onClick={onOpenSettings} /></div>
        <div className="relative z-10 px-6 py-14 flex flex-col items-start text-left max-w-lg">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center mb-5">
            <Grid3x3 className="w-6 h-6 text-indigo-200" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3 text-white drop-shadow-lg">Mandalart Maker</h1>
          <p className="text-indigo-200 text-base max-w-sm leading-relaxed drop-shadow">Decompose any goal into a structured 9×9 action plan — one center, eight subgoals, sixty-four steps.</p>
        </div>
        <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-white/40 z-10 px-4">
          All rights reserved D.H. Alf Bae, 2025. Produced by Dr.Alf.
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-indigo-50 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">What is your main goal?</h2>
            <p className="text-gray-400 text-sm mb-5">Be specific — this becomes the center of your chart.</p>
            <textarea value={goal} onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Become a professional web developer in 12 months"
              disabled={isLoading} rows={4}
              className="w-full px-4 py-3 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-gray-300"
              onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey && goal.trim()) onSubmit(goal.trim()) }}
            />
            <button onClick={() => goal.trim() && onSubmit(goal.trim())} disabled={!goal.trim() || isLoading}
              className="mt-4 w-full h-12 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-100 disabled:text-gray-300 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating subgoals…</> : <><span>Generate Mandalart</span><ArrowRight className="w-4 h-4" /></>}
            </button>
            <button onClick={onOpenSettings} className="mt-4 w-full flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-indigo-600 transition group">
              <Settings className="w-3 h-3 group-hover:rotate-45 transition-transform" />
              <span>Using <span className="font-semibold text-gray-600 group-hover:text-indigo-600">{PROVIDERS.find((p) => p.id === config.provider)?.label}</span>
                {config.provider !== "mock" && config.model && <span className="text-gray-400"> · {config.model}</span>}
                {config.provider !== "mock" && !config.apiKey && <span className="text-rose-500 font-semibold"> · API key required</span>}
              </span>
            </button>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[{n:"1",label:"Main Goal",desc:"Your core objective"},{n:"8",label:"Subgoals",desc:"Key focus areas"},{n:"64",label:"Actions",desc:"Concrete next steps"}].map((item) => (
              <div key={item.n} className="bg-white border border-gray-100 rounded-xl p-3 text-center">
                <div className="text-2xl font-extrabold text-indigo-600 leading-none">{item.n}</div>
                <div className="text-xs font-semibold text-gray-700 mt-1">{item.label}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ErrorBanner({ message, onDismiss, onOpenSettings }: { message: string; onDismiss: () => void; onOpenSettings: () => void }) {
  return (
    <div className="mx-4 mt-4 flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
      <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-rose-800">Generation failed</p>
        <p className="text-xs text-rose-600 mt-0.5 break-words">{message}</p>
        <button onClick={onOpenSettings} className="mt-2 text-xs font-semibold text-rose-700 underline underline-offset-2">Check API settings</button>
      </div>
      <button onClick={onDismiss} className="text-rose-400 hover:text-rose-600"><X className="w-4 h-4" /></button>
    </div>
  )
}

// ─── Subgoal Review Step ────────────────────────────────────────────────────────────────

function SubgoalReviewStep({ mainGoal, subgoals, onUpdate, onConfirm, onStartEdit, onSaveEdit, onAcceptAll, onNext }: {
  mainGoal: string; subgoals: MandalartCell[]
  onUpdate: (i: number, v: string) => void; onConfirm: (i: number) => void
  onStartEdit: (i: number) => void; onSaveEdit: (i: number) => void
  onAcceptAll: () => void; onNext: () => void
}) {
  const confirmed = subgoals.filter((s) => s.isConfirmed).length
  const allConfirmed = confirmed === 8
  return (
    <div className="min-h-screen bg-gray-50 pb-16" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-3xl mx-auto px-4 pt-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Outfit', sans-serif" }}>Review Your Subgoals</h2>
          <p className="text-gray-400 text-sm mt-1">Goal: <span className="text-gray-700 font-medium">{mainGoal}</span></p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="h-1.5 w-40 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${(confirmed / 8) * 100}%` }} />
            </div>
            <span className="text-xs text-gray-500 font-medium">{confirmed}/8</span>
            {!allConfirmed && <button onClick={onAcceptAll} className="text-xs text-indigo-600 font-semibold hover:underline">Accept all</button>}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {subgoals.map((sg, i) => (
            <div key={sg.id} className={`bg-white rounded-2xl border-2 p-4 transition-all ${
              sg.isConfirmed ? "border-emerald-400 bg-emerald-50/30" : "border-gray-100 hover:border-gray-200"
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold ${COLORS[i].chip}`}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  {sg.isEditing
                    ? <input value={sg.content} onChange={(e) => onUpdate(i, e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSaveEdit(i)} autoFocus className="w-full text-sm text-gray-800 bg-transparent border-b-2 border-indigo-400 focus:outline-none pb-0.5" />
                    : <p className="text-sm font-medium text-gray-800 leading-snug">{sg.content}</p>
                  }
                </div>
              </div>
              <div className="flex gap-1.5 mt-3 ml-10">
                {sg.isEditing ? (
                  <button onClick={() => onSaveEdit(i)} className="flex-1 h-8 bg-indigo-600 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1"><Save className="w-3 h-3" /> Save</button>
                ) : sg.isConfirmed ? (
                  <>
                    <div className="flex-1 h-8 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1"><Check className="w-3 h-3" /> Confirmed</div>
                    <button onClick={() => onStartEdit(i)} className="h-8 w-8 bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center hover:bg-gray-200 transition"><Edit2 className="w-3 h-3" /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => onStartEdit(i)} className="flex-1 h-8 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 hover:bg-gray-200 transition"><Edit2 className="w-3 h-3" /> Edit</button>
                    <button onClick={() => onConfirm(i)} className="flex-1 h-8 bg-indigo-600 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1 hover:bg-indigo-700 transition"><Check className="w-3 h-3" /> Confirm</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        {allConfirmed && (
          <div className="text-center mt-8">
            <button onClick={onNext} className="h-12 px-8 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 mx-auto" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Generate Action Items <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function GeneratingStep({ providerLabel }: { providerLabel: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
        <h3 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>Generating Action Items</h3>
        <p className="text-gray-400 text-sm">{providerLabel} is creating 8 actions for each subgoal…</p>
      </div>
    </div>
  )
}

// ─── Actions Review Step ───────────────────────────────────────────────────────────────────

function ActionsReviewStep({ mainGoal, subgoals, detailedActions, onActionUpdate, onActionConfirm, onActionStartEdit, onActionSaveEdit, onAcceptAll, onComplete }: {
  mainGoal: string; subgoals: MandalartCell[]; detailedActions: { [id: string]: MandalartCell[] }
  onActionUpdate: (sgId: string, i: number, v: string) => void; onActionConfirm: (sgId: string, i: number) => void
  onActionStartEdit: (sgId: string, i: number) => void; onActionSaveEdit: (sgId: string, i: number) => void
  onAcceptAll: (sgId: string) => void; onComplete: () => void
}) {
  const [active, setActive] = useState(0)
  const totalActions = Object.values(detailedActions).flat().length
  const confirmedActions = Object.values(detailedActions).flat().filter((a) => a.isConfirmed).length
  const allConfirmed = confirmedActions === totalActions && totalActions > 0
  return (
    <div className="min-h-screen bg-gray-50 pb-16" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-5xl mx-auto px-4 pt-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Outfit', sans-serif" }}>Review Action Items</h2>
          <p className="text-gray-400 text-sm mt-1">Goal: <span className="text-gray-700 font-medium">{mainGoal}</span></p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="h-1.5 w-48 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${totalActions > 0 ? (confirmedActions / totalActions) * 100 : 0}%` }} />
            </div>
            <span className="text-xs text-gray-500 font-medium">{confirmedActions}/{totalActions}</span>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {subgoals.map((sg, i) => {
            const actions = detailedActions[sg.id] || []
            const done = actions.filter((a) => a.isConfirmed).length === 8
            return (
              <button key={sg.id} onClick={() => setActive(i)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
                active === i ? `${COLORS[i].chip} shadow-md` : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
              }`}>
                {i + 1}. {sg.content.length > 22 ? sg.content.slice(0, 22) + "…" : sg.content}
                {done && <Check className="w-3 h-3" />}
              </button>
            )
          })}
        </div>
        {subgoals[active] && (() => {
          const sg = subgoals[active]
          const actions = detailedActions[sg.id] || []
          const sgDone = actions.filter((a) => a.isConfirmed).length
          return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${COLORS[active].chip}`}>{active + 1}</div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm" style={{ fontFamily: "'Outfit', sans-serif" }}>{sg.content}</h3>
                    <p className="text-xs text-gray-400">{sgDone}/8 confirmed</p>
                  </div>
                </div>
                {sgDone < 8 && <button onClick={() => onAcceptAll(sg.id)} className="text-xs text-indigo-600 font-semibold hover:underline">Accept all</button>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {actions.map((action, i) => (
                  <div key={action.id} className={`rounded-xl border-2 p-3 transition-all ${
                    action.isConfirmed ? "border-emerald-300 bg-emerald-50/40" : "border-gray-100 bg-gray-50 hover:border-gray-200"
                  }`}>
                    <div className="text-[10px] text-gray-300 font-semibold mb-1 uppercase tracking-wide">#{i + 1}</div>
                    {action.isEditing
                      ? <input value={action.content} onChange={(e) => onActionUpdate(sg.id, i, e.target.value)} onKeyDown={(e) => e.key === "Enter" && onActionSaveEdit(sg.id, i)} autoFocus className="w-full text-xs text-gray-800 bg-transparent border-b border-indigo-400 focus:outline-none mb-2" />
                      : <p className="text-xs text-gray-700 leading-snug mb-2 min-h-[2.5rem]">{action.content}</p>
                    }
                    <div className="flex gap-1">
                      {action.isEditing ? (
                        <button onClick={() => onActionSaveEdit(sg.id, i)} className="flex-1 h-6 bg-indigo-600 text-white text-[10px] font-semibold rounded-lg flex items-center justify-center"><Save className="w-2.5 h-2.5" /></button>
                      ) : action.isConfirmed ? (
                        <>
                          <div className="flex-1 h-6 bg-emerald-100 text-emerald-700 text-[10px] rounded-lg flex items-center justify-center"><Check className="w-2.5 h-2.5" /></div>
                          <button onClick={() => onActionStartEdit(sg.id, i)} className="h-6 w-6 bg-gray-100 rounded-lg flex items-center justify-center"><Edit2 className="w-2.5 h-2.5 text-gray-400" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => onActionStartEdit(sg.id, i)} className="h-6 w-7 bg-gray-200 text-gray-500 rounded-lg flex items-center justify-center hover:bg-gray-300 transition"><Edit2 className="w-2.5 h-2.5" /></button>
                          <button onClick={() => onActionConfirm(sg.id, i)} className="flex-1 h-6 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 transition"><Check className="w-2.5 h-2.5" /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
        {allConfirmed && (
          <div className="text-center mt-8">
            <button onClick={onComplete} className="h-12 px-8 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 mx-auto" style={{ fontFamily: "'Outfit', sans-serif" }}>
              View Mandalart <Grid3x3 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Visualization Step ─────────────────────────────────────────────────────────────────────

type CellDef = { content: string; colorClass: string; type: "mainGoal" | "subgoal" | "action" | "empty"; subgoalIndex?: number; subgoalId?: string; actionIndex?: number }
type EditState = { open: boolean; type: CellDef["type"]; content: string; subgoalIndex?: number; subgoalId?: string; actionIndex?: number }

function VisualizationStep({ data, onRestart, onUpdateMainGoal, onUpdateSubgoal, onUpdateAction, onOpenSettings, config }: {
  data: MandalartData; onRestart: () => void
  onUpdateMainGoal: (v: string) => void; onUpdateSubgoal: (i: number, v: string) => void; onUpdateAction: (sgId: string, i: number, v: string) => void
  onOpenSettings: () => void; config: LLMConfig
}) {
  const [edit, setEdit] = useState<EditState>({ open: false, type: "empty", content: "" })
  const [editContent, setEditContent] = useState("")
  const openEdit = (cell: CellDef) => {
    if (cell.type === "empty" || !cell.content.trim()) return
    setEdit({ open: true, type: cell.type, content: cell.content, subgoalIndex: cell.subgoalIndex, subgoalId: cell.subgoalId, actionIndex: cell.actionIndex })
    setEditContent(cell.content)
  }
  const saveEdit = () => {
    if (edit.type === "mainGoal") onUpdateMainGoal(editContent)
    else if (edit.type === "subgoal" && edit.subgoalIndex !== undefined) onUpdateSubgoal(edit.subgoalIndex, editContent)
    else if (edit.type === "action" && edit.subgoalId && edit.actionIndex !== undefined) onUpdateAction(edit.subgoalId, edit.actionIndex, editContent)
    setEdit((p) => ({ ...p, open: false }))
  }
  const buildGrid = (): CellDef[][] => {
    const empty: CellDef = { content: "", colorClass: "bg-gray-50", type: "empty" }
    const grid: CellDef[][] = Array(9).fill(null).map(() => Array(9).fill(empty))
    grid[4][4] = { content: data.mainGoal.content, colorClass: "bg-indigo-700 text-white font-bold cursor-pointer hover:bg-indigo-800 transition", type: "mainGoal" }
    const subgoalPos = [[1,1],[1,4],[1,7],[4,1],[4,7],[7,1],[7,4],[7,7]]
    const sectionStart = [[0,0],[0,3],[0,6],[3,0],[3,6],[6,0],[6,3],[6,6]]
    data.subgoals.forEach((sg, sgIdx) => {
      const [sRow, sCol] = subgoalPos[sgIdx]
      grid[sRow][sCol] = { content: sg.content, colorClass: `${COLORS[sgIdx].chip} cursor-pointer hover:opacity-80 transition font-semibold`, type: "subgoal", subgoalIndex: sgIdx }
      const actions = data.detailedActions[sg.id] || []
      const [startR, startC] = sectionStart[sgIdx]
      let ai = 0
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        if (r === 1 && c === 1) continue
        if (ai < actions.length) { grid[startR + r][startC + c] = { content: actions[ai].content, colorClass: `${COLORS[sgIdx].cell} cursor-pointer hover:opacity-80 transition`, type: "action", subgoalId: sg.id, actionIndex: ai }; ai++ }
      }
    })
    return grid
  }
  const grid = buildGrid()
  const downloadTXT = () => {
    const lines = ["MANDALART GOAL PLANNER", "=".repeat(45), `Main Goal: ${data.mainGoal.content}`, ""]
    data.subgoals.forEach((sg, i) => {
      lines.push(`${i + 1}. ${sg.content}`)
      ;(data.detailedActions[sg.id] || []).forEach((a, ai) => lines.push(`   ${ai + 1}. ${a.content}`))
      lines.push("")
    })
    const blob = new Blob([lines.join("\n")], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url
    a.download = `Mandalart_${data.mainGoal.content.slice(0, 20).replace(/\s+/g, "_")}.txt`
    a.click(); URL.revokeObjectURL(url)
  }
  const typeLabelMap = { mainGoal: "Main Goal", subgoal: "Subgoal", action: "Action Item", empty: "" }
  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 no-print">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: "'Outfit', sans-serif" }}>Your Mandalart</h2>
            <p className="text-xs text-gray-400 mt-0.5">Click any cell to edit · Generated with {PROVIDERS.find(p => p.id === config.provider)?.label}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onOpenSettings} className="h-9 px-4 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 hover:bg-gray-50 transition no-print"><Settings className="w-3.5 h-3.5" /> API Settings</button>
            <button onClick={downloadTXT} className="h-9 px-4 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 hover:bg-gray-50 transition no-print"><FileText className="w-3.5 h-3.5" /> Export TXT</button>
            <button onClick={() => window.print()} className="h-9 px-4 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 hover:bg-gray-50 transition no-print"><Printer className="w-3.5 h-3.5" /> Print</button>
            <button onClick={onRestart} className="h-9 px-4 bg-indigo-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 hover:bg-indigo-700 transition no-print"><RotateCcw className="w-3.5 h-3.5" /> New Goal</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="inline-grid border-2 border-gray-300 rounded-2xl overflow-hidden shadow-lg bg-white" style={{ gridTemplateColumns: "repeat(9, minmax(72px, 1fr))", minWidth: "660px" }}>
            {grid.map((row, rIdx) => row.map((cell, cIdx) => {
              const divR = rIdx === 2 || rIdx === 5 ? "border-b-2 border-gray-300" : ""
              const divC = cIdx === 2 || cIdx === 5 ? "border-r-2 border-gray-300" : ""
              return (
                <div key={`${rIdx}-${cIdx}`} onClick={() => openEdit(cell)}
                  className={`h-[72px] border border-gray-100 flex items-center justify-center text-center select-none ${cell.colorClass} ${divR} ${divC}`}
                  style={{ fontSize: "0.52rem", lineHeight: 1.25, padding: "4px 3px" }}>
                  <span>{cell.content}</span>
                </div>
              )
            }))}
          </div>
        </div>
        <div className="mt-8 bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>Full Summary</h3>
          <p className="text-xs text-gray-400 mb-4">Goal: <span className="text-indigo-600 font-semibold">{data.mainGoal.content}</span></p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.subgoals.map((sg, i) => (
              <div key={sg.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${COLORS[i].chip}`}>{i + 1}</div>
                  <span className="text-sm font-semibold text-gray-800">{sg.content}</span>
                </div>
                <div className="ml-7 space-y-0.5">
                  {(data.detailedActions[sg.id] || []).map((action, ai) => (
                    <div key={action.id} className="flex gap-1.5 text-xs text-gray-500">
                      <span className="text-gray-300 flex-shrink-0 w-4">{ai + 1}.</span>
                      <span>{action.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {edit.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEdit((p) => ({ ...p, open: false }))}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1">{typeLabelMap[edit.type]}</div>
            <h3 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>Edit Content</h3>
            <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} autoFocus className="w-full px-3 py-2.5 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setEdit((p) => ({ ...p, open: false }))} className="flex-1 h-10 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition">Cancel</button>
              <button onClick={saveEdit} disabled={!editContent.trim()} className="flex-1 h-10 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-40">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep] = useState<AppStep>("input")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [config, setConfig] = useState<LLMConfig>(loadConfig)
  const [data, setData] = useState<MandalartData>({
    mainGoal: { id: "main", content: "", isConfirmed: false, isEditing: false },
    subgoals: [],
    detailedActions: {},
  })
  const handleSaveConfig = (cfg: LLMConfig) => { setConfig(cfg); saveConfig(cfg) }
  const handleGoalSubmit = async (goal: string) => {
    if (config.provider !== "mock" && !config.apiKey.trim()) { setShowSettings(true); return }
    setIsLoading(true); setError(null)
    setData((p) => ({ ...p, mainGoal: { id: "main", content: goal, isConfirmed: true, isEditing: false } }))
    try {
      const texts = await llmGenerateSubgoals(goal, config)
      setData((p) => ({ ...p, subgoals: texts.map((content, i) => ({ id: `sg-${i}`, content, isConfirmed: false, isEditing: false })) }))
      setStep("review-subgoals")
    } catch (e: any) { setError(e.message ?? "Unknown error") } finally { setIsLoading(false) }
  }
  const handleGenerateDetails = async () => {
    setStep("generate-details"); setIsLoading(true); setError(null)
    try {
      const actions: { [id: string]: MandalartCell[] } = {}
      await Promise.all(data.subgoals.map(async (sg, i) => {
        const texts = await llmGenerateActions(sg.content, data.mainGoal.content, i, config)
        actions[sg.id] = texts.map((content, ai) => ({ id: `${sg.id}-a${ai}`, content, isConfirmed: false, isEditing: false }))
      }))
      setData((p) => ({ ...p, detailedActions: actions }))
      setStep("review-details")
    } catch (e: any) { setError(e.message ?? "Unknown error"); setStep("review-subgoals") } finally { setIsLoading(false) }
  }
  const updateSg    = (i: number, v: string) => setData((p) => ({ ...p, subgoals: p.subgoals.map((s, idx) => idx === i ? { ...s, content: v } : s) }))
  const confirmSg   = (i: number) => setData((p) => ({ ...p, subgoals: p.subgoals.map((s, idx) => idx === i ? { ...s, isConfirmed: true, isEditing: false } : s) }))
  const startEditSg = (i: number) => setData((p) => ({ ...p, subgoals: p.subgoals.map((s, idx) => idx === i ? { ...s, isEditing: true } : s) }))
  const saveEditSg  = (i: number) => setData((p) => ({ ...p, subgoals: p.subgoals.map((s, idx) => idx === i ? { ...s, isEditing: false, isConfirmed: true } : s) }))
  const acceptAllSg = () => setData((p) => ({ ...p, subgoals: p.subgoals.map((s) => ({ ...s, isConfirmed: true, isEditing: false })) }))
  const updateAct    = (sgId: string, i: number, v: string) => setData((p) => ({ ...p, detailedActions: { ...p.detailedActions, [sgId]: p.detailedActions[sgId].map((a, idx) => idx === i ? { ...a, content: v } : a) } }))
  const confirmAct   = (sgId: string, i: number) => setData((p) => ({ ...p, detailedActions: { ...p.detailedActions, [sgId]: p.detailedActions[sgId].map((a, idx) => idx === i ? { ...a, isConfirmed: true, isEditing: false } : a) } }))
  const startEditAct = (sgId: string, i: number) => setData((p) => ({ ...p, detailedActions: { ...p.detailedActions, [sgId]: p.detailedActions[sgId].map((a, idx) => idx === i ? { ...a, isEditing: true } : a) } }))
  const saveEditAct  = (sgId: string, i: number) => setData((p) => ({ ...p, detailedActions: { ...p.detailedActions, [sgId]: p.detailedActions[sgId].map((a, idx) => idx === i ? { ...a, isEditing: false, isConfirmed: true } : a) } }))
  const acceptAllAct = (sgId: string) => setData((p) => ({ ...p, detailedActions: { ...p.detailedActions, [sgId]: p.detailedActions[sgId].map((a) => ({ ...a, isConfirmed: true, isEditing: false })) } }))
  const restart = () => { setStep("input"); setError(null); setData({ mainGoal: { id: "main", content: "", isConfirmed: false, isEditing: false }, subgoals: [], detailedActions: {} }) }
  const providerLabel = PROVIDERS.find((p) => p.id === config.provider)?.label ?? "AI"
  return (
    <div className="size-full overflow-auto">
      {step !== "input" && step !== "visualization" && (
        <div className="bg-white border-b border-gray-100 sticky top-0 z-20 no-print"><StepProgress current={step} /></div>
      )}
      {error && step !== "generate-details" && (
        <ErrorBanner message={error} onDismiss={() => setError(null)} onOpenSettings={() => setShowSettings(true)} />
      )}
      {step === "input" && <GoalInputStep onSubmit={handleGoalSubmit} isLoading={isLoading} config={config} onOpenSettings={() => setShowSettings(true)} />}
      {step === "review-subgoals" && <SubgoalReviewStep mainGoal={data.mainGoal.content} subgoals={data.subgoals} onUpdate={updateSg} onConfirm={confirmSg} onStartEdit={startEditSg} onSaveEdit={saveEditSg} onAcceptAll={acceptAllSg} onNext={handleGenerateDetails} />}
      {step === "generate-details" && <GeneratingStep providerLabel={providerLabel} />}
      {step === "review-details" && <ActionsReviewStep mainGoal={data.mainGoal.content} subgoals={data.subgoals} detailedActions={data.detailedActions} onActionUpdate={updateAct} onActionConfirm={confirmAct} onActionStartEdit={startEditAct} onActionSaveEdit={saveEditAct} onAcceptAll={acceptAllAct} onComplete={() => setStep("visualization")} />}
      {step === "visualization" && <VisualizationStep data={data} onRestart={restart} onUpdateMainGoal={(v) => setData((p) => ({ ...p, mainGoal: { ...p.mainGoal, content: v } }))} onUpdateSubgoal={updateSg} onUpdateAction={updateAct} onOpenSettings={() => setShowSettings(true)} config={config} />}
      {showSettings && <LLMSettingsModal config={config} onSave={handleSaveConfig} onClose={() => setShowSettings(false)} />}
    </div>
  )
}
