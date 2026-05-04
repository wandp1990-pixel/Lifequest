export { getClient } from "./client"
export type { Character } from "./types"
export { initDb, initDbSchemaOnly } from "./schema"

export { getCharacter, updateCharacter, incrementTaskCount } from "./queries/character"
export { addActivityLog, getRecentActivities } from "./queries/activity"
export {
  getChecklistItems, addChecklistLog, addChecklistItem,
  deleteChecklistItem, getTodayCheckedItemIds,
  updateChecklistStreak, streakBonusExp, updateChecklistItemName,
} from "./queries/checklist"
export { getTodoItems, cleanupCompletedTodos, addTodoItem, completeTodoItem, deleteTodoItem, updateTodoExp, updateTodoName } from "./queries/todo"
export {
  getRoutines, addRoutine, addRoutineItem,
  deleteRoutine, deleteRoutineItem, checkRoutineItem,
  reorderRoutineItems, updateRoutineDeadline,
  updateRoutineName, updateRoutineItemName,
} from "./queries/routine"
export { getEquipment, addEquipment, equipItem, unequipItem, deleteEquipment } from "./queries/equipment"
export { addBattleLog } from "./queries/battle"
export { getGameConfig, getGameConfigFull, updateGameConfigValue, getBattleConfig, getBattleConfigFull, updateBattleConfigValue } from "./queries/config"
export { getActivePrompt, updatePromptContent } from "./queries/prompt"
export { getItemGrades, getItemSlots, getAbilityPool, getPassivePool } from "./queries/items"
export { getSkillsWithInvestment, saveSkillInvestments, getAllSkillsDb, createSkillDb, updateSkillDb, deleteSkillDb } from "./queries/skills"
export type { SkillRow, SkillDbRow } from "./queries/skills"
export { getTodayAttendance, checkAttendance } from "./queries/attendance"
export {
  savePushSubscription, deletePushSubscription, getAllPushSubscriptions,
  updateChecklistNotifyTime, updateTodoNotifyTime,
  getPendingHabitNotifications, getPendingTodoNotifications,
} from "./queries/push"
