import { Lock } from "lucide-react";
import Card, { CardHeader } from "@/components/common/Card";
import FileUploadRow from "@/components/common/FileUploadRow";
import Text from "@/components/typography/Text";
import { uploadDocumentRequest } from "@/api/ownerRestaurants";
import { DOCUMENT_NAMES } from "@/data/restaurantStatuses";
import { formatDateTime } from "@/utils/date";

// What each document is, in the owner's words
const DOCUMENT_HINTS = {
  BUSINESS_REGISTRATION: "Your Registrar-General's certificate",
  FDA_CERTIFICATE: "Food hygiene certificate from the Food and Drugs Authority",
  GHANA_CARD: "Front of the owner's Ghana Card",
  OPERATING_LICENCE: "From your Metropolitan or Municipal Assembly",
};

// The 4 verification documents our team checks before approving [AC-REST-01, AC-IMG-03].
// They are private: the owner can replace them but never gets a link back.
//   documents: what's uploaded so far [{ documentType, updatedAt }]
//   onUploaded(): the page loads the list again
const RestaurantDocuments = ({ restaurantId, documents, onUploaded }) => {
  const upload = async (documentType, file) => {
    await uploadDocumentRequest(restaurantId, documentType, file);
    await onUploaded();
  };

  return (
    <Card padding="lg">
      <CardHeader title="Documents" level={2} />
      <Text muted className="flex items-start gap-2 text-[15px]">
        <Lock size={16} className="mt-1 shrink-0" aria-hidden="true" />
        Private: only our review team sees these. A clear photo or a PDF, up to 5 MB.
      </Text>
      {Object.keys(DOCUMENT_NAMES).map((documentType) => {
        const uploaded = documents.find((document) => document.documentType === documentType);
        return (
          <FileUploadRow
            key={documentType}
            title={DOCUMENT_NAMES[documentType]}
            hint={
              uploaded
                ? "Uploaded " + formatDateTime(uploaded.updatedAt)
                : DOCUMENT_HINTS[documentType]
            }
            accept="image/jpeg,image/png,image/webp,application/pdf"
            isDone={Boolean(uploaded)}
            onUpload={(file) => upload(documentType, file)}
          />
        );
      })}
    </Card>
  );
};

export default RestaurantDocuments;
