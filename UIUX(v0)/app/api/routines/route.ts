import { NextRequest, NextResponse } from "next/server"
import {
  initDb, getRoutines, addRoutine, addRoutineItem,
  deleteRoutine, deleteRoutineItem, checkRoutineItem,
  reorderRoutineItems, addActivityLog, incrementTaskCount,
  updateRoutineDeadline, updateRoutineName, updateRoutineItemName,
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
    const { itemId } = await req.json()
    if (typeof itemId !== "number") {
      return NextResponse.json({ error: "itemId 필요" }, { status: 400 })
    }
    const result = await checkRoutineItem(itemId)
    if (!result) return NextResponse.json({ error: "항목 없음 또는 이미 체크됨" }, { status: 400 })

    const totalExp = result.exp + result.bonusExp
    const comment = result.deadlineBonus
      ? `⏰ 마감 전 달성! 🎉 ${result.routineName} 완수! (2배 보너스)`
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
      deadlineBonus: result.deadlineBonus,
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
      if (typeof routineId !== "number" || !name) {
        return NextResponse.json({ error: "필수값 누락" }, { status: 400 })
      }
      await addRoutineItem(routineId, name, fixedExp)
      return NextResponse.json(await getRoutines())
    }
    if (action === "updateDeadline") {
      const routineId = body.routineId
      const deadlineTime = body.deadlineTime ?? null
      if (typeof routineId !== "number") {
        return NextResponse.json({ error: "routineId 필요" }, { status: 400 })
      }
      await updateRoutineDeadline(routineId, deadlineTime)
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
    if (action === "updateRoutineName") {
      const name = (body.name ?? "").trim()
      if (typeof body.routineId !== "number" || !name) {
        return NextResponse.json({ error: "필수값 누락" }, { status: 400 })
      }
      await updateRoutineName(body.routineId, name)
      return NextResponse.json(await getRoutines())
    }
    if (action === "updateItemName") {
      const name = (body.name ?? "").trim()
      if (typeof body.itemId !== "number" || !name) {
        return NextResponse.json({ error: "필수값 누락" }, { status: 400 })
      }
      await updateRoutineItemName(body.itemId, name)
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
