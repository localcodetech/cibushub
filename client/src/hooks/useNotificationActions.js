import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markAllNotificationsReadRequest, markNotificationReadRequest } from "@/api/notifications";

// What tapping notifications does, shared by the notification centre and the bell's preview
// [AC-NOTIF-07]:
//   open(notification): marks it read and goes to the screen it is about (if it has one)
//   markAllRead:        the mutation behind "Mark all as read" (.mutate(), .isPending)
// After either, the bell gets the new unread count and every notification list refreshes.
export const useNotificationActions = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  const open = (notification) => {
    if (!notification.readAt) {
      markOneRead.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return { open, markAllRead };
};
