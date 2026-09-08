import { useRef, useState } from "react";

import { summarizeDay, roundTo } from "@/lib/forge/calculations";
import {
  type ActivityProfile,
  type DailyActivityAdjustment,
  type DailyLog,
  type Food,
  type ForgeState,
  type UserProfile,
  type WeightEntry,
} from "@/lib/forge/models";

import { type Copy } from "./labels";
import { type ActivityLevel, formatWeightLabel } from "./helpers";
import { Button, Field, Input } from "./ui";

export type FinalizeDayDraft = {
  steps: number;
  activityLevel: ActivityLevel;
  gymToday: boolean;
  gymDurationMinutes: number;
  weightKg?: number;
};

type TodayFinalizeSheetProps = {
  open: boolean;
  completed: boolean;
  copy: Copy;
  date: string;
  foods: Food[];
  profile: UserProfile;
  goal: ForgeState["goal"];
  activityProfile: ActivityProfile;
  currentWeightKg: number;
  currentWeightEntry?: WeightEntry;
  currentLog: DailyLog;
  currentAdjustment: DailyActivityAdjustment;
  onClose: () => void;
  onConfirmWeight: (weightKg: number) => boolean;
  onConfirmDay: (draft: FinalizeDayDraft) => boolean;
};

export function TodayFinalizeSheet({
  open,
  completed,
  copy,
  date,
  foods,
  profile,
  goal,
  activityProfile,
  currentWeightKg,
  currentWeightEntry,
  currentLog,
  currentAdjustment,
  onClose,
  onConfirmWeight,
  onConfirmDay,
}: TodayFinalizeSheetProps) {
  const weightConfirmLock = useRef(false);
  const dayConfirmLock = useRef(false);
  const weightJustSaved = useRef(false);
  const [steps, setSteps] = useState(() => {
    const resolvedSteps = Math.max(
      0,
      currentLog.steps ??
        currentLog.activity.steps ??
        activityProfile.averageDailySteps,
    );
    return String(resolvedSteps);
  });
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    () => currentLog.activityLevel ?? currentAdjustment.type ?? "normal",
  );
  const [gymToday, setGymToday] = useState(
    () =>
      currentLog.gymToday ??
      currentAdjustment.gymToday ??
      currentLog.activity.gymSession ??
      false,
  );
  const [gymDurationMinutes, setGymDurationMinutes] = useState(() => {
    const resolvedGymDuration =
      currentLog.activity.gymDurationMinutes ||
      activityProfile.typicalGymDurationMinutes;
    return String(
      (currentLog.gymToday ??
        currentAdjustment.gymToday ??
        currentLog.activity.gymSession ??
        false)
        ? resolvedGymDuration
        : activityProfile.typicalGymDurationMinutes,
    );
  });
  const [weightDraft, setWeightDraft] = useState("");
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [pendingWeightConfirmation, setPendingWeightConfirmation] = useState<
    number | null
  >(null);
  const [showChangeConfirmation, setShowChangeConfirmation] = useState(false);

  if (!open) {
    return null;
  }

  const stepsValue = Number(steps) || 0;
  const parsedWeight = Number(weightDraft);
  const confirmedWeight = currentWeightEntry?.weightKg;
  const previewWeight =
    Number.isFinite(parsedWeight) && parsedWeight > 0
      ? parsedWeight
      : (confirmedWeight ?? currentWeightKg);
  const draftLog: DailyLog = {
    ...currentLog,
    activity: {
      steps: stepsValue,
      gymSession: gymToday,
      gymDurationMinutes: gymToday
        ? Number(gymDurationMinutes) ||
          activityProfile.typicalGymDurationMinutes
        : 0,
      extraActivityMinutes: currentLog.activity.extraActivityMinutes ?? 0,
    },
  };
  const previewSummary = summarizeDay({
    log: draftLog,
    foods,
    profile,
    goal,
    weightKg: previewWeight,
    activityProfile,
    dailyAdjustment: {
      date,
      type: activityLevel,
      gymToday,
    },
  });
  const previewExpenditure = roundTo(
    previewSummary.deficitOrSurplus + previewSummary.consumedCalories,
  );
  const savedSteps =
    currentLog.steps ??
    currentLog.activity.steps ??
    activityProfile.averageDailySteps;
  const savedActivity =
    currentLog.activityLevel ?? currentAdjustment.type ?? "normal";
  const savedGym =
    currentLog.gymToday ??
    currentAdjustment.gymToday ??
    currentLog.activity.gymSession ??
    false;
  const changesNeedApproval =
    completed &&
    (savedSteps !== stepsValue ||
      savedActivity !== activityLevel ||
      savedGym !== gymToday);

  const handleWeightSave = () => {
    if (weightConfirmLock.current) {
      return;
    }
    const nextWeight = Number(weightDraft);
    if (!Number.isFinite(nextWeight) || nextWeight <= 0) {
      return;
    }
    if (currentWeightEntry) {
      return;
    }

    setPendingWeightConfirmation(nextWeight);
  };

  const confirmWeight = () => {
    if (weightConfirmLock.current || pendingWeightConfirmation === null) {
      return;
    }

    weightConfirmLock.current = true;
    const saved = onConfirmWeight(pendingWeightConfirmation);
    weightConfirmLock.current = false;
    if (saved) {
      weightJustSaved.current = true;
      setPendingWeightConfirmation(null);
      setWeightDraft("");
      setShowWeightInput(false);
    }
  };

  const confirmDay = () => {
    if (dayConfirmLock.current) {
      return;
    }

    if (pendingWeightConfirmation !== null) {
      return;
    }

    if (weightJustSaved.current && !currentWeightEntry) {
      return;
    }

    if (!currentWeightEntry && showWeightInput) {
      if (Number.isFinite(parsedWeight) && parsedWeight > 0) {
        setPendingWeightConfirmation(parsedWeight);
      }
      return;
    }

    if (completed && changesNeedApproval && !showChangeConfirmation) {
      setShowChangeConfirmation(true);
      return;
    }

    dayConfirmLock.current = true;
    const saved = onConfirmDay({
      steps: stepsValue,
      activityLevel,
      gymToday,
      gymDurationMinutes: gymToday
        ? Number(gymDurationMinutes) ||
          activityProfile.typicalGymDurationMinutes
        : 0,
      weightKg:
        Number.isFinite(parsedWeight) && parsedWeight > 0
          ? parsedWeight
          : undefined,
    });
    dayConfirmLock.current = false;
    if (saved) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/65 px-4 py-6">
      <button
        type="button"
        aria-label="Close finalize day sheet"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-xl rounded-3xl border border-(--border) bg-(--surface-elevated) shadow-2xl shadow-black/40">
        <div className="flex max-h-[88vh] flex-col pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
          <div className="flex items-center justify-between gap-3 border-b border-(--border) px-4 py-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-(--text-muted)">
                {copy.finishToday}
              </div>
              <div className="mt-1 text-xl font-medium tracking-[-0.04em] text-foreground">
                {completed ? copy.todayCompleted : copy.doneForToday}
              </div>
            </div>
            <Button onClick={onClose}>{copy.cancel}</Button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-5">
              <div className="rounded-2xl border border-(--border) bg-(--surface) p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-(--text-muted)">
                  {copy.todayEstimate}
                </div>
                <div className="mt-2 text-4xl font-medium tracking-tighter text-foreground">
                  ~{previewExpenditure.toLocaleString()} kcal
                </div>
                <div className="mt-2 text-sm text-(--text-secondary)">
                  {copy.basedOnNormalActivity}
                </div>
              </div>

              <div className="rounded-2xl border border-(--border) bg-(--surface) p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-(--text-muted)">
                      {copy.todaysSteps}
                    </div>
                    <div className="mt-2 text-sm text-(--text-secondary)">
                      {copy.normalActivityShort}
                    </div>
                  </div>
                  <Input
                    className="w-32 text-right"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={steps}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      if (nextValue === "") {
                        setSteps("");
                        return;
                      }

                      const numericValue = Number(nextValue);
                      if (!Number.isFinite(numericValue) || numericValue < 0) {
                        setSteps("0");
                        return;
                      }

                      setSteps(String(Math.floor(numericValue)));
                    }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-(--border) bg-(--surface) p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-(--text-muted)">
                  {copy.todaysActivity}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(
                    [
                      ["less", copy.lessActive],
                      ["normal", copy.normalActivity],
                      ["more", copy.moreActive],
                    ] as const
                  ).map(([level, label]) => (
                    <button
                      key={level}
                      type="button"
                      aria-pressed={activityLevel === level}
                      onClick={() => setActivityLevel(level)}
                      className={`min-h-11 rounded-lg border px-3 text-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)/60 ${activityLevel === level ? "border-(--accent) bg-(--accent)/10 text-(--accent)" : "border-(--border) text-(--text-secondary)"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm text-(--text-secondary)">
                  <span>{copy.gymToday}</span>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      aria-pressed={gymToday}
                      className={
                        gymToday
                          ? "border-(--accent) bg-(--accent)/10 text-(--accent)"
                          : ""
                      }
                      onClick={() => setGymToday(true)}
                    >
                      {copy.yes}
                    </Button>
                    <Button
                      aria-pressed={!gymToday}
                      className={
                        !gymToday
                          ? "border-(--accent) bg-(--accent)/10 text-(--accent)"
                          : ""
                      }
                      onClick={() => setGymToday(false)}
                    >
                      {copy.no}
                    </Button>
                  </div>
                </div>
                {gymToday ? (
                  <div className="mt-3">
                    <Field label={copy.duration}>
                      <Input
                        type="number"
                        value={gymDurationMinutes}
                        onChange={(event) =>
                          setGymDurationMinutes(event.target.value)
                        }
                      />
                    </Field>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-(--border) bg-(--surface) p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-(--text-muted)">
                  {copy.todaysWeight}
                </div>
                {currentWeightEntry ? (
                  <div className="mt-3 space-y-2">
                    <div className="text-lg font-medium text-foreground">
                      {formatWeightLabel(currentWeightEntry.weightKg)} ✓
                    </div>
                    <div className="text-sm text-(--text-secondary)">
                      {copy.recordedToday}
                    </div>
                  </div>
                ) : showWeightInput ? (
                  <div className="mt-3 space-y-3">
                    <Field label="Weight">
                      <Input
                        type="number"
                        step="0.1"
                        value={weightDraft}
                        onChange={(event) => setWeightDraft(event.target.value)}
                      />
                    </Field>
                    {pendingWeightConfirmation === null ? (
                      <Button
                        className="w-full bg-(--accent) text-black"
                        onClick={handleWeightSave}
                      >
                        {copy.saveWeight}
                      </Button>
                    ) : (
                      <div className="space-y-3 rounded-xl border border-(--border) bg-white/3 p-3">
                        <div className="text-sm text-(--text-secondary)">
                          {copy.saveWeightPrompt}{" "}
                          <span className="font-medium text-foreground">
                            {formatWeightLabel(pendingWeightConfirmation)}
                          </span>
                          ?
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => setPendingWeightConfirmation(null)}
                          >
                            {copy.cancel}
                          </Button>
                          <Button
                            className="border-(--accent) bg-(--accent) text-black"
                            onClick={confirmWeight}
                          >
                            {copy.confirmWeight}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    className="mt-3 border-(--accent)/60 text-(--accent)"
                    onClick={() => setShowWeightInput(true)}
                  >
                    {copy.addWeightNow}
                  </Button>
                )}
              </div>

              {showChangeConfirmation ? (
                <div className="rounded-2xl border border-(--accent)/40 bg-(--accent)/8 p-4">
                  <div className="text-sm text-(--text-secondary)">
                    Change today&apos;s activity?
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button onClick={() => setShowChangeConfirmation(false)}>
                      {copy.cancel}
                    </Button>
                    <Button
                      className="border-(--accent) bg-(--accent) text-black"
                      onClick={confirmDay}
                    >
                      {copy.confirmChange}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-t border-(--border) px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <div className="text-[10px] uppercase tracking-[0.18em] text-(--text-muted)">
              {copy.todayEstimate}
            </div>
            <div className="mt-1 text-2xl font-medium tracking-tighter text-foreground">
              ~{previewExpenditure.toLocaleString()} kcal
            </div>
            <Button
              className="mt-4 w-full bg-(--accent) text-black"
              onClick={confirmDay}
            >
              {completed ? copy.confirmChange : copy.confirmDay}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
