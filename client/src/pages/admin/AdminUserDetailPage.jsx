import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Phone } from "lucide-react";
import Container from "@/layouts/Container";
import Text from "@/components/typography/Text";
import Card from "@/components/common/Card";
import Skeleton from "@/components/common/Skeleton";
import ErrorState from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import ConfirmActionSheet from "@/components/admin/ConfirmActionSheet";
import {
  deleteUserRequest,
  getAdminUserRequest,
  reactivateUserRequest,
  suspendUserRequest,
} from "@/api/admin";
import { ACCOUNT_STATUSES, ROLE_NAMES } from "@/data/userLabels";
import { RESTAURANT_STATUSES } from "@/data/restaurantStatuses";
import { formatDateTime } from "@/utils/date";
import PageHeader from "@/components/common/PageHeader";

// /admin/users/:userId: one account, and suspend, reactivate or delete it
// [AC-ADM-02, AC-ADM-08, AC-CUST-11]
const AdminUserDetailPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // "suspend", "reactivate", "delete" or null
  const [openAction, setOpenAction] = useState(null);

  const {
    data: user,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => getAdminUserRequest(userId),
  });

  if (isPending) {
    return (
      <Container>
        <div role="status" className="space-y-4 py-8">
          <span className="sr-only">Loading account</span>
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

  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-user", userId] });
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const statusInfo = ACCOUNT_STATUSES[user.status];
  const isSuspended = user.status === "SUSPENDED";

  return (
    <Container>
      <section className="mx-auto max-w-3xl py-8">
        <PageHeader
          back={{ to: "/admin/users", label: "Users" }}
          title={user.fullName}
          meta={ROLE_NAMES[user.role] + " · joined " + formatDateTime(user.createdAt)}
          badge={<StatusBadge label={statusInfo.label} tone={statusInfo.tone} />}
          actions={
            <Link
              to={"/admin/audit-log?targetId=" + user.id}
              className="inline-flex min-h-11 items-center text-[15px] font-bold text-primary"
            >
              History
            </Link>
          }
        />

        {/* Admin accounts are managed by the super admin [AC-SADM-01] */}
        {user.canBeSuspended ? (
          <div className="mt-6">
            {isSuspended ? (
              <Button onClick={() => setOpenAction("reactivate")} className="h-12 font-bold">
                Reactivate account
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setOpenAction("suspend")}
                className="h-12 font-bold text-destructive"
              >
                Suspend account
              </Button>
            )}
            {/* For someone who asked us by email or phone to delete their data */}
            <Button
              variant="ghost"
              onClick={() => setOpenAction("delete")}
              className="ml-2 h-12 font-bold text-destructive"
            >
              Delete account
            </Button>
          </div>
        ) : (
          <Text muted className="mt-6">
            Admin accounts are managed by the super admin.
          </Text>
        )}

        <Card className="mt-8 space-y-2 text-[15px]">
          <p className="font-bold">Contact</p>
          {user.phone && (
            <p className="flex items-start gap-2">
              <Phone size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              <a href={"tel:" + user.phone} className="underline">
                {user.phone}
              </a>
              {!user.phoneVerifiedAt && (
                <span className="text-muted-foreground">(not verified)</span>
              )}
            </p>
          )}
          {user.email && (
            <p className="flex items-start gap-2 break-all">
              <Mail size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              <a href={"mailto:" + user.email} className="underline">
                {user.email}
              </a>
              {user.emailBouncedAt && <span className="text-destructive">(bouncing)</span>}
              {!user.emailBouncedAt && !user.emailVerifiedAt && (
                <span className="text-muted-foreground">(not confirmed)</span>
              )}
            </p>
          )}
          <p className="text-muted-foreground">
            Last login: {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "never"}
          </p>
        </Card>

        {user.orderCount !== undefined && (
          <Card className="mt-4 text-[15px]">
            <p className="font-bold">Orders</p>
            <p className="mt-1">
              {user.orderCount} orders.{" "}
              <Link to="/admin/orders" className="text-primary underline">
                Find them by phone in Orders
              </Link>
            </p>
          </Card>
        )}

        {user.restaurants && (
          <Card className="mt-4 text-[15px]">
            <p className="font-bold">Restaurants</p>
            {user.restaurants.length === 0 && (
              <p className="mt-1 text-muted-foreground">None yet</p>
            )}
            <ul className="mt-1 space-y-1">
              {user.restaurants.map((restaurant) => (
                <li key={restaurant.id}>
                  <Link to={"/admin/restaurants/" + restaurant.id} className="underline">
                    {restaurant.name}
                  </Link>{" "}
                  <span className="text-muted-foreground">
                    ({RESTAURANT_STATUSES[restaurant.status].label})
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {user.riderProfile && (
          <Card className="mt-4 text-[15px]">
            <p className="font-bold">Rider application</p>
            <Link
              to={"/admin/riders/" + user.riderProfile.id}
              className="mt-1 inline-block underline"
            >
              Open the rider's application
            </Link>
          </Card>
        )}
      </section>

      {openAction === "suspend" && (
        <ConfirmActionSheet
          title={"Suspend " + user.fullName + "?"}
          description={
            user.role === "RESTAURANT_OWNER"
              ? "They are signed out everywhere and get an SMS. Their restaurants stay listed: suspend those separately if needed."
              : "They are signed out everywhere at once and get an SMS with your reason."
          }
          confirmLabel="Suspend"
          needsReason
          isDangerous
          onConfirm={async (reason) => {
            await suspendUserRequest(user.id, reason);
            await refreshAll();
          }}
          onClose={() => setOpenAction(null)}
        />
      )}
      {openAction === "delete" && (
        <ConfirmActionSheet
          title={"Delete " + user.fullName + "'s account?"}
          description="Only when they asked us to. Their name, phone, email, photo and addresses are removed for good; past orders stay without them. They get a last email. Write when and how they asked."
          confirmLabel="Delete account"
          needsReason
          isDangerous
          onConfirm={async (reason) => {
            await deleteUserRequest(user.id, reason);
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            navigate("/admin/users", { replace: true });
          }}
          onClose={() => setOpenAction(null)}
        />
      )}
      {openAction === "reactivate" && (
        <ConfirmActionSheet
          title={"Reactivate " + user.fullName + "?"}
          description="They can log in again, and get an SMS saying so."
          confirmLabel="Reactivate"
          needsReason
          onConfirm={async (reason) => {
            await reactivateUserRequest(user.id, reason);
            await refreshAll();
          }}
          onClose={() => setOpenAction(null)}
        />
      )}
    </Container>
  );
};

export default AdminUserDetailPage;
