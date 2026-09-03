import { type ForgeState } from "@/lib/forge/models";

function createId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)}`;
}

const starterFoods = [
  {
    id: "food-skyr",
    source: "saved" as const,
    name: "Skyr yogurt",
    defaultServingGrams: 200,
    nutritionPer100g: { calories: 62, protein: 11, carbs: 3.8, fat: 0.2 },
    saved: true,
    usageCount: 0,
  },
  {
    id: "food-oats",
    source: "saved" as const,
    name: "Rolled oats",
    defaultServingGrams: 60,
    nutritionPer100g: { calories: 372, protein: 13, carbs: 58, fat: 7 },
    saved: true,
    usageCount: 0,
  },
  {
    id: "food-chicken",
    source: "saved" as const,
    name: "Chicken breast",
    defaultServingGrams: 180,
    nutritionPer100g: { calories: 120, protein: 23, carbs: 0, fat: 2.6 },
    saved: true,
    usageCount: 0,
  },
  {
    id: "food-rice",
    source: "saved" as const,
    name: "Cooked rice",
    defaultServingGrams: 180,
    nutritionPer100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
    saved: true,
    usageCount: 0,
  },
];

export function createDefaultState(): ForgeState {
  return {
    profile: {
      id: "profile-default",
      name: "",
      sex: "male",
      age: 29,
      heightCm: 182,
    },
    goal: {
      type: "loss",
      targetWeightKg: 82,
      weeklyRateKg: 0.35,
    },
    settings: {
      language: "en",
      macroSplit: {
        proteinRatio: 0.3,
        carbRatio: 0.45,
        fatRatio: 0.25,
      },
      hasCompletedOnboarding: false,
    },
    foods: starterFoods,
    meals: [],
    dailyLogs: [],
    weightEntries: [],
  };
}

export function createIdFactory(prefix: string) {
  return () => createId(prefix);
}
