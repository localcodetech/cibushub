import { formatMoney } from "@/utils/money";

// Items and money for checkout, all from the server's quote [AC-CHK-01, AC-CHK-02].
// quote: the answer from POST /customer/checkout/quote
const OrderSummary = ({ quote }) => {
  return (
    <section>
      <h2 className="font-heading text-lg font-bold">Your order</h2>

      <ul className="mt-3 divide-y divide-border border-y border-border">
        {quote.lines.map((line, index) => (
          // The same dish can appear twice with different options, so add the index
          <li key={line.menuItemId + index} className="flex justify-between gap-4 py-3">
            <div className="min-w-0">
              <p>
                <span className="font-bold">{line.quantity} ×</span> {line.name}
              </p>
              {line.options.length > 0 && (
                <p className="text-[15px] text-muted-foreground">
                  {line.options.map((option) => option.name).join(", ")}
                </p>
              )}
            </div>
            <p className="shrink-0">{formatMoney(line.lineTotalPesewas)}</p>
          </li>
        ))}
      </ul>

      <dl className="mt-3 space-y-1 text-[15px]">
        <MoneyRow label="Subtotal" pesewas={quote.subtotalPesewas} />
        <MoneyRow label="Delivery fee" pesewas={quote.deliveryFeePesewas} />
        {/* Only shown when there is one [AC-CHK-01] */}
        {quote.serviceFeePesewas > 0 && (
          <MoneyRow label="Service fee" pesewas={quote.serviceFeePesewas} />
        )}
        {quote.discountPesewas > 0 && (
          <MoneyRow label="Discount" pesewas={-quote.discountPesewas} />
        )}
        <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
          <dt>Total</dt>
          <dd>{formatMoney(quote.totalPesewas)}</dd>
        </div>
      </dl>

      {/* The distance the fee was worked out from, so the fee isn't a mystery [AC-CHK-03] */}
      {quote.delivery && (
        <p className="mt-2 text-[13px] text-muted-foreground">
          Delivery fee for about {(quote.delivery.roadMeters / 1000).toFixed(1)} km by road.
        </p>
      )}
    </section>
  );
};

// One "label ........ GHS 12.00" line
const MoneyRow = ({ label, pesewas }) => {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{formatMoney(pesewas)}</dd>
    </div>
  );
};

export default OrderSummary;
