import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartFigure from "@/components/analytics/ChartFigure";
import ChartTooltip from "@/components/analytics/ChartTooltip";
import { AXIS_TICK, GRID_PROPS, SERIES_COLORS, shortDay } from "@/components/analytics/chartTheme";
import { formatDay } from "@/utils/date";

const formatStars = (rating) => rating.toFixed(1) + " ★";

// Average stars per day [AC-ANL-03]. Days without reviews have no point; the line joins the
// days that do, so a quiet day doesn't look like a 0-star day.
const RatingChart = ({ days, totals }) => {
  const reviewedDays = days.filter((day) => day.averageRating !== null).length;

  return (
    <ChartFigure
      title="Ratings over time"
      summary={
        totals.averageRating === null
          ? "No reviews in this period."
          : "Average " + formatStars(totals.averageRating) + " from " + totals.reviews + " reviews."
      }
    >
      {reviewedDays === 0 ? (
        <p className="text-muted-foreground">No reviews in this period.</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
              // A little room under 1 star, so its label doesn't touch the dates
              domain={[0.5, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <Tooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
              content={<ChartTooltip title={formatDay} formatValue={formatStars} />}
            />
            <Line
              dataKey="averageRating"
              name="Average"
              stroke={SERIES_COLORS.first}
              strokeWidth={2}
              connectNulls
              dot={{ r: 4 }}
              activeDot={{ r: 6, stroke: "var(--card)", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartFigure>
  );
};

export default RatingChart;
