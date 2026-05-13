import { NextRequest } from "next/server"
import { getProjects, addProjectTask } from "@/lib/db/queries/project"
import { ok, badRequest, withInit } from "@/lib/api/respond"

export const POST = withInit(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const projectId = Number(id)
  const { name, exp_reward = 0 } = await req.json()
  if (!name?.trim()) return badRequest("이름 필수")
  await addProjectTask(projectId, name.trim(), Math.max(0, Number(exp_reward) || 0))
  const projects = await getProjects()
  return ok({ projects })
})
