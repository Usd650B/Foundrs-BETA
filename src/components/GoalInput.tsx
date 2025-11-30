import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface GoalInputProps {
  userId: string;
}

const GoalInput = ({ userId }: GoalInputProps) => {
  const [goal, setGoal] = useState("");
  const [todayGoal, setTodayGoal] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const maxLength = 100;

  useEffect(() => {
    fetchTodayGoal();
  }, [userId]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim() || goal.length > maxLength) return;

    setLoading(true);
    const today = new Date().toISOString().split("T")[0];

    try {
      const { data, error } = await supabase
        .from("goals")
        .insert({
          user_id: userId,
          goal_text: goal.trim(),
          date: today,
        })
        .select()
        .single();

      if (error) throw error;

      setTodayGoal(data);
      setGoal("");
      toast({
        title: "Goal posted!",
        description: "Now go make it happen 💪",
      });
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

  if (todayGoal) {
    return (
      <Card className="mb-8 border-success/20 bg-success/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl">✅</div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Your goal for today:</p>
              <p className="text-lg font-medium text-foreground">{todayGoal.goal_text}</p>
              {todayGoal.completed ? (
                <p className="text-sm text-success mt-2 font-medium">Marked as complete!</p>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  You'll check in later today
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8 border-primary/20 shadow-lg">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              What's your #1 goal today?
            </label>
            <Textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Ship the payment feature..."
              className="min-h-24 resize-none text-lg"
              disabled={loading}
              maxLength={maxLength}
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-muted-foreground">
                {goal.length}/{maxLength} characters
              </p>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            disabled={loading || !goal.trim() || goal.length > maxLength}
          >
            {loading ? "Posting..." : "Post Today's Goal"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default GoalInput;
