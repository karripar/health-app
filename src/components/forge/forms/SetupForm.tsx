import { Button, Field, Input, Select } from "../ui";

export function SetupForm({
  copy,
  form,
  onChange,
  onSubmit,
}: {
  copy: Record<string, string>;
  form: {
    name: string;
    sex: string;
    age: string;
    heightCm: string;
    startWeightKg: string;
    targetWeightKg: string;
    goalType: string;
    weeklyRateKg: string;
    averageDailySteps: string;
    gymSessionsPerWeek: string;
    typicalGymDurationMinutes: string;
    otherActivityName: string;
    otherActivitySessionsPerWeek: string;
    otherActivityDurationMinutes: string;
  };
  onChange: (field: keyof typeof form, value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="min-h-screen bg-background px-4 py-6 text-foreground">
      <div className="mx-auto max-w-md pt-10">
        <div className="text-[10px] uppercase tracking-[0.24em] text-(--text-muted)">
          FORGE
        </div>
        <h1 className="mt-3 text-3xl font-medium tracking-tighter">
          {copy.setupTitle}
        </h1>
        <p className="mt-2 text-sm leading-6 text-(--text-secondary)">
          {copy.setupCopy}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Field label={copy.name}>
            <Input
              value={form.name}
              onChange={(event) => onChange("name", event.target.value)}
            />
          </Field>
          <Field label={copy.sex}>
            <Select
              value={form.sex}
              onChange={(event) => onChange("sex", event.target.value)}
            >
              <option value="male">{copy.male}</option>
              <option value="female">{copy.female}</option>
            </Select>
          </Field>
          <Field label={copy.age}>
            <Input
              type="number"
              value={form.age}
              onChange={(event) => onChange("age", event.target.value)}
            />
          </Field>
          <Field label={copy.height}>
            <Input
              type="number"
              value={form.heightCm}
              onChange={(event) => onChange("heightCm", event.target.value)}
            />
          </Field>
          <Field label={copy.firstWeight}>
            <Input
              type="number"
              step="0.1"
              value={form.startWeightKg}
              onChange={(event) =>
                onChange("startWeightKg", event.target.value)
              }
            />
          </Field>
          <Field label={copy.targetWeight}>
            <Input
              type="number"
              step="0.1"
              value={form.targetWeightKg}
              onChange={(event) =>
                onChange("targetWeightKg", event.target.value)
              }
            />
          </Field>
          <Field label={copy.goalType}>
            <Select
              value={form.goalType}
              onChange={(event) => onChange("goalType", event.target.value)}
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
              value={form.weeklyRateKg}
              onChange={(event) => onChange("weeklyRateKg", event.target.value)}
            />
          </Field>
          <Field label={copy.averageDailySteps}>
            <Input
              type="number"
              value={form.averageDailySteps}
              onChange={(event) =>
                onChange("averageDailySteps", event.target.value)
              }
            />
          </Field>
          <Field label={copy.gymSessionsPerWeek}>
            <Input
              type="number"
              min={0}
              max={14}
              value={form.gymSessionsPerWeek}
              onChange={(event) =>
                onChange("gymSessionsPerWeek", event.target.value)
              }
            />
          </Field>
          <Field label={copy.typicalGymDuration}>
            <Input
              type="number"
              value={form.typicalGymDurationMinutes}
              onChange={(event) =>
                onChange("typicalGymDurationMinutes", event.target.value)
              }
            />
          </Field>
          <Field label={copy.otherRegularActivity}>
            <Input
              value={form.otherActivityName}
              onChange={(event) =>
                onChange("otherActivityName", event.target.value)
              }
              placeholder="cycling"
            />
          </Field>
          <Field label={copy.otherActivitySessionsPerWeek}>
            <Input
              type="number"
              min={0}
              value={form.otherActivitySessionsPerWeek}
              onChange={(event) =>
                onChange("otherActivitySessionsPerWeek", event.target.value)
              }
            />
          </Field>
          <Field label={copy.otherActivityDuration}>
            <Input
              type="number"
              value={form.otherActivityDurationMinutes}
              onChange={(event) =>
                onChange("otherActivityDurationMinutes", event.target.value)
              }
            />
          </Field>
        </div>
        <Button
          className="mt-6 w-full bg-(--accent) text-black"
          onClick={onSubmit}
        >
          {copy.finishSetup}
        </Button>
      </div>
    </div>
  );
}
