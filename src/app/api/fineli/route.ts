import { NextRequest, NextResponse } from "next/server";

const fallbackFineliFoods = [
  {
    id: "fallback-chicken-breast",
    name: "Chicken breast",
    brand: undefined,
    defaultServingGrams: 150,
    nutritionPer100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  },
  {
    id: "fallback-chicken-thigh",
    name: "Chicken thigh",
    defaultServingGrams: 150,
    nutritionPer100g: { calories: 209, protein: 26, carbs: 0, fat: 11 },
  },
  {
    id: "fallback-chicken-drumstick",
    name: "Chicken drumstick",
    defaultServingGrams: 150,
    nutritionPer100g: { calories: 184, protein: 24, carbs: 0, fat: 8.5 },
  },
  {
    id: "fallback-ground-chicken",
    name: "Ground chicken",
    defaultServingGrams: 100,
    nutritionPer100g: { calories: 197, protein: 19, carbs: 0, fat: 12 },
  },
  {
    id: "fallback-egg",
    name: "Egg",
    defaultServingGrams: 100,
    nutritionPer100g: { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  },
  {
    id: "fallback-greek-yogurt",
    name: "Greek yogurt",
    defaultServingGrams: 200,
    nutritionPer100g: { calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
  },
];

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

function normalizeItem(item: Record<string, unknown>) {
  const id = String(item.id ?? item.foodId ?? "");
  const name = String(
    item.name ?? item.foodName ?? item.label ?? item.description ?? "",
  ).trim();
  if (!id && !name) {
    return null;
  }

  const nutrition = item.nutrition as Record<string, unknown> | undefined;
  const raw = nutrition ?? item;

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

  return {
    id: id || name,
    name,
    brand: item.brand ? String(item.brand) : undefined,
    defaultServingGrams: toNumber(item.portionSize ?? item.servingSize) ?? 100,
    nutritionPer100g: { calories, protein, carbs, fat },
  };
}

async function fetchFineliCandidates(query: string) {
  const endpoints = [
    "https://fineli.fi/fineli/api/v1/foods",
    "https://fineli.fi/fineli/api/v1/food-items",
  ] as const;

  for (const baseUrl of endpoints) {
    const url = new URL(baseUrl);
    url.searchParams.set("q", query);
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

      const normalized = items
        .flatMap((item) =>
          typeof item === "object" && item
            ? [normalizeItem(item as Record<string, unknown>)]
            : [],
        )
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      if (normalized.length) {
        return normalized;
      }
    } catch {
      continue;
    }
  }

  return [];
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "12");
  const lang = request.nextUrl.searchParams.get("lang") ?? "en";

  if (!query) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const itemLimit = Number.isFinite(limit) && limit > 0 ? limit : 12;

  const items = await fetchFineliCandidates(query);
  const normalizedItems = items.length
    ? items
    : fallbackFineliFoods.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase()),
      );

  const limited = normalizedItems.slice(0, itemLimit).map((item) => ({
    ...item,
    source: "fineli",
    saved: false,
    usageCount: 0,
  }));

  return NextResponse.json({ items: limited, lang }, { status: 200 });
}
