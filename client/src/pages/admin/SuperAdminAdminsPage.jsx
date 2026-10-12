import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Skeleton from "@/components/common/Skeleton";
import ErrorState from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import ConfirmActionSheet from "@/components/admin/ConfirmActionSheet";
import CreateAdminSheet from "@/components/admin/CreateAdminSheet";
import {
  changeAdminRoleRequest,
  getAdminsRequest,
  reactivateAdminRequest,
  removeAdminRequest,
  suspendAdminRequest,
} from "@/api/superAdmin";
import { ACCOUNT_STATUSES, ROLE_NAMES } from "@/data/userLabels";
import { useAuthStore } from "@/store/authStore";
import { formatDateTime } from "@/utils/date";
import { List } from "@/components/common/List";

// Each action's sheet: its title, words and request
const ACTIONS = {
  suspend: {
    title: (admin) => "Suspend " + admin.fullName + "?",
    description: "They are signed out everywhere and can't log in until reactivated.",
    confirmLabel: "Suspend",
    isDangerous: true,
    run: (admin, reason) => suspendAdminRequest(admin.id, reason),
  },
  reactivate: {
    title: (admin) => "Reactivate " + admin.fullName + "?",
    description: "They can log in again.",
    confirmLabel: "Reactivate",
    isDangerous: false,
    run: (admin, reason) => reactivateAdminRequest(admin.id, reason),
  },
  promote: {
    title: (admin) => "Make " + admin.fullName + " a super admin?",
    description: "They can then manage admins and change platform settings.",
    confirmLabel: "Make super admin",
    isDangerous: false,
    run: (admin, reason) => changeAdminRoleRequest(admin.id, "SUPER_ADMIN", reason),
  },
  demote: {
    title: (admin) => "Make " + admin.fullName + " an admin?",
    description: "They lose super admin powers and are asked to log in again.",
    confirmLabel: "Make admin",
    isDangerous: true,
    run: (admin, reason) => changeAdminRoleRequest(admin.id, "ADMIN", reason),
  },
  remove: {
    title: (admin) => "Remove " + admin.fullName + "?",
    description: "The account is closed for good. Its history stays in the audit log.",
    confirmLabel: "Remove",
    isDangerous: true,
    run: (admin, reason) => removeAdminRequest(admin.id, reason),
  },
};

// /admin/admins: super admins only. Add, suspend, promote and remove admins [AC-SADM-01].
// The server never lets the last active super admin go [AC-SADM-04].
const SuperAdminAdminsPage = () => {
  const me = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  // { admin, action } while a sheet is open
  const [acting, setActing] = useState(null);

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["super-admin-admins"],
    queryFn: getAdminsRequest,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["super-admin-admins"] });

  return (
    <Container>
      <section className="mx-auto max-w-3xl py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Heading level={1}>Admins</Heading>
          <Button onClick={() => setIsAdding(true)} className="h-12 font-bold">
            <UserPlus size={18} aria-hidden="true" />
            Add admin
          </Button>
        </div>
        <Text muted className="mt-1">
          There must always be at least one active super admin.
        </Text>

        <div className="mt-6">
          {isPending && <Skeleton className="h-40 w-full" />}
          {error && <ErrorState message={error.message} onRetry={refetch} />}
          {data && (
            <List>
              {data.map((admin) => {
                const statusInfo = ACCOUNT_STATUSES[admin.status];
                const isMe = admin.id === me.id;
                const isSuspended = admin.status === "SUSPENDED";
                return (
                  <li key={admin.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold">
                        {admin.fullName}
                        {isMe && <span className="font-normal text-muted-foreground"> (you)</span>}
                      </span>
                      <StatusBadge label={statusInfo.label} tone={statusInfo.tone} />
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                      {ROLE_NAMES[admin.role]} · {admin.email} · {admin.phone} · last login{" "}
                      {admin.lastLoginAt ? formatDateTime(admin.lastLoginAt) : "never"}
                    </p>
                    {/* Nobody changes their own account here: no locking yourself out */}
                    {!isMe && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <ActionButton
                          onClick={() =>
                            setActing({
                              admin,
                              action: admin.role === "ADMIN" ? "promote" : "demote",
                            })
                          }
                        >
                          {admin.role === "ADMIN" ? "Make super admin" : "Make admin"}
                        </ActionButton>
                        <ActionButton
                          onClick={() =>
                            setActing({ admin, action: isSuspended ? "reactivate" : "suspend" })
                          }
                        >
                          {isSuspended ? "Reactivate" : "Suspend"}
                        </ActionButton>
                        <ActionButton
                          isDangerous
                          onClick={() => setActing({ admin, action: "remove" })}
                        >
                          Remove
                        </ActionButton>
                      </div>
                    )}
                  </li>
                );
              })}
            </List>
          )}
        </div>
      </section>

      {isAdding && <CreateAdminSheet onDone={refresh} onClose={() => setIsAdding(false)} />}
      {acting && (
        <ConfirmActionSheet
          title={ACTIONS[acting.action].title(acting.admin)}
          description={ACTIONS[acting.action].description}
          confirmLabel={ACTIONS[acting.action].confirmLabel}
          isDangerous={ACTIONS[acting.action].isDangerous}
          needsReason
          onConfirm={async (reason) => {
            await ACTIONS[acting.action].run(acting.admin, reason);
            await refresh();
          }}
          onClose={() => setActing(null)}
        />
      )}
    </Container>
  );
};

const ActionButton = ({ isDangerous = false, onClick, children }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "min-h-11 rounded-md border border-border px-3 font-bold" +
        (isDangerous ? " text-destructive" : "")
      }
    >
      {children}
    </button>
  );
};

export default SuperAdminAdminsPage;
