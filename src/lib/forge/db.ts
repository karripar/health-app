import { openDB } from "idb";

import { createDefaultState } from "@/lib/forge/default-data";
import { type Food, type ForgeState } from "@/lib/forge/models";

const DB_NAME = "forge-local";
const DB_VERSION = 1;
const APP_STORE = "app-state";
const FOOD_CACHE_STORE = "food-cache";
const APP_STATE_KEY = "state";
const MAX_SEARCH_CACHE_ENTRIES = 75;

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
    activityProfile: {
      ...fallback.activityProfile,
      ...state.activityProfile,
      otherActivities:
        state.activityProfile?.otherActivities ??
        fallback.activityProfile.otherActivities,
    },
    foods: state.foods?.length ? state.foods : fallback.foods,
    meals: state.meals ?? fallback.meals,
    dailyLogs: state.dailyLogs ?? fallback.dailyLogs,
    dailyActivityAdjustments:
      state.dailyActivityAdjustments ?? fallback.dailyActivityAdjustments,
    weightEntries: state.weightEntries ?? fallback.weightEntries,
  };
}

export async function loadState() {
  const db = await getDb();
  const state = await db.get(APP_STORE, APP_STATE_KEY);
  return normalizeState(state as ForgeState | undefined);
}

export async function saveState(state: ForgeState) {
  try {
    const db = await getDb();
    await db.put(APP_STORE, state, APP_STATE_KEY);
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "QuotaExceededError") {
      return;
    }
    throw error;
  }
}

export async function loadCachedFoodSearch(query: string) {
  const db = await getDb();
  return (await db.get(FOOD_CACHE_STORE, query.toLowerCase())) as
    | CachedFoodSearch
    | undefined;
}

export async function saveCachedFoodSearch(query: string, foods: Food[]) {
  try {
    const db = await getDb();
    const record: CachedFoodSearch = {
      query: query.toLowerCase(),
      foods,
      updatedAt: new Date().toISOString(),
    };
    await db.put(FOOD_CACHE_STORE, record);

    const cachedRecords = await db.getAll(FOOD_CACHE_STORE);
    if (cachedRecords.length <= MAX_SEARCH_CACHE_ENTRIES) {
      return;
    }

    const oldest = cachedRecords
      .sort(
        (left, right) =>
          new Date(left.updatedAt).getTime() -
          new Date(right.updatedAt).getTime(),
      )
      .slice(0, cachedRecords.length - MAX_SEARCH_CACHE_ENTRIES);

    await Promise.all(
      oldest.map((entry) => db.delete(FOOD_CACHE_STORE, entry.query)),
    );
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "QuotaExceededError") {
      return;
    }
    throw error;
  }
}
