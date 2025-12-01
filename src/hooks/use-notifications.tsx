import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useNotifications = (userId: string) => {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      // Get user's active partnerships first
      const { data: activePartnerships } = await supabase
        .from("partnerships")
        .select("id")
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq("status", "active");

      const partnershipIds = activePartnerships?.map(p => p.id) || [];

      // Fetch unread messages count from active partnerships
      let messagesCount = 0;
      if (partnershipIds.length > 0) {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .in("partnership_id", partnershipIds)
          .neq("sender_id", userId)
          .eq("read", false);
        
        messagesCount = count || 0;
      }

      setUnreadMessages(messagesCount);

      // Fetch pending partnership requests count
      const { count: requestsCount } = await supabase
        .from("partnerships")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("status", "pending");

      setPendingRequests(requestsCount || 0);
    };

    fetchNotifications();

    // Set up real-time subscriptions
    const messagesChannel = supabase
      .channel("messages-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
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
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(partnershipsChannel);
    };
  }, [userId]);

  return { unreadMessages, pendingRequests, total: unreadMessages + pendingRequests };
};
