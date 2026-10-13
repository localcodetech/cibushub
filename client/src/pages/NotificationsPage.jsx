import { Link, useSearchParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Bell, Settings } from "lucide-react";
import Container from "@/layouts/Container";
import Text from "@/components/typography/Text";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { getNotificationsRequest } from "@/api/notifications";
import { isSameGhanaDay } from "@/utils/date";
import { List } from "@/components/common/List";
import PageHeader from "@/components/common/PageHeader";
import NotificationRow from "@/components/notifications/NotificationRow";
import { useNotificationActions } from "@/hooks/useNotificationActions";

// /notifications: my notification centre, newest first, 20 a page [AC-NOTIF-07].
// The same page for every role. New ones arrive live (the bell refreshes this list).
const NotificationsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["notifications", "list", { page }],
    queryFn: () => getNotificationsRequest(page),
    placeholderData: keepPreviousData,
  });

  // Tapping one marks it read and opens what it is about; "Mark all as read"
  const { open: handleOpen, markAllRead } = useNotificationActions();

  const handleChangePage = (newPage) => {
    setSearchParams({ page: String(newPage) });
    window.scrollTo(0, 0);
  };

  const unreadCount = data ? data.meta.unreadCount : 0;

  return (
    <Container>
      <section className="mx-auto max-w-2xl py-8">
        <PageHeader
          title="Notifications"

          actions={
            <>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllRead.mutate()}
                    disabled={markAllRead.isPending}
                    className="min-h-11 rounded-md border border-border px-4 font-bold disabled:opacity-40"
                  >
                    Mark all as read
                  </button>
                )}
                <Link
                  to="/notifications/settings"
                  aria-label="Notification settings"
                  className="flex size-11 items-center justify-center rounded-md border border-border"
                >
                  <Settings size={20} aria-hidden="true" />
                </Link>
              </div>
            </>
          }
        />
        <div className="mt-6">
          <NotificationList
            data={data}
            isPending={isPending}
            error={error}
            onRetry={refetch}
            onOpen={handleOpen}
            onChangePage={handleChangePage}
          />
        </div>
      </section>
    </Container>
  );
};

// [{ title: "Today", notifications }, { title: "Earlier", notifications }], empty groups left out
const groupByDay = (notifications) => {
  const now = new Date();
  const today = notifications.filter((item) => isSameGhanaDay(item.createdAt, now));
  const earlier = notifications.filter((item) => !isSameGhanaDay(item.createdAt, now));
  return [
    { title: "Today", notifications: today },
    { title: "Earlier", notifications: earlier },
  ].filter((group) => group.notifications.length > 0);
};

// Loading, error, empty or the list [AC-UX-02 to 04]
const NotificationList = ({ data, isPending, error, onRetry, onOpen, onChangePage }) => {
  if (isPending) {
    return (
      <div role="status" className="space-y-3">
        <span className="sr-only">Loading notifications</span>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={onRetry} />;
  }

  if (data.notifications.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="No notifications yet"
        message="Updates about your orders and your account will show here."
      />
    );
  }

  return (
    <>
      {/* Today first, then everything older, each under its own heading */}
      {groupByDay(data.notifications).map((group) => (
        <section key={group.title} className="mb-6">
          <h2 className="mb-2 text-[13px] font-bold tracking-wide text-muted-foreground uppercase">
            {group.title}
          </h2>
          <List>
            {group.notifications.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} onOpen={onOpen} />
            ))}
          </List>
        </section>
      ))}

      {data.meta.totalPages > 1 && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={data.meta.page <= 1}
            onClick={() => onChangePage(data.meta.page - 1)}
            className="min-h-11 rounded-md border border-border px-4 font-bold disabled:opacity-40"
          >
            Previous
          </button>
          <Text size="small" muted>
            Page {data.meta.page} of {data.meta.totalPages}
          </Text>
          <button
            type="button"
            disabled={data.meta.page >= data.meta.totalPages}
            onClick={() => onChangePage(data.meta.page + 1)}
            className="min-h-11 rounded-md border border-border px-4 font-bold disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      )}
    </>
  );
};

export default NotificationsPage;
