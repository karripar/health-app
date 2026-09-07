import { loadCachedFoodSearch, saveCachedFoodSearch } from "@/lib/forge/db";
import { type Food, type NutritionFacts } from "@/lib/forge/models";

const fallbackFineliFoods: Food[] = [
  {
    id: "fallback-chicken-breast",
    source: "fineli",
    name: "Chicken breast",
    defaultServingGrams: 150,
    nutritionPer100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    usageCount: 0,
  },
  {
    id: "fallback-chicken-thigh",
    source: "fineli",
    name: "Chicken thigh",
    defaultServingGrams: 150,
    nutritionPer100g: { calories: 209, protein: 26, carbs: 0, fat: 11 },
    usageCount: 0,
  },
  {
    id: "fallback-chicken-drumstick",
    source: "fineli",
    name: "Chicken drumstick",
    defaultServingGrams: 150,
    nutritionPer100g: { calories: 184, protein: 24, carbs: 0, fat: 8.5 },
    usageCount: 0,
  },
  {
    id: "fallback-chicken-ground",
    source: "fineli",
    name: "Ground chicken",
    defaultServingGrams: 100,
    nutritionPer100g: { calories: 197, protein: 19, carbs: 0, fat: 12 },
    usageCount: 0,
  },
  {
    id: "fallback-egg",
    source: "fineli",
    name: "Egg",
    defaultServingGrams: 100,
    nutritionPer100g: { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
    usageCount: 0,
  },
  {
    id: "fallback-yogurt",
    source: "fineli",
    name: "Greek yogurt",
    defaultServingGrams: 200,
    nutritionPer100g: { calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
    usageCount: 0,
  },
  {
    id: "fallback-rice",
    source: "fineli",
    name: "White rice",
    defaultServingGrams: 150,
    nutritionPer100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
    usageCount: 0,
  },
  {
    id: "fallback-oats",
    source: "fineli",
    name: "Oats",
    defaultServingGrams: 40,
    nutritionPer100g: { calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9 },
    usageCount: 0,
  },
  {
    id: "fallback-banana",
    source: "fineli",
    name: "Banana",
    defaultServingGrams: 120,
    nutritionPer100g: { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
    usageCount: 0,
  },
  {
    id: "fallback-salmon",
    source: "fineli",
    name: "Salmon",
    defaultServingGrams: 150,
    nutritionPer100g: { calories: 208, protein: 20, carbs: 0, fat: 13 },
    usageCount: 0,
  },
];

let localFineliDatasetCache: Food[] | null = null;

function createId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)}`;
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.replace(/\s+/g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreFoodMatch(food: Food, query: string) {
  const tokens = normalizeSearchText(query).split(" ").filter(Boolean);

  if (!tokens.length) {
    return 0;
  }

  const haystack = normalizeSearchText(`${food.name} ${food.brand ?? ""}`);
  const name = normalizeSearchText(food.name);
  const brand = normalizeSearchText(food.brand ?? "");

  let score = 0;

  for (const token of tokens) {
    if (haystack === token) {
      score += 30;
    }
    if (haystack.startsWith(token)) {
      score += 16;
    }
    if (name.startsWith(token)) {
      score += 12;
    }
    if (name.includes(token)) {
      score += 10;
    }
    if (brand.includes(token)) {
      score += 8;
    }
    if (haystack.includes(token)) {
      score += 6;
    }
  }

  if (name.startsWith(tokens[0])) {
    score += 4;
  }

  return score;
}

function nutritionFromObject(
  candidate: Record<string, unknown>,
): NutritionFacts | null {
  const nutrition = candidate.nutrition as Record<string, unknown> | undefined;
  const nutrients =
    (candidate.nutrients as Array<Record<string, unknown>> | undefined) ??
    (nutrition?.nutrients as Array<Record<string, unknown>> | undefined);

  if (nutrients?.length) {
    const lookup = (nameCandidates: string[]) => {
      const match = nutrients.find((item) => {
        const key = String(
          item.name ?? item.nutrient ?? item.code ?? "",
        ).toLowerCase();
        return nameCandidates.some((candidateName) =>
          key.includes(candidateName),
        );
      });
      return toNumber(match?.value ?? match?.amount ?? match?.avg);
    };

    const calories = lookup(["energy", "kcal"]);
    const protein = lookup(["protein"]);
    const carbs = lookup(["carbohydrate", "carb"]);
    const fat = lookup(["fat"]);
    if (
      calories !== undefined &&
      protein !== undefined &&
      carbs !== undefined &&
      fat !== undefined
    ) {
      return { calories, protein, carbs, fat };
    }
  }

  const raw = nutrition ?? candidate;
  const calories = toNumber(
    raw.energyKcal ?? raw.energy ?? raw.kcal ?? raw.calories,
  );
  const protein = toNumber(raw.protein ?? raw.protein_g);
  const carbs = toNumber(
    raw.carbohydrate ?? raw.carbs ?? raw.carbohydrates ?? raw.carbohydrate_g,
  );
  const fat = toNumber(raw.fat ?? raw.fat_g);
  if (
    calories === undefined ||
    protein === undefined ||
    carbs === undefined ||
    fat === undefined
  ) {
    return null;
  }

  return { calories, protein, carbs, fat };
}

function normalizeFood(candidate: Record<string, unknown>): Food | null {
  const nutritionData =
    (candidate.nutritionPer100g as Record<string, unknown> | undefined) ??
    (candidate.nutrition as Record<string, unknown> | undefined) ??
    candidate;

  const normalizedCandidate = {
    ...candidate,
    nutrition: nutritionData,
  };

  const nutrition = nutritionFromObject(normalizedCandidate);
  if (!nutrition) {
    return null;
  }

  const name = String(
    candidate.name ??
      candidate.foodName ??
      candidate.label ??
      candidate.description ??
      "",
  ).trim();
  if (!name) {
    return null;
  }

  return {
    id: String(candidate.id ?? candidate.foodId ?? createId("fineli")),
    source: "fineli",
    name,
    brand: candidate.brand ? String(candidate.brand) : undefined,
    defaultServingGrams:
      toNumber(candidate.portionSize ?? candidate.servingSize) ?? 100,
    nutritionPer100g: nutrition,
    usageCount: 0,
  };
}

async function loadLocalFineliDataset() {
  if (localFineliDatasetCache) {
    return localFineliDatasetCache;
  }

  try {
    const response = await fetch("/data/fineli-dataset.json", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as unknown;
    const source = payload && typeof payload === "object" ? payload : {};
    const items = Array.isArray(payload)
      ? payload
      : Array.isArray((source as Record<string, unknown>).items)
        ? ((source as Record<string, unknown>).items as unknown[])
        : Array.isArray((source as Record<string, unknown>).results)
          ? ((source as Record<string, unknown>).results as unknown[])
          : [];

    const foods = items
      .flatMap((item) =>
        typeof item === "object" && item
          ? [normalizeFood(item as Record<string, unknown>)]
          : [],
      )
      .filter((item): item is Food => Boolean(item));

    localFineliDatasetCache = foods;
    return foods;
  } catch {
    return [];
  }
}

export async function searchFineliFoods(query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const normalizedQuery = normalizeSearchText(trimmed);
  const localFoods = await loadLocalFineliDataset();
  if (localFoods.length) {
    const ranked = localFoods
      .map((food) => ({ food, score: scoreFoodMatch(food, normalizedQuery) }))
      .filter((entry) => entry.score > 0)
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.food.name.localeCompare(right.food.name),
      )
      .map((entry) => entry.food);

    if (ranked.length) {
      const limited = ranked.slice(0, 20);
      await saveCachedFoodSearch(trimmed, limited);
      return limited;
    }
  }

  const cached = await loadCachedFoodSearch(trimmed);
  if (cached?.foods?.length) {
    return cached.foods.slice(0, 20);
  }

  const fallbackMatches = fallbackFineliFoods
    .map((food) => ({ food, score: scoreFoodMatch(food, normalizedQuery) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.food.name.localeCompare(right.food.name),
    )
    .map((entry) => entry.food);

  return fallbackMatches.length ? fallbackMatches.slice(0, 20) : [];
}
