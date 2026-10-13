import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Popover } from "radix-ui";
import { Bell } from "lucide-react";
import { getNotificationsRequest, getUnreadCountRequest } from "@/api/notifications";
import { onLiveEvent } from "@/lib/liveUpdates";
import { List } from "@/components/common/List";
import Skeleton from "@/components/common/Skeleton";
import NotificationRow from "@/components/notifications/NotificationRow";
import { useNotificationActions } from "@/hooks/useNotificationActions";
import { cn } from "@/lib/utils";

// How many the desktop preview shows; the rest are on /notifications
const PREVIEW_SIZE = 5;

const BELL_CLASSES =
  "relative flex size-11 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

// The bell in the navbar with my unread count [AC-NOTIF-07]. Only drawn for a logged-in user.
// On phones it opens /notifications. On wider screens it drops down a preview of the latest
// ones (Radix Popover: focus moves in, Escape and clicking outside close it).
const NotificationBell = () => {
  const queryClient = useQueryClient();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadCountRequest,
  });

  // Live: the server sends the new count with every new notification, and when I read
  // them on another screen. We put that number straight in, then refresh the list.
  useEffect(() => {
    const handleCountChange = (details) => {
      queryClient.setQueryData(["notifications", "unread-count"], details.unreadCount);
      queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
    };

    const stopNew = onLiveEvent("notification:new", handleCountChange);
    const stopUnread = onLiveEvent("notification:unread", handleCountChange);
    return () => {
      stopNew();
      stopUnread();
    };
  }, [queryClient]);

  // Big numbers would not fit in the badge
  let badgeText = String(unreadCount);
  if (unreadCount > 99) {
    badgeText = "99+";
  }

  const label = "Notifications, " + unreadCount + " unread";
  const icon = (
    <>
      <Bell size={22} aria-hidden="true" />
      {unreadCount > 0 && (
        <span className="absolute top-0.5 right-0.5 flex min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[12px] font-bold text-secondary-foreground">
          {badgeText}
        </span>
      )}
    </>
  );

  return (
    <>
      {/* Phones: straight to the full page */}
      <Link to="/notifications" aria-label={label} className={cn(BELL_CLASSES, "md:hidden")}>
        {icon}
      </Link>
      {/* Wider screens: the preview */}
      <div className="hidden md:block">
        <BellPreview label={label} unreadCount={unreadCount}>
          {icon}
        </BellPreview>
      </div>
    </>
  );
};

// The drop-down: the latest notifications, "Mark all as read" and a link to all of them
const BellPreview = ({ label, unreadCount, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { open, markAllRead } = useNotificationActions();

  // Loaded only while the preview is open (the same list as page 1 of /notifications)
  const { data, isPending } = useQuery({
    queryKey: ["notifications", "list", { page: 1 }],
    queryFn: () => getNotificationsRequest(1),
    enabled: isOpen,
  });

  const handleOpen = (notification) => {
    setIsOpen(false);
    open(notification);
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger aria-label={label} className={BELL_CLASSES}>
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        {/* A floating layer: the one place the design guide allows a shadow */}
        <Popover.Content
          align="end"
          sideOffset={8}
          aria-label="Latest notifications"
          className="z-50 w-96 overflow-hidden rounded-lg border border-border bg-background text-foreground shadow-lg"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <p className="font-heading font-bold">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-[15px] font-bold text-primary disabled:opacity-40"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {isPending ? (
              <div role="status" className="space-y-2 p-4">
                <span className="sr-only">Loading notifications</span>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : data.notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-muted-foreground">No notifications yet</p>
            ) : (
              <List className="rounded-none border-0">
                {data.notifications.slice(0, PREVIEW_SIZE).map((notification) => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    onOpen={handleOpen}
                  />
                ))}
              </List>
            )}
          </div>

          <Link
            to="/notifications"
            onClick={() => setIsOpen(false)}
            className="block border-t border-border px-4 py-3 text-center font-bold text-primary hover:bg-primary/[0.04]"
          >
            See all notifications
          </Link>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export default NotificationBell;
