export type Sex = "male" | "female";

export type GoalType = "loss" | "maintenance" | "gain";

export type Language = "en" | "fi";

export type FoodSource = "fineli" | "custom" | "saved";

export interface MacroSplit {
  proteinRatio: number;
  carbRatio: number;
  fatRatio: number;
}

export interface NutritionFacts {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  salt?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
}

export interface Goal {
  type: GoalType;
  targetWeightKg: number;
  weeklyRateKg: number;
  manualCalorieTarget?: number;
}

export interface Food {
  id: string;
  source: FoodSource;
  name: string;
  brand?: string;
  defaultServingGrams: number;
  nutritionPer100g: NutritionFacts;
  saved?: boolean;
  lastUsedAt?: string;
  usageCount: number;
}

export interface FoodEntry {
  id: string;
  foodId: string;
  grams: number;
  loggedAt: string;
}

export interface ActivityEntry {
  steps: number;
  gymSession: boolean;
  gymDurationMinutes: number;
  extraActivityMinutes: number;
}

export interface DailyLog {
  date: string;
  foodEntries: FoodEntry[];
  activity: ActivityEntry;
}

export interface MealItem {
  id: string;
  foodId: string;
  grams: number;
}

export interface Meal {
  id: string;
  name: string;
  items: MealItem[];
  lastUsedAt?: string;
  usageCount: number;
}

export interface WeightEntry {
  id: string;
  weightKg: number;
  loggedAt: string;
}

export interface TDEEEstimate {
  value: number;
  confidence: "low" | "moderate" | "high";
  basedOnDays: number;
  updatedAt: string;
}

export interface Settings {
  language: Language;
  macroSplit: MacroSplit;
  hasCompletedOnboarding: boolean;
}

export interface ForgeState {
  profile: UserProfile;
  goal: Goal;
  settings: Settings;
  foods: Food[];
  meals: Meal[];
  dailyLogs: DailyLog[];
  weightEntries: WeightEntry[];
  tdeeEstimate?: TDEEEstimate;
}

export interface WeightTrendPoint {
  date: string;
  actual: number;
  trend: number;
}

export interface DaySummary {
  targetCalories: number;
  consumedCalories: number;
  remainingCalories: number;
  caloriesBurned: number;
  deficitOrSurplus: number;
  macros: NutritionFacts;
  macroTargets: NutritionFacts;
}
