"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  buildInsights,
  buildWeightTrend,
  calculateActivityCalories,
  calculateAverageWeeklyChange,
  calculateBmr,
  estimateAdaptiveTdee,
  estimateTimeToTarget,
  getLatestWeight,
  roundTo,
  scaleNutrition,
  summarizeDay,
  sumNutrition,
} from "@/lib/forge/calculations";
import { createDefaultState, createIdFactory } from "@/lib/forge/default-data";
import { loadState, saveState } from "@/lib/forge/db";
import { searchFineliFoods } from "@/lib/forge/fineli";
import {
  type ActivityEntry,
  type DailyLog,
  type Food,
  type FoodEntry,
  type ForgeState,
  type GoalType,
  type Language,
  type Meal,
} from "@/lib/forge/models";

type TabKey = "today" | "food" | "progress" | "more";

const makeFoodId = createIdFactory("food");
const makeEntryId = createIdFactory("entry");
const makeWeightId = createIdFactory("weight");
const makeMealId = createIdFactory("meal");
const makeMealItemId = createIdFactory("meal-item");

const labels = {
  en: {
    today: "Today",
    food: "Food",
    progress: "Progress",
    more: "More",
    setupTitle: "Set up your baseline",
    setupCopy:
      "Enter your profile and starting weight before using the dashboard.",
    finishSetup: "Finish setup",
    calorieTarget: "Target",
    consumed: "Consumed",
    remaining: "Remaining",
    quickAdd: "Quick add",
    recentEntries: "Logged today",
    emptyEntries: "No food logged yet.",
    foodSearch: "Search foods",
    search: "Search",
    addToToday: "Add to today",
    remove: "Remove",
    saveFood: "Save food",
    savedFoods: "Saved foods",
    customFood: "Custom food",
    meals: "Meals",
    buildMeal: "Build meal",
    saveMeal: "Save meal",
    calories: "Calories",
    protein: "Protein",
    carbs: "Carbs",
    fat: "Fat",
    steps: "Steps",
    gym: "Gym",
    duration: "Gym min",
    extraActivity: "Extra min",
    deficitOrSurplus: "Balance",
    activityBurn: "Activity burn",
    currentWeight: "Current",
    startWeight: "Starting",
    targetWeight: "Target",
    totalChange: "Change",
    estimatedTime: "ETA",
    averageWeeklyChange: "Weekly trend",
    bodyweightTrend: "Bodyweight trend",
    adaptiveTdee: "Adaptive TDEE",
    basedOn: "Based on",
    confidence: "Confidence",
    insights: "Insights",
    noData: "Add more data to unlock this estimate.",
    profile: "Profile",
    settings: "Settings",
    english: "English",
    finnish: "Finnish",
    goalType: "Goal",
    maintenance: "Maintenance",
    loss: "Loss",
    gain: "Gain",
    manualCalories: "Manual calories",
    weeklyRate: "Weekly rate",
    height: "Height (cm)",
    age: "Age",
    sex: "Sex",
    male: "Male",
    female: "Female",
    name: "Name",
    save: "Save",
    addWeight: "Add weight",
    noteFineli: "Fineli results are cached locally when available.",
    fineliFallback:
      "Live Fineli results are unavailable right now. Saved foods still work offline.",
    mealName: "Meal name",
    open: "Open",
    hide: "Hide",
    firstWeight: "Starting weight (kg)",
    todayFocus: "Today",
    done: "Done",
    planned: "Planned",
  },
  fi: {
    today: "Tänään",
    food: "Ruoka",
    progress: "Edistyminen",
    more: "Lisää",
    setupTitle: "Aseta lähtötiedot",
    setupCopy: "Syötä profiili ja aloituspaino ennen dashboardin käyttöä.",
    finishSetup: "Tallenna tiedot",
    calorieTarget: "Tavoite",
    consumed: "Syöty",
    remaining: "Jäljellä",
    quickAdd: "Pikalisäys",
    recentEntries: "Merkinnät tänään",
    emptyEntries: "Ruokia ei ole vielä kirjattu.",
    foodSearch: "Hae ruokia",
    search: "Hae",
    addToToday: "Lisää tälle päivälle",
    remove: "Poista",
    saveFood: "Tallenna ruoka",
    savedFoods: "Tallennetut ruoat",
    customFood: "Oma ruoka",
    meals: "Ateriat",
    buildMeal: "Rakenna ateria",
    saveMeal: "Tallenna ateria",
    calories: "Kalorit",
    protein: "Proteiini",
    carbs: "Hiilarit",
    fat: "Rasva",
    steps: "Askeleet",
    gym: "Sali",
    duration: "Salimin",
    extraActivity: "Lisämin",
    deficitOrSurplus: "Tase",
    activityBurn: "Aktiivisuus",
    currentWeight: "Nykyinen",
    startWeight: "Aloitus",
    targetWeight: "Tavoite",
    totalChange: "Muutos",
    estimatedTime: "Arvio",
    averageWeeklyChange: "Viikkotrendi",
    bodyweightTrend: "Painotrendi",
    adaptiveTdee: "Mukautuva TDEE",
    basedOn: "Perustuu",
    confidence: "Luottamus",
    insights: "Huomiot",
    noData: "Lisää dataa saadaksesi arvion.",
    profile: "Profiili",
    settings: "Asetukset",
    english: "Englanti",
    finnish: "Suomi",
    goalType: "Tavoite",
    maintenance: "Ylläpito",
    loss: "Pudotus",
    gain: "Nousu",
    manualCalories: "Manuaaliset kalorit",
    weeklyRate: "Viikkotahti",
    height: "Pituus (cm)",
    age: "Ikä",
    sex: "Sukupuoli",
    male: "Mies",
    female: "Nainen",
    name: "Nimi",
    save: "Tallenna",
    addWeight: "Lisää paino",
    noteFineli: "Fineli-tulokset tallennetaan paikallisesti kun niitä saadaan.",
    fineliFallback:
      "Finelin livetuloksia ei saatu juuri nyt. Tallennetut ruoat toimivat silti offline-tilassa.",
    mealName: "Aterian nimi",
    open: "Avaa",
    hide: "Piilota",
    firstWeight: "Aloituspaino (kg)",
    todayFocus: "Tänään",
    done: "Tehty",
    planned: "Suunniteltu",
  },
} as const;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatSigned(value: number, suffix = "") {
  const rounded = roundTo(value, 1);
  const prefix = rounded > 0 ? "+" : "";
  return `${prefix}${rounded.toLocaleString()}${suffix}`;
}

function formatFoodDisplayName(name: string) {
  const value = name.replace(/\s+/g, " ").trim();
  if (!value) {
    return value;
  }

  if (value === value.toUpperCase() && /[A-Z]/.test(value)) {
    return value
      .toLowerCase()
      .replace(
        /(^|\s|[-/()])([a-z0-9])/g,
        (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`,
      );
  }

  return value;
}

function mergeFoods(existing: Food[], incoming: Food[]) {
  const map = new Map(existing.map((food) => [food.id, food]));
  for (const food of incoming) {
    map.set(
      food.id,
      map.get(food.id) ? { ...map.get(food.id)!, ...food } : food,
    );
  }
  return [...map.values()];
}

function getTodayLog(state: ForgeState): DailyLog {
  return (
    state.dailyLogs.find((log) => log.date === todayKey()) ?? {
      date: todayKey(),
      foodEntries: [],
      activity: {
        steps: 0,
        gymSession: false,
        gymDurationMinutes: 0,
        extraActivityMinutes: 0,
      },
    }
  );
}

function upsertTodayLog(draft: ForgeState, log: DailyLog) {
  const index = draft.dailyLogs.findIndex((entry) => entry.date === log.date);
  if (index === -1) {
    draft.dailyLogs.unshift(log);
  } else {
    draft.dailyLogs[index] = log;
  }
}

function mealNutrition(meal: Meal, foods: Food[]) {
  const foodsById = new Map(foods.map((food) => [food.id, food]));
  return sumNutrition(
    meal.items.flatMap((item) => {
      const food = foodsById.get(item.foodId);
      return food ? [scaleNutrition(food.nutritionPer100g, item.grams)] : [];
    }),
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="border-t border-(--border) py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-(--text-muted)">
        {label}
      </div>
      <div className="mt-2 text-2xl font-medium tracking-[-0.05em] text-foreground">
        {value}
      </div>
      {helper ? (
        <div className="mt-1 text-xs text-(--text-secondary)">{helper}</div>
      ) : null}
    </div>
  );
}

function MacroRow({
  label,
  value,
  target,
}: {
  label: string;
  value: number;
  target: number;
}) {
  const percentage = Math.min(100, target > 0 ? (value / target) * 100 : 0);

  return (
    <div className="border-t border-(--border) py-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-(--text-secondary)">{label}</span>
        <span className="text-foreground">
          {roundTo(value)} / {roundTo(target)} g
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-(--accent)"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function Button({
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      type={type}
      className={`min-h-11 rounded-lg border border-(--border) px-3 text-sm font-medium text-foreground transition-colors active:scale-[0.99] ${className}`}
    />
  );
}

function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-h-11 w-full rounded-lg border border-(--border) bg-transparent px-3 text-foreground outline-none placeholder:text-(--text-muted) focus:border-(--accent) ${className}`}
    />
  );
}

function Select({
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`min-h-11 w-full rounded-lg border border-(--border) bg-transparent px-3 text-foreground outline-none focus:border-(--accent) ${className}`}
    />
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2 text-xs uppercase tracking-[0.12em] text-(--text-muted)">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function ForgeApp() {
  const [state, setState] = useState<ForgeState>(() => createDefaultState());
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [foodQuery, setFoodQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [selectedFoodId, setSelectedFoodId] = useState("");
  const [selectedFoodGrams, setSelectedFoodGrams] = useState("100");
  const [searchMessage, setSearchMessage] = useState("");
  const [weightInput, setWeightInput] = useState("");
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
  });

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
        });
        setWeightInput(
          loaded.weightEntries.at(-1)
            ? String(loaded.weightEntries.at(-1)?.weightKg ?? "")
            : "",
        );
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
        });
        setWeightInput("");
      }
    };

    void loadAppState();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!state) {
      return;
    }
    void saveState(state);
  }, [state]);

  const updateState = (updater: (draft: ForgeState) => void) => {
    setState((current) => {
      const draft = structuredClone(current);
      updater(draft);
      return draft;
    });
  };

  const copy = labels[state.settings.language];
  const todayLog = getTodayLog(state);
  const latestWeight =
    getLatestWeight(state.weightEntries)?.weightKg ?? state.goal.targetWeightKg;
  const todaySummary = summarizeDay({
    log: todayLog,
    foods: state.foods,
    profile: state.profile,
    goal: state.goal,
    weightKg: latestWeight,
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
  const recentEntries = todayLog.foodEntries.slice(0, 4).map((entry) => ({
    entry,
    food: foodsById.get(entry.foodId),
  }));
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
  const insights = buildInsights({
    ...state,
    tdeeEstimate: adaptiveTdee,
  }).slice(0, 2);
  const baseBmr = calculateBmr(state.profile, latestWeight);
  const activityBurn = calculateActivityCalories(todayLog.activity);

  const handleSetupSubmit = () => {
    const startWeightKg = Number(setupForm.startWeightKg);
    const targetWeightKg = Number(setupForm.targetWeightKg);
    const age = Number(setupForm.age);
    const heightCm = Number(setupForm.heightCm);
    const weeklyRateKg = Number(setupForm.weeklyRateKg);

    if (
      !setupForm.name.trim() ||
      !Number.isFinite(startWeightKg) ||
      !Number.isFinite(targetWeightKg) ||
      !Number.isFinite(age) ||
      !Number.isFinite(heightCm) ||
      !Number.isFinite(weeklyRateKg)
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
      draft.settings.hasCompletedOnboarding = true;
      draft.weightEntries = [
        {
          id: makeWeightId(),
          weightKg: startWeightKg,
          loggedAt: new Date().toISOString(),
        },
      ];
      upsertTodayLog(draft, getTodayLog(draft));
      draft.tdeeEstimate = estimateAdaptiveTdee(draft);
    });
    setWeightInput(setupForm.startWeightKg);
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
      upsertTodayLog(draft, log);
      draft.foods = mergeFoods(draft.foods, [
        {
          ...food,
          usageCount: food.usageCount + 1,
          lastUsedAt: new Date().toISOString(),
        },
      ]);
      draft.tdeeEstimate = estimateAdaptiveTdee(draft);
    });
  };

  const removeFoodFromToday = (entryId: string) => {
    updateState((draft) => {
      const log = getTodayLog(draft);
      log.foodEntries = log.foodEntries.filter((entry) => entry.id !== entryId);
      upsertTodayLog(draft, log);
      draft.tdeeEstimate = estimateAdaptiveTdee(draft);
    });
  };

  const addWeight = () => {
    const nextWeight = Number(weightInput);
    if (!Number.isFinite(nextWeight) || nextWeight <= 0) {
      return;
    }

    updateState((draft) => {
      draft.weightEntries.push({
        id: makeWeightId(),
        weightKg: nextWeight,
        loggedAt: new Date().toISOString(),
      });
      draft.tdeeEstimate = estimateAdaptiveTdee(draft);
    });
  };

  const updateActivity = (
    field: keyof ActivityEntry,
    value: number | boolean,
  ) => {
    updateState((draft) => {
      const log = getTodayLog(draft);
      log.activity = { ...log.activity, [field]: value };
      upsertTodayLog(draft, log);
    });
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
      upsertTodayLog(draft, log);
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

  const toggleLanguage = (language: Language) => {
    updateState((draft) => {
      draft.settings.language = language;
    });
  };

  if (!state.settings.hasCompletedOnboarding) {
    return (
      <div className="min-h-screen bg-background px-4 py-6 text-foreground">
        <div className="mx-auto max-w-md pt-10">
          <div className="text-[10px] uppercase tracking-[0.24em] text-(--text-muted)">
            FORGE
          </div>
          <h1 className="mt-3 text-3xl font-medium tracking-[-0.05em]">
            {copy.setupTitle}
          </h1>
          <p className="mt-2 text-sm leading-6 text-(--text-secondary)">
            {copy.setupCopy}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Field label={copy.name}>
              <Input
                value={setupForm.name}
                onChange={(event) =>
                  setSetupForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label={copy.sex}>
              <Select
                value={setupForm.sex}
                onChange={(event) =>
                  setSetupForm((current) => ({
                    ...current,
                    sex: event.target.value,
                  }))
                }
              >
                <option value="male">{copy.male}</option>
                <option value="female">{copy.female}</option>
              </Select>
            </Field>
            <Field label={copy.age}>
              <Input
                type="number"
                value={setupForm.age}
                onChange={(event) =>
                  setSetupForm((current) => ({
                    ...current,
                    age: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label={copy.height}>
              <Input
                type="number"
                value={setupForm.heightCm}
                onChange={(event) =>
                  setSetupForm((current) => ({
                    ...current,
                    heightCm: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label={copy.firstWeight}>
              <Input
                type="number"
                step="0.1"
                value={setupForm.startWeightKg}
                onChange={(event) =>
                  setSetupForm((current) => ({
                    ...current,
                    startWeightKg: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label={copy.targetWeight}>
              <Input
                type="number"
                step="0.1"
                value={setupForm.targetWeightKg}
                onChange={(event) =>
                  setSetupForm((current) => ({
                    ...current,
                    targetWeightKg: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label={copy.goalType}>
              <Select
                value={setupForm.goalType}
                onChange={(event) =>
                  setSetupForm((current) => ({
                    ...current,
                    goalType: event.target.value,
                  }))
                }
              >
                <option value="loss">{copy.loss}</option>
                <option value="maintenance">{copy.maintenance}</option>
                <option value="gain">{copy.gain}</option>
              </Select>
            </Field>
            <Field label={copy.weeklyRate}>
              <Input
                type="number"
                step="0.05"
                value={setupForm.weeklyRateKg}
                onChange={(event) =>
                  setSetupForm((current) => ({
                    ...current,
                    weeklyRateKg: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
          <Button
            className="mt-6 w-full bg-(--accent) text-black"
            onClick={handleSetupSubmit}
          >
            {copy.finishSetup}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-6 sm:max-w-4xl sm:px-6">
        <header className="mb-6 flex items-end justify-between gap-4 border-b border-(--border) pb-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-(--text-muted)">
              FORGE
            </div>
            <h1 className="mt-2 text-3xl font-medium tracking-[-0.05em]">
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
          <section className="space-y-6">
            <div className="space-y-5 border-b border-(--border) pb-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-(--text-muted)">
                    {copy.calorieTarget}
                  </div>
                  <div className="mt-2 text-4xl font-medium tracking-[-0.06em]">
                    {todaySummary.targetCalories.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-(--text-muted)">
                    {copy.remaining}
                  </div>
                  <div className="mt-2 text-2xl font-medium tracking-[-0.05em] text-(--accent)">
                    {todaySummary.remainingCalories.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-(--accent)"
                  style={{ width: `${calorieProgress}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label={copy.consumed}
                  value={`${todaySummary.consumedCalories.toLocaleString()}`}
                  helper="kcal"
                />
                <StatCard
                  label={copy.deficitOrSurplus}
                  value={formatSigned(todaySummary.deficitOrSurplus)}
                  helper="kcal"
                />
              </div>
            </div>

            <div className="space-y-0">
              <MacroRow
                label={copy.protein}
                value={todaySummary.macros.protein}
                target={todaySummary.macroTargets.protein}
              />
              <MacroRow
                label={copy.carbs}
                value={todaySummary.macros.carbs}
                target={todaySummary.macroTargets.carbs}
              />
              <MacroRow
                label={copy.fat}
                value={todaySummary.macros.fat}
                target={todaySummary.macroTargets.fat}
              />
            </div>

            <div className="grid grid-cols-3 gap-3 border-b border-(--border) pb-5">
              <StatCard
                label={copy.steps}
                value={todayLog.activity.steps.toLocaleString()}
              />
              <StatCard
                label={copy.activityBurn}
                value={`${activityBurn.toLocaleString()}`}
                helper="kcal"
              />
              <StatCard
                label={copy.adaptiveTdee}
                value={`${roundTo(adaptiveTdee?.value ?? baseBmr * 1.2).toLocaleString()}`}
                helper={adaptiveTdee ? adaptiveTdee.confidence : "estimate"}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">{copy.addWeight}</div>
                <Button
                  className="bg-(--accent) text-black"
                  onClick={addWeight}
                >
                  {copy.save}
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-[0.95fr_1.05fr]">
                <Input
                  type="number"
                  step="0.1"
                  value={weightInput}
                  onChange={(event) => setWeightInput(event.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field label={copy.steps}>
                    <Input
                      type="number"
                      value={todayLog.activity.steps}
                      onChange={(event) =>
                        updateActivity("steps", Number(event.target.value))
                      }
                    />
                  </Field>
                  <Field label={copy.duration}>
                    <Input
                      type="number"
                      value={todayLog.activity.gymDurationMinutes}
                      onChange={(event) =>
                        updateActivity(
                          "gymDurationMinutes",
                          Number(event.target.value),
                        )
                      }
                    />
                  </Field>
                  <Field label={copy.extraActivity}>
                    <Input
                      type="number"
                      value={todayLog.activity.extraActivityMinutes}
                      onChange={(event) =>
                        updateActivity(
                          "extraActivityMinutes",
                          Number(event.target.value),
                        )
                      }
                    />
                  </Field>
                  <label className="flex min-h-11 items-center gap-2 rounded-lg border border-(--border) px-3 text-xs uppercase tracking-[0.12em] text-(--text-muted)">
                    <input
                      type="checkbox"
                      checked={todayLog.activity.gymSession}
                      onChange={(event) =>
                        updateActivity("gymSession", event.target.checked)
                      }
                    />
                    {copy.gym}
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t border-(--border) pt-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">{copy.quickAdd}</div>
                <Button
                  className="border-(--accent) text-(--accent)"
                  onClick={() => setActiveTab("food")}
                >
                  {copy.food}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {quickFoods.map((food) => (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() =>
                      addFoodToToday(food, food.defaultServingGrams)
                    }
                    className="flex items-center justify-between gap-3 rounded-lg border border-(--border) px-3 py-3 text-left"
                  >
                    <div>
                      <div className="font-medium">{food.name}</div>
                      <div className="mt-1 text-xs text-(--text-secondary)">
                        {food.defaultServingGrams} g serving
                      </div>
                    </div>
                    <span className="rounded-md bg-(--accent) px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-black">
                      {copy.addToToday}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 border-t border-(--border) pt-5">
              <div className="text-sm font-medium">{copy.recentEntries}</div>
              <div className="space-y-2">
                {recentEntries.length ? (
                  recentEntries.map(({ entry, food }) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 border-b border-(--border) py-2.5"
                    >
                      <div>
                        <div className="font-medium">
                          {food?.name ?? "Food"}
                        </div>
                        <div className="text-sm text-(--text-secondary)">
                          {entry.grams} g
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-(--accent)">
                          {food
                            ? scaleNutrition(food.nutritionPer100g, entry.grams)
                                .calories
                            : 0}{" "}
                          kcal
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFoodFromToday(entry.id)}
                          className="rounded-md border border-(--border) px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-(--text-muted)"
                        >
                          {copy.remove}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-(--text-secondary)">
                    {copy.emptyEntries}
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "food" ? (
          <section className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1.35fr_0.95fr]">
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      className="flex-1"
                      value={foodQuery}
                      onChange={(event) => setFoodQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          void handleSearch();
                        }
                      }}
                      placeholder={copy.foodSearch}
                    />
                    <div className="flex gap-2">
                      <Button
                        className="bg-(--accent) text-black"
                        onClick={() => void handleSearch()}
                      >
                        {copy.search}
                      </Button>
                      {foodQuery ? (
                        <Button
                          onClick={() => {
                            setFoodQuery("");
                            setSearchResults([]);
                            setSelectedFoodId("");
                            setSearchMessage("");
                          }}
                        >
                          Clear
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-sm text-(--text-secondary)">
                    {searchMessage || copy.noteFineli}
                  </div>
                </div>

                {searchResults.length ? (
                  <div className="space-y-3 border-t border-(--border) pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">
                        {copy.foodSearch}
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-(--text-muted)">
                        {searchResults.length} results
                      </div>
                    </div>
                    <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                      {searchResults.slice(0, 12).map((food) => (
                        <button
                          key={food.id}
                          type="button"
                          onClick={() => setSelectedFoodId(food.id)}
                          className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${selectedFoodId === food.id ? "border-(--accent) bg-white/3" : "border-(--border) hover:border-(--accent)/70"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium text-[15px]">
                                {formatFoodDisplayName(food.name)}
                              </div>
                              {food.brand ? (
                                <div className="mt-1 text-xs text-(--text-muted)">
                                  {formatFoodDisplayName(food.brand)}
                                </div>
                              ) : null}
                            </div>
                            <div className="shrink-0 rounded-md bg-white/3 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-(--text-muted)">
                              {food.defaultServingGrams}g
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-(--text-secondary)">
                            <span>
                              {food.nutritionPer100g.calories} kcal / 100g
                            </span>
                            <span>•</span>
                            <span>{food.nutritionPer100g.protein}P</span>
                            <span>•</span>
                            <span>{food.nutritionPer100g.carbs}C</span>
                            <span>•</span>
                            <span>{food.nutritionPer100g.fat}F</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-4 rounded-xl border border-(--border) bg-white/2 p-4">
                {selectedFood ? (
                  <>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-(--text-muted)">
                        Selected item
                      </div>
                      <div className="mt-2 text-lg font-medium">
                        {formatFoodDisplayName(selectedFood.name)}
                      </div>
                      {selectedFood.brand ? (
                        <div className="mt-1 text-sm text-(--text-secondary)">
                          {formatFoodDisplayName(selectedFood.brand)}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-(--text-secondary)">
                        {selectedFood.nutritionPer100g.calories} kcal / 100g
                      </div>
                      <Input
                        className="w-24"
                        type="number"
                        value={selectedFoodGrams}
                        onChange={(event) =>
                          setSelectedFoodGrams(event.target.value)
                        }
                      />
                    </div>
                    {selectedFoodNutrition ? (
                      <div className="grid grid-cols-2 gap-3">
                        <StatCard
                          label={copy.calories}
                          value={`${selectedFoodNutrition.calories}`}
                        />
                        <StatCard
                          label={copy.protein}
                          value={`${selectedFoodNutrition.protein}g`}
                        />
                        <StatCard
                          label={copy.carbs}
                          value={`${selectedFoodNutrition.carbs}g`}
                        />
                        <StatCard
                          label={copy.fat}
                          value={`${selectedFoodNutrition.fat}g`}
                        />
                      </div>
                    ) : null}
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        className="bg-(--accent) text-black"
                        onClick={() =>
                          addFoodToToday(
                            selectedFood,
                            Number(selectedFoodGrams) ||
                              selectedFood.defaultServingGrams,
                          )
                        }
                      >
                        {`Add ${Number(selectedFoodGrams) || selectedFood.defaultServingGrams} g`}
                      </Button>
                      <Button onClick={saveSelectedFood}>
                        {copy.saveFood}
                      </Button>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => {
                        addFoodToMealDraft(selectedFood);
                        setShowMealBuilder(true);
                      }}
                    >
                      {copy.buildMeal}
                    </Button>
                  </>
                ) : (
                  <div className="flex h-full min-h-[220px] items-center justify-center text-sm text-(--text-secondary)">
                    Choose a food from the results list to preview nutrition and
                    add it to today.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 border-t border-(--border) pt-5">
              <div className="text-sm font-medium">{copy.savedFoods}</div>
              <div className="space-y-2">
                {quickFoods.map((food) => (
                  <div
                    key={food.id}
                    className="flex items-center justify-between gap-3 border-b border-(--border) py-2.5"
                  >
                    <div>
                      <div className="font-medium">{food.name}</div>
                      <div className="text-sm text-(--text-secondary)">
                        {food.defaultServingGrams} g
                      </div>
                    </div>
                    <Button
                      onClick={() =>
                        addFoodToToday(food, food.defaultServingGrams)
                      }
                    >
                      {copy.addToToday}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 border-t border-(--border) pt-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">{copy.customFood}</div>
                <Button
                  onClick={() => setShowCustomFood((current) => !current)}
                >
                  {showCustomFood ? copy.hide : copy.open}
                </Button>
              </div>
              {showCustomFood ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field label={copy.name}>
                    <Input
                      value={customFood.name}
                      onChange={(event) =>
                        setCustomFood((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label={copy.calories}>
                    <Input
                      type="number"
                      value={customFood.calories}
                      onChange={(event) =>
                        setCustomFood((current) => ({
                          ...current,
                          calories: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label={copy.protein}>
                    <Input
                      type="number"
                      value={customFood.protein}
                      onChange={(event) =>
                        setCustomFood((current) => ({
                          ...current,
                          protein: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label={copy.carbs}>
                    <Input
                      type="number"
                      value={customFood.carbs}
                      onChange={(event) =>
                        setCustomFood((current) => ({
                          ...current,
                          carbs: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label={copy.fat}>
                    <Input
                      type="number"
                      value={customFood.fat}
                      onChange={(event) =>
                        setCustomFood((current) => ({
                          ...current,
                          fat: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
              ) : null}
              {showCustomFood ? (
                <Button
                  className="w-full bg-(--accent) text-black"
                  onClick={addCustomFood}
                >
                  {copy.save}
                </Button>
              ) : null}
            </div>

            <div className="space-y-3 border-t border-(--border) pt-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">{copy.meals}</div>
                <Button
                  onClick={() => setShowMealBuilder((current) => !current)}
                >
                  {showMealBuilder ? copy.hide : copy.open}
                </Button>
              </div>
              {showMealBuilder ? (
                <div className="space-y-3">
                  <Field label={copy.mealName}>
                    <Input
                      value={mealName}
                      onChange={(event) => setMealName(event.target.value)}
                    />
                  </Field>
                  {mealDraft.map((item, index) => {
                    const food = foodsById.get(item.foodId);
                    return (
                      <div
                        key={`${item.foodId}-${index}`}
                        className="flex items-center justify-between gap-3 border-b border-(--border) py-2.5"
                      >
                        <div className="font-medium">
                          {food?.name ?? "Food"}
                        </div>
                        <Input
                          className="w-24"
                          type="number"
                          value={item.grams}
                          onChange={(event) =>
                            setMealDraft((current) =>
                              current.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? {
                                      ...entry,
                                      grams: Number(event.target.value),
                                    }
                                  : entry,
                              ),
                            )
                          }
                        />
                      </div>
                    );
                  })}
                  <Button
                    className="w-full bg-(--accent) text-black"
                    onClick={saveMeal}
                  >
                    {copy.saveMeal}
                  </Button>
                </div>
              ) : null}
              <div className="space-y-2">
                {state.meals.map((meal) => {
                  const nutrition = mealNutrition(meal, state.foods);
                  return (
                    <div
                      key={meal.id}
                      className="flex items-center justify-between gap-3 border-b border-(--border) py-2.5"
                    >
                      <div>
                        <div className="font-medium">{meal.name}</div>
                        <div className="text-sm text-(--text-secondary)">
                          {nutrition.calories} kcal
                        </div>
                      </div>
                      <Button onClick={() => addMealToToday(meal)}>
                        {copy.addToToday}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "progress" ? (
          <section className="space-y-6">
            <div className="grid grid-cols-2 gap-3 border-b border-(--border) pb-5">
              <StatCard
                label={copy.currentWeight}
                value={currentWeight ? `${currentWeight.toFixed(1)} kg` : "-"}
              />
              <StatCard
                label={copy.startWeight}
                value={startingWeight ? `${startingWeight.toFixed(1)} kg` : "-"}
              />
              <StatCard
                label={copy.totalChange}
                value={
                  totalChange !== null
                    ? `${formatSigned(totalChange, " kg")}`
                    : "-"
                }
              />
              <StatCard
                label={copy.estimatedTime}
                value={etaWeeks ? `${etaWeeks} wk` : "-"}
              />
            </div>

            <div className="space-y-3 border-b border-(--border) pb-5">
              <div className="text-sm font-medium">{copy.bodyweightTrend}</div>
              <div className="h-60 w-full">
                {weightTrend.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightTrend}>
                      <CartesianGrid
                        stroke="rgba(255,255,255,0.08)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#9AA49D", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#9AA49D", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        domain={["dataMin - 1", "dataMax + 1"]}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#111512",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 12,
                        }}
                        labelStyle={{ color: "#9AA49D" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="#626B65"
                        strokeWidth={2}
                        dot={{ r: 2, fill: "#626B65" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="trend"
                        stroke="#39D353"
                        strokeWidth={3}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-(--text-secondary)">
                    {copy.noData}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium">{copy.adaptiveTdee}</div>
              {adaptiveTdee ? (
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    label={copy.adaptiveTdee}
                    value={`${adaptiveTdee.value.toLocaleString()} kcal`}
                    helper={`${copy.basedOn} ${adaptiveTdee.basedOnDays} d`}
                  />
                  <StatCard
                    label={copy.confidence}
                    value={adaptiveTdee.confidence}
                    helper={
                      averageWeeklyChange !== null
                        ? `${copy.averageWeeklyChange}: ${formatSigned(averageWeeklyChange, " kg")}`
                        : undefined
                    }
                  />
                </div>
              ) : (
                <div className="text-sm text-(--text-secondary)">
                  {copy.noData}
                </div>
              )}
            </div>
          </section>
        ) : null}

        {activeTab === "more" ? (
          <section className="space-y-6">
            <div className="space-y-4 border-b border-(--border) pb-5">
              <div className="text-sm font-medium">{copy.profile}</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={copy.name}>
                  <Input
                    value={state.profile.name}
                    onChange={(event) =>
                      updateProfile("name", event.target.value)
                    }
                  />
                </Field>
                <Field label={copy.sex}>
                  <Select
                    value={state.profile.sex}
                    onChange={(event) =>
                      updateProfile("sex", event.target.value)
                    }
                  >
                    <option value="male">{copy.male}</option>
                    <option value="female">{copy.female}</option>
                  </Select>
                </Field>
                <Field label={copy.age}>
                  <Input
                    type="number"
                    value={state.profile.age}
                    onChange={(event) =>
                      updateProfile("age", event.target.value)
                    }
                  />
                </Field>
                <Field label={copy.height}>
                  <Input
                    type="number"
                    value={state.profile.heightCm}
                    onChange={(event) =>
                      updateProfile("heightCm", event.target.value)
                    }
                  />
                </Field>
                <Field label={copy.goalType}>
                  <Select
                    value={state.goal.type}
                    onChange={(event) => updateGoal("type", event.target.value)}
                  >
                    <option value="loss">{copy.loss}</option>
                    <option value="maintenance">{copy.maintenance}</option>
                    <option value="gain">{copy.gain}</option>
                  </Select>
                </Field>
                <Field label={copy.targetWeight}>
                  <Input
                    type="number"
                    step="0.1"
                    value={state.goal.targetWeightKg}
                    onChange={(event) =>
                      updateGoal("targetWeightKg", event.target.value)
                    }
                  />
                </Field>
                <Field label={copy.weeklyRate}>
                  <Input
                    type="number"
                    step="0.05"
                    value={state.goal.weeklyRateKg}
                    onChange={(event) =>
                      updateGoal("weeklyRateKg", event.target.value)
                    }
                  />
                </Field>
                <Field label={copy.manualCalories}>
                  <Input
                    type="number"
                    value={state.goal.manualCalorieTarget ?? ""}
                    onChange={(event) =>
                      updateGoal("manualCalorieTarget", event.target.value)
                    }
                  />
                </Field>
              </div>
            </div>

            <div className="space-y-3 border-b border-(--border) pb-5">
              <div className="text-sm font-medium">{copy.settings}</div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  className={
                    state.settings.language === "en"
                      ? "border-(--accent) text-(--accent)"
                      : ""
                  }
                  onClick={() => toggleLanguage("en")}
                >
                  {copy.english}
                </Button>
                <Button
                  className={
                    state.settings.language === "fi"
                      ? "border-(--accent) text-(--accent)"
                      : ""
                  }
                  onClick={() => toggleLanguage("fi")}
                >
                  {copy.finnish}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium">{copy.insights}</div>
              <div className="space-y-2">
                {insights.length ? (
                  insights.map((insight) => (
                    <div
                      key={insight}
                      className="border-b border-(--border) py-2.5 text-sm leading-6 text-(--text-secondary)"
                    >
                      {insight}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-(--text-secondary)">
                    {copy.noData}
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-(--border) bg-[rgba(10,15,12,0.96)] px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
          {(["today", "food", "progress", "more"] as TabKey[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`min-h-11 rounded-lg px-3 text-sm font-medium transition-colors ${activeTab === tab ? "bg-(--accent) text-black" : "text-(--text-secondary)"}`}
            >
              {copy[tab]}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
