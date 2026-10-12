import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Eye, FileText, Mail, Phone, UserRound } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Card from "@/components/common/Card";
import Skeleton from "@/components/common/Skeleton";
import ErrorState from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import StatusPill from "@/components/admin/StatusPill";
import ConfirmActionSheet from "@/components/admin/ConfirmActionSheet";
import {
  approveRiderRequest,
  getAdminRiderDocumentsRequest,
  getAdminRiderRequest,
  rejectRiderRequest,
  revealGhanaCardRequest,
  suspendRiderRequest,
} from "@/api/admin";
import { RIDER_DOCUMENT_NAMES, RIDER_STATUSES, VEHICLE_NAMES } from "@/data/riderStatuses";
import { formatDateTime } from "@/utils/date";

// /admin/riders/:riderId: check one application, then approve, reject, suspend or
// reactivate [AC-ADM-04]. Every action asks first; reject and suspend need a reason [AC-ADM-08].
const AdminRiderDetailPage = () => {
  const { riderId } = useParams();
  const queryClient = useQueryClient();
  // Which action's "Are you sure?" sheet is open: "approve", "reject", "suspend" or null
  const [openAction, setOpenAction] = useState(null);

  const {
    data: profile,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-rider", riderId],
    queryFn: () => getAdminRiderRequest(riderId),
  });

  if (isPending) {
    return (
      <Container>
        <div role="status" className="space-y-4 py-8">
          <span className="sr-only">Loading rider</span>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <div className="py-8">
          <ErrorState message={error.message} onRetry={refetch} />
        </div>
      </Container>
    );
  }

  // After an action: fetch this rider, the lists and the dashboard counts again
  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-rider", riderId] });
    queryClient.invalidateQueries({ queryKey: ["admin-riders"] });
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };

  const statusInfo = RIDER_STATUSES[profile.status];
  const name = profile.rider.fullName;

  return (
    <Container>
      <section className="mx-auto max-w-3xl py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/admin/riders" className="text-[15px] font-bold text-primary">
            ← Riders
          </Link>
          <Link
            to={"/admin/audit-log?targetId=" + profile.id}
            className="text-[15px] font-bold text-primary"
          >
            History
          </Link>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          {profile.rider.photoUrl ? (
            <img
              src={profile.rider.photoUrl}
              alt={"Photo of " + name}
              className="size-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-full bg-muted">
              <UserRound size={32} className="text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          <div className="flex-1">
            <Heading level={1}>{name}</Heading>
            <div className="mt-1">
              <StatusPill label={statusInfo.label} tone={statusInfo.tone} />
            </div>
          </div>
        </div>

        {profile.rejectionReason && (
          <Card tone="danger" className="mt-4">
            <p className="font-bold text-destructive">Last reason given</p>
            <p className="mt-1">{profile.rejectionReason}</p>
          </Card>
        )}

        <Actions status={profile.status} onChoose={setOpenAction} />

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card className="space-y-2 text-[15px]">
            <p className="font-bold">Contact</p>
            <p className="flex items-start gap-2">
              <Phone size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              <a href={"tel:" + profile.rider.phone} className="underline">
                {profile.rider.phone}
              </a>
            </p>
            {profile.rider.email && (
              <p className="flex items-start gap-2 break-all">
                <Mail size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                <a href={"mailto:" + profile.rider.email} className="underline">
                  {profile.rider.email}
                </a>
              </p>
            )}
          </Card>

          <Card className="space-y-2 text-[15px]">
            <p className="font-bold">Application</p>
            <p>
              {VEHICLE_NAMES[profile.vehicleType]}
              {profile.plateNumber ? " · " + profile.plateNumber : ""}
            </p>
            <GhanaCard riderId={profile.id} maskedNumber={profile.ghanaCardNumber} />
            {profile.submittedAt && (
              <p className="text-muted-foreground">Sent {formatDateTime(profile.submittedAt)}</p>
            )}
          </Card>
        </div>

        <Documents riderId={profile.id} />
      </section>

      {openAction === "approve" && (
        <ConfirmActionSheet
          title={profile.status === "SUSPENDED" ? `Reactivate ${name}?` : `Approve ${name}?`}
          description="They can go online and take deliveries. They get an SMS and an email."
          confirmLabel={profile.status === "SUSPENDED" ? "Reactivate" : "Approve"}
          onConfirm={async () => {
            await approveRiderRequest(profile.id);
            await refreshAll();
          }}
          onClose={() => setOpenAction(null)}
        />
      )}
      {openAction === "reject" && (
        <ConfirmActionSheet
          title={`Reject ${name}'s application?`}
          description="They see your reason, can fix it in the app and submit again."
          confirmLabel="Reject"
          needsReason
          isDangerous
          onConfirm={async (reason) => {
            await rejectRiderRequest(profile.id, reason);
            await refreshAll();
          }}
          onClose={() => setOpenAction(null)}
        />
      )}
      {openAction === "suspend" && (
        <ConfirmActionSheet
          title={`Suspend ${name}?`}
          description="They are taken offline at once and get no more deliveries until reactivated."
          confirmLabel="Suspend"
          needsReason
          isDangerous
          onConfirm={async (reason) => {
            await suspendRiderRequest(profile.id, reason);
            await refreshAll();
          }}
          onClose={() => setOpenAction(null)}
        />
      )}
    </Container>
  );
};

// The buttons that make sense for the current status
const Actions = ({ status, onChoose }) => {
  if (status === "PENDING_APPROVAL") {
    return (
      <div className="mt-6 flex gap-3">
        <Button onClick={() => onChoose("approve")} className="h-12 flex-1 font-bold sm:flex-none">
          Approve
        </Button>
        <Button
          variant="outline"
          onClick={() => onChoose("reject")}
          className="h-12 flex-1 font-bold text-destructive sm:flex-none"
        >
          Reject
        </Button>
      </div>
    );
  }
  if (status === "APPROVED") {
    return (
      <div className="mt-6">
        <Button
          variant="outline"
          onClick={() => onChoose("suspend")}
          className="h-12 font-bold text-destructive"
        >
          Suspend
        </Button>
      </div>
    );
  }
  if (status === "SUSPENDED") {
    return (
      <div className="mt-6">
        <Button onClick={() => onChoose("approve")} className="h-12 font-bold">
          Reactivate
        </Button>
      </div>
    );
  }
  return null;
};

// The Ghana Card number, masked until the admin asks to see it (that look is audited)
const GhanaCard = ({ riderId, maskedNumber }) => {
  const [fullNumber, setFullNumber] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleReveal = async () => {
    setErrorMessage("");
    try {
      setFullNumber(await revealGhanaCardRequest(riderId));
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  return (
    <div>
      <p className="flex flex-wrap items-center gap-2">
        <span>Ghana Card:</span>
        <span className="font-mono">{fullNumber || maskedNumber || "not given"}</span>
        {!fullNumber && maskedNumber && (
          <button
            type="button"
            onClick={handleReveal}
            className="inline-flex min-h-11 items-center gap-1 px-1 font-bold text-primary"
          >
            <Eye size={16} aria-hidden="true" />
            Show
          </button>
        )}
      </p>
      {!fullNumber && maskedNumber && (
        <p className="text-[13px] text-muted-foreground">Showing it is noted in the audit log.</p>
      )}
      {errorMessage && <p className="text-[13px] text-destructive">{errorMessage}</p>}
    </div>
  );
};

// The Ghana Card and licence photos. Their links work for 5 minutes.
const Documents = ({ riderId }) => {
  const { data, isPending, error } = useQuery({
    queryKey: ["admin-rider-documents", riderId],
    queryFn: () => getAdminRiderDocumentsRequest(riderId),
    staleTime: 60 * 1000,
  });

  return (
    <section className="mt-8">
      <Heading level={2}>Documents</Heading>
      {isPending && <Skeleton className="mt-3 h-20 w-full" />}
      {error && (
        <Text muted className="mt-3">
          Documents couldn't load: {error.message}
        </Text>
      )}
      {data && data.length === 0 && (
        <Text muted className="mt-3">
          No documents uploaded.
        </Text>
      )}
      {data && data.length > 0 && (
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
          {data.map((document) => (
            <li key={document.documentType}>
              <a
                href={document.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-4 py-3"
              >
                <FileText size={18} className="shrink-0 text-primary" aria-hidden="true" />
                <span className="flex-1 font-bold">
                  {RIDER_DOCUMENT_NAMES[document.documentType] || document.documentType}
                </span>
                <span className="text-[13px] text-muted-foreground uppercase">
                  {document.format}
                </span>
                <ExternalLink size={16} className="text-muted-foreground" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default AdminRiderDetailPage;
