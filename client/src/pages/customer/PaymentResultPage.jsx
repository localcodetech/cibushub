import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Card from "@/components/common/Card";
import ErrorState from "@/components/common/ErrorState";
import { getPaymentStatusRequest, startPaymentRequest } from "@/api/orders";
import { formatMoney } from "@/utils/money";

const ASK_EVERY_MS = 3000;
// Mobile Money can take a while to approve; after this we stop asking on our own
const STOP_ASKING_AFTER_MS = 2 * 60 * 1000;

// /orders/:orderId/payment: Paystack sends the customer back here after paying [AC-PAY-09, AC-PAY-10].
// Coming back proves nothing: the page asks OUR server, which asks Paystack, until it knows.
const PaymentResultPage = () => {
  const { orderId } = useParams();
  const queryClient = useQueryClient();
  const [isTakingLong, setIsTakingLong] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");

  // After 2 minutes, stop asking automatically and offer "Check again" instead
  useEffect(() => {
    const timer = setTimeout(() => setIsTakingLong(true), STOP_ASKING_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  const { data, error, refetch, isFetching } = useQuery({
    queryKey: ["payment-status", orderId],
    queryFn: () => getPaymentStatusRequest(orderId),
    // Ask again every 3 seconds, but only while the answer is still "PENDING"
    refetchInterval: (query) => {
      const answer = query.state.data;
      if (answer && answer.state === "PENDING" && !isTakingLong) {
        return ASK_EVERY_MS;
      }
      return false;
    },
  });

  // Paid: the orders list and the order page are out of date now
  const isPaid = data && data.state === "PAID";
  useEffect(() => {
    if (isPaid) {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }
  }, [isPaid, queryClient]);

  // "Try again": same order, a fresh trip to Paystack [AC-PAY-10]
  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryError("");
    try {
      const payment = await startPaymentRequest(orderId);
      window.location.assign(payment.authorizationUrl);
    } catch (error) {
      setRetryError(error.message);
      setIsRetrying(false);
    }
  };

  if (error) {
    return (
      <ResultLayout>
        <ErrorState message={error.message} onRetry={refetch} />
      </ResultLayout>
    );
  }

  // First answer not here yet
  if (!data) {
    return (
      <ResultLayout>
        <Waiting title="Confirming payment…" />
      </ResultLayout>
    );
  }

  if (data.state === "PAID") {
    return (
      <ResultLayout>
        <Card className="text-center">
          <CircleCheck size={48} className="mx-auto text-primary" aria-hidden="true" />
          <Heading level={2} className="mt-3">
            Payment confirmed
          </Heading>
          <Text muted className="mt-1">
            Order {data.orderNumber} · {formatMoney(data.totalPesewas)}
          </Text>
          <Text className="mt-3">The restaurant has your order. We'll keep you posted.</Text>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              to={"/customer/orders/" + data.orderId}
              className="flex min-h-12 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground"
            >
              Track my order
            </Link>
            <Link
              to={"/customer/orders/" + data.orderId + "/receipt"}
              className="flex min-h-12 items-center justify-center rounded-md border border-border font-bold"
            >
              View receipt
            </Link>
          </div>
        </Card>
      </ResultLayout>
    );
  }

  if (data.state === "PENDING") {
    return (
      <ResultLayout>
        {isTakingLong ? (
          <Card className="text-center">
            <Heading level={2}>Still confirming</Heading>
            <Text muted className="mt-2">
              Mobile Money can take a few minutes. If you approved the prompt, your order will
              update on its own; you don't need to pay again.
            </Text>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="mt-6 min-h-12 w-full rounded-md bg-primary font-bold text-primary-foreground disabled:opacity-60"
            >
              {isFetching ? "Checking…" : "Check again"}
            </button>
          </Card>
        ) : (
          <Waiting
            title="Confirming payment…"
            hint="Paying with Mobile Money? Approve the prompt on your phone. Please keep this page open."
          />
        )}
      </ResultLayout>
    );
  }

  // FAILED, NOT_COMPLETED or NOT_STARTED: the order is saved, they can pay again [AC-PAY-10]
  if (data.state === "FAILED" || data.state === "NOT_COMPLETED" || data.state === "NOT_STARTED") {
    const title = data.state === "NOT_STARTED" ? "Pay for your order" : "Payment didn't go through";

    return (
      <ResultLayout>
        <Card className="text-center">
          {data.state !== "NOT_STARTED" && (
            <CircleX size={48} className="mx-auto text-destructive" aria-hidden="true" />
          )}
          <Heading level={2} className="mt-3">
            {title}
          </Heading>
          {data.message && <Text className="mt-2">{data.message}.</Text>}
          <Text muted className="mt-2">
            Order {data.orderNumber} is saved. You have 30 minutes from placing it to pay; no money
            was taken for this try.
          </Text>
          {retryError && (
            <p role="alert" className="mt-3 text-[15px] text-destructive">
              {retryError}
            </p>
          )}
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="mt-6 min-h-12 w-full rounded-md bg-primary font-bold text-primary-foreground disabled:opacity-60"
          >
            {isRetrying ? "Opening payment…" : "Pay " + formatMoney(data.totalPesewas)}
          </button>
        </Card>
      </ResultLayout>
    );
  }

  // PROBLEM (wrong amount) or CLOSED (cancelled before payment)
  return (
    <ResultLayout>
      <Card className="text-center">
        <CircleAlert size={48} className="mx-auto text-destructive" aria-hidden="true" />
        <Heading level={2} className="mt-3">
          {data.state === "CLOSED" ? "Order cancelled" : "We're checking this payment"}
        </Heading>
        <Text className="mt-2">{data.message}.</Text>
        <Text muted className="mt-1">
          Order {data.orderNumber}
        </Text>
        <Link
          to="/restaurants"
          className="mt-6 flex min-h-12 items-center justify-center rounded-md border border-border font-bold"
        >
          Back to restaurants
        </Link>
      </Card>
    </ResultLayout>
  );
};

// A spinner with a short message. role="status" lets screen readers announce it
const Waiting = ({ title, hint }) => {
  return (
    <Card className="text-center">
      <div role="status">
        <LoaderCircle size={40} className="mx-auto animate-spin text-primary" aria-hidden="true" />
        <Heading level={2} className="mt-3">
          {title}
        </Heading>
      </div>
      {hint && (
        <Text muted className="mt-2">
          {hint}
        </Text>
      )}
    </Card>
  );
};

const ResultLayout = ({ children }) => {
  return (
    <Container>
      <section className="mx-auto max-w-md py-10">{children}</section>
    </Container>
  );
};

export default PaymentResultPage;
