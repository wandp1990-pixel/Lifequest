import { NextRequest, NextResponse } from "next/server"
import {
  initDb,
  getEquipment,
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
import { getClient, now } from "@/lib/db/client"
import { buildPlayerCombatStats } from "@/lib/battle"

type GradeRow = {
  grade: string; name: string; weight: number
  stat_min: number; stat_max: number
  sub_count: string; combat_count: string; passive_count: string
}
type SlotRow = { slot: string; name: string; main_ability: string; excluded: string }
type AbilityRow = { name: string; base_value: number; unit: string; category: string }
type PassiveRow = { name: string; description: string }

// 가중치 기반 등급 선택 (가중치 합산 후 random roll)
// weight가 모두 0 이하면 균등 폴백
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

// 장비 슬롯 균등 랜덤 선택
function pickSlot(slots: SlotRow[]): SlotRow {
  return slots[Math.floor(Math.random() * slots.length)]
}

// min~max 사이 정수 랜덤 (inclusive)
function randBetween(min: number, max: number): number {
  if (max <= min) return min
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// 옵션 개수 문자열을 정수로 변환
// "0~1" → 50% 확률로 0 또는 1
// "1~2" → 50% 확률로 1 또는 2
function parseCount(raw: unknown): number {
  const s = String(raw ?? "0").trim()
  if (s === "" || s === "0") return 0
  if (s === "1") return 1
  if (s === "2") return 2
  if (s === "0~1") return Math.random() < 0.5 ? 0 : 1
  if (s === "1~2") return Math.random() < 0.5 ? 1 : 2
  return 0
}

// 옵션 값을 포맷팅 ("물리공격력 +120" 또는 "치명타확률 +5.0%")
function formatOpt(name: string, value: number, unit: string): string {
  if (unit === "%") return `${name} +${value.toFixed(1)}%`
  return `${name} +${Math.round(value)}`
}

// 능력치 값 생성 (등급/비율 기준으로 무작위 범위 결정)
// % 단위: base * ratio * (1~2배 랜덤) → 최대 2배 범위
// Pt 단위: stat_min/stat_max 범위를 ratio로 조정 후 무작위 선택
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

// 장착/해제/삭제 처리 후 effective 스탯 재계산
// 장비 변경 후 max_hp/mp가 감소했으면 current를 새 max에 맞게 캡
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

    // 장비 변경 후 최종 전투 스탯 및 아이템 보너스 포함 max_hp/mp 계산
    const [char, bcfg, equipment, allSkills] = await Promise.all([
      getCharacter(), getBattleConfig(), getEquipment(), getSkillsWithInvestment(),
    ])
    const equippedOptions = (equipment as unknown as { is_equipped: number; options: string }[])
      .filter((e) => e.is_equipped === 1)
      .map((e) => e.options)
    const cs = buildPlayerCombatStats(char, equippedOptions, bcfg, allSkills)
    const effMaxHp = Math.round(cs.max_hp)
    const effMaxMp = Math.round(cs.max_mp)
    // 장비 제거로 max가 감소했을 때 current_hp가 초과하면 new max로 캡
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

// 가챠: count개 장비 생성 및 뽑기권 차감
// 등급별 메인/서브/전투/패시브 옵션을 확률과 비율에 따라 조합
export async function POST(req: NextRequest) {
  try {
    await initDb()
    const { count = 1 } = await req.json()

    if (!Number.isInteger(count) || count < 1 || count > 100) {
      return NextResponse.json({ error: "count는 1 이상 100 이하의 정수여야 합니다" }, { status: 400 })
    }

    const char = await getCharacter()
    if (char.draw_tickets < count) {
      return NextResponse.json({ error: "뽑기권이 부족합니다" }, { status: 400 })
    }

    const grades = (await getItemGrades()) as unknown as GradeRow[]
    const slots = (await getItemSlots()) as unknown as SlotRow[]
    const abilities = (await getAbilityPool()) as unknown as AbilityRow[]
    const passives = (await getPassivePool()) as unknown as PassiveRow[]

    // 가챠 결과를 먼저 모두 결정 (랜덤). DB 쓰기는 트랜잭션 안에서 한 번에.
    type RolledItem = { slot: string; name: string; grade: string; mainValue: number; options: string[] }
    const rolled: RolledItem[] = []
    for (let i = 0; i < count; i++) {
      const grade = pickGrade(grades)
      const slot = pickSlot(slots)

      const excluded = new Set<string>((() => {
        try { return JSON.parse(slot.excluded) as string[] } catch { return [] }
      })())
      const used = new Set<string>()
      const optionLines: string[] = []

      // 메인 능력치: 슬롯의 주 능력(예: 무기 = 물리공격력)
      // stat_min~stat_max를 롤한 후 레벨당 +2% 보정 적용
      const mainAbility = abilities.find(a => a.name === slot.main_ability)
      const rawMainValue = randBetween(grade.stat_min, grade.stat_max)
      const levelMultiplier = 1 + (char.level - 1) * 0.02
      const mainValue = Math.round(rawMainValue * levelMultiplier)
      if (mainAbility) {
        optionLines.push(formatOpt(mainAbility.name, mainValue, mainAbility.unit || "Pt"))
        used.add(mainAbility.name)
      }

      // 서브 능력치 (BaseStat: STR/VIT/DEX/INT/LUK)
      // 비율: [0.5, 0.4] — 첫 번째가 두 번째보다 더 강함
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

      // 전투 능력치 (Combat: 공격력, 방어력, 치명타 등)
      // 비율: [1.0, 0.8] — 첫 번째가 두 번째보다 더 강함
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

      // 패시브 능력 ([더블어택], [생명흡수] 등)
      const passiveCount = parseCount(grade.passive_count)
      for (let j = 0; j < passiveCount; j++) {
        if (!passives.length) break
        const passive = passives[Math.floor(Math.random() * passives.length)]
        optionLines.push(`[${passive.name}]`)
        break
      }

      rolled.push({
        slot: slot.slot,
        name: `${grade.name} ${slot.name}`,
        grade: grade.grade,
        mainValue,
        options: optionLines,
      })
    }

    // 트랜잭션: 티켓 차감 + N개 INSERT atomic.
    // 차감은 conditional UPDATE라 race 시 한 쪽만 통과 → rollback.
    const client = getClient()
    const tx = await client.transaction("write")
    const insertedIds: number[] = []
    try {
      const upRes = await tx.execute({
        sql: "UPDATE character SET draw_tickets = draw_tickets - ? WHERE id=1 AND draw_tickets >= ?",
        args: [count, count],
      })
      if (upRes.rowsAffected === 0) {
        await tx.rollback()
        return NextResponse.json({ error: "뽑기권이 부족합니다" }, { status: 400 })
      }
      const t = now()
      for (const item of rolled) {
        const r = await tx.execute({
          sql: "INSERT INTO equipment (slot,name,grade,base_stat,options,roll_level,is_equipped,created_at) VALUES (?,?,?,?,?,?,0,?)",
          args: [item.slot, item.name, item.grade, item.mainValue, JSON.stringify(item.options), char.level, t],
        })
        insertedIds.push(Number(r.lastInsertRowid))
      }
      await tx.commit()
    } catch (e) {
      await tx.rollback()
      throw e
    }

    const results = rolled.map((item, i) => ({
      id: insertedIds[i],
      name: item.name,
      grade: item.grade,
      slot: item.slot,
      rollLevel: char.level,
      mainValue: item.mainValue,
      options: item.options,
    }))
    return NextResponse.json({ results })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
