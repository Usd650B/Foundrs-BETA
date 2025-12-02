import { supabase } from "@/integrations/supabase/client";

interface MailroomNotificationOptions {
  recipientId?: string | null;
  senderName?: string | null;
  preview: string;
  partnershipId?: string;
  partnerName?: string | null;
}

export const notifyMailroomMessage = async ({
  recipientId,
  senderName,
  preview,
  partnershipId,
  partnerName,
}: MailroomNotificationOptions) => {
  if (!recipientId) return;

  try {
    await supabase.from("notifications").insert({
      user_id: recipientId,
      title: "Someone mailroomed you",
      message: `${senderName || "A partner"}: ${preview.slice(0, 140)}`,
      type: "message",
      metadata: {
        partnership_id: partnershipId ?? null,
        partner_name: partnerName ?? senderName ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to create mailroom notification", error);
  }
};
