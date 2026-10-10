import { COMPANY_ADDRESS, COMPANY_NAME, CONTACT_EMAIL } from "@/data/legal/legalInfo";
import { formatMoney } from "@/utils/money";
import { formatDateTime } from "@/utils/date";

// What the badge in the corner says for each payment state
const PAYMENT_BADGES = {
  PAID: "Paid",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partly refunded",
};

// The receipt as a branded document: the same on screen and on A4 paper / PDF [AC-PAY-17].
// Everything comes from the order's frozen copy, so it never changes after payment [AC-PAY-15].
// receipt: the answer from GET /customer/orders/:orderId/receipt
const ReceiptDocument = ({ receipt }) => {
  const deliveryLines = [receipt.deliveryArea, receipt.deliveryLandmark].filter(Boolean);

  return (
    // print:shadow-none / print:border-0: on paper the page itself is the edge
    <article className="overflow-hidden rounded-xl border border-border bg-white text-[#2b2118] shadow-sm print:rounded-none print:border-0 print:shadow-none">
      {/* ── Brand header: forest green band with the logo ── */}
      <header className="flex items-center justify-between gap-4 bg-[#123c2a] px-6 py-5 text-[#f7f0df]">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="size-11" />
          <div>
            <p className="font-heading text-2xl leading-none font-extrabold">CibusHub</p>
            <p className="mt-1 hidden text-[13px] whitespace-nowrap opacity-80 sm:block print:block">
              Food delivery in Kumasi
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-heading text-lg font-bold tracking-widest">RECEIPT</p>
          {/* Phones: too tight here, and the order number is just below anyway */}
          <p className="hidden text-[13px] opacity-80 sm:block print:block">
            {receipt.orderNumber}
          </p>
        </div>
      </header>

      <div className="space-y-6 px-6 py-6">
        {/* ── Key facts + paid badge ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[14px]">
            <dt className="text-[#6b5d4f]">Order number</dt>
            <dd className="font-bold">{receipt.orderNumber}</dd>
            <dt className="text-[#6b5d4f]">Ordered</dt>
            <dd>{formatDateTime(receipt.placedAt)}</dd>
            {receipt.paidAt && (
              <>
                <dt className="text-[#6b5d4f]">Paid</dt>
                <dd>{formatDateTime(receipt.paidAt)}</dd>
              </>
            )}
          </dl>
          <span className="rounded-full border-2 border-[#123c2a] px-4 py-1 font-heading text-sm font-extrabold tracking-wider text-[#123c2a] uppercase">
            {PAYMENT_BADGES[receipt.paymentStatus] || "Paid"}
          </span>
        </div>

        {/* ── Who and where: two columns on wide screens and paper, one on phones ── */}
        <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
          <PartyBox title="Billed to">
            <p className="font-bold">{receipt.customerName}</p>
            <p>{receipt.contactPhone}</p>
            {deliveryLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {receipt.deliveryGhanaPostGps && <p>GPS: {receipt.deliveryGhanaPostGps}</p>}
          </PartyBox>
          <PartyBox title="From">
            <p className="font-bold">{receipt.restaurantName}</p>
            {receipt.restaurantAddress && <p>{receipt.restaurantAddress}</p>}
            {receipt.restaurantPhone && <p>{receipt.restaurantPhone}</p>}
          </PartyBox>
        </div>

        {/* ── Items: a real table, so columns line up on paper ── */}
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b-2 border-[#123c2a] text-left text-[12px] tracking-wider text-[#6b5d4f] uppercase">
              <th className="py-2 font-bold">Item</th>
              <th className="py-2 text-center font-bold">Qty</th>
              <th className="hidden py-2 text-right font-bold sm:table-cell print:table-cell">
                Unit price
              </th>
              <th className="py-2 text-right font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((item, index) => (
              // Same dish twice with different options: the index keeps keys unique
              <tr key={item.name + index} className="border-b border-[#e6dccb] align-top">
                <td className="py-2.5 pr-2">
                  <p className="font-bold">{item.name}</p>
                  {item.options.length > 0 && (
                    <p className="text-[13px] text-[#6b5d4f]">{item.options.join(", ")}</p>
                  )}
                </td>
                <td className="py-2.5 text-center">{item.quantity}</td>
                <td className="hidden py-2.5 text-right whitespace-nowrap sm:table-cell print:table-cell">
                  {formatMoney(item.unitPricePesewas)}
                </td>
                <td className="py-2.5 text-right whitespace-nowrap">
                  {formatMoney(item.lineTotalPesewas)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Totals, on the right like a printed bill ── */}
        <dl className="ml-auto w-full max-w-xs space-y-1 text-[14px]">
          <TotalRow label="Subtotal" pesewas={receipt.subtotalPesewas} />
          <TotalRow label="Delivery fee" pesewas={receipt.deliveryFeePesewas} />
          {receipt.serviceFeePesewas > 0 && (
            <TotalRow label="Service fee" pesewas={receipt.serviceFeePesewas} />
          )}
          {receipt.discountPesewas > 0 && (
            <TotalRow label="Discount" pesewas={-receipt.discountPesewas} />
          )}
          <div className="mt-2 flex justify-between rounded-md bg-[#123c2a] px-3 py-2 font-heading text-base font-bold text-[#f7f0df]">
            <dt>Total paid</dt>
            <dd>{formatMoney(receipt.totalPesewas)}</dd>
          </div>
        </dl>

        {/* ── Payment ── */}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-[#f7f0df] px-4 py-3 text-[14px]">
          <dt className="text-[#6b5d4f]">Paid with</dt>
          <dd>{receipt.paymentMethod || "—"} (Paystack)</dd>
          <dt className="text-[#6b5d4f]">Reference</dt>
          <dd className="break-all">{receipt.paymentReference || "—"}</dd>
        </dl>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-[#e6dccb] px-6 py-4 text-center text-[12px] text-[#6b5d4f]">
        <p className="font-bold text-[#2b2118]">Thank you for ordering with CibusHub!</p>
        <p className="mt-1">All amounts are in Ghana cedis (GHS).</p>
        <p className="mt-1">
          {COMPANY_NAME} · {COMPANY_ADDRESS} · {CONTACT_EMAIL}
        </p>
      </footer>
    </article>
  );
};

// A small titled box for "Billed to" / "From"
const PartyBox = ({ title, children }) => {
  return (
    <div className="rounded-lg border border-[#e6dccb] px-4 py-3 text-[14px] leading-relaxed">
      <p className="mb-1 text-[12px] font-bold tracking-wider text-[#6b5d4f] uppercase">{title}</p>
      {children}
    </div>
  );
};

// One "label ........ GHS 12.00" line
const TotalRow = ({ label, pesewas }) => {
  return (
    <div className="flex justify-between px-3">
      <dt className="text-[#6b5d4f]">{label}</dt>
      <dd>{formatMoney(pesewas)}</dd>
    </div>
  );
};

export default ReceiptDocument;
