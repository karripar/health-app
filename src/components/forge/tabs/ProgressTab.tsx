import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { StatCard } from "../cards/StatCard";
import { formatSigned } from "../helpers";

export function ProgressTab({
  copy,
  currentWeight,
  startingWeight,
  totalChange,
  etaWeeks,
  weightTrend,
  adaptiveTdee,
  averageWeeklyChange,
}: {
  copy: Record<string, string>;
  currentWeight?: number;
  startingWeight?: number;
  totalChange: number | null;
  etaWeeks: number | null;
  weightTrend: Array<{ date: string; actual: number; trend: number }>;
  adaptiveTdee?: { value: number; basedOnDays: number; confidence: string };
  averageWeeklyChange: number | null;
}) {
  return (
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
            totalChange !== null ? `${formatSigned(totalChange, " kg")}` : "-"
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
          <div className="text-sm text-(--text-secondary)">{copy.noData}</div>
        )}
      </div>
    </section>
  );
}
