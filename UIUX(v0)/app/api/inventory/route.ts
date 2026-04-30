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
  getBattleConfig,
  getSkillsWithInvestment,
} from "@/lib/db"
import { buildPlayerCombatStats } from "@/lib/battle"

type GradeRow = {
  grade: string; name: string; weight: number
  stat_min: number; stat_max: number
  sub_count: string; combat_count: string; passive_count: string
}
type SlotRow = { slot: string; name: string; main_ability: string; excluded: string }
type AbilityRow = { name: string; base_value: number; unit: string; category: string }
type PassiveRow = { name: string; description: string }

function pickGrade(grades: GradeRow[]): GradeRow {
  const total = grades.reduce((s, g) => s + Math.max(0, g.weight), 0)
  if (total <= 0) return grades[Math.floor(Math.random() * grades.length)]
  let r = Math.random() * total
  for (const g of grades) {
    r -= Math.max(0, g.weight)
    if (r <= 0) return g
  }
  return grades[grades.length - 1]
}

function pickSlot(slots: SlotRow[]): SlotRow {
  return slots[Math.floor(Math.random() * slots.length)]
}

function randBetween(min: number, max: number): number {
  if (max <= min) return min
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// "0~1" → 0 또는 1 확률 처리
function parseCount(raw: unknown): number {
  const s = String(raw ?? "0").trim()
  if (s === "" || s === "0") return 0
  if (s === "1") return 1
  if (s === "2") return 2
  if (s === "0~1") return Math.random() < 0.5 ? 0 : 1
  if (s === "1~2") return Math.random() < 0.5 ? 1 : 2
  return 0
}

function formatOpt(name: string, value: number, unit: string): string {
  if (unit === "%") return `${name} +${value.toFixed(1)}%`
  return `${name} +${Math.round(value)}`
}

// 프로토타입 item_engine.py _roll_ability_value 동일 로직
function rollAbilityValue(ability: AbilityRow, grade: GradeRow, ratio: number): string {
  if (ability.unit === "%") {
    const value = ability.base_value * ratio * (1 + Math.random())
    return formatOpt(ability.name, value, "%")
  }
  const low = Math.max(0, Math.floor(grade.stat_min * 0.3 * ratio))
  const high = Math.max(low, Math.floor(grade.stat_max * 0.5 * ratio))
  return formatOpt(ability.name, randBetween(low, high), "Pt")
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

export async function PATCH(req: NextRequest) {
  try {
    await initDb()
    const { action, itemId } = await req.json()
    if (typeof itemId !== "number" || !Number.isFinite(itemId)) {
      return NextResponse.json({ error: "itemId 필요" }, { status: 400 })
    }
    if (action === "equip") await equipItem(itemId)
    else if (action === "unequip") await unequipItem(itemId)
    else if (action === "delete") await deleteEquipment(itemId)
    else return NextResponse.json({ error: "알 수 없는 action" }, { status: 400 })

    const [char, bcfg, equipment, allSkills] = await Promise.all([
      getCharacter(), getBattleConfig(), getEquipment(), getSkillsWithInvestment(),
    ])
    const equippedOptions = (equipment as { is_equipped: number; options: string }[])
      .filter((e) => e.is_equipped === 1)
      .map((e) => e.options)
    const cs = buildPlayerCombatStats(char, equippedOptions, bcfg, allSkills)
    const effMaxHp = Math.round(cs.max_hp)
    const effMaxMp = Math.round(cs.max_mp)
    if (char.current_hp > effMaxHp || char.current_mp > effMaxMp) {
      await updateCharacter({
        current_hp: Math.min(char.current_hp, effMaxHp),
        current_mp: Math.min(char.current_mp, effMaxMp),
      })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb()
    const { count = 1 } = await req.json()

    const char = await getCharacter()
    if (char.draw_tickets < count) {
      return NextResponse.json({ error: "뽑기권이 부족합니다" }, { status: 400 })
    }

    const grades = (await getItemGrades()) as unknown as GradeRow[]
    const slots = (await getItemSlots()) as unknown as SlotRow[]
    const abilities = (await getAbilityPool()) as unknown as AbilityRow[]
    const passives = (await getPassivePool()) as unknown as PassiveRow[]

    const results = []
    for (let i = 0; i < count; i++) {
      const grade = pickGrade(grades)
      const slot = pickSlot(slots)

      const excluded = new Set<string>((() => {
        try { return JSON.parse(slot.excluded) as string[] } catch { return [] }
      })())
      const used = new Set<string>()
      const optionLines: string[] = []

      // 메인 능력치: stat_min~stat_max 직접 롤
      const mainAbility = abilities.find(a => a.name === slot.main_ability)
      const mainValue = randBetween(grade.stat_min, grade.stat_max)
      if (mainAbility) {
        optionLines.push(formatOpt(mainAbility.name, mainValue, mainAbility.unit || "Pt"))
        used.add(mainAbility.name)
      }

      // 서브 능력치 (BaseStat)
      const subCount = parseCount(grade.sub_count)
      const subRatios = [0.5, 0.4]
      for (let j = 0; j < subCount; j++) {
        const pool = abilities.filter(
          a => a.category === "BaseStat" && !excluded.has(a.name) && !used.has(a.name)
        )
        if (!pool.length) break
        const ability = pool[Math.floor(Math.random() * pool.length)]
        used.add(ability.name)
        optionLines.push(rollAbilityValue(ability, grade, subRatios[j] ?? 0.4))
      }

      // 전투 능력치 (Combat)
      const combatCount = parseCount(grade.combat_count)
      const combatRatios = [1.0, 0.8]
      for (let j = 0; j < combatCount; j++) {
        const pool = abilities.filter(
          a => a.category === "Combat" && !excluded.has(a.name) && !used.has(a.name) && a.name !== slot.main_ability
        )
        if (!pool.length) break
        const ability = pool[Math.floor(Math.random() * pool.length)]
        used.add(ability.name)
        optionLines.push(rollAbilityValue(ability, grade, combatRatios[j] ?? 0.8))
      }

      // 패시브
      const passiveCount = parseCount(grade.passive_count)
      for (let j = 0; j < passiveCount; j++) {
        if (!passives.length) break
        const passive = passives[Math.floor(Math.random() * passives.length)]
        optionLines.push(`[${passive.name}]`)
        break
      }

      const name = `${grade.name} ${slot.name}`
      const id = await addEquipment(slot.slot, name, grade.grade, mainValue, optionLines)
      results.push({ id, name, grade: grade.grade, slot: slot.slot, mainValue, options: optionLines })
    }

    await updateCharacter({ draw_tickets: char.draw_tickets - count })
    return NextResponse.json({ results })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
