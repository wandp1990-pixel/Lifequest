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
      const match = text.match(/\{.*?\}/s)
      if (match) {
        const data = JSON.parse(match[0])
        return {
          exp: Math.max(0, Math.min(200, Math.floor(Number(data.exp ?? 50)))),
          comment: String(data.comment ?? "활동 완료!").slice(0, 50),
          error: null,
        }
      }
      return { exp: 50, comment: "활동 완료!", error: null }
    } catch (e) {
      lastMsg = e instanceof Error ? e.message : String(e)
      console.error(`[AI judgeActivity] ${modelName} failed:`, lastMsg)
    }
  }

  return { exp: 50, comment: "활동 완료! (AI 일시 오류)", error: lastMsg || "모든 모델 실패" }
}
