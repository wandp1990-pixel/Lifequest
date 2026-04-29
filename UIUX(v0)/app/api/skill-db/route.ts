import { NextRequest, NextResponse } from "next/server"
import { initDb, getAllSkillsDb, createSkillDb, updateSkillDb, deleteSkillDb } from "@/lib/db"

export async function GET() {
  try {
    await initDb()
    const skills = await getAllSkillsDb()
    return NextResponse.json({ skills })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb()
    const data = await req.json()
    await createSkillDb(data)
    const skills = await getAllSkillsDb()
    return NextResponse.json({ skills })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await initDb()
    const { id, ...data } = await req.json()
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    await updateSkillDb(id, data)
    const skills = await getAllSkillsDb()
    return NextResponse.json({ skills })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initDb()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    await deleteSkillDb(id)
    const skills = await getAllSkillsDb()
    return NextResponse.json({ skills })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
