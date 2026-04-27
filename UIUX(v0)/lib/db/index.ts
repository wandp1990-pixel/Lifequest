export { getClient } from "./client"
export type { Character } from "./types"
export { initDb } from "./schema"

export { getCharacter, updateCharacter, incrementTaskCount } from "./queries/character"
export { addActivityLog, getRecentActivities } from "./queries/activity"
export {
  getChecklistItems, addChecklistLog, addChecklistItem,
  deleteChecklistItem, getTodayCheckedItemIds,
  updateChecklistStreak, streakBonusExp,
} from "./queries/checklist"
export { getTodoItems, addTodoItem, completeTodoItem, deleteTodoItem, updateTodoExp } from "./queries/todo"
export {
  getRoutines, addRoutine, addRoutineItem,
  deleteRoutine, deleteRoutineItem, checkRoutineItem,
  reorderRoutineItems,
} from "./queries/routine"
export { getEquipment, addEquipment, equipItem, unequipItem, deleteEquipment } from "./queries/equipment"
export { addBattleLog } from "./queries/battle"
export { getGameConfig, getGameConfigFull, updateGameConfigValue, getBattleConfig, getBattleConfigFull, updateBattleConfigValue } from "./queries/config"
export { getActivePrompt, updatePromptContent } from "./queries/prompt"
export { getItemGrades, getItemSlots, getAbilityPool, getPassivePool } from "./queries/items"
export { getSkillsWithInvestment, saveSkillInvestments } from "./queries/skills"
export type { SkillRow } from "./queries/skills"
export { getTodayAttendance, checkAttendance } from "./queries/attendance"
