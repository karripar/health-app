"use client";

import { useEffect, useState } from "react";
import {
  buildInsights,
  buildWeightTrend,
  calculateAverageWeeklyChange,
  estimateAdaptiveTdee,
  estimateTimeToTarget,
  getLatestWeight,
  roundTo,
  scaleNutrition,
  summarizeDay,
} from "@/lib/forge/calculations";
import { createDefaultState, createIdFactory } from "@/lib/forge/default-data";
import { loadState, saveState } from "@/lib/forge/db";
import { searchFineliFoods } from "@/lib/forge/fineli";
import {
  type Food,
  type FoodEntry,
  type ForgeState,
  type GoalType,
  type Language,
  type Meal,
} from "@/lib/forge/models";

import { labels } from "./labels";
import {
  getActivityLabel,
  getDailyActivityForDate,
  getTodayLog,
  getWeightEntryForToday,
  getWeightForDate,
  mergeFoods,
  todayKey,
} from "./helpers";
import { SetupForm } from "./forms/SetupForm";
import { TabNavigation } from "./tabs/TabNavigation";
import { TodayTab } from "./tabs/TodayTab";
import { FoodTab } from "./tabs/FoodTab";
import { ProgressTab } from "./tabs/ProgressTab";
import { MoreTab } from "./tabs/MoreTab";
import {
  TodayFinalizeSheet,
  type FinalizeDayDraft,
} from "./today-finish-sheet";

const makeFoodId = createIdFactory("food");
const makeEntryId = createIdFactory("entry");
const makeWeightId = createIdFactory("weight");
const makeMealId = createIdFactory("meal");
const makeMealItemId = createIdFactory("meal-item");

type TabKey = "today" | "food" | "progress" | "more";

export function ForgeApp() {
  const [state, setState] = useState<ForgeState>(() => createDefaultState());
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [isTodayFinalizeOpen, setIsTodayFinalizeOpen] = useState(false);
  const [foodQuery, setFoodQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [selectedFoodId, setSelectedFoodId] = useState("");
  const [selectedFoodGrams, setSelectedFoodGrams] = useState("100");
  const [isHydrated, setIsHydrated] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [showCustomFood, setShowCustomFood] = useState(false);
  const [showMealBuilder, setShowMealBuilder] = useState(false);
  const [mealName, setMealName] = useState("");
  const [mealDraft, setMealDraft] = useState<
    Array<{ foodId: string; grams: number }>
  >([]);
  const [customFood, setCustomFood] = useState({
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });
  const [setupForm, setSetupForm] = useState({
    name: "",
    sex: "male",
    age: "29",
    heightCm: "182",
    startWeightKg: "",
    targetWeightKg: "",
    goalType: "loss",
    weeklyRateKg: "0.35",
    averageDailySteps: "7000",
    gymSessionsPerWeek: "3",
    typicalGymDurationMinutes: "60",
    otherActivityName: "",
    otherActivitySessionsPerWeek: "0",
    otherActivityDurationMinutes: "0",
  });
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    tone: "success" | "info";
  } | null>(null);

  useEffect(() => {
    let active = true;

    const loadAppState = async () => {
      try {
        const loaded = await loadState();
        if (!active) {
          return;
        }

        setState(loaded);
        setSetupForm({
          name: loaded.profile.name,
          sex: loaded.profile.sex,
          age: String(loaded.profile.age),
          heightCm: String(loaded.profile.heightCm),
          startWeightKg: loaded.weightEntries[0]
            ? String(loaded.weightEntries[0].weightKg)
            : "",
          targetWeightKg: String(loaded.goal.targetWeightKg),
          goalType: loaded.goal.type,
          weeklyRateKg: String(loaded.goal.weeklyRateKg),
          averageDailySteps: String(loaded.activityProfile.averageDailySteps),
          gymSessionsPerWeek: String(loaded.activityProfile.gymSessionsPerWeek),
          typicalGymDurationMinutes: String(
            loaded.activityProfile.typicalGymDurationMinutes,
          ),
          otherActivityName:
            loaded.activityProfile.otherActivities[0]?.name ?? "",
          otherActivitySessionsPerWeek: String(
            loaded.activityProfile.otherActivities[0]?.sessionsPerWeek ?? 0,
          ),
          otherActivityDurationMinutes: String(
            loaded.activityProfile.otherActivities[0]?.durationMinutes ?? 0,
          ),
        });
        setIsHydrated(true);
      } catch {
        if (!active) {
          return;
        }

        const fallback = createDefaultState();
        setState(fallback);
        setSetupForm({
          name: fallback.profile.name,
          sex: fallback.profile.sex,
          age: String(fallback.profile.age),
          heightCm: String(fallback.profile.heightCm),
          startWeightKg: "",
          targetWeightKg: String(fallback.goal.targetWeightKg),
          goalType: fallback.goal.type,
          weeklyRateKg: String(fallback.goal.weeklyRateKg),
          averageDailySteps: String(fallback.activityProfile.averageDailySteps),
          gymSessionsPerWeek: String(
            fallback.activityProfile.gymSessionsPerWeek,
          ),
          typicalGymDurationMinutes: String(
            fallback.activityProfile.typicalGymDurationMinutes,
          ),
          otherActivityName: "",
          otherActivitySessionsPerWeek: "0",
          otherActivityDurationMinutes: "0",
        });
        setIsHydrated(true);
      }
    };

    void loadAppState();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    void saveState(state);
  }, [isHydrated, state]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setStatusMessage(null);
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [statusMessage]);

  const announceStatus = (
    text: string,
    tone: "success" | "info" = "success",
  ) => {
    setStatusMessage({ text, tone });
  };

  const updateState = (updater: (draft: ForgeState) => void) => {
    setState((current) => {
      const draft = structuredClone(current);
      updater(draft);
      return draft;
    });
  };

  const copy = labels[state.settings.language];
  const todayDate = todayKey();
  const todayLog = getTodayLog(state);
  const todayActivityAdjustment = getDailyActivityForDate(state, todayDate);
  const currentWeightEntry = getWeightEntryForToday(state);
  const latestWeight =
    getLatestWeight(state.weightEntries)?.weightKg ?? state.goal.targetWeightKg;
  const todaySummary = summarizeDay({
    log: todayLog,
    foods: state.foods,
    profile: state.profile,
    goal: state.goal,
    weightKg: latestWeight,
    activityProfile: state.activityProfile,
    dailyAdjustment: todayActivityAdjustment,
  });
  const calorieProgress = Math.max(
    0,
    Math.min(
      100,
      (todaySummary.consumedCalories /
        Math.max(1, todaySummary.targetCalories)) *
        100,
    ),
  );
  const quickFoods = [...state.foods]
    .filter((food) => food.saved || food.usageCount > 0)
    .sort(
      (a, b) =>
        b.usageCount - a.usageCount ||
        (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? ""),
    )
    .slice(0, 4);
  const foodsById = new Map(state.foods.map((food) => [food.id, food]));
  const adaptiveTdee = state.tdeeEstimate ?? estimateAdaptiveTdee(state);
  const averageWeeklyChange = calculateAverageWeeklyChange(state.weightEntries);
  const weightTrend = buildWeightTrend(state.weightEntries);
  const currentWeight = getLatestWeight(state.weightEntries)?.weightKg;
  const startingWeight = state.weightEntries[0]?.weightKg;
  const totalChange =
    currentWeight !== undefined && startingWeight !== undefined
      ? roundTo(currentWeight - startingWeight, 1)
      : null;
  const etaWeeks = estimateTimeToTarget({
    currentWeightKg: currentWeight,
    targetWeightKg: state.goal.targetWeightKg,
    averageWeeklyChangeKg: averageWeeklyChange,
  });
  const selectedFood = [...searchResults, ...state.foods].find(
    (food) => food.id === selectedFoodId,
  );
  const selectedFoodNutrition = selectedFood
    ? scaleNutrition(
        selectedFood.nutritionPer100g,
        Number(selectedFoodGrams) || selectedFood.defaultServingGrams,
      )
    : null;
  const todayFoodEntries = todayLog.foodEntries.map((entry) => {
    const food = foodsById.get(entry.foodId);
    const nutrition = food
      ? scaleNutrition(food.nutritionPer100g, entry.grams)
      : null;

    return {
      id: entry.id,
      name: food?.name ?? "Food",
      grams: entry.grams,
      calories: nutrition?.calories ?? 0,
      protein: nutrition?.protein ?? 0,
      carbs: nutrition?.carbs ?? 0,
      fat: nutrition?.fat ?? 0,
    };
  });
  const insights = buildInsights({
    ...state,
    tdeeEstimate: adaptiveTdee,
  }).slice(0, 2);
  const todayEstimate =
    todayLog.finalized && typeof todayLog.estimatedExpenditure === "number"
      ? todayLog.estimatedExpenditure
      : roundTo(todaySummary.deficitOrSurplus + todaySummary.consumedCalories);
  const todayCompleted = Boolean(todayLog.finalized);
  const activitySummaryLabel = todayCompleted
    ? getActivityLabel(
        copy,
        todayLog.activityLevel ?? todayActivityAdjustment.type,
      )
    : copy.normalActivityShort;
  const currentStepSummary =
    state.activityProfile.averageDailySteps.toLocaleString();
  const currentGymSummary = `${state.activityProfile.gymSessionsPerWeek}× gym/week`;

  const handleSetupSubmit = () => {
    const startWeightKg = Number(setupForm.startWeightKg);
    const targetWeightKg = Number(setupForm.targetWeightKg);
    const age = Number(setupForm.age);
    const heightCm = Number(setupForm.heightCm);
    const weeklyRateKg = Number(setupForm.weeklyRateKg);
    const averageDailySteps = Number(setupForm.averageDailySteps);
    const gymSessionsPerWeek = Number(setupForm.gymSessionsPerWeek);
    const typicalGymDurationMinutes = Number(
      setupForm.typicalGymDurationMinutes,
    );
    const otherActivitySessionsPerWeek = Number(
      setupForm.otherActivitySessionsPerWeek,
    );
    const otherActivityDurationMinutes = Number(
      setupForm.otherActivityDurationMinutes,
    );

    if (
      !setupForm.name.trim() ||
      !Number.isFinite(startWeightKg) ||
      !Number.isFinite(targetWeightKg) ||
      !Number.isFinite(age) ||
      !Number.isFinite(heightCm) ||
      !Number.isFinite(weeklyRateKg) ||
      !Number.isFinite(averageDailySteps) ||
      !Number.isFinite(gymSessionsPerWeek) ||
      !Number.isFinite(typicalGymDurationMinutes)
    ) {
      return;
    }

    updateState((draft) => {
      draft.profile.name = setupForm.name.trim();
      draft.profile.sex = setupForm.sex as "male" | "female";
      draft.profile.age = age;
      draft.profile.heightCm = heightCm;
      draft.goal.type = setupForm.goalType as GoalType;
      draft.goal.targetWeightKg = targetWeightKg;
      draft.goal.weeklyRateKg = weeklyRateKg;
      draft.activityProfile = {
        averageDailySteps: Math.max(0, averageDailySteps),
        gymSessionsPerWeek: Math.min(14, Math.max(0, gymSessionsPerWeek)),
        typicalGymDurationMinutes: Math.max(0, typicalGymDurationMinutes),
        otherActivities:
          setupForm.otherActivityName.trim() &&
          Number.isFinite(otherActivitySessionsPerWeek) &&
          Number.isFinite(otherActivityDurationMinutes)
            ? [
                {
                  name: setupForm.otherActivityName.trim(),
                  sessionsPerWeek: Math.max(0, otherActivitySessionsPerWeek),
                  durationMinutes: Math.max(0, otherActivityDurationMinutes),
                },
              ]
            : [],
      };
      draft.settings.hasCompletedOnboarding = true;
      draft.weightEntries = [
        {
          id: makeWeightId(),
          date: todayKey(),
          weightKg: startWeightKg,
          confirmed: true,
          loggedAt: new Date().toISOString(),
        },
      ];
      draft.tdeeEstimate = estimateAdaptiveTdee(draft);
    });
    announceStatus("Setup saved", "success");
  };

  const addFoodToToday = (food: Food, grams: number) => {
    updateState((draft) => {
      const log = getTodayLog(draft);
      log.foodEntries.unshift({
        id: makeEntryId(),
        foodId: food.id,
        grams,
        loggedAt: new Date().toISOString(),
      } satisfies FoodEntry);
      draft.dailyLogs = draft.dailyLogs.filter(
        (entry) => entry.date !== log.date,
      );
      draft.dailyLogs.unshift(log);
      draft.foods = mergeFoods(draft.foods, [
        {
          ...food,
          usageCount: food.usageCount + 1,
          lastUsedAt: new Date().toISOString(),
        },
      ]);
      draft.tdeeEstimate = estimateAdaptiveTdee(draft);
    });
    announceStatus(`Added ${food.name}`, "success");
  };

  const removeFoodEntry = (entryId: string) => {
    updateState((draft) => {
      const log = getTodayLog(draft);
      log.foodEntries = log.foodEntries.filter((entry) => entry.id !== entryId);
      draft.dailyLogs = draft.dailyLogs.filter(
        (entry) => entry.date !== log.date,
      );
      draft.dailyLogs.unshift(log);
      draft.tdeeEstimate = estimateAdaptiveTdee(draft);
    });
    announceStatus("Food entry removed", "success");
  };

  const confirmWeightForToday = (weightKg: number) => {
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      return false;
    }

    if (getWeightForDate(state.weightEntries, todayDate)) {
      announceStatus("Today's weight is already recorded", "info");
      return false;
    }

    updateState((draft) => {
      if (getWeightForDate(draft.weightEntries, todayDate)) {
        return;
      }

      draft.weightEntries.push({
        id: makeWeightId(),
        date: todayDate,
        weightKg,
        confirmed: true,
        loggedAt: new Date().toISOString(),
      });
      draft.tdeeEstimate = estimateAdaptiveTdee(draft);
    });
    announceStatus("Weight saved", "success");
    return true;
  };

  const confirmToday = (draft: FinalizeDayDraft) => {
    const existingWeightEntry = getWeightForDate(
      state.weightEntries,
      todayDate,
    );
    const finalWeightKg = existingWeightEntry?.weightKg ?? latestWeight;
    const summary = summarizeDay({
      log: {
        ...todayLog,
        activity: {
          steps: draft.steps,
          gymSession: draft.gymToday,
          gymDurationMinutes: draft.gymToday ? draft.gymDurationMinutes : 0,
          extraActivityMinutes: 0,
        },
      },
      foods: state.foods,
      profile: state.profile,
      goal: state.goal,
      weightKg: finalWeightKg,
      activityProfile: state.activityProfile,
      dailyAdjustment: {
        date: todayDate,
        type: draft.activityLevel,
        gymToday: draft.gymToday,
      },
    });

    updateState((draftState) => {
      const log = getTodayLog(draftState);
      log.activity = {
        steps: draft.steps,
        gymSession: draft.gymToday,
        gymDurationMinutes: draft.gymToday ? draft.gymDurationMinutes : 0,
        extraActivityMinutes: 0,
      };
      log.steps = draft.steps;
      log.activityLevel = draft.activityLevel;
      log.gymToday = draft.gymToday;
      log.caloriesConsumed = roundTo(summary.consumedCalories);
      log.estimatedExpenditure = roundTo(
        summary.deficitOrSurplus + summary.consumedCalories,
      );
      log.finalized = true;
      log.weightEntryId =
        getWeightForDate(draftState.weightEntries, todayDate)?.id ??
        existingWeightEntry?.id;

      draftState.dailyActivityAdjustments = [
        {
          date: todayDate,
          type: draft.activityLevel,
          gymToday: draft.gymToday,
        },
        ...draftState.dailyActivityAdjustments.filter(
          (adjustment) => adjustment.date !== todayDate,
        ),
      ];

      draftState.dailyLogs = draftState.dailyLogs.filter(
        (entry) => entry.date !== todayDate,
      );
      draftState.dailyLogs.unshift(log);
      draftState.tdeeEstimate = estimateAdaptiveTdee(draftState);
    });

    announceStatus("Today completed ✓", "success");
    setIsTodayFinalizeOpen(false);
    return true;
  };

  const handleSearch = async () => {
    const results = await searchFineliFoods(foodQuery);
    const fallbackUsed = results.some((food) =>
      food.id.startsWith("fallback-"),
    );

    setSearchResults(results);
    setSelectedFoodId(results[0]?.id ?? "");
    setSearchMessage(
      results.length
        ? fallbackUsed
          ? "Using local fallback results while Fineli is temporarily unavailable."
          : copy.noteFineli
        : copy.fineliFallback,
    );
    if (results.length) {
      updateState((draft) => {
        draft.foods = mergeFoods(draft.foods, results);
      });
    }
  };

  const saveSelectedFood = () => {
    if (!selectedFood) {
      return;
    }

    updateState((draft) => {
      draft.foods = mergeFoods(draft.foods, [
        {
          ...selectedFood,
          saved: true,
          source: selectedFood.source === "custom" ? "custom" : "saved",
        },
      ]);
    });
    announceStatus("Food saved", "success");
  };

  const addCustomFood = () => {
    const calories = Number(customFood.calories);
    const protein = Number(customFood.protein);
    const carbs = Number(customFood.carbs);
    const fat = Number(customFood.fat);

    if (
      !customFood.name.trim() ||
      [calories, protein, carbs, fat].some((value) => !Number.isFinite(value))
    ) {
      return;
    }

    updateState((draft) => {
      draft.foods.unshift({
        id: makeFoodId(),
        source: "custom",
        name: customFood.name.trim(),
        defaultServingGrams: 100,
        nutritionPer100g: { calories, protein, carbs, fat },
        saved: true,
        usageCount: 0,
      });
    });
    announceStatus("Custom food saved", "success");
    setCustomFood({ name: "", calories: "", protein: "", carbs: "", fat: "" });
    setShowCustomFood(false);
  };

  const addFoodToMealDraft = (food: Food) => {
    setMealDraft((current) => [
      ...current,
      { foodId: food.id, grams: food.defaultServingGrams },
    ]);
    if (!mealName) {
      setMealName(food.name);
    }
  };

  const saveMeal = () => {
    if (!mealName.trim() || !mealDraft.length) {
      return;
    }

    updateState((draft) => {
      draft.meals.unshift({
        id: makeMealId(),
        name: mealName.trim(),
        usageCount: 0,
        items: mealDraft.map((item) => ({ ...item, id: makeMealItemId() })),
      });
    });
    announceStatus("Meal saved", "success");
    setMealName("");
    setMealDraft([]);
    setShowMealBuilder(false);
  };

  const addMealToToday = (meal: Meal) => {
    updateState((draft) => {
      const log = getTodayLog(draft);
      const timestamp = new Date().toISOString();
      for (const item of meal.items) {
        log.foodEntries.unshift({
          id: makeEntryId(),
          foodId: item.foodId,
          grams: item.grams,
          loggedAt: timestamp,
        });
      }
      draft.dailyLogs = draft.dailyLogs.filter(
        (entry) => entry.date !== log.date,
      );
      draft.dailyLogs.unshift(log);
      draft.meals = draft.meals.map((entry) =>
        entry.id === meal.id
          ? {
              ...entry,
              usageCount: entry.usageCount + 1,
              lastUsedAt: timestamp,
            }
          : entry,
      );
      draft.tdeeEstimate = estimateAdaptiveTdee(draft);
    });
    announceStatus(`Added meal: ${meal.name}`, "success");
  };

  const updateProfile = (
    field: "name" | "age" | "heightCm" | "sex",
    value: string,
  ) => {
    updateState((draft) => {
      if (field === "sex") {
        draft.profile.sex = value as "male" | "female";
      } else if (field === "name") {
        draft.profile.name = value;
      } else {
        draft.profile[field] = Number(value);
      }
      draft.tdeeEstimate = estimateAdaptiveTdee(draft);
    });
  };

  const updateGoal = (
    field: "type" | "targetWeightKg" | "weeklyRateKg" | "manualCalorieTarget",
    value: string,
  ) => {
    updateState((draft) => {
      if (field === "type") {
        draft.goal.type = value as GoalType;
      } else if (field === "manualCalorieTarget") {
        draft.goal.manualCalorieTarget = value ? Number(value) : undefined;
      } else {
        draft.goal[field] = Number(value);
      }
    });
  };

  const handleSetupFormChange = (
    field: keyof typeof setupForm,
    value: string,
  ) => {
    setSetupForm((current) => ({ ...current, [field]: value }));
  };

  const handleActivityFieldUpdate = (field: string, value: string | number) => {
    updateState((draft) => {
      if (field === "averageDailySteps") {
        draft.activityProfile.averageDailySteps = Number(value);
      } else if (field === "gymSessionsPerWeek") {
        draft.activityProfile.gymSessionsPerWeek = Number(value);
      } else if (field === "typicalGymDurationMinutes") {
        draft.activityProfile.typicalGymDurationMinutes = Number(value);
      } else if (field === "otherActivityName") {
        const nextName = String(value).trim();
        const existing = draft.activityProfile.otherActivities[0] ?? {
          name: "",
          sessionsPerWeek: 0,
          durationMinutes: 0,
        };
        draft.activityProfile.otherActivities = nextName
          ? [{ ...existing, name: nextName }]
          : [];
      } else if (field === "otherActivitySessionsPerWeek") {
        const target = draft.activityProfile.otherActivities[0] ?? {
          name: "",
          sessionsPerWeek: 0,
          durationMinutes: 0,
        };
        draft.activityProfile.otherActivities = [
          {
            ...target,
            sessionsPerWeek: Number(value),
          },
        ];
      } else if (field === "otherActivityDurationMinutes") {
        const target = draft.activityProfile.otherActivities[0] ?? {
          name: "",
          sessionsPerWeek: 0,
          durationMinutes: 0,
        };
        draft.activityProfile.otherActivities = [
          {
            ...target,
            durationMinutes: Number(value),
          },
        ];
      }
    });
  };

  const toggleLanguage = (language: Language) => {
    updateState((draft) => {
      draft.settings.language = language;
    });
  };

  if (!state.settings.hasCompletedOnboarding) {
    return (
      <SetupForm
        copy={copy}
        form={setupForm}
        onChange={handleSetupFormChange}
        onSubmit={handleSetupSubmit}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-6 sm:max-w-4xl sm:px-6">
        {statusMessage ? (
          <div
            className={`mb-4 rounded-lg border px-3 py-2 text-sm ${statusMessage.tone === "success" ? "border-(--accent)/50 bg-(--accent)/10 text-(--accent)" : "border-(--border) bg-white/5 text-foreground"}`}
            role="status"
            aria-live="polite"
          >
            {statusMessage.text}
          </div>
        ) : null}
        <header className="mb-6 flex items-end justify-between gap-4 border-b border-(--border) pb-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-(--text-muted)">
              FORGE
            </div>
            <h1 className="mt-2 text-3xl font-medium tracking-tighter">
              {copy.todayFocus}
            </h1>
            <p className="mt-1 text-sm text-(--text-secondary)">
              {state.profile.name || "Athlete"}
            </p>
          </div>
          <div className="rounded-md border border-(--border) px-2.5 py-1.5 text-[10px] uppercase tracking-[0.18em] text-(--accent)">
            {todayLog.activity.gymSession ? copy.done : copy.planned}
          </div>
        </header>

        {activeTab === "today" ? (
          <TodayTab
            copy={copy}
            calorieProgress={calorieProgress}
            todaySummary={todaySummary}
            todayEstimate={todayEstimate}
            todayCompleted={todayCompleted}
            activitySummaryLabel={activitySummaryLabel}
            currentStepSummary={currentStepSummary}
            currentGymSummary={currentGymSummary}
            todayFoodEntries={todayFoodEntries}
            onRemoveFoodEntry={removeFoodEntry}
            onOpenFinalize={() => setIsTodayFinalizeOpen(true)}
          />
        ) : null}

        {activeTab === "food" ? (
          <FoodTab
            copy={copy}
            foodQuery={foodQuery}
            searchResults={searchResults}
            selectedFoodId={selectedFoodId}
            selectedFood={selectedFood ?? undefined}
            selectedFoodGrams={selectedFoodGrams}
            selectedFoodNutrition={selectedFoodNutrition}
            searchMessage={searchMessage}
            quickFoods={quickFoods}
            customFood={customFood}
            mealName={mealName}
            mealDraft={mealDraft}
            showCustomFood={showCustomFood}
            showMealBuilder={showMealBuilder}
            foodsById={foodsById}
            stateMeals={state.meals}
            onFoodQueryChange={setFoodQuery}
            onSearch={() => void handleSearch()}
            onClear={() => {
              setFoodQuery("");
              setSearchResults([]);
              setSelectedFoodId("");
              setSearchMessage("");
            }}
            onSelectFood={setSelectedFoodId}
            onChangeSelectedGrams={setSelectedFoodGrams}
            onSaveSelectedFood={saveSelectedFood}
            onBuildMeal={addFoodToMealDraft}
            onAddFoodToToday={addFoodToToday}
            onToggleCustomFood={() => setShowCustomFood((current) => !current)}
            onCustomFoodChange={(field, value) =>
              setCustomFood((current) => ({ ...current, [field]: value }))
            }
            onAddCustomFood={addCustomFood}
            onToggleMealBuilder={() =>
              setShowMealBuilder((current) => !current)
            }
            onMealNameChange={setMealName}
            onMealDraftChange={(index, grams) =>
              setMealDraft((current) =>
                current.map((entry, entryIndex) =>
                  entryIndex === index ? { ...entry, grams } : entry,
                ),
              )
            }
            onSaveMeal={saveMeal}
            onAddMealToToday={addMealToToday}
          />
        ) : null}

        {activeTab === "progress" ? (
          <ProgressTab
            copy={copy}
            currentWeight={currentWeight}
            startingWeight={startingWeight}
            totalChange={totalChange}
            etaWeeks={etaWeeks}
            weightTrend={weightTrend}
            adaptiveTdee={adaptiveTdee}
            averageWeeklyChange={averageWeeklyChange}
          />
        ) : null}

        {activeTab === "more" ? (
          <MoreTab
            copy={copy}
            state={state}
            insights={insights}
            onProfileUpdate={updateProfile}
            onGoalUpdate={updateGoal}
            onActivityUpdate={handleActivityFieldUpdate}
            onLanguageChange={toggleLanguage}
          />
        ) : null}

        <TodayFinalizeSheet
          key={`${todayDate}-${currentWeightEntry?.id ?? "none"}-${todayCompleted ? "1" : "0"}`}
          open={isTodayFinalizeOpen}
          completed={todayCompleted}
          copy={copy}
          date={todayDate}
          foods={state.foods}
          profile={state.profile}
          goal={state.goal}
          activityProfile={state.activityProfile}
          currentWeightKg={latestWeight}
          currentWeightEntry={currentWeightEntry}
          currentLog={todayLog}
          currentAdjustment={todayActivityAdjustment}
          onClose={() => setIsTodayFinalizeOpen(false)}
          onConfirmWeight={confirmWeightForToday}
          onConfirmDay={(draft) => confirmToday(draft)}
        />
      </div>

      <TabNavigation
        activeTab={activeTab}
        onChange={setActiveTab}
        copy={copy as Record<"today" | "food" | "progress" | "more", string>}
      />
    </div>
  );
}
