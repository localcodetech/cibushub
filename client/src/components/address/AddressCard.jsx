import { Link } from "react-router";
import Card from "@/components/common/Card";
import { findAddressLabel } from "@/data/addressLabels";

// One saved address with its actions: Make default, Edit, Delete [AC-CUST-03, AC-CUST-07].
// address:          one item from GET /customer/addresses
// isBusy:           true while a change to this address is being saved
// onMakeDefault / onDelete: what the buttons do
const AddressCard = ({ address, isBusy, onMakeDefault, onDelete }) => {
  const label = findAddressLabel(address.label);
  const Icon = label.icon;

  return (
    <Card>
      <div className="flex items-start gap-3">
        <Icon size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold">{label.label}</p>
            {address.isDefault && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[13px] font-bold text-primary">
                Default
              </span>
            )}
          </div>

          {/* Only the parts the customer filled in */}
          {address.area && <p className="mt-1">{address.area}</p>}
          {address.landmark && (
            <p className="text-[15px] text-muted-foreground">{address.landmark}</p>
          )}
          {address.ghanaPostGps && (
            <p className="text-[15px] text-muted-foreground">GPS: {address.ghanaPostGps}</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 border-t border-border pt-2">
        {!address.isDefault && (
          <button
            type="button"
            disabled={isBusy}
            onClick={onMakeDefault}
            className="min-h-11 text-[15px] font-bold text-primary disabled:opacity-40"
          >
            Make default
          </button>
        )}
        <Link
          to={"/customer/addresses/" + address.id + "/edit"}
          className="inline-flex min-h-11 items-center text-[15px] font-bold text-primary"
        >
          Edit
        </Link>
        <button
          type="button"
          disabled={isBusy}
          onClick={onDelete}
          className="min-h-11 text-[15px] font-bold text-destructive disabled:opacity-40"
        >
          Delete
        </button>
      </div>
    </Card>
  );
};

export default AddressCard;
