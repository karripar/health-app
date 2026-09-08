import {
  sumNutrition,
  scaleNutrition,
  roundTo,
  getWeightForDate as getWeightForDateFromCalculations,
} from "@/lib/forge/calculations";
import {
  type DailyLog,
  type Food,
  type ForgeState,
  type Meal,
  type WeightEntry,
} from "@/lib/forge/models";

export type ActivityLevel = "less" | "normal" | "more";

export function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatSigned(value: number, suffix = "") {
  const rounded = roundTo(value, 1);
  const prefix = rounded > 0 ? "+" : "";
  return `${prefix}${rounded.toLocaleString()}${suffix}`;
}

export function formatWeightLabel(weightKg: number) {
  return `${roundTo(weightKg, 1).toFixed(1)} kg`;
}

export function formatFoodDisplayName(name: string) {
  const value = name.replace(/\s+/g, " ").trim();
  if (!value) {
    return value;
  }

  if (value === value.toUpperCase() && /[A-Z]/.test(value)) {
    return value
      .toLowerCase()
      .replace(
        /(^|\s|[-/()])([a-z0-9])/g,
        (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`,
      );
  }

  return value;
}

export function mergeFoods(existing: Food[], incoming: Food[]) {
  const map = new Map(existing.map((food) => [food.id, food]));
  for (const food of incoming) {
    map.set(
      food.id,
      map.get(food.id) ? { ...map.get(food.id)!, ...food } : food,
    );
  }
  return [...map.values()];
}

export function getTodayLog(state: ForgeState): DailyLog {
  return (
    state.dailyLogs.find((log) => log.date === todayKey()) ?? {
      date: todayKey(),
      foodEntries: [],
      activity: {
        steps: 0,
        gymSession: false,
        gymDurationMinutes: 0,
        extraActivityMinutes: 0,
      },
    }
  );
}

export function upsertTodayLog(draft: ForgeState, log: DailyLog) {
  const index = draft.dailyLogs.findIndex((entry) => entry.date === log.date);
  if (index === -1) {
    draft.dailyLogs.unshift(log);
  } else {
    draft.dailyLogs[index] = log;
  }
}

export function mealNutrition(meal: Meal, foods: Food[]) {
  const foodsById = new Map(foods.map((food) => [food.id, food]));
  return sumNutrition(
    meal.items.flatMap((item) => {
      const food = foodsById.get(item.foodId);
      return food ? [scaleNutrition(food.nutritionPer100g, item.grams)] : [];
    }),
  );
}

export function getActivityLabel(
  copy: { lessActive: string; moreActive: string; normalActivity: string },
  level: ActivityLevel,
) {
  if (level === "less") {
    return copy.lessActive;
  }
  if (level === "more") {
    return copy.moreActive;
  }
  return copy.normalActivity;
}

export function getWeightEntryForToday(state: ForgeState) {
  return getWeightForDateFromCalculations(state.weightEntries, todayKey());
}

export function getWeightForDate(entries: WeightEntry[], date: string) {
  return getWeightForDateFromCalculations(entries, date);
}

export function getDailyActivityForDate(state: ForgeState, date: string) {
  return (
    state.dailyActivityAdjustments.find(
      (adjustment) => adjustment.date === date,
    ) ?? {
      date,
      type: "normal" as const,
      gymToday: undefined,
    }
  );
}
