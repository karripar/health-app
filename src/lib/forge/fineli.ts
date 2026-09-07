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

function createId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)}`;
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
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
  const nutrition = nutritionFromObject(candidate);
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

async function requestCandidates(query: string) {
  const url = new URL("/api/fineli", window.location.origin);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "12");
  url.searchParams.set("lang", "en");

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const items = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(payload.results)
          ? payload.results
          : Array.isArray(payload.data)
            ? payload.data
            : [];

    const foods = items
      .flatMap((item) =>
        typeof item === "object" && item
          ? [normalizeFood(item as Record<string, unknown>)]
          : [],
      )
      .filter((item): item is Food => Boolean(item));

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

  const normalizedQuery = trimmed.toLowerCase();
  const matches = fallbackFineliFoods.filter((food) => {
    const haystack = `${food.name} ${food.brand ?? ""}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  const networkFoods = await requestCandidates(trimmed);
  if (networkFoods.length) {
    await saveCachedFoodSearch(trimmed, networkFoods);
    return networkFoods;
  }

  const cached = await loadCachedFoodSearch(trimmed);
  if (cached?.foods?.length) {
    return cached.foods;
  }

  return matches.length ? matches : [];
}
