import {
  type ActivityEntry,
  type DailyLog,
  type Food,
  type ForgeState,
  type Goal,
  type NutritionFacts,
  type TDEEEstimate,
  type UserProfile,
  type WeightEntry,
  type WeightTrendPoint,
} from "@/lib/forge/models";

const KCAL_PER_KG = 7700;

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function roundTo(value: number, precision = 0) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function calculateBmr(profile: UserProfile, weightKg: number) {
  const base = 10 * weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  return profile.sex === "male" ? base + 5 : base - 161;
}

export function calculateActivityCalories(activity: ActivityEntry) {
  const stepCalories = activity.steps * 0.04;
  const gymCalories = activity.gymSession ? activity.gymDurationMinutes * 6 : 0;
  const extraActivityCalories = activity.extraActivityMinutes * 4;
  return roundTo(stepCalories + gymCalories + extraActivityCalories);
}

export function calculateMacroTargets(
  targetCalories: number,
  weightKg: number,
) {
  const proteinGrams = Math.max(weightKg * 2, (targetCalories * 0.25) / 4);
  const fatGrams = Math.max(weightKg * 0.8, (targetCalories * 0.25) / 9);
  const remainingCalories = targetCalories - proteinGrams * 4 - fatGrams * 9;
  const carbGrams = Math.max(0, remainingCalories / 4);

  return {
    calories: roundTo(targetCalories),
    protein: roundTo(proteinGrams),
    carbs: roundTo(carbGrams),
    fat: roundTo(fatGrams),
  } satisfies NutritionFacts;
}

export function scaleNutrition(
  nutrition: NutritionFacts,
  grams: number,
): NutritionFacts {
  const ratio = grams / 100;
  return {
    calories: roundTo(nutrition.calories * ratio),
    protein: roundTo(nutrition.protein * ratio, 1),
    carbs: roundTo(nutrition.carbs * ratio, 1),
    fat: roundTo(nutrition.fat * ratio, 1),
    fiber: nutrition.fiber ? roundTo(nutrition.fiber * ratio, 1) : undefined,
    sugar: nutrition.sugar ? roundTo(nutrition.sugar * ratio, 1) : undefined,
    salt: nutrition.salt ? roundTo(nutrition.salt * ratio, 1) : undefined,
  };
}

export function sumNutrition(entries: NutritionFacts[]) {
  return entries.reduce<NutritionFacts>(
    (total, item) => ({
      calories: total.calories + item.calories,
      protein: total.protein + item.protein,
      carbs: total.carbs + item.carbs,
      fat: total.fat + item.fat,
      fiber: (total.fiber ?? 0) + (item.fiber ?? 0),
      sugar: (total.sugar ?? 0) + (item.sugar ?? 0),
      salt: (total.salt ?? 0) + (item.salt ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, salt: 0 },
  );
}

export function calculateCalorieTarget(params: {
  expenditure: number;
  goal: Goal;
}) {
  const { expenditure, goal } = params;

  if (
    typeof goal.manualCalorieTarget === "number" &&
    goal.manualCalorieTarget > 0
  ) {
    return roundTo(goal.manualCalorieTarget);
  }

  const rateDelta = (goal.weeklyRateKg * KCAL_PER_KG) / 7;
  if (goal.type === "loss") {
    return roundTo(expenditure - rateDelta);
  }
  if (goal.type === "gain") {
    return roundTo(expenditure + rateDelta);
  }
  return roundTo(expenditure);
}

export function getLatestWeight(weightEntries: WeightEntry[]) {
  return [...weightEntries]
    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
    .at(-1);
}

export function buildWeightTrend(weightEntries: WeightEntry[]) {
  const sorted = [...weightEntries].sort((a, b) =>
    a.loggedAt.localeCompare(b.loggedAt),
  );
  if (!sorted.length) {
    return [] as WeightTrendPoint[];
  }

  let trend = sorted[0].weightKg;
  return sorted.map((entry, index) => {
    trend = index === 0 ? entry.weightKg : trend * 0.75 + entry.weightKg * 0.25;
    return {
      date: entry.loggedAt.slice(0, 10),
      actual: roundTo(entry.weightKg, 1),
      trend: roundTo(trend, 1),
    } satisfies WeightTrendPoint;
  });
}

export function calculateAverageWeeklyChange(weightEntries: WeightEntry[]) {
  const trend = buildWeightTrend(weightEntries);
  if (trend.length < 2) {
    return null;
  }

  const first = trend[0];
  const last = trend.at(-1)!;
  const days = Math.max(1, differenceInDays(first.date, last.date));
  return roundTo(((last.trend - first.trend) / days) * 7, 2);
}

export function estimateTimeToTarget(params: {
  currentWeightKg?: number;
  targetWeightKg: number;
  averageWeeklyChangeKg: number | null;
}) {
  const { currentWeightKg, targetWeightKg, averageWeeklyChangeKg } = params;
  if (
    !currentWeightKg ||
    !averageWeeklyChangeKg ||
    averageWeeklyChangeKg === 0
  ) {
    return null;
  }

  const direction = targetWeightKg - currentWeightKg;
  if (Math.sign(direction) !== Math.sign(averageWeeklyChangeKg)) {
    return null;
  }

  const weeks = Math.abs(direction / averageWeeklyChangeKg);
  return Number.isFinite(weeks) ? roundTo(weeks, 1) : null;
}

export function estimateAdaptiveTdee(
  state: ForgeState,
): TDEEEstimate | undefined {
  const weightTrend = buildWeightTrend(state.weightEntries);
  if (weightTrend.length < 3 || state.dailyLogs.length < 14) {
    return undefined;
  }

  const sortedLogs = [...state.dailyLogs].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const recentLogs = sortedLogs.slice(-21);
  if (recentLogs.length < 14) {
    return undefined;
  }

  const foodsById = new Map(state.foods.map((food) => [food.id, food]));
  const averageIntake =
    recentLogs.reduce((sum, log) => {
      const dayCalories = log.foodEntries.reduce((total, entry) => {
        const food = foodsById.get(entry.foodId);
        return food
          ? total + scaleNutrition(food.nutritionPer100g, entry.grams).calories
          : total;
      }, 0);

      return sum + dayCalories;
    }, 0) / recentLogs.length;

  const startDate = recentLogs[0].date;
  const endDate = recentLogs.at(-1)!.date;
  const weightsInWindow = weightTrend.filter(
    (entry) => entry.date >= startDate && entry.date <= endDate,
  );
  if (weightsInWindow.length < 2) {
    return undefined;
  }

  const first = weightsInWindow[0];
  const last = weightsInWindow.at(-1)!;
  const days = Math.max(1, differenceInDays(first.date, last.date));
  const dailyWeightEnergy = ((last.trend - first.trend) * KCAL_PER_KG) / days;
  const estimate = averageIntake - dailyWeightEnergy;
  const confidence =
    recentLogs.length >= 21 && weightsInWindow.length >= 5
      ? "high"
      : recentLogs.length >= 16 && weightsInWindow.length >= 3
        ? "moderate"
        : "low";

  return {
    value: roundTo(estimate),
    confidence,
    basedOnDays: recentLogs.length,
    updatedAt: new Date().toISOString(),
  };
}

export function summarizeDay(params: {
  log: DailyLog;
  foods: Food[];
  profile: UserProfile;
  goal: Goal;
  weightKg: number;
}) {
  const foodsById = new Map(params.foods.map((food) => [food.id, food]));
  const macros = sumNutrition(
    params.log.foodEntries.flatMap((entry) => {
      const food = foodsById.get(entry.foodId);
      return food ? [scaleNutrition(food.nutritionPer100g, entry.grams)] : [];
    }),
  );
  const baseTdee = calculateBmr(params.profile, params.weightKg) * 1.2;
  const caloriesBurned = calculateActivityCalories(params.log.activity);
  const expenditure = baseTdee + caloriesBurned;
  const targetCalories = calculateCalorieTarget({
    expenditure,
    goal: params.goal,
  });
  const macroTargets = calculateMacroTargets(targetCalories, params.weightKg);

  return {
    targetCalories,
    consumedCalories: roundTo(macros.calories),
    remainingCalories: roundTo(targetCalories - macros.calories),
    caloriesBurned,
    deficitOrSurplus: roundTo(expenditure - macros.calories),
    macros,
    macroTargets,
  };
}

export function buildInsights(state: ForgeState) {
  const latestWeight = getLatestWeight(state.weightEntries)?.weightKg;
  const averageWeeklyChange = calculateAverageWeeklyChange(state.weightEntries);
  const tdee = state.tdeeEstimate ?? estimateAdaptiveTdee(state);
  const insights: string[] = [];

  if (typeof averageWeeklyChange === "number") {
    const direction = averageWeeklyChange < 0 ? "decreased" : "increased";
    insights.push(
      `Your average weight has ${direction} by approximately ${Math.abs(averageWeeklyChange).toFixed(2)} kg/week.`,
    );
  }

  if (tdee) {
    insights.push(
      `Your estimated TDEE appears to be approximately ${tdee.value.toLocaleString()} kcal/day.`,
    );
  }

  if (latestWeight) {
    const weeks = estimateTimeToTarget({
      currentWeightKg: latestWeight,
      targetWeightKg: state.goal.targetWeightKg,
      averageWeeklyChangeKg: averageWeeklyChange,
    });
    if (weeks) {
      insights.push(
        `At the current trend, your target weight is roughly ${weeks.toFixed(1)} weeks away.`,
      );
    }
  }

  return insights;
}

function differenceInDays(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
}
