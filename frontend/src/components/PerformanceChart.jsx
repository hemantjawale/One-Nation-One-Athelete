import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Empty } from "./UI";
import { dateLabel } from "../lib/forms";
export default function PerformanceChart({ sessions }) {
  const data = [...sessions]
    .filter((r) => r.metric > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  return data.length ? (
    <div className="chart">
      <ResponsiveContainer width="100%" height={235}>
        <AreaChart
          data={data}
          margin={{ top: 15, right: 15, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ed794d" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#ed794d" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e2e5d9" />
          <XAxis
            dataKey="date"
            tickFormatter={(d) =>
              new Date(d).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })
            }
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            labelFormatter={dateLabel}
            formatter={(v) => [v, data[0].unit]}
          />
          <Area
            dataKey="metric"
            type="monotone"
            stroke="#e9784b"
            strokeWidth={2.5}
            fill="url(#chart-fill)"
            isAnimationActive={false}
            dot={{ r: 4, fill: "#e9784b", stroke: "#fff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <Empty text="Log a measured result to reveal your performance trend." />
  );
}
