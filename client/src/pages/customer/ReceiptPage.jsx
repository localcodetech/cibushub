import { useState } from "react";
import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, ReceiptText } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import ReceiptDocument from "@/components/receipt/ReceiptDocument";
import { downloadReceiptPdfRequest, getReceiptRequest } from "@/api/orders";

// /customer/orders/:orderId/receipt: what was paid, with a "Download PDF" button [AC-PAY-15, AC-PAY-17].
// The prices come from the order's frozen copy, never today's menu.
const ReceiptPage = () => {
  const { orderId } = useParams();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

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

  // Downloads the PDF the server makes: one tap, straight into Downloads [AC-PAY-17]
  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    setDownloadError("");
    try {
      await downloadReceiptPdfRequest(orderId, receipt.orderNumber);
    } catch (error) {
      setDownloadError(error.message);
    }
    setIsDownloading(false);
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
      {/* The bar above the receipt: on screen only, never on the paper */}
      <div className="mb-4 flex items-center justify-between gap-4 print:hidden">
        <Heading level={1}>Receipt</Heading>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isDownloading}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md bg-primary px-4 font-bold text-primary-foreground disabled:opacity-60"
        >
          <Download size={18} aria-hidden="true" />
          {isDownloading ? "Downloading…" : "Download PDF"}
        </button>
      </div>

      {downloadError && (
        <p role="alert" className="mb-4 text-[15px] text-destructive print:hidden">
          {downloadError}
        </p>
      )}

      <ReceiptDocument receipt={receipt} />
    </ReceiptLayout>
  );
};

// On paper: no page padding or width limit; the A4 margins come from @page in index.css
const ReceiptLayout = ({ children }) => {
  return (
    <Container>
      <section className="mx-auto max-w-2xl py-8 print:max-w-none print:py-0">{children}</section>
    </Container>
  );
};

export default ReceiptPage;
