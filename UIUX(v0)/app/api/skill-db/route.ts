import { NextRequest } from "next/server"
import { getAllSkillsDb, createSkillDb, updateSkillDb, deleteSkillDb } from "@/lib/db"
import { ok, badRequest, withInit } from "@/lib/api/respond"

export const GET = withInit(async () => {
  const skills = await getAllSkillsDb()
  return ok({ skills })
})

export const POST = withInit(async (req: NextRequest) => {
  const data = await req.json()
  await createSkillDb(data)
  const skills = await getAllSkillsDb()
  return ok({ skills })
})

export const PUT = withInit(async (req: NextRequest) => {
  const { id, ...data } = await req.json()
  if (!id) return badRequest("id required")
  await updateSkillDb(id, data)
  const skills = await getAllSkillsDb()
  return ok({ skills })
})

export const DELETE = withInit(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return badRequest("id required")
  await deleteSkillDb(id)
  const skills = await getAllSkillsDb()
  return ok({ skills })
})
