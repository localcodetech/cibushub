import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import StatusBadge from "@/components/common/StatusBadge";
import { getAdminUsersRequest } from "@/api/admin";
import { ACCOUNT_STATUSES, ROLE_NAMES } from "@/data/userLabels";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatDateTime } from "@/utils/date";
import { List, ListRow } from "@/components/common/List";
import Avatar from "@/components/common/Avatar";

// /admin/users: find any account [AC-ADM-02]
const AdminUsersPage = () => {
  const [searchText, setSearchText] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const typed = useDebouncedValue(searchText.trim(), 300);
  const q = typed.length >= 2 ? typed : "";

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["admin-users", { q, role, status, page }],
    queryFn: () => getAdminUsersRequest({ q, role, status, page }),
    placeholderData: keepPreviousData,
  });

  // Any filter change starts again at page 1
  const changeFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <Container>
      <section className="py-8">
        <Heading level={1}>Users</Heading>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative block sm:col-span-2">
            <span className="sr-only">Name, email or phone</span>
            <Search
              size={18}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchText}
              onChange={changeFilter(setSearchText)}
              placeholder="Name, email or phone"
              className="h-12 w-full rounded-md border border-input bg-background pr-3 pl-10 text-base"
            />
          </label>
          <label className="block">
            <span className="sr-only">Role</span>
            <select
              value={role}
              onChange={changeFilter(setRole)}
              className="h-12 w-full rounded-md border border-input bg-background px-3 text-base"
            >
              <option value="">Every role</option>
              {Object.entries(ROLE_NAMES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Status</span>
            <select
              value={status}
              onChange={changeFilter(setStatus)}
              className="h-12 w-full rounded-md border border-input bg-background px-3 text-base"
            >
              <option value="">Every status</option>
              {Object.entries(ACCOUNT_STATUSES).map(([value, info]) => (
                <option key={value} value={value}>
                  {info.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6">
          <UserList data={data} isPending={isPending} error={error} onRetry={refetch} />
        </div>

        {data && data.meta.totalPages > 1 && (
          <nav aria-label="Pages" className="mt-6 flex items-center justify-between gap-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="min-h-11 rounded-md border border-border px-4 font-bold disabled:opacity-40"
            >
              Previous
            </button>
            <Text size="small" muted>
              Page {data.meta.page} of {data.meta.totalPages} · {data.meta.totalItems} users
            </Text>
            <button
              type="button"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage(page + 1)}
              className="min-h-11 rounded-md border border-border px-4 font-bold disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </Container>
  );
};

// Loading, error, empty or the list [AC-UX-02 to 04]
const UserList = ({ data, isPending, error, onRetry }) => {
  if (isPending) {
    return (
      <div role="status" className="space-y-3">
        <span className="sr-only">Loading users</span>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={onRetry} />;
  }

  if (data.users.length === 0) {
    return <EmptyState icon={Users} title="No users found" />;
  }

  return (
    <List>
      {data.users.map((user) => {
        const statusInfo = ACCOUNT_STATUSES[user.status];
        return (
          <ListRow
            key={user.id}
            to={"/admin/users/" + user.id}
            leading={<Avatar name={user.fullName} />}
            title={user.fullName}
            badge={<StatusBadge label={statusInfo.label} tone={statusInfo.tone} />}
            meta={
              ROLE_NAMES[user.role] +
              " · " +
              (user.phone || user.email) +
              " · joined " +
              formatDateTime(user.createdAt)
            }
          />
        );
      })}
    </List>
  );
};

export default AdminUsersPage;
