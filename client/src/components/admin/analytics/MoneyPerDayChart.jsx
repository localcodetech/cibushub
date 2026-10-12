import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDay } from "@/utils/date";
import { formatMoney } from "@/utils/money";
import ChartFigure from "@/components/analytics/ChartFigure";
import ChartTooltip from "@/components/analytics/ChartTooltip";
import {
  AXIS_TICK,
  GRID_PROPS,
  SERIES_COLORS,
  cedisTick,
  shortDay,
} from "@/components/analytics/chartTheme";

// The key, in the order of the lines; the text stays in the normal ink colour, the small line
// beside it (solid or dashed, like the chart) says which is which
const MoneyLegend = () => {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
      <li className="flex items-center gap-2">
        <svg width="20" height="4" aria-hidden="true">
          <line x1="0" y1="2" x2="20" y2="2" stroke={SERIES_COLORS.first} strokeWidth="2" />
        </svg>
        Customers paid
      </li>
      <li className="flex items-center gap-2">
        <svg width="20" height="4" aria-hidden="true">
          <line
            x1="0"
            y1="2"
            x2="20"
            y2="2"
            stroke={SERIES_COLORS.second}
            strokeWidth="2"
            strokeDasharray="6 4"
          />
        </svg>
        CibusHub kept
      </li>
    </ul>
  );
};

// Two lines on one money axis [AC-ANL-01]: what customers paid (after refunds) and what CibusHub
// kept. The CibusHub line is also dashed, so the two never rely on colour alone.
const MoneyPerDayChart = ({ days, totals }) => {
  return (
    <ChartFigure
      title="Money per day"
      legend={<MoneyLegend />}
      summary={
        "Customers paid " +
        formatMoney(totals.customerPaidPesewas) +
        " and CibusHub kept " +
        formatMoney(totals.cibushubPesewas) +
        " in this period."
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
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
            tickFormatter={cedisTick}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={84}
          />
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
            content={<ChartTooltip title={formatDay} formatValue={formatMoney} />}
          />
          <Line
            dataKey="customerPaidPesewas"
            name="Customers paid"
            stroke={SERIES_COLORS.first}
            strokeWidth={2}
            dot={days.length <= 31 ? { r: 3 } : false}
            activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
          />
          <Line
            dataKey="cibushubPesewas"
            name="CibusHub kept"
            stroke={SERIES_COLORS.second}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={days.length <= 31 ? { r: 3 } : false}
            activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
};

export default MoneyPerDayChart;
