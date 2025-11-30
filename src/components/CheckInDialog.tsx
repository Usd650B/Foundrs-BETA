import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface CheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const CheckInDialog = ({ open, onOpenChange, userId }: CheckInDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [todayGoal, setTodayGoal] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchTodayGoal();
    }
  }, [open, userId]);

  const fetchTodayGoal = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();

    if (!error && data) {
      setTodayGoal(data);
    }
  };

  const handleCheckIn = async (completed: boolean) => {
    if (!todayGoal) return;

    setLoading(true);
    try {
      // Update goal completion
      const { error: goalError } = await supabase
        .from("goals")
        .update({ completed })
        .eq("id", todayGoal.id);

      if (goalError) throw goalError;

      // Update streak
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("current_streak, longest_streak")
        .eq("user_id", userId)
        .single();

      if (!profileError && profile) {
        const newStreak = completed ? profile.current_streak + 1 : 0;
        const newLongest = Math.max(newStreak, profile.longest_streak);

        await supabase
          .from("profiles")
          .update({
            current_streak: newStreak,
            longest_streak: newLongest,
          })
          .eq("user_id", userId);
      }

      // Mark check-in as done for today
      localStorage.setItem("lastCheckIn", new Date().toDateString());

      toast({
        title: completed ? "Great work! 🎉" : "Tomorrow's a new day",
        description: completed
          ? "Streak updated! Keep the momentum going."
          : "Don't break the chain tomorrow!",
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!todayGoal) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No goal for today</DialogTitle>
            <DialogDescription>
              You didn't post a goal today. Post one now to keep your streak going!
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>End of Day Check-In</DialogTitle>
          <DialogDescription>Did you complete your goal today?</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="font-medium text-foreground">{todayGoal.goal_text}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleCheckIn(true)}
              disabled={loading}
              className="bg-success hover:bg-success/90 text-success-foreground"
            >
              ✓ Yes, Done!
            </Button>
            <Button
              onClick={() => handleCheckIn(false)}
              disabled={loading}
              variant="outline"
            >
              Not Today
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckInDialog;
