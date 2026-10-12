import Heading from "@/components/typography/Heading";
import Card from "@/components/common/Card";

// 45 -> "45 s", 200 -> "3 min 20 s", 3900 -> "1 h 5 min"; null -> "No data"
const formatDuration = (seconds) => {
  if (seconds === null) return "No data";
  if (seconds < 60) return seconds + " s";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const rest = seconds % 60;
    return minutes + " min" + (rest > 0 ? " " + rest + " s" : "");
  }
  const restMinutes = minutes % 60;
  return Math.floor(minutes / 60) + " h" + (restMinutes > 0 ? " " + restMinutes + " min" : "");
};

const formatPercent = (percent) => (percent === null ? "No data" : percent + "%");

// How fast orders move, and how many go wrong [AC-ANL-02]. Rules: docs/analytics.md.
//   operations: the server's { averageSeconds, paidOrders, rejectedPercent, cancelledPercent }
const OperationsTiles = ({ operations }) => {
  const times = operations.averageSeconds;
  const tiles = [
    { label: "Restaurant accepts in", value: formatDuration(times.accept) },
    { label: "Kitchen time", value: formatDuration(times.prepare) },
    { label: "Finding a rider", value: formatDuration(times.assignRider) },
    { label: "Delivery (pickup to door)", value: formatDuration(times.deliver) },
    { label: "Paid to delivered", value: formatDuration(times.total) },
    { label: "Rejected by restaurants", value: formatPercent(operations.rejectedPercent) },
    { label: "Cancelled after paying", value: formatPercent(operations.cancelledPercent) },
  ];

  return (
    <section className="mt-6">
      <Heading level={3}>How fast (averages)</Heading>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label} padding="sm">
            <dt className="text-[13px] text-muted-foreground">{tile.label}</dt>
            <dd className="mt-1 font-heading text-xl font-bold">{tile.value}</dd>
          </Card>
        ))}
      </dl>
      <p className="mt-2 text-[13px] text-muted-foreground">
        From {operations.paidOrders} paid {operations.paidOrders === 1 ? "order" : "orders"} in this
        period.
      </p>
    </section>
  );
};

export default OperationsTiles;
