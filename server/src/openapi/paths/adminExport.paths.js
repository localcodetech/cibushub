import { errorResponse, queryParameters } from "../helpers.js";
import { analyticsRangeSchema } from "../../validators/admin/analytics.validator.js";

// A CSV download: the file, not our JSON envelope
const csvResponse = (description, example) => ({
  description,
  content: { "text/csv": { schema: { type: "string" }, example } },
});

const exportPath = (summary, description, example) => ({
  get: {
    tags: ["Admin: Exports"],
    summary,
    description:
      description +
      " Money in cedis (70.72), times in Ghana time, no phones or emails. Formula-looking cells start with ' (CSV injection). Audited as DATA_EXPORTED [AC-ANL-04].",
    security: [{ cookieAuth: [] }],
    parameters: queryParameters(analyticsRangeSchema),
    responses: {
      200: csvResponse("The CSV file (attachment)", example),
      400: errorResponse(
        "Bad dates, or more than 92 days",
        "VALIDATION_ERROR",
        "Invalid request data",
      ),
    },
  },
});

export const adminExportPaths = {
  "/api/v1/admin/exports/orders": exportPath(
    "Orders placed in a range of days, as CSV",
    "Orders placed between from and to (Ghana days, both included), unpaid ones too.",
    "Order number,Placed at (Ghana time),Restaurant,Status,...\r\nCH-261009-006516,2026-10-09 12:00:00,Golden Pot,DELIVERED,...\r\n",
  ),
  "/api/v1/admin/exports/payments": exportPath(
    "Payment attempts started in a range of days, as CSV",
    "Payment attempts started between from and to (Ghana days, both included), with processed refunds.",
    "Reference,Started at (Ghana time),Paid at (Ghana time),Order number,...\r\nCH-261009-006516-1,2026-10-09 12:00:00,2026-10-09 12:01:10,CH-261009-006516,...\r\n",
  ),
};
