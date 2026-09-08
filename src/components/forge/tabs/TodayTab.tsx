import { Button, MacroRow, StatCard } from "../ui";
import { formatSigned } from "../helpers";

export function TodayTab({
  copy,
  calorieProgress,
  todaySummary,
  todayEstimate,
  todayCompleted,
  activitySummaryLabel,
  currentStepSummary,
  currentGymSummary,
  todayFoodEntries,
  onRemoveFoodEntry,
  onOpenFinalize,
}: {
  copy: Record<string, string>;
  calorieProgress: number;
  todaySummary: {
    targetCalories: number;
    remainingCalories: number;
    consumedCalories: number;
    deficitOrSurplus: number;
    macros: { protein: number; carbs: number; fat: number };
    macroTargets: { protein: number; carbs: number; fat: number };
  };
  todayEstimate: number;
  todayCompleted: boolean;
  activitySummaryLabel: string;
  currentStepSummary: string;
  currentGymSummary: string;
  todayFoodEntries: Array<{
    id: string;
    name: string;
    grams: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
  onRemoveFoodEntry: (entryId: string) => void;
  onOpenFinalize: () => void;
}) {
  return (
    <section className="space-y-6">
      <div className="space-y-5 border-b border-(--border) pb-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-(--text-muted)">
              {copy.today}
            </div>
            <div className="mt-2 text-4xl font-medium tracking-tighter">
              {todaySummary.targetCalories.toLocaleString()} kcal
            </div>
            <div className="mt-1 text-sm text-(--text-secondary)">
              {copy.calorieTarget}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.18em] text-(--text-muted)">
              {copy.remaining}
            </div>
            <div className="mt-2 text-2xl font-medium tracking-tighter text-(--accent)">
              {todaySummary.remainingCalories.toLocaleString()} kcal
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
            value={`${todaySummary.consumedCalories.toLocaleString()} kcal`}
          />
          <StatCard
            label={copy.deficitOrSurplus}
            value={formatSigned(todaySummary.deficitOrSurplus, " kcal")}
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

      <div className="space-y-4 rounded-xl border border-(--border) bg-white/2 p-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-(--text-muted)">
          {copy.estimatedExpenditure}
        </div>
        <div className="text-3xl font-medium tracking-tighter">
          ~{todayEstimate.toLocaleString()} kcal
        </div>
        <div className="text-sm text-(--text-secondary)">
          {activitySummaryLabel}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-(--border) pb-5">
        <StatCard
          label={copy.steps}
          value={`${currentStepSummary}`}
          helper={copy.todayFocus}
        />
        <StatCard label={copy.gym} value={currentGymSummary} helper={copy.usual} />
      </div>

      <div className="space-y-3 rounded-xl border border-(--border) bg-white/2 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">{copy.recentEntries}</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-(--text-muted)">
            {todayFoodEntries.length}
          </div>
        </div>

        {todayFoodEntries.length ? (
          <div className="space-y-2">
            {todayFoodEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-(--border) bg-transparent px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{entry.name}</div>
                  <div className="text-xs text-(--text-secondary)">
                    {entry.grams} g • {entry.calories} kcal
                  </div>
                </div>
                <button
                  type="button"
                  className="text-xs text-(--text-secondary) underline underline-offset-2 hover:text-(--accent)"
                  onClick={() => onRemoveFoodEntry(entry.id)}
                >
                  {copy.remove}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-(--text-secondary)">
            {copy.emptyEntries}
          </div>
        )}
      </div>

      <Button
        className={`w-full border-(--accent)/60 ${todayCompleted ? "bg-(--accent)/10 text-(--accent)" : "bg-(--accent) text-black"}`}
        onClick={onOpenFinalize}
      >
        {todayCompleted ? copy.todayCompleted : copy.doneForToday}
      </Button>
    </section>
  );
}
