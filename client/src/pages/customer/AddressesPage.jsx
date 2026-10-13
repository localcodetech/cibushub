import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPinned, Plus } from "lucide-react";
import Container from "@/layouts/Container";
import Text from "@/components/typography/Text";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import Sheet from "@/components/common/Sheet";
import AddressCard from "@/components/address/AddressCard";
import { MAX_ADDRESSES } from "@/data/addressLabels";
import PageHeader from "@/components/common/PageHeader";
import {
  deleteAddressRequest,
  getAddressesRequest,
  makeDefaultAddressRequest,
} from "@/api/addresses";

// /customer/addresses: the customer's saved delivery addresses [AC-CUST-03, 07, 08]
const AddressesPage = () => {
  const queryClient = useQueryClient();
  // The address waiting for "Delete this address?", or null
  const [addressToDelete, setAddressToDelete] = useState(null);
  // A message when a change fails (e.g. no internet)
  const [actionError, setActionError] = useState("");

  const {
    data: addresses,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ["addresses"],
    queryFn: getAddressesRequest,
  });

  // useMutation is for requests that CHANGE data. After success we mark the list
  // as out of date (invalidate), so TanStack Query fetches it again.
  const makeDefault = useMutation({
    mutationFn: makeDefaultAddressRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
    onError: (error) => setActionError(error.message),
  });

  const remove = useMutation({
    mutationFn: deleteAddressRequest,
    onSuccess: () => {
      setAddressToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
    onError: (error) => {
      setAddressToDelete(null);
      setActionError(error.message);
    },
  });

  const handleMakeDefault = (addressId) => {
    setActionError("");
    makeDefault.mutate(addressId);
  };

  const handleConfirmDelete = () => {
    setActionError("");
    remove.mutate(addressToDelete.id);
  };

  // The id of the address being changed right now, so only its buttons wait
  const busyId = makeDefault.isPending ? makeDefault.variables : null;
  const isFull = addresses && addresses.length >= MAX_ADDRESSES;

  return (
    <Container>
      <section className="mx-auto max-w-2xl py-8">
        <PageHeader
          title="My addresses"

          actions={
            <>
              {addresses && addresses.length > 0 && !isFull && (
                <Link
                  to="/customer/addresses/new"
                  className="inline-flex min-h-11 items-center gap-1 rounded-md bg-primary px-4 font-bold text-primary-foreground"
                >
                  <Plus size={18} aria-hidden="true" />
                  Add address
                </Link>
              )}
            </>
          }
        />

        {isFull && (
          <Text size="small" muted className="mt-2">
            You have {MAX_ADDRESSES} addresses, the most you can keep. Delete one to add another.
          </Text>
        )}

        {actionError && (
          <p role="alert" className="mt-4 text-[15px] text-destructive">
            {actionError}
          </p>
        )}

        <div className="mt-6">
          <AddressList
            addresses={addresses}
            isPending={isPending}
            error={error}
            busyId={busyId}
            onRetry={refetch}
            onMakeDefault={handleMakeDefault}
            onDelete={setAddressToDelete}
          />
        </div>
      </section>

      {addressToDelete && (
        <Sheet
          title="Delete this address?"
          description={
            addressToDelete.isDefault
              ? "It is your default. Your newest other address will become the default."
              : "You can add it again later."
          }
          onClose={() => setAddressToDelete(null)}
        >
          <div className="flex flex-col gap-3 p-4 sm:flex-row-reverse">
            <button
              type="button"
              disabled={remove.isPending}
              onClick={handleConfirmDelete}
              className="min-h-12 flex-1 rounded-md bg-destructive px-5 font-bold text-white disabled:opacity-60"
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </button>
            <button
              type="button"
              onClick={() => setAddressToDelete(null)}
              className="min-h-12 flex-1 rounded-md border border-border px-5 font-bold"
            >
              Cancel
            </button>
          </div>
        </Sheet>
      )}
    </Container>
  );
};

// Loading, error, empty or the list [AC-UX-02 to 04]
const AddressList = ({ addresses, isPending, error, busyId, onRetry, onMakeDefault, onDelete }) => {
  if (isPending) {
    return (
      <div role="status" className="space-y-4">
        <span className="sr-only">Loading addresses</span>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={onRetry} />;
  }

  if (addresses.length === 0) {
    return (
      <EmptyState
        icon={MapPinned}
        title="No saved addresses yet"
        message="Add where you want your food delivered. You'll drop a pin so the rider finds you."
        action={{ label: "Add an address", to: "/customer/addresses/new" }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {addresses.map((address) => (
        <AddressCard
          key={address.id}
          address={address}
          isBusy={busyId === address.id}
          onMakeDefault={() => onMakeDefault(address.id)}
          onDelete={() => onDelete(address)}
        />
      ))}
    </div>
  );
};

export default AddressesPage;
