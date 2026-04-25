import { getClient, now } from "../client"

export async function getActivePrompt(category = "general"): Promise<string> {
  const db = getClient()
  const res = await db.execute({
    sql: "SELECT content FROM prompt WHERE category = ? AND is_active = 1 ORDER BY version DESC LIMIT 1",
    args: [category],
  })
  return (res.rows[0]?.content as string) ?? ""
}

export async function updatePromptContent(category: string, content: string) {
  const db = getClient()
  await db.execute({
    sql: "UPDATE prompt SET content=?, updated_at=? WHERE category=? AND is_active=1",
    args: [content, now(), category],
  })
}
