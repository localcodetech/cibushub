import { useEffect } from "react";
import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, ReceiptText } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { getReceiptRequest } from "@/api/orders";
import { formatMoney } from "@/utils/money";
import { formatDateTime } from "@/utils/date";



// /customer/orders/:orderId/receipt: what was paid, with a "Download PDF" button [AC-PAY-15, AC-PAY-17].
// The prices come from the order's frozen copy, never today's menu.
const ReceiptPage = () => {
  const { orderId } = useParams();

  const {
    data: receipt,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ["receipt", orderId],
    queryFn: () => getReceiptRequest(orderId),
    // Asking again won't change "not yours" or "not paid"
    retry: (failureCount, error) =>
      error.status !== 404 && error.status !== 409 && failureCount < 3,
  });

  // The browser names the saved PDF after the page title: "CibusHub receipt CH-1042.pdf"
  useEffect(() => {
    if (!receipt) {
      return;
    }
    const oldTitle = document.title;
    document.title = "CibusHub receipt " + receipt.orderNumber;
    // Put the old title back when leaving the page
    return () => {
      document.title = oldTitle;
    };
  }, [receipt]);

  // window.print() opens the browser's print window, where "Save as PDF" is one of the printers.
  // Paper is white, so a dark theme is switched to light just for printing, then put back.
  const handleDownloadPdf = () => {
    const page = document.documentElement;
    const wasDark = page.classList.contains("dark");

    if (wasDark) {
      page.classList.remove("dark");
      // "afterprint" fires when the print window closes (printed, saved or cancelled)
      window.addEventListener("afterprint", () => page.classList.add("dark"), { once: true });
    }

    window.print();
  };

  if (isPending) {
    return (
      <ReceiptLayout>
        <div role="status" className="space-y-3">
          <span className="sr-only">Loading receipt</span>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      </ReceiptLayout>
    );
  }

  if (error && error.status === 404) {
    return (
      <ReceiptLayout>
        <EmptyState
          icon={ReceiptText}
          title="Receipt not found"
          message="This order doesn't exist or isn't yours."
        />
      </ReceiptLayout>
    );
  }

  if (error && error.code === "RECEIPT_NOT_AVAILABLE") {
    return (
      <ReceiptLayout>
        <EmptyState
          icon={ReceiptText}
          title="No receipt yet"
          message="The receipt appears once the order is paid."
        />
      </ReceiptLayout>
    );
  }

  if (error) {
    return (
      <ReceiptLayout>
        <ErrorState message={error.message} onRetry={refetch} />
      </ReceiptLayout>
    );
  }

  return (
    <ReceiptLayout>
      <div className="flex items-start justify-between gap-4">
        <div>
          <Heading level={1}>Receipt</Heading>
          <Text muted className="mt-1">
            Order {receipt.orderNumber} · {receipt.restaurantName}
          </Text>
          {receipt.paidAt && (
            <Text size="small" muted>
              Paid {formatDateTime(receipt.paidAt)}
            </Text>
          )}
        </div>

        {/* print:hidden keeps this button off the paper */}
        <button
          type="button"
          onClick={handleDownloadPdf}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border border-border px-4 font-bold print:hidden"
        >
          <Download size={18} aria-hidden="true" />
          Download PDF
        </button>
      </div>

      {/* Dishes */}
      <ul className="mt-6 divide-y divide-border border-y border-border">
        {receipt.items.map((item, index) => (
          // Two lines can be the same dish with different options, so the index makes the key unique
          <li key={item.name + index} className="flex justify-between gap-4 py-3">
            <div className="min-w-0">
              <p>
                <span className="font-bold">{item.quantity} ×</span> {item.name}
              </p>
              {item.options.length > 0 && (
                <p className="text-[15px] text-muted-foreground">{item.options.join(", ")}</p>
              )}
            </div>
            <p className="shrink-0">{formatMoney(item.lineTotalPesewas)}</p>
          </li>
        ))}
      </ul>

      {/* Money summary */}
      <dl className="mt-4 space-y-1 text-[15px]">
        <SummaryRow label="Subtotal" pesewas={receipt.subtotalPesewas} />
        <SummaryRow label="Delivery fee" pesewas={receipt.deliveryFeePesewas} />
        <SummaryRow label="Service fee" pesewas={receipt.serviceFeePesewas} />
        {receipt.discountPesewas > 0 && (
          <SummaryRow label="Discount" pesewas={-receipt.discountPesewas} />
        )}
        <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
          <dt>Total paid</dt>
          <dd>{formatMoney(receipt.totalPesewas)}</dd>
        </div>
      </dl>

      {/* Payment details */}
      <dl className="mt-6 space-y-1 text-[15px] text-muted-foreground">
        {receipt.paymentMethod && (
          <div className="flex justify-between gap-4">
            <dt>Paid by</dt>
            <dd>{receipt.paymentMethod}</dd>
          </div>
        )}
        {receipt.paymentReference && (
          <div className="flex justify-between gap-4">
            <dt>Payment reference</dt>
            <dd className="break-all">{receipt.paymentReference}</dd>
          </div>
        )}
      </dl>

      {/* Only on paper: the navbar (with the name) is hidden when printing */}
      <p className="mt-8 hidden text-[13px] print:block">CibusHub · Food delivery in Kumasi</p>
    </ReceiptLayout>
  );
};

// One "label ........ GHS 12.00" line
const SummaryRow = ({ label, pesewas }) => {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{formatMoney(pesewas)}</dd>
    </div>
  );
};

// print: classes only apply on paper / PDF: black text on white, no padding, full width
const ReceiptLayout = ({ children }) => {
  return (
    <Container>
      <section className="mx-auto max-w-xl py-8 print:max-w-none print:bg-white print:py-0 print:text-black">
        {children}
      </section>
    </Container>
  );
};

export default ReceiptPage;
