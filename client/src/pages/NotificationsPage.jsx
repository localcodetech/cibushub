import { useNavigate, useSearchParams } from "react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import {
  getNotificationsRequest,
  markAllNotificationsReadRequest,
  markNotificationReadRequest,
} from "@/api/notifications";
import { formatDateTime } from "@/utils/date";
import { cn } from "@/lib/utils";

// /notifications: my notification centre, newest first, 20 a page [AC-NOTIF-07].
// The same page for every role. New ones arrive live (the bell refreshes this list).
const NotificationsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["notifications", "list", { page }],
    queryFn: () => getNotificationsRequest(page),
    placeholderData: keepPreviousData,
  });

  // After reading: refresh the list, and put the new count on the bell
  const handleRead = (result) => {
    queryClient.setQueryData(["notifications", "unread-count"], result.unreadCount);
    queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
  };

  const markOneRead = useMutation({
    mutationFn: markNotificationReadRequest,
    onSuccess: handleRead,
  });

  const markAllRead = useMutation({
    mutationFn: markAllNotificationsReadRequest,
    onSuccess: handleRead,
  });

  // Tapping one marks it read and opens the screen it is about (if it has one)
  const handleOpen = (notification) => {
    if (!notification.readAt) {
      markOneRead.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleChangePage = (newPage) => {
    setSearchParams({ page: String(newPage) });
    window.scrollTo(0, 0);
  };

  const unreadCount = data ? data.meta.unreadCount : 0;

  return (
    <Container>
      <section className="mx-auto max-w-2xl py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Heading level={1}>Notifications</Heading>
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
        </div>
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
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {data.notifications.map((notification) => {
          const isUnread = !notification.readAt;
          return (
            <li key={notification.id}>
              <button
                type="button"
                onClick={() => onOpen(notification)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left"
              >
                {/* A dot for unread ones; an empty space keeps the text lined up */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-2 size-2.5 shrink-0 rounded-full",
                    isUnread ? "bg-primary" : "bg-transparent",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className={cn(isUnread ? "font-bold" : "font-normal")}>
                    {isUnread && <span className="sr-only">Unread: </span>}
                    {notification.title}
                  </p>
                  <p className="mt-0.5 text-[15px]">{notification.body}</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {formatDateTime(notification.createdAt)}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

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
