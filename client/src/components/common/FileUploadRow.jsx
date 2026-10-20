import { useRef, useState } from "react";
import { CircleCheck, Upload } from "lucide-react";
import Text from "@/components/typography/Text";

const MAX_BYTES = 5 * 1024 * 1024; // the server's limit [AC-IMG-01]

// One "upload this" row: a title, a short help line, and an Upload / Replace button.
// The file is sent as soon as it is chosen.
//
// <FileUploadRow title="Ghana Card" hint="Front of the card" accept="image/*,application/pdf"
//   isDone={true} onUpload={(file) => uploadRiderDocumentRequest("GHANA_CARD", file)} />
//
// onUpload(file): sends it; should throw (our API errors) if the server refuses it
// badge: optional, shown beside the title (e.g. "Verified")
// note: optional message under the row (e.g. why our team rejected the file)
const FileUploadRow = ({ title, hint, accept, isDone, disabled, badge, note, onUpload }) => {
  // The real <input type="file"> is hidden; our button "clicks" it
  const inputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileChosen = async (event) => {
    const file = event.target.files[0];
    // Let the same file be chosen again later (e.g. after an error)
    event.target.value = "";
    if (!file) {
      return;
    }
    if (file.size > MAX_BYTES) {
      setErrorMessage("The file must be 5 MB or smaller");
      return;
    }

    setErrorMessage("");
    setIsUploading(true);
    try {
      await onUpload(file);
    } catch (error) {
      setErrorMessage(error.message);
    }
    setIsUploading(false);
  };

  let buttonText = "Upload";
  if (isDone) {
    buttonText = "Replace";
  }
  if (isUploading) {
    buttonText = "Uploading…";
  }

  return (
    <div className="flex flex-col gap-2 border-b border-border py-4 last:border-b-0">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Text className="flex flex-wrap items-center gap-2 font-bold">
            {/* A badge says more than the tick (e.g. "Rejected"), so it replaces it */}
            {isDone && !badge && (
              <CircleCheck size={18} className="text-success" aria-label="Uploaded" />
            )}
            {title}
            {badge}
          </Text>
          {hint && (
            <Text muted className="text-[13px]">
              {hint}
            </Text>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={handleFileChosen}
        />
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current.click()}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border border-border px-4 font-bold disabled:opacity-50"
        >
          <Upload size={18} aria-hidden="true" />
          {buttonText}
        </button>
      </div>

      {note && <p className="text-[15px]">{note}</p>}
      {errorMessage && (
        <p role="alert" className="text-[15px] text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default FileUploadRow;
