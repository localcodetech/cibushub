import { Link } from "react-router";
import { Plus } from "lucide-react";
import { findAddressLabel } from "@/data/addressLabels";

// "Deliver to": the customer's saved addresses as radio buttons, plus "Add a new address" [AC-CHK-01].
// addresses:  the list from GET /customer/addresses (default first)
// selectedId: the chosen address id
// onSelect:   called with the id the customer picks
const AddressPicker = ({ addresses, selectedId, onSelect }) => {
  return (
    <fieldset>
      <legend className="font-heading text-lg font-bold">Deliver to</legend>

      <div className="mt-3 space-y-2">
        {addresses.map((address) => {
          const label = findAddressLabel(address.label);
          const Icon = label.icon;

          return (
            // has-checked: the chosen address gets a green border
            <label
              key={address.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-checked:border-primary has-checked:bg-primary/5 has-focus-visible:ring-2 has-focus-visible:ring-ring"
            >
              <input
                type="radio"
                name="address"
                value={address.id}
                checked={address.id === selectedId}
                onChange={() => onSelect(address.id)}
                className="mt-1 size-5 shrink-0 accent-primary"
              />
              <Icon size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block font-bold">
                  {label.label}
                  {address.isDefault && (
                    <span className="ml-2 text-[13px] font-normal text-muted-foreground">
                      Default
                    </span>
                  )}
                </span>
                {address.area && <span className="block">{address.area}</span>}
                {address.landmark && (
                  <span className="block text-[15px] text-muted-foreground">
                    {address.landmark}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {/* state.returnTo: after saving, the address form brings them back to checkout */}
      <Link
        to="/customer/addresses/new"
        state={{ returnTo: "/checkout" }}
        className="mt-2 inline-flex min-h-11 items-center gap-1 font-bold text-primary"
      >
        <Plus size={18} aria-hidden="true" />
        Add a new address
      </Link>
    </fieldset>
  );
};

export default AddressPicker;
