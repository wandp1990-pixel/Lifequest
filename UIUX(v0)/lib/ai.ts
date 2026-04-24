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

  const genai = new GoogleGenerativeAI(apiKey)
  const model = genai.getGenerativeModel({ model: "gemini-1.5-flash" })
  const fullPrompt = `${prompt}\n\n유저 활동: ${activityText}`

  for (let attempt = 0; attempt < 3; attempt++) {
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
      return { exp: 50, comment: "활동 완료!", error: "응답 파싱 실패" }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 5000))
          continue
        }
        return { exp: 0, comment: "", error: "rate_limit" }
      }
      return { exp: 0, comment: "", error: msg }
    }
  }
  return { exp: 0, comment: "", error: "재시도 초과" }
}
