import Card from "@/components/common/Card";

// A chart with its title, and a sentence for screen readers that says what it shows.
//   legend: optional, shown between the title and the chart
const ChartFigure = ({ title, summary, legend, children }) => {
  return (
    <Card as="figure">
      <figcaption className="font-bold">{title}</figcaption>
      <p className="sr-only">{summary}</p>
      {legend}
      {/* aria-hidden: the summary above (and the table below the charts) say the same */}
      <div className="mt-3 h-64" aria-hidden="true">
        {children}
      </div>
    </Card>
  );
};

export default ChartFigure;
