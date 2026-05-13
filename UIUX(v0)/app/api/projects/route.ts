import { NextRequest } from "next/server"
import { getProjects, addProject } from "@/lib/db/queries/project"
import { ok, badRequest, withInit } from "@/lib/api/respond"

export const GET = withInit(async () => {
  const projects = await getProjects()
  return ok({ projects })
})

export const POST = withInit(async (req: NextRequest) => {
  const { name, description = "", priority = "medium", due_date = null, color = "violet", chapter_id = null } = await req.json()
  if (!name?.trim()) return badRequest("이름 필수")
  await addProject(name.trim(), description, priority, 0, due_date, color, chapter_id)
  const projects = await getProjects()
  return ok({ projects })
})
