import { loadCachedFoodSearch, saveCachedFoodSearch } from "@/lib/forge/db";
import { type Food, type NutritionFacts } from "@/lib/forge/models";

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
  const endpoints = [
    ["https://fineli.fi/fineli/api/v1/foods", ["search", query]],
    ["https://fineli.fi/fineli/api/v1/foods", ["q", query]],
    ["https://fineli.fi/fineli/api/v1/food-items", ["search", query]],
    ["https://fineli.fi/fineli/api/v1/food-items", ["q", query]],
  ] as const;

  for (const [baseUrl, [param, value]] of endpoints) {
    const url = new URL(baseUrl);
    url.searchParams.set(param, value);
    url.searchParams.set("limit", "12");
    url.searchParams.set("lang", "en");

    try {
      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as unknown;
      const items = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as Record<string, unknown>).items)
          ? ((payload as Record<string, unknown>).items as unknown[])
          : Array.isArray((payload as Record<string, unknown>).results)
            ? ((payload as Record<string, unknown>).results as unknown[])
            : Array.isArray((payload as Record<string, unknown>).data)
              ? ((payload as Record<string, unknown>).data as unknown[])
              : [];

      const foods = items
        .flatMap((item) =>
          typeof item === "object" && item
            ? [normalizeFood(item as Record<string, unknown>)]
            : [],
        )
        .filter((item): item is Food => Boolean(item));

      if (foods.length) {
        return foods;
      }
    } catch {
      continue;
    }
  }

  return [];
}

export async function searchFineliFoods(query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const networkFoods = await requestCandidates(trimmed);
  if (networkFoods.length) {
    await saveCachedFoodSearch(trimmed, networkFoods);
    return networkFoods;
  }

  const cached = await loadCachedFoodSearch(trimmed);
  return cached?.foods ?? [];
}
