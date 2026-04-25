import { GoogleGenerativeAI } from "@google/generative-ai"
import { getActivePrompt } from "./db"

export async function judgeActivity(activityText: string): Promise<{
  exp: number
  comment: string
  error: string | null
}> {
  const prompt = await getActivePrompt("general")
  if (!prompt) return { exp: 50, comment: "활동 완료!", error: null }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { exp: 50, comment: "활동 완료!", error: "API 키 없음" }

  const keyHint = `${apiKey.slice(0, 6)}...${apiKey.slice(-4)} (len:${apiKey.length})`

  const genai = new GoogleGenerativeAI(apiKey)
  const model = genai.getGenerativeModel({ model: "gemini-2.0-flash-lite" })
  const fullPrompt = `${prompt}\n\n유저 활동: ${activityText}`

  try {
    const result = await model.generateContent(fullPrompt)
    const text = result.response.text().trim()
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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[AI judgeActivity error]", msg)
    throw new Error(`KEY=${keyHint} | ${msg}`)
  }
}
