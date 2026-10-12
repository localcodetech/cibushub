import { ListIcon, ListRow } from "@/components/common/List";
import { notificationStyle } from "@/data/notificationTypes";
import { cn } from "@/lib/utils";
import { formatDateTime, formatRelative } from "@/utils/date";

// One notification, in the notification centre and in the bell's preview [AC-NOTIF-07].
// An icon and colour for its kind; unread ones have a soft green tint, a green edge on the
// left and a bold title (never colour alone: screen readers hear "Unread").
//   onOpen: called when tapped (marks it read and opens what it is about)
const NotificationRow = ({ notification, onOpen }) => {
  const isUnread = !notification.readAt;
  const style = notificationStyle(notification.type);

  return (
    <ListRow
      onClick={() => onOpen(notification)}
      className={cn(
        "items-start border-l-4",
        isUnread ? "border-l-primary bg-primary/[0.06]" : "border-l-transparent",
      )}
      leading={<ListIcon icon={style.icon} tone={style.tone} />}
      title={
        <span className={isUnread ? "font-bold" : "font-normal"}>
          {isUnread && <span className="sr-only">Unread: </span>}
          {notification.title}
        </span>
      }
      detail={notification.body}
      meta={
        // "5 min ago" to read quickly; the exact time on hover and for screen readers
        <time dateTime={notification.createdAt} title={formatDateTime(notification.createdAt)}>
          {formatRelative(notification.createdAt)}
        </time>
      }
    />
  );
};

export default NotificationRow;
