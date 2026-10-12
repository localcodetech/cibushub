import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, CircleCheck, Clock } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Card from "@/components/common/Card";
import Skeleton from "@/components/common/Skeleton";
import ErrorState from "@/components/common/ErrorState";
import RiderDetailsForm from "@/components/rider/RiderDetailsForm";
import FileUploadRow from "@/components/rider/FileUploadRow";
import { Button } from "@/components/ui/button";
import {
  getMyApplicationRequest,
  submitApplicationRequest,
  uploadRiderDocumentRequest,
  uploadRiderPhotoRequest,
} from "@/api/riderApplication";
import { RIDER_VEHICLES, isMotorised } from "@/data/riderVehicles";
import { useAuthStore } from "@/store/authStore";
import PageHeader from "@/components/common/PageHeader";

const APPLICATION_KEY = ["rider-application"];

// What each "missing" code means, for the list under the Submit button
const MISSING_LABELS = {
  DETAILS: "Your vehicle and Ghana Card details",
  PHOTO: "A clear photo of your face",
  GHANA_CARD: "A photo of your Ghana Card",
  DRIVERS_LICENCE: "A photo of your driver's licence",
};

const vehicleLabel = (vehicleType) => {
  const vehicle = RIDER_VEHICLES.find((item) => item.value === vehicleType);
  return vehicle ? vehicle.label : "";
};

// The rider application [AC-RIDER-01]: details, photo, documents, then "Submit for review".
// The same page shows "under review", "rejected: fix and resubmit" and "approved".
const RiderApplicationPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const checkSession = useAuthStore((state) => state.checkSession);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const query = useQuery({ queryKey: APPLICATION_KEY, queryFn: getMyApplicationRequest });

  // Every save returns the whole application: show it straight away, no refetch needed
  const showSaved = (application) => {
    queryClient.setQueryData(APPLICATION_KEY, application);
  };

  if (query.isPending) {
    return (
      <Container>
        <div role="status" className="mx-auto flex max-w-lg flex-col gap-4 py-8">
          <span className="sr-only">Loading your application</span>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </Container>
    );
  }

  if (query.isError) {
    return (
      <Container>
        <div className="mx-auto max-w-lg py-8">
          <ErrorState message={query.error.message} onRetry={query.refetch} />
        </div>
      </Container>
    );
  }

  const application = query.data;
  const hasDocument = (documentType) =>
    application.documents.some((doc) => doc.documentType === documentType);

  const handleSubmit = async () => {
    setSubmitError("");
    setIsSubmitting(true);
    try {
      showSaved(await submitApplicationRequest());
    } catch (error) {
      setSubmitError(error.message);
    }
    setIsSubmitting(false);
  };

  // Approved: the account is now active. Ask the server again so the app knows, then go in.
  const handleStart = async () => {
    await checkSession();
    navigate("/rider");
  };

  return (
    <Container>
      <section className="mx-auto flex max-w-lg flex-col gap-6 py-8">
        <div>
          <PageHeader title="Become a CibusHub rider" />
          <Text muted className="mt-2">
            We check every rider before their first delivery. It takes about 5 minutes.
          </Text>
        </div>

        <StatusBanner application={application} onStart={handleStart} />

        {application.canEdit && (
          <>
            <Card>
              <Heading level={2} className="mb-4 text-lg">
                1. Vehicle and Ghana Card
              </Heading>
              <RiderDetailsForm application={application} onSaved={showSaved} />
            </Card>

            <Card>
              <Heading level={2} className="text-lg">
                2. Photo and documents
              </Heading>
              <Text muted className="mt-1 text-[13px]">
                JPG, PNG or WebP (documents may also be PDF), 5 MB at most. Only our review team can
                see your documents.
              </Text>
              <FileUploadRow
                title="Your photo"
                hint="Your face, clearly, without sunglasses. Customers see it."
                accept="image/jpeg,image/png,image/webp"
                isDone={Boolean(application.photoUrl)}
                onUpload={async (file) => showSaved(await uploadRiderPhotoRequest(file))}
              />
              <FileUploadRow
                title="Ghana Card"
                hint="The front of the card, all four corners visible"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                isDone={hasDocument("GHANA_CARD")}
                onUpload={async (file) =>
                  showSaved(await uploadRiderDocumentRequest("GHANA_CARD", file))
                }
              />
              {/* Bicycles don't need a licence; until details are saved, assume they do */}
              {(!application.vehicleType || isMotorised(application.vehicleType)) && (
                <FileUploadRow
                  title="Driver's licence"
                  hint="Needed for motorbikes and cars"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  isDone={hasDocument("DRIVERS_LICENCE")}
                  onUpload={async (file) =>
                    showSaved(await uploadRiderDocumentRequest("DRIVERS_LICENCE", file))
                  }
                />
              )}
            </Card>

            <div className="flex flex-col gap-3">
              {application.missing.length > 0 && (
                <div>
                  <Text className="font-bold">Still needed:</Text>
                  <ul className="mt-1 list-disc pl-5 text-[15px] text-muted-foreground">
                    {application.missing.map((code) => (
                      <li key={code}>{MISSING_LABELS[code]}</li>
                    ))}
                  </ul>
                </div>
              )}

              {submitError && (
                <p role="alert" className="flex items-center gap-2 text-[15px] text-destructive">
                  <CircleAlert size={18} aria-hidden="true" />
                  {submitError}
                </p>
              )}

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={application.missing.length > 0 || isSubmitting}
                className="h-12 text-base font-bold"
              >
                {isSubmitting ? "Submitting…" : "Submit for review"}
              </Button>
            </div>
          </>
        )}

        {!application.canEdit && (
          <Card>
            <Heading level={2} className="text-lg">
              Your details
            </Heading>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">
              <dt className="text-muted-foreground">Vehicle</dt>
              <dd>{vehicleLabel(application.vehicleType)}</dd>
              {application.plateNumber && (
                <>
                  <dt className="text-muted-foreground">Plate</dt>
                  <dd>{application.plateNumber}</dd>
                </>
              )}
              <dt className="text-muted-foreground">Ghana Card</dt>
              <dd>{application.ghanaCardNumber}</dd>
            </dl>
          </Card>
        )}
      </section>
    </Container>
  );
};

// The box at the top that says where the application stands
const StatusBanner = ({ application, onStart }) => {
  if (application.status === "PENDING_APPROVAL") {
    return (
      <div role="status" className="flex gap-3 rounded-lg border border-border p-4">
        <Clock size={24} className="shrink-0 text-primary" aria-hidden="true" />
        <div>
          <Text className="font-bold">Submitted: we're reviewing it</Text>
          <Text muted className="text-[15px]">
            Usually within 1 to 2 working days. We'll text you when it's done.
          </Text>
        </div>
      </div>
    );
  }

  if (application.status === "REJECTED") {
    return (
      <div role="alert" className="flex gap-3 rounded-lg border border-destructive p-4">
        <CircleAlert size={24} className="shrink-0 text-destructive" aria-hidden="true" />
        <div>
          <Text className="font-bold">Your application needs changes</Text>
          <Text className="text-[15px]">{application.rejectionReason}</Text>
          <Text muted className="mt-1 text-[15px]">
            Fix what's mentioned below, then submit again.
          </Text>
        </div>
      </div>
    );
  }

  if (application.status === "APPROVED") {
    return (
      <div role="status" className="flex flex-col gap-3 rounded-lg border border-success p-4">
        <Text className="flex items-center gap-2 font-bold">
          <CircleCheck size={24} className="text-success" aria-hidden="true" />
          You're approved. Welcome to CibusHub!
        </Text>
        <Button type="button" onClick={onStart} className="h-12 text-base font-bold">
          Start riding
        </Button>
      </div>
    );
  }

  if (application.status === "SUSPENDED") {
    return (
      <div role="alert" className="flex gap-3 rounded-lg border border-destructive p-4">
        <CircleAlert size={24} className="shrink-0 text-destructive" aria-hidden="true" />
        <Text className="font-bold">Your rider account is suspended. Please contact support.</Text>
      </div>
    );
  }

  // NOT_STARTED or DRAFT: the steps below say what to do
  return null;
};

export default RiderApplicationPage;
