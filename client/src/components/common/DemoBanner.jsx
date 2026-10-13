import { FlaskConical } from "lucide-react";
import { isDemoSite } from "@/utils/site";

// A thin strip above the navbar on demo.cibushubgh.com, so nobody mistakes the demo for the
// real service: its restaurants are made up and payments run in Paystack's test mode.
const DemoBanner = () => {
  if (!isDemoSite) {
    return null;
  }

  return (
    <div className="bg-gold text-gold-foreground print:hidden">
      <p className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-1.5 text-center text-[13px] font-bold">
        <FlaskConical size={14} aria-hidden="true" className="shrink-0" />
        Demo: made-up restaurants, test payments, no real deliveries.
      </p>
    </div>
  );
};

export default DemoBanner;
