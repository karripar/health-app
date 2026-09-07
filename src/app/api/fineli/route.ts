import { promises as fs } from "node:fs";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreMatch(entry: Record<string, unknown>, query: string) {
  const tokens = normalizeSearchText(query).split(" ").filter(Boolean);

  if (!tokens.length) {
    return 0;
  }

  const name = normalizeSearchText(String(entry.name ?? ""));
  const brand = normalizeSearchText(String(entry.brand ?? ""));
  const haystack = `${name} ${brand}`;

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

async function readLocalFineliDataset() {
  const filePath = path.join(
    process.cwd(),
    "public",
    "data",
    "fineli-dataset.json",
  );

  try {
    const fileText = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(fileText) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "12");
  const lang = request.nextUrl.searchParams.get("lang") ?? "en";

  if (!rawQuery) {
    return NextResponse.json({ items: [], lang }, { status: 200 });
  }

  const itemLimit = Number.isFinite(limit) && limit > 0 ? limit : 12;
  const dataset = await readLocalFineliDataset();
  const normalizedQuery = normalizeSearchText(rawQuery);

  const items = dataset
    .filter((entry) => {
      if (!entry || typeof entry !== "object") {
        return false;
      }

      return scoreMatch(entry as Record<string, unknown>, normalizedQuery) > 0;
    })
    .map((entry) => ({
      entry: entry as Record<string, unknown>,
      score: scoreMatch(entry as Record<string, unknown>, normalizedQuery),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, itemLimit)
    .map(({ entry }) => ({
      ...entry,
      source: "fineli",
      saved: false,
      usageCount: 0,
    }));

  return NextResponse.json({ items, lang }, { status: 200 });
}
