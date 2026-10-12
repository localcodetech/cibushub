import { CreditCard, RotateCcw, ShieldCheck, Smartphone } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Card from "@/components/common/Card";
import { ListIcon } from "@/components/common/List";

const WAYS_TO_PAY = ["MTN MoMo", "Telecel Cash", "AT Money", "Visa and Mastercard"];

// How paying works, and what happens if a kitchen can't take the order
const PayingSafe = () => {
  return (
    <section className="py-12">
      <Container>
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <Heading level={2}>Paying is safe</Heading>
            <Text muted className="mt-2 max-w-prose">
              Payments go through Paystack, so CibusHub never sees your card number or your Mobile
              Money PIN.
            </Text>
            <ul className="mt-5 flex flex-wrap gap-2">
              {WAYS_TO_PAY.map((way) => (
                <li
                  key={way}
                  className="flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-[15px] font-bold"
                >
                  {way.includes("card") ? (
                    <CreditCard size={16} aria-hidden="true" />
                  ) : (
                    <Smartphone size={16} aria-hidden="true" />
                  )}
                  {way}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <Card className="flex gap-3">
              <ListIcon icon={RotateCcw} tone="gold" />
              <div>
                <p className="font-bold">Full refund if the kitchen can't cook it</p>
                <p className="mt-1 text-[15px] text-muted-foreground">
                  If a restaurant turns your order down, or doesn't answer in time, your money is
                  sent back automatically.
                </p>
              </div>
            </Card>
            <Card className="flex gap-3">
              <ListIcon icon={ShieldCheck} />
              <div>
                <p className="font-bold">Your receipt, every time</p>
                <p className="mt-1 text-[15px] text-muted-foreground">
                  Each paid order comes with a receipt by email, and a PDF you can download.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default PayingSafe;
