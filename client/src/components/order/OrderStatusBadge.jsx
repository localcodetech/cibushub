import StatusBadge from "@/components/common/StatusBadge";
import { ORDER_STATUSES } from "@/data/orderStatuses";

// The order's status as a badge, e.g. "Preparing" [AC-CUST-09]. Its colour and icon come from
// the status group in data/orderStatuses.js.
const OrderStatusBadge = ({ status }) => {
  const info = ORDER_STATUSES[status] || { label: status, tone: "neutral" };

  return <StatusBadge label={info.label} tone={info.tone} />;
};

export default OrderStatusBadge;
