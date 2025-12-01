import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const messageSchema = z.object({
  message: z.string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(500, "Message must be less than 500 characters")
});

interface MessageUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetUsername: string;
  currentUserId: string;
}

const MessageUserDialog = ({
  open,
  onOpenChange,
  targetUserId,
  targetUsername,
  currentUserId
}: MessageUserDialogProps) => {
  const [message, setMessage] = useState("");
  const [existingPartnership, setExistingPartnership] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (open && targetUserId) {
      checkExistingPartnership();
    }
  }, [open, targetUserId]);

  const checkExistingPartnership = async () => {
    const { data } = await supabase
      .from("partnerships")
      .select("*")
      .or(`and(requester_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`)
      .single();

    setExistingPartnership(data);
  };

  const handleSendMessage = async () => {
    try {
      const validatedData = messageSchema.parse({ message });
      setLoading(true);

      if (existingPartnership) {
        if (existingPartnership.status === "active") {
          // Navigate to partnership chat
          navigate(`/partners?partnership=${existingPartnership.id}`);
          onOpenChange(false);
          return;
        } else if (existingPartnership.status === "pending") {
          toast({
            title: "Partnership Pending",
            description: "You already have a pending partnership request with this user."
          });
          onOpenChange(false);
          return;
        }
      }

      // Send partnership request
      const { error } = await supabase.from("partnerships").insert({
        requester_id: currentUserId,
        receiver_id: targetUserId,
        message: validatedData.message,
        status: "pending"
      });

      if (error) throw error;

      toast({
        title: "Partnership Request Sent!",
        description: `Your request has been sent to ${targetUsername}`
      });

      onOpenChange(false);
      setMessage("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: error.errors[0].message
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to send partnership request"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect with {targetUsername}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {targetUsername.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">{targetUsername}</p>
              {existingPartnership?.status === "active" && (
                <Badge variant="outline" className="bg-success/10 mt-1">
                  Already Partners
                </Badge>
              )}
            </div>
          </div>

          {existingPartnership?.status === "active" ? (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                You're already accountability partners with {targetUsername}!
              </p>
              <Button onClick={handleSendMessage} className="w-full" disabled={loading}>
                Go to Chat
              </Button>
            </div>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Introduce yourself and why you'd like to be partners:
                </label>
                <Textarea
                  placeholder={`Hey ${targetUsername}, I saw your goal today and would love to be accountability partners!`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {message.length}/500 characters
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || loading}
                >
                  {loading ? "Sending..." : "Send Request"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessageUserDialog;
