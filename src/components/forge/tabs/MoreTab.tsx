import { Button, Field, Input, Select } from "../ui";

export function MoreTab({
  copy,
  state,
  insights,
  onProfileUpdate,
  onGoalUpdate,
  onActivityUpdate,
  onLanguageChange,
}: {
  copy: Record<string, string>;
  state: {
    profile: { name: string; sex: string; age: number; heightCm: number };
    goal: {
      type: string;
      targetWeightKg: number;
      weeklyRateKg: number;
      manualCalorieTarget?: number | string;
    };
    activityProfile: {
      averageDailySteps: number;
      gymSessionsPerWeek: number;
      typicalGymDurationMinutes: number;
      otherActivities: Array<{
        name: string;
        sessionsPerWeek: number;
        durationMinutes: number;
      }>;
    };
    settings: { language: "en" | "fi" };
  };
  insights: string[];
  onProfileUpdate: (
    field: "name" | "age" | "heightCm" | "sex",
    value: string,
  ) => void;
  onGoalUpdate: (
    field: "type" | "targetWeightKg" | "weeklyRateKg" | "manualCalorieTarget",
    value: string,
  ) => void;
  onActivityUpdate: (field: string, value: string | number) => void;
  onLanguageChange: (language: "en" | "fi") => void;
}) {
  return (
    <section className="space-y-6">
      <div className="space-y-4 border-b border-(--border) pb-5">
        <div className="text-sm font-medium">{copy.profile}</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={copy.name}>
            <Input
              value={state.profile.name}
              onChange={(event) => onProfileUpdate("name", event.target.value)}
            />
          </Field>
          <Field label={copy.sex}>
            <Select
              value={state.profile.sex}
              onChange={(event) => onProfileUpdate("sex", event.target.value)}
            >
              <option value="male">{copy.male}</option>
              <option value="female">{copy.female}</option>
            </Select>
          </Field>
          <Field label={copy.age}>
            <Input
              type="number"
              value={state.profile.age}
              onChange={(event) => onProfileUpdate("age", event.target.value)}
            />
          </Field>
          <Field label={copy.height}>
            <Input
              type="number"
              value={state.profile.heightCm}
              onChange={(event) =>
                onProfileUpdate("heightCm", event.target.value)
              }
            />
          </Field>
          <Field label={copy.goalType}>
            <Select
              value={state.goal.type}
              onChange={(event) => onGoalUpdate("type", event.target.value)}
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
                onGoalUpdate("targetWeightKg", event.target.value)
              }
            />
          </Field>
          <Field label={copy.weeklyRate}>
            <Input
              type="number"
              step="0.05"
              value={state.goal.weeklyRateKg}
              onChange={(event) =>
                onGoalUpdate("weeklyRateKg", event.target.value)
              }
            />
          </Field>
          <Field label={copy.manualCalories}>
            <Input
              type="number"
              value={state.goal.manualCalorieTarget ?? ""}
              onChange={(event) =>
                onGoalUpdate("manualCalorieTarget", event.target.value)
              }
            />
          </Field>
        </div>
      </div>

      <div className="space-y-4 border-b border-(--border) pb-5">
        <div className="text-sm font-medium">{copy.activityProfile}</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={copy.averageDailySteps}>
            <Input
              type="number"
              value={state.activityProfile.averageDailySteps}
              onChange={(event) =>
                onActivityUpdate(
                  "averageDailySteps",
                  Number(event.target.value),
                )
              }
            />
          </Field>
          <Field label={copy.gymSessionsPerWeek}>
            <Input
              type="number"
              min={0}
              max={14}
              value={state.activityProfile.gymSessionsPerWeek}
              onChange={(event) =>
                onActivityUpdate(
                  "gymSessionsPerWeek",
                  Number(event.target.value),
                )
              }
            />
          </Field>
          <Field label={copy.typicalGymDuration}>
            <Input
              type="number"
              value={state.activityProfile.typicalGymDurationMinutes}
              onChange={(event) =>
                onActivityUpdate(
                  "typicalGymDurationMinutes",
                  Number(event.target.value),
                )
              }
            />
          </Field>
          <Field label={copy.otherRegularActivity}>
            <Input
              value={state.activityProfile.otherActivities[0]?.name ?? ""}
              onChange={(event) =>
                onActivityUpdate("otherActivityName", event.target.value)
              }
              placeholder="cycling"
            />
          </Field>
        </div>
        {state.activityProfile.otherActivities[0] ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label={copy.otherActivitySessionsPerWeek}>
              <Input
                type="number"
                min={0}
                value={state.activityProfile.otherActivities[0].sessionsPerWeek}
                onChange={(event) =>
                  onActivityUpdate(
                    "otherActivitySessionsPerWeek",
                    Number(event.target.value),
                  )
                }
              />
            </Field>
            <Field label={copy.otherActivityDuration}>
              <Input
                type="number"
                value={state.activityProfile.otherActivities[0].durationMinutes}
                onChange={(event) =>
                  onActivityUpdate(
                    "otherActivityDurationMinutes",
                    Number(event.target.value),
                  )
                }
              />
            </Field>
          </div>
        ) : null}
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
            onClick={() => onLanguageChange("en")}
          >
            {copy.english}
          </Button>
          <Button
            className={
              state.settings.language === "fi"
                ? "border-(--accent) text-(--accent)"
                : ""
            }
            onClick={() => onLanguageChange("fi")}
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
            <div className="text-sm text-(--text-secondary)">{copy.noData}</div>
          )}
        </div>
      </div>
    </section>
  );
}
