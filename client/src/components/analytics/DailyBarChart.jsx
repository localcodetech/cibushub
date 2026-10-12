import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDay } from "@/utils/date";
import ChartFigure from "./ChartFigure";
import ChartTooltip from "./ChartTooltip";
import { AXIS_TICK, GRID_PROPS, SERIES_COLORS, shortDay } from "./chartTheme";

// One bar per day, e.g. orders per day or earnings per day [AC-ANL-01, AC-ANL-03]
//   days: [{ day: "2026-10-09", ... }]; dataKey: which number to draw; name: what it is
//   formatValue: number -> words for the tooltip; axisFormat: shorter words for the axis
//   axisWidth: room for the axis numbers (money needs more)
const DailyBarChart = ({
  title,
  summary,
  days,
  dataKey,
  name,
  formatValue = String,
  axisFormat = String,
  axisWidth = 40,
}) => {
  return (
    <ChartFigure title={title} summary={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis
            dataKey="day"
            tickFormatter={shortDay}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            minTickGap={16}
          />
          <YAxis
            allowDecimals={false}
            tickFormatter={axisFormat}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={axisWidth}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            content={<ChartTooltip title={formatDay} formatValue={formatValue} />}
          />
          {/* Rounded at the top only, so each bar still stands on the baseline */}
          <Bar
            dataKey={dataKey}
            name={name}
            fill={SERIES_COLORS.first}
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
};

export default DailyBarChart;
