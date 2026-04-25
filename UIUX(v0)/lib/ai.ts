import { GoogleGenerativeAI } from "@google/generative-ai"
import { getActivePrompt } from "./db"

const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"]
const RETRIABLE = /\b(429|500|502|503|504)\b|overload|unavailable|high demand/i

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function tryGenerate(
  genai: GoogleGenerativeAI,
  modelName: string,
  fullPrompt: string,
): Promise<string> {
  const model = genai.getGenerativeModel({ model: modelName })
  let lastErr: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await model.generateContent(fullPrompt)
      return result.response.text().trim()
    } catch (e) {
      lastErr = e
      const msg = e instanceof Error ? e.message : String(e)
      if (!RETRIABLE.test(msg)) throw e
      await sleep(500 * (attempt + 1))
    }
  }
  throw lastErr
}

function extractJson(text: string): unknown | null {
  const start = text.indexOf("{")
  if (start === -1) return null
  let depth = 0
  let inStr = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (escape) {
      escape = false
      continue
    }
    if (inStr) {
      if (ch === "\\") escape = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === "{") depth++
    else if (ch === "}") {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}

type AnyObj = Record<string, unknown>

function pickNumber(obj: AnyObj | null | undefined, ...keys: string[]): number | null {
  if (!obj) return null
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === "number" && Number.isFinite(v)) return v
    if (typeof v === "string") {
      const n = parseFloat(v)
      if (Number.isFinite(n)) return n
    }
    if (v && typeof v === "object") {
      const inner = v as AnyObj
      for (const ik of ["value", "score", "exp", "xp", "amount"]) {
        const iv = inner[ik]
        if (typeof iv === "number" && Number.isFinite(iv)) return iv
      }
    }
  }
  return null
}

function pickString(obj: AnyObj | null | undefined, ...keys: string[]): string | null {
  if (!obj) return null
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === "string" && v.trim()) return v.trim()
    if (v && typeof v === "object") {
      const inner = v as AnyObj
      for (const ik of ["reason", "text", "message", "사유"]) {
        const iv = inner[ik]
        if (typeof iv === "string" && iv.trim()) return iv.trim()
      }
    }
  }
  return null
}

function parseResponse(text: string): { exp: number; comment: string } | null {
  const data = extractJson(text)
  if (!data || typeof data !== "object") return null
  const obj = data as AnyObj

  let exp = pickNumber(obj, "exp", "total_xp", "totalXp", "score", "xp", "최종", "total")
  if (exp === null) {
    const base = pickNumber(obj, "base_xp", "baseXp", "base", "기본")
    const bonus = pickNumber(obj, "bonus_xp", "bonusXp", "bonus", "추가", "보너스")
    if (base !== null || bonus !== null) exp = (base ?? 0) + (bonus ?? 0)
  }
  if (exp === null) return null

  let comment = pickString(obj, "comment", "reason", "사유", "message", "설명", "explanation")
  if (!comment) {
    const baseReason = pickString(obj, "base_reason", "baseReason", "base_xp_reason")
    const bonusReason = pickString(obj, "bonus_reason", "bonusReason", "bonus_xp_reason")
    const parts = [baseReason, bonusReason].filter(Boolean) as string[]
    if (parts.length) comment = parts.join(" / ")
  }
  if (!comment) {
    const baseObj = (obj.base_xp ?? obj.baseXp) as AnyObj | undefined
    const bonusObj = (obj.bonus_xp ?? obj.bonusXp) as AnyObj | undefined
    const parts: string[] = []
    if (typeof baseObj?.reason === "string") parts.push(baseObj.reason)
    if (typeof bonusObj?.reason === "string") parts.push(bonusObj.reason)
    if (parts.length) comment = parts.join(" / ")
  }

  return {
    exp: Math.max(0, Math.min(200, Math.floor(exp))),
    comment: (comment ?? "활동 완료!").slice(0, 80),
  }
}

export async function judgeActivity(activityText: string): Promise<{
  exp: number
  comment: string
  error: string | null
}> {
  const prompt = await getActivePrompt("general")
  if (!prompt) return { exp: 50, comment: "활동 완료!", error: null }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { exp: 50, comment: "활동 완료!", error: "API 키 없음" }

  const genai = new GoogleGenerativeAI(apiKey)
  const fullPrompt = `${prompt}\n\n유저 활동: ${activityText}`

  let lastMsg = ""
  for (const modelName of MODELS) {
    try {
      const text = await tryGenerate(genai, modelName, fullPrompt)
      const parsed = parseResponse(text)
      if (parsed) return { ...parsed, error: null }
      lastMsg = `JSON 파싱 실패 (${modelName})`
      console.error(`[AI judgeActivity] ${modelName} parse failed, raw:`, text.slice(0, 300))
    } catch (e) {
      lastMsg = e instanceof Error ? e.message : String(e)
      console.error(`[AI judgeActivity] ${modelName} failed:`, lastMsg)
    }
  }

  return { exp: 50, comment: "활동 완료! (AI 일시 오류)", error: lastMsg || "모든 모델 실패" }
}
