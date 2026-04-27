import { NextRequest, NextResponse } from "next/server"
import {
  initDb, getRoutines, addRoutine, addRoutineItem,
  deleteRoutine, deleteRoutineItem, checkRoutineItem,
  reorderRoutineItems, addActivityLog, incrementTaskCount,
} from "@/lib/db"
import { gainExp } from "@/lib/game"

export async function GET() {
  try {
    await initDb()
    return NextResponse.json(await getRoutines())
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb()
    const { itemId, startedAt } = await req.json()
    if (typeof itemId !== "number") {
      return NextResponse.json({ error: "itemId 필요" }, { status: 400 })
    }
    const result = await checkRoutineItem(itemId, startedAt)
    if (!result) return NextResponse.json({ error: "항목 없음 또는 이미 체크됨" }, { status: 400 })

    const totalExp = result.exp + result.bonusExp
    const comment = result.timeBonus
      ? result.allDone && result.bonusExp > 0
        ? `⚡ 제한시간 달성! 🎉 ${result.routineName} 완수!`
        : "⚡ 제한시간 달성! EXP 2배!"
      : result.allDone && result.bonusExp > 0
        ? `🎉 ${result.routineName} 완수! 보너스 +${result.bonusExp}`
        : "루틴 항목 완료"
    await addActivityLog(
      result.allDone ? `${result.routineName} 루틴 완수` : `루틴 항목 완료`,
      "routine",
      totalExp,
      comment,
    )
    await incrementTaskCount()
    const levelResult = await gainExp(totalExp)

    return NextResponse.json({
      exp: result.exp,
      bonusExp: result.bonusExp,
      allDone: result.allDone,
      routineName: result.routineName,
      timeBonus: result.timeBonus,
      ...levelResult,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await initDb()
    const body = await req.json()
    const { action } = body
    if (action === "addRoutine") {
      const name = (body.name ?? "").trim()
      if (!name) return NextResponse.json({ error: "이름을 입력하세요" }, { status: 400 })
      const id = await addRoutine(name)
      return NextResponse.json({ ...(await getRoutines()), createdRoutineId: id })
    }
    if (action === "addItem") {
      const routineId = body.routineId
      const name = (body.name ?? "").trim()
      const fixedExp = Number(body.fixedExp ?? 10)
      const timeLimitMinutes = body.timeLimitMinutes ? Number(body.timeLimitMinutes) : null
      if (typeof routineId !== "number" || !name) {
        return NextResponse.json({ error: "필수값 누락" }, { status: 400 })
      }
      await addRoutineItem(routineId, name, fixedExp, timeLimitMinutes)
      return NextResponse.json(await getRoutines())
    }
    if (action === "reorderItems") {
      const orderedItemIds = body.orderedItemIds
      if (!Array.isArray(orderedItemIds)) {
        return NextResponse.json({ error: "orderedItemIds 필요" }, { status: 400 })
      }
      await reorderRoutineItems(orderedItemIds)
      return NextResponse.json(await getRoutines())
    }
    return NextResponse.json({ error: "알 수 없는 action" }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initDb()
    const body = await req.json()
    const { action } = body
    if (action === "deleteRoutine") {
      await deleteRoutine(body.id)
    } else if (action === "deleteItem") {
      await deleteRoutineItem(body.id)
    } else {
      return NextResponse.json({ error: "알 수 없는 action" }, { status: 400 })
    }
    return NextResponse.json(await getRoutines())
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
