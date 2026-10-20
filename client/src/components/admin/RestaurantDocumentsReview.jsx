import { useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Skeleton from "@/components/common/Skeleton";
import StatusBadge from "@/components/common/StatusBadge";
import Alert from "@/components/common/Alert";
import { Button } from "@/components/ui/button";
import ConfirmActionSheet from "@/components/admin/ConfirmActionSheet";
import { reviewRestaurantDocumentRequest } from "@/api/admin";
import { DOCUMENT_NAMES, DOCUMENT_STATUSES, REQUIRED_DOCUMENTS } from "@/data/restaurantStatuses";

// The admin opens each verification document and marks it Verified or Rejected (with a reason
// the owner reads) [AC-REST-01, AC-IMG-03]. The required ones are always listed, even when
// missing, so the admin sees at once what stops the approval.
//   documentsQuery: the page's query for GET /admin/restaurants/:id/documents
//   onReviewed(): the page loads the documents again
const RestaurantDocumentsReview = ({ restaurantId, documentsQuery, onReviewed }) => {
  // The document whose "Reject" sheet is open, or null
  const [rejecting, setRejecting] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [workingOn, setWorkingOn] = useState(null);

  const { data, isPending, error } = documentsQuery;

  const verify = async (documentType) => {
    setErrorMessage("");
    setWorkingOn(documentType);
    try {
      await reviewRestaurantDocumentRequest(restaurantId, documentType, { status: "VERIFIED" });
      await onReviewed();
    } catch (requestError) {
      setErrorMessage(requestError.message);
    }
    setWorkingOn(null);
  };

  // Every required type, then any other uploaded ones, in the DOCUMENT_NAMES order
  const documentTypes = data
    ? Object.keys(DOCUMENT_NAMES).filter(
        (documentType) =>
          REQUIRED_DOCUMENTS.includes(documentType) ||
          data.some((document) => document.documentType === documentType),
      )
    : [];

  return (
    <section className="mt-8">
      <Heading level={2}>Documents</Heading>
      <Text muted className="mt-1 text-[15px]">
        Open each file, then verify or reject it. Business registration and the tax certificate must
        be verified before you can approve.
      </Text>

      {isPending && <Skeleton className="mt-3 h-20 w-full" />}
      {error && (
        <Text muted className="mt-3">
          Documents couldn't load: {error.message}
        </Text>
      )}
      {errorMessage && <Alert className="mt-3">{errorMessage}</Alert>}

      {data && (
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
          {documentTypes.map((documentType) => {
            const document = data.find((each) => each.documentType === documentType);
            return (
              <DocumentRow
                key={documentType}
                documentType={documentType}
                document={document}
                isWorking={workingOn === documentType}
                onVerify={() => verify(documentType)}
                onReject={() => setRejecting(documentType)}
              />
            );
          })}
        </ul>
      )}

      {rejecting && (
        <ConfirmActionSheet
          title={`Reject the ${DOCUMENT_NAMES[rejecting].toLowerCase()}?`}
          description="The owner sees your reason and can upload a new file."
          confirmLabel="Reject"
          needsReason
          isDangerous
          onConfirm={async (reason) => {
            await reviewRestaurantDocumentRequest(restaurantId, rejecting, {
              status: "REJECTED",
              reason,
            });
            await onReviewed();
          }}
          onClose={() => setRejecting(null)}
        />
      )}
    </section>
  );
};

// One document: its name and badge, a link to open it, and the Verify / Reject buttons
const DocumentRow = ({ documentType, document, isWorking, onVerify, onReject }) => {
  const isRequired = REQUIRED_DOCUMENTS.includes(documentType);
  const statusInfo = document ? DOCUMENT_STATUSES[document.verificationStatus] : null;

  return (
    <li className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <FileText size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-bold break-words">{DOCUMENT_NAMES[documentType]}</p>
            {isRequired && <p className="text-[13px] text-muted-foreground">Required</p>}
          </div>
        </div>
        {statusInfo ? (
          <StatusBadge label={statusInfo.label} tone={statusInfo.tone} />
        ) : (
          <StatusBadge label="Not uploaded" tone="neutral" />
        )}
      </div>

      {document && document.rejectionReason && (
        <p className="text-[15px]">
          <span className="font-bold text-destructive">Reason given: </span>
          {document.rejectionReason}
        </p>
      )}

      {document && (
        <div className="flex flex-wrap items-center gap-3">
          {/* The link works for 5 minutes; the page fetches fresh ones */}
          <a
            href={document.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 font-bold text-primary"
          >
            Open {document.format.toUpperCase()}
            <ExternalLink size={16} aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <div className="ml-auto flex gap-2">
            {document.verificationStatus !== "VERIFIED" && (
              <Button onClick={onVerify} disabled={isWorking} className="h-11 font-bold">
                {isWorking ? "Saving…" : "Verify"}
              </Button>
            )}
            {document.verificationStatus !== "REJECTED" && (
              <Button
                variant="outline"
                onClick={onReject}
                disabled={isWorking}
                className="h-11 font-bold text-destructive"
              >
                Reject
              </Button>
            )}
          </div>
        </div>
      )}
    </li>
  );
};

export default RestaurantDocumentsReview;
