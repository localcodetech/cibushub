import { useState } from "react";
import { Link } from "react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, RefreshCw, Search, Undo2 } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import StatusPill from "@/components/admin/StatusPill";
import ConfirmActionSheet from "@/components/admin/ConfirmActionSheet";
import {
  getAdminPaymentsRequest,
  getAdminRefundsRequest,
  retryRefundRequest,
  reverifyPaymentRequest,
} from "@/api/admin";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatMoney } from "@/utils/money";
import { formatDateTime } from "@/utils/date";
import { cn } from "@/lib/utils";

// How each status reads and looks
const PAYMENT_STATUSES = {
  SUCCESS: { label: "Paid", tone: "green" },
  PENDING: { label: "Pending", tone: "gold" },
  FAILED: { label: "Failed", tone: "red" },
  ABANDONED: { label: "Abandoned", tone: "muted" },
  AMOUNT_MISMATCH: { label: "Wrong amount", tone: "red" },
};
const REFUND_STATUSES = {
  PENDING: { label: "Pending", tone: "gold" },
  PROCESSED: { label: "Refunded", tone: "green" },
  FAILED: { label: "Failed", tone: "red" },
};

// Reasons saved as codes, in words
const REASON_WORDS = {
  RESTAURANT_TIMEOUT: "Restaurant didn't answer in time",
};

// What Paystack's answer to "check again" means
const OUTCOME_WORDS = {
  ORDER_PAID: "Paid: the order went to the restaurant.",
  ALREADY_PROCESSED: "Already settled; nothing changed.",
  AMOUNT_MISMATCH: "Paystack shows a different amount. The order was NOT marked paid.",
  NOT_PAID: "Not paid. The payment is now marked as failed.",
  STILL_PENDING: "Still pending at Paystack (e.g. the MoMo prompt was not answered).",
  PAID_AFTER_CLOSE: "Paid after the order closed: a full refund was started.",
  UNKNOWN_REFERENCE: "Paystack doesn't know this payment.",
};

// Small pill buttons for the filters
const Pills = ({ options, value, onChange, label }) => {
  return (
    <div role="group" aria-label={label} className="flex gap-2 overflow-x-auto pb-1">
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "min-h-11 shrink-0 rounded-full border px-4 font-bold",
            value === option.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

const Pager = ({ meta, page, onPage }) => {
  if (!meta || meta.totalPages <= 1) {
    return null;
  }
  return (
    <nav aria-label="Pages" className="mt-6 flex items-center justify-between gap-4">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="min-h-11 rounded-md border border-border px-4 font-bold disabled:opacity-40"
      >
        Previous
      </button>
      <Text size="small" muted>
        Page {meta.page} of {meta.totalPages}
      </Text>
      <button
        type="button"
        disabled={page >= meta.totalPages}
        onClick={() => onPage(page + 1)}
        className="min-h-11 rounded-md border border-border px-4 font-bold disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  );
};

// /admin/payments: payments and refunds, and the ones that need a person [AC-ADM-06]
const AdminPaymentsPage = () => {
  const [tab, setTab] = useState("payments");

  return (
    <Container>
      <section className="py-8">
        <Heading level={1}>Payments</Heading>
        <div className="mt-6 flex gap-6 border-b border-border">
          {[
            { value: "payments", label: "Payments" },
            { value: "refunds", label: "Refunds" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTab(option.value)}
              aria-pressed={tab === option.value}
              className={cn(
                "min-h-12 border-b-2 font-bold",
                tab === option.value ? "border-primary text-primary" : "border-transparent",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="mt-6">{tab === "payments" ? <PaymentsTab /> : <RefundsTab />}</div>
      </section>
    </Container>
  );
};

const PAYMENT_FILTERS = [
  { value: "FLAGGED", label: "Needs attention" },
  { value: "", label: "All" },
  { value: "SUCCESS", label: "Paid" },
  { value: "PENDING", label: "Pending" },
  { value: "FAILED", label: "Failed" },
  { value: "AMOUNT_MISMATCH", label: "Wrong amount" },
];

const PaymentsTab = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("FLAGGED");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  // The answer from the last "Check with Paystack", shown next to that payment
  const [answers, setAnswers] = useState({});
  const [checkingId, setCheckingId] = useState(null);

  const typed = useDebouncedValue(searchText.trim(), 300);
  const q = typed.length >= 3 ? typed : "";
  const filters = {
    flagged: filter === "FLAGGED",
    status: filter === "FLAGGED" ? "" : filter,
    q,
    page,
  };

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["admin-payments", filters],
    queryFn: () => getAdminPaymentsRequest(filters),
    placeholderData: keepPreviousData,
  });

  const handleCheck = async (payment) => {
    setCheckingId(payment.id);
    let answer;
    try {
      const result = await reverifyPaymentRequest(payment.id);
      answer = OUTCOME_WORDS[result.outcome] || result.outcome;
    } catch (requestError) {
      answer = requestError.message;
    }
    setAnswers({ ...answers, [payment.id]: answer });
    setCheckingId(null);
    queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };

  return (
    <>
      <Pills
        label="Show"
        options={PAYMENT_FILTERS}
        value={filter}
        onChange={(value) => {
          setFilter(value);
          setPage(1);
        }}
      />
      <label className="relative mt-4 block max-w-md">
        <span className="sr-only">Payment reference or order number</span>
        <Search
          size={18}
          className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchText}
          onChange={(event) => {
            setSearchText(event.target.value);
            setPage(1);
          }}
          placeholder="Payment reference or order number"
          className="h-12 w-full rounded-md border border-input bg-background pr-3 pl-10 text-base"
        />
      </label>

      <div className="mt-6">
        {isPending && (
          <div role="status" className="space-y-3">
            <span className="sr-only">Loading payments</span>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}
        {error && <ErrorState message={error.message} onRetry={refetch} />}
        {data && data.payments.length === 0 && (
          <EmptyState
            icon={Banknote}
            title={filter === "FLAGGED" ? "Nothing needs attention" : "No payments found"}
          />
        )}
        {data && data.payments.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {data.payments.map((payment) => (
              <li key={payment.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold break-all">{payment.reference}</span>
                  <StatusPill
                    label={PAYMENT_STATUSES[payment.status].label}
                    tone={PAYMENT_STATUSES[payment.status].tone}
                  />
                </div>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  <Link to={"/admin/orders/" + payment.order.id} className="underline">
                    {payment.order.orderNumber}
                  </Link>{" "}
                  · {payment.order.customer ? payment.order.customer.fullName : "—"} ·{" "}
                  {formatDateTime(payment.createdAt)}
                </p>
                <p className="mt-0.5 text-[15px]">
                  <span className="font-bold">{formatMoney(payment.amountPesewas)}</span>
                  {payment.gatewayResponse && (
                    <span className="text-muted-foreground">
                      {" "}
                      · Paystack: {payment.gatewayResponse}
                    </span>
                  )}
                </p>
                {payment.status === "PENDING" && (
                  <button
                    type="button"
                    onClick={() => handleCheck(payment)}
                    disabled={checkingId === payment.id}
                    className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 font-bold disabled:opacity-40"
                  >
                    <RefreshCw size={16} aria-hidden="true" />
                    {checkingId === payment.id ? "Checking…" : "Check with Paystack"}
                  </button>
                )}
                {answers[payment.id] && (
                  <p role="status" className="mt-2 text-[15px]">
                    {answers[payment.id]}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Pager meta={data && data.meta} page={page} onPage={setPage} />
    </>
  );
};

const REFUND_FILTERS = [
  { value: "FAILED", label: "Failed" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSED", label: "Processed" },
  { value: "", label: "All" },
];

const RefundsTab = () => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("FAILED");
  const [page, setPage] = useState(1);
  // The failed refund whose "Try again" sheet is open
  const [retrying, setRetrying] = useState(null);

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["admin-refunds", { status, page }],
    queryFn: () => getAdminRefundsRequest({ status, page }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <Pills
        label="Show"
        options={REFUND_FILTERS}
        value={status}
        onChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
      />
      <div className="mt-6">
        {isPending && (
          <div role="status">
            <span className="sr-only">Loading refunds</span>
            <Skeleton className="h-20 w-full" />
          </div>
        )}
        {error && <ErrorState message={error.message} onRetry={refetch} />}
        {data && data.refunds.length === 0 && (
          <EmptyState
            icon={Undo2}
            title={status === "FAILED" ? "No failed refunds" : "No refunds found"}
          />
        )}
        {data && data.refunds.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {data.refunds.map((refund) => (
              <li key={refund.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold">{formatMoney(refund.amountPesewas)}</span>
                  <StatusPill
                    label={REFUND_STATUSES[refund.status].label}
                    tone={REFUND_STATUSES[refund.status].tone}
                  />
                </div>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  <Link to={"/admin/orders/" + refund.order.id} className="underline">
                    {refund.order.orderNumber}
                  </Link>{" "}
                  · {formatDateTime(refund.createdAt)} ·{" "}
                  {REASON_WORDS[refund.reason] || refund.reason}
                </p>
                {refund.failureReason && (
                  <p className="mt-1 text-[15px] text-destructive">{refund.failureReason}</p>
                )}
                {refund.status === "FAILED" && (
                  <button
                    type="button"
                    onClick={() => setRetrying(refund)}
                    className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 font-bold"
                  >
                    <RefreshCw size={16} aria-hidden="true" />
                    Try again
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Pager meta={data && data.meta} page={page} onPage={setPage} />

      {retrying && (
        <ConfirmActionSheet
          title={"Send the " + formatMoney(retrying.amountPesewas) + " refund again?"}
          description={
            "For order " + retrying.order.orderNumber + ". Paystack gets a new refund request."
          }
          confirmLabel="Send again"
          needsReason
          onConfirm={async (reason) => {
            await retryRefundRequest(retrying.id, reason);
            queryClient.invalidateQueries({ queryKey: ["admin-refunds"] });
            queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
          }}
          onClose={() => setRetrying(null)}
        />
      )}
    </>
  );
};

export default AdminPaymentsPage;
