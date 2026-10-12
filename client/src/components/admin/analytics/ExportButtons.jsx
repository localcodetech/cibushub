import { useState } from "react";
import { Download } from "lucide-react";
import { downloadExportRequest } from "@/api/admin";

const EXPORTS = [
  { kind: "orders", label: "Orders (CSV)" },
  { kind: "payments", label: "Payments (CSV)" },
];

// Download the chosen period's orders or payments as spreadsheet files [AC-ANL-04].
// Each download is written in the audit log on the server.
//   range: { from, to }; disabled while the range has a problem
const ExportButtons = ({ range, disabled }) => {
  // The kind being downloaded right now, or ""
  const [working, setWorking] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const download = async (kind) => {
    setErrorMessage("");
    setWorking(kind);
    try {
      await downloadExportRequest(kind, range);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setWorking("");
    }
  };

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[15px] font-bold">Download this period:</span>
        {EXPORTS.map((item) => (
          <button
            key={item.kind}
            type="button"
            onClick={() => download(item.kind)}
            disabled={disabled || working !== ""}
            className="flex min-h-11 items-center gap-2 rounded-md border border-border px-3 font-bold disabled:opacity-50"
          >
            <Download size={18} aria-hidden="true" />
            {working === item.kind ? "Preparing…" : item.label}
          </button>
        ))}
      </div>
      {errorMessage && (
        <p role="alert" className="mt-2 text-[15px] text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default ExportButtons;
