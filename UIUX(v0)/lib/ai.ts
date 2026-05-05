import { GoogleGenerativeAI, SchemaType, type ObjectSchema } from "@google/generative-ai"
import { getActivePrompt } from "./db"

const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"]
const RETRIABLE = /\b(500|502|503|504)\b|overload|unavailable|high demand/i
const QUOTA_ERROR = /\b429\b|quota|rate.?limit/i

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const RESPONSE_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    exp: { type: SchemaType.INTEGER, description: "0~200 사이 정수" },
    comment: { type: SchemaType.STRING, description: "경험치 산정 근거 요약 (Base XP 이유 · Bonus XP 이유 포함, 60자 이내 한국어)" },
  },
  required: ["exp", "comment"],
}

const PROJECT_EXP_SCHEMA: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    bonus_exp: { type: SchemaType.INTEGER, description: "50~500 사이 정수" },
    task_exp:  { type: SchemaType.INTEGER, description: "10~100 사이 정수" },
    comment:   { type: SchemaType.STRING,  description: "산정 근거 50자 이내 한국어" },
  },
  required: ["bonus_exp", "task_exp", "comment"],
}

const PROJECT_JUDGE_SYSTEM = `당신은 RPG 게임 마스터입니다. 플레이어의 실생활 프로젝트를 보고 경험치를 산정합니다.
규칙:
- bonus_exp: 프로젝트 전체 완료 보너스 EXP (50~500, 우선순위·복잡도·기간 반영)
- task_exp: 하위 작업 1개당 기본 추천 EXP (10~100)
- high → bonus_exp 200+, medium → 100~200, low → 50~100 기준
- 복잡하거나 오래 걸릴수록 높게 책정`

const JSON_ENFORCEMENT = `\n\n반드시 아래 JSON 한 개만 출력하라. 다른 텍스트(마크다운/설명/코드블록) 절대 금지:\n{"exp": <0~200 정수>, "comment": "<Base XP 이유 · Bonus XP 이유 포함, 60자 이내 한국어 근거 요약>"}`

async function tryGenerate(
  genai: GoogleGenerativeAI,
  modelName: string,
  fullPrompt: string,
  schema?: ObjectSchema,
): Promise<string> {
  const model = genai.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema ?? RESPONSE_SCHEMA,
    },
  })
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
  const fullPrompt = `${prompt}\n\n유저 활동: ${activityText}${JSON_ENFORCEMENT}`

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
      if (QUOTA_ERROR.test(lastMsg)) {
        return { exp: 50, comment: "활동 완료! (AI 쿼터 초과)", error: lastMsg }
      }
    }
  }

  return { exp: 50, comment: "활동 완료! (AI 일시 오류)", error: lastMsg || "모든 모델 실패" }
}

export async function judgeProjectExp(
  name: string,
  description: string,
  priority: string,
): Promise<{ bonus_exp: number; task_exp: number; comment: string; error: string | null }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { bonus_exp: 100, task_exp: 20, comment: "기본값 적용", error: "API 키 없음" }

  const genai = new GoogleGenerativeAI(apiKey)
  const priorityLabel = priority === "high" ? "높음" : priority === "medium" ? "보통" : "낮음"
  const fullPrompt = `${PROJECT_JUDGE_SYSTEM}

프로젝트:
- 이름: ${name}
- 설명: ${description || "없음"}
- 우선순위: ${priorityLabel}

반드시 JSON만 출력: {"bonus_exp": <50~500 정수>, "task_exp": <10~100 정수>, "comment": "<50자 이내 한국어>"}`

  let lastMsg = ""
  for (const modelName of MODELS) {
    try {
      const text = await tryGenerate(genai, modelName, fullPrompt, PROJECT_EXP_SCHEMA)
      const data = extractJson(text)
      if (data && typeof data === "object") {
        const obj = data as AnyObj
        const bonus_exp = Math.max(50, Math.min(500, Math.round(Number(obj.bonus_exp) || 100)))
        const task_exp  = Math.max(10, Math.min(100, Math.round(Number(obj.task_exp)  || 20)))
        const comment   = String(obj.comment || "AI 산정 완료").slice(0, 80)
        return { bonus_exp, task_exp, comment, error: null }
      }
      lastMsg = `JSON 파싱 실패 (${modelName})`
    } catch (e) {
      lastMsg = e instanceof Error ? e.message : String(e)
      if (QUOTA_ERROR.test(lastMsg))
        return { bonus_exp: 100, task_exp: 20, comment: "기본값 적용 (AI 쿼터 초과)", error: lastMsg }
    }
  }
  return { bonus_exp: 100, task_exp: 20, comment: "기본값 적용 (AI 오류)", error: lastMsg }
}
