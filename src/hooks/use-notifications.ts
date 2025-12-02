import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useNotifications = (userId: string) => {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      const { count: messagesCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("type", "message")
        .eq("read", false);

      setUnreadMessages(messagesCount || 0);

      const { count: requestsCount } = await supabase
        .from("partnerships")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("status", "pending");

      setPendingRequests(requestsCount || 0);
    };

    fetchNotifications();

    const notificationsChannel = supabase
      .channel("notifications-feed")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => fetchNotifications()
      )
      .subscribe();

    const partnershipsChannel = supabase
      .channel("partnerships-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "partnerships",
        },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(partnershipsChannel);
    };
  }, [userId]);

  return { unreadMessages, pendingRequests, total: unreadMessages + pendingRequests };
};
