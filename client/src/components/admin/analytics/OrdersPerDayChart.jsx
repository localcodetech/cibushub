import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDay } from "@/utils/date";
import ChartFigure from "./ChartFigure";
import ChartTooltip from "./ChartTooltip";
import { AXIS_TICK, GRID_PROPS, SERIES_COLORS, shortDay } from "./chartTheme";

// Orders paid each day: one bar per day [AC-ANL-01]
const OrdersPerDayChart = ({ days, total }) => {
  return (
    <ChartFigure
      title="Orders per day"
      summary={
        total +
        " paid orders from " +
        formatDay(days[0].day) +
        " to " +
        formatDay(days.at(-1).day) +
        "."
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis
            dataKey="day"
            tickFormatter={shortDay}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            minTickGap={16}
          />
          <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltip title={formatDay} />} />
          {/* Rounded at the top only, so each bar still stands on the baseline */}
          <Bar
            dataKey="orders"
            name="Orders"
            fill={SERIES_COLORS.first}
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
};

export default OrdersPerDayChart;
