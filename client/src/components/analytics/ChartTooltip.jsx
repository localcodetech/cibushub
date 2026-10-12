// The box that appears on hover or tap. formatValue turns a number into words, e.g. formatMoney.
//   Recharts passes active, payload and label; we pass title (how to show the label)
const ChartTooltip = ({ active, payload, label, formatValue = String, title = String }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2 text-[13px] shadow-sm">
      <p className="font-bold">{title(label)}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="mt-1 flex items-center gap-2">
          {/* The coloured mark says which line; the text stays in the normal ink colour */}
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <span>{item.name}:</span>
          <span className="font-bold">{formatValue(item.value)}</span>
        </p>
      ))}
    </div>
  );
};

export default ChartTooltip;
