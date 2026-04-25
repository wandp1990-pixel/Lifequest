import { NextRequest, NextResponse } from "next/server"
import {
  initDb,
  getEquipment,
  addEquipment,
  equipItem,
  unequipItem,
  deleteEquipment,
  getCharacter,
  updateCharacter,
  getItemGrades,
  getItemSlots,
  getAbilityPool,
  getPassivePool,
} from "@/lib/db"

// 가챠: 등급 랜덤 선택
function pickGrade<T extends { weight: number }>(grades: T[]): T {
  const total = grades.reduce((s, g) => s + g.weight, 0)
  let r = Math.random() * total
  for (const g of grades) {
    r -= g.weight
    if (r <= 0) return g
  }
  return grades[grades.length - 1]
}

// 슬롯 랜덤 선택
function pickSlot(slots: { slot: string; name: string; main_ability: string }[]) {
  return slots[Math.floor(Math.random() * slots.length)]
}

// 능력치 범위에서 무작위 값
function randBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export async function GET() {
  try {
    await initDb()
    const equipment = await getEquipment()
    const char = await getCharacter()
    return NextResponse.json({ equipment, draw_tickets: char.draw_tickets })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// 장착/해제
export async function PATCH(req: NextRequest) {
  try {
    await initDb()
    const { action, itemId } = await req.json()
    if (action === "equip") await equipItem(itemId)
    else if (action === "unequip") await unequipItem(itemId)
    else if (action === "delete") await deleteEquipment(itemId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// 가챠
export async function POST(req: NextRequest) {
  try {
    await initDb()
    const { count = 1 } = await req.json()

    const char = await getCharacter()
    if (char.draw_tickets < count) {
      return NextResponse.json({ error: "뽑기권이 부족합니다" }, { status: 400 })
    }

    const grades = (await getItemGrades()) as unknown as { grade: string; name: string; weight: number; stat_min: number; stat_max: number }[]
    const slots = (await getItemSlots()) as unknown as { slot: string; name: string; main_ability: string }[]
    const abilities = (await getAbilityPool()) as unknown as { name: string; base_value: number; effect: string; category: string }[]
    const passives = (await getPassivePool()) as unknown as { name: string; description: string }[]

    const results = []
    for (let i = 0; i < count; i++) {
      const grade = pickGrade(grades)
      const slot = pickSlot(slots)
      const baseStat = randBetween(grade.stat_min, grade.stat_max)

      // 메인 능력치 (슬롯 고정)
      const mainAbility = abilities.find((a) => a.name === slot.main_ability)
      const options: Record<string, unknown> = {}
      if (mainAbility) {
        options[mainAbility.name] = Math.round(mainAbility.base_value * (baseStat / 10))
      }

      // 서브 능력치 1개 랜덤
      const subs = abilities.filter((a) => a.name !== slot.main_ability)
      if (subs.length > 0) {
        const sub = subs[Math.floor(Math.random() * subs.length)]
        options[sub.name] = Math.round(sub.base_value * (baseStat / 15))
      }

      // SR 이상: 패시브 추가
      if (["SR", "SSR", "UR"].includes(grade.grade) && passives.length > 0) {
        const passive = passives[Math.floor(Math.random() * passives.length)]
        options["passive"] = passive.name
      }

      const name = `${grade.name} ${slot.name}`
      const id = await addEquipment(slot.slot, name, grade.grade, baseStat, options)
      results.push({ id, name, grade: grade.grade, slot: slot.slot, baseStat, options })
    }

    await updateCharacter({ draw_tickets: char.draw_tickets - count })

    return NextResponse.json({ results })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
