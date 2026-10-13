import { useLocation, useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPinOff } from "lucide-react";
import Container from "@/layouts/Container";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import AddressForm from "@/components/address/AddressForm";
import { createAddressRequest, getAddressesRequest, updateAddressRequest } from "@/api/addresses";
import PageHeader from "@/components/common/PageHeader";

// /customer/addresses/new and /customer/addresses/:addressId/edit [AC-CUST-03, AC-CUST-04]
const AddressFormPage = () => {
  // No :addressId in the address means "new"
  const { addressId } = useParams();
  const isEditing = Boolean(addressId);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // To edit, we need the address. It is in the list we already have (or fetch it)
  const {
    data: addresses,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ["addresses"],
    queryFn: getAddressesRequest,
    enabled: isEditing,
  });

  // Called by the form with the details to send. If it throws, the form shows the message
  const handleSave = async (details) => {
    if (isEditing) {
      await updateAddressRequest(addressId, details);
    } else {
      await createAddressRequest(details);
    }
    await queryClient.invalidateQueries({ queryKey: ["addresses"] });
    // Opened from checkout? Go back there; otherwise to the list
    const returnTo = location.state ? location.state.returnTo : null;
    navigate(returnTo === "/checkout" ? "/checkout" : "/customer/addresses");
  };

  const title = isEditing ? "Edit address" : "Add an address";

  if (!isEditing) {
    return (
      <FormLayout title={title}>
        <AddressForm address={null} onSave={handleSave} />
      </FormLayout>
    );
  }

  if (isPending) {
    return (
      <FormLayout title={title}>
        <div role="status" className="space-y-4">
          <span className="sr-only">Loading address</span>
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </FormLayout>
    );
  }

  if (error) {
    return (
      <FormLayout title={title}>
        <ErrorState message={error.message} onRetry={refetch} />
      </FormLayout>
    );
  }

  const address = addresses.find((candidate) => candidate.id === addressId);

  if (!address) {
    return (
      <FormLayout title={title}>
        <EmptyState
          icon={MapPinOff}
          title="Address not found"
          message="It may have been deleted."
          action={{ label: "Back to my addresses", to: "/customer/addresses" }}
        />
      </FormLayout>
    );
  }

  return (
    <FormLayout title={title}>
      <AddressForm address={address} onSave={handleSave} />
    </FormLayout>
  );
};

// The same page frame for every state above
const FormLayout = ({ title, children }) => {
  return (
    <Container>
      <section className="mx-auto max-w-xl py-8">
        <PageHeader back={{ to: "/customer/addresses", label: "My addresses" }} title={title} />
        <div className="mt-6">{children}</div>
      </section>
    </Container>
  );
};

export default AddressFormPage;
