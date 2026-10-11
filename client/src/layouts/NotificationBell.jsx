import { useEffect } from "react";
import { Link } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { getUnreadCountRequest } from "@/api/notifications";
import { onLiveEvent } from "@/lib/liveUpdates";

// The bell in the navbar with my unread count [AC-NOTIF-07]. It opens /notifications.
// Only drawn for a logged-in user (see Navbar).
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

  return (
    <Link
      to="/notifications"
      aria-label={"Notifications, " + unreadCount + " unread"}
      className="relative flex size-11 items-center justify-center rounded-md"
    >
      <Bell size={22} aria-hidden="true" />
      {unreadCount > 0 && (
        <span className="absolute top-0.5 right-0.5 flex min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[12px] font-bold text-secondary-foreground">
          {badgeText}
        </span>
      )}
    </Link>
  );
};

export default NotificationBell;
