import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartFigure from "./ChartFigure";
import Card from "@/components/common/Card";
import ChartTooltip from "./ChartTooltip";
import { AXIS_TICK, SERIES_COLORS } from "./chartTheme";

// Long names are cut on the axis; the tooltip shows them in full
const shortName = (name) => (name.length > 16 ? name.slice(0, 15) + "…" : name);

// One bar per row, longest first: for "orders by status" and "top restaurants" [AC-ANL-01]
//   rows: [{ name, value }]; valueName: what the number is ("Orders");
//   formatValue: number -> words; emptyText: shown when there are no rows
//   labelWidth: room after the longest bar for its number (money needs more)
const HorizontalBarChart = ({
  title,
  summary,
  rows,
  valueName,
  formatValue = String,
  emptyText,
  labelWidth = 40,
}) => {
  if (rows.length === 0) {
    return (
      <Card as="figure">
        <figcaption className="font-bold">{title}</figcaption>
        <p className="mt-3 text-muted-foreground">{emptyText}</p>
      </Card>
    );
  }

  return (
    <ChartFigure title={title} summary={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 0, right: labelWidth, bottom: 0, left: 0 }}
          barCategoryGap={6}
        >
          <CartesianGrid stroke="var(--border)" horizontal={false} />
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            tickFormatter={shortName}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={136}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            content={<ChartTooltip formatValue={formatValue} />}
          />
          {/* Rounded at the far end only; the number sits just past it */}
          <Bar
            dataKey="value"
            name={valueName}
            fill={SERIES_COLORS.first}
            radius={[0, 4, 4, 0]}
            maxBarSize={24}
          >
            <LabelList
              dataKey="value"
              position="right"
              formatter={formatValue}
              style={{ fill: "var(--foreground)", fontSize: 13 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
};

export default HorizontalBarChart;
