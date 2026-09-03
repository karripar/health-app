import { openDB } from "idb";

import { createDefaultState } from "@/lib/forge/default-data";
import { type Food, type ForgeState } from "@/lib/forge/models";

const DB_NAME = "forge-local";
const DB_VERSION = 1;
const APP_STORE = "app-state";
const FOOD_CACHE_STORE = "food-cache";
const APP_STATE_KEY = "state";

interface CachedFoodSearch {
  query: string;
  foods: Food[];
  updatedAt: string;
}

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(APP_STORE)) {
        db.createObjectStore(APP_STORE);
      }
      if (!db.objectStoreNames.contains(FOOD_CACHE_STORE)) {
        db.createObjectStore(FOOD_CACHE_STORE, { keyPath: "query" });
      }
    },
  });
}

function normalizeState(state?: ForgeState): ForgeState {
  const fallback = createDefaultState();
  if (!state) {
    return fallback;
  }

  return {
    ...fallback,
    ...state,
    profile: {
      ...fallback.profile,
      ...state.profile,
    },
    goal: {
      ...fallback.goal,
      ...state.goal,
    },
    settings: {
      ...fallback.settings,
      ...state.settings,
      hasCompletedOnboarding:
        state.settings?.hasCompletedOnboarding ??
        Boolean(state.weightEntries?.length || state.profile?.name?.trim()),
    },
    foods: state.foods?.length ? state.foods : fallback.foods,
    meals: state.meals ?? fallback.meals,
    dailyLogs: state.dailyLogs ?? fallback.dailyLogs,
    weightEntries: state.weightEntries ?? fallback.weightEntries,
  };
}

export async function loadState() {
  const db = await getDb();
  const state = await db.get(APP_STORE, APP_STATE_KEY);
  return normalizeState(state as ForgeState | undefined);
}

export async function saveState(state: ForgeState) {
  const db = await getDb();
  await db.put(APP_STORE, state, APP_STATE_KEY);
}

export async function loadCachedFoodSearch(query: string) {
  const db = await getDb();
  return (await db.get(FOOD_CACHE_STORE, query.toLowerCase())) as
    | CachedFoodSearch
    | undefined;
}

export async function saveCachedFoodSearch(query: string, foods: Food[]) {
  const db = await getDb();
  const record: CachedFoodSearch = {
    query: query.toLowerCase(),
    foods,
    updatedAt: new Date().toISOString(),
  };
  await db.put(FOOD_CACHE_STORE, record);
}
