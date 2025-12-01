import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, X } from "lucide-react";
import { z } from "zod";

const goalSchema = z.object({
  goal_text: z.string()
    .trim()
    .min(1, "Goal cannot be empty")
    .max(100, "Goal must be less than 100 characters")
});

interface GoalInputProps {
  userId: string;
}

const GoalInput = ({ userId }: GoalInputProps) => {
  const [goal, setGoal] = useState("");
  const [todayGoals, setTodayGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const { toast } = useToast();
  const maxLength = 100;

  useEffect(() => {
    fetchTodayGoals();

    // Set up realtime subscription for goals
    const channel = supabase
      .channel("user-goals")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "goals",
          filter: `user_id=eq.${userId}`
        },
        () => fetchTodayGoals()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchTodayGoals = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setTodayGoals(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = goalSchema.parse({ goal_text: goal });
      setLoading(true);
      
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("goals")
        .insert({
          user_id: userId,
          goal_text: validatedData.goal_text,
          date: today,
        })
        .select()
        .single();

      if (error) throw error;

      setTodayGoals([...todayGoals, data]);
      setGoal("");
      setShowInput(false);
      toast({
        title: "Goal added!",
        description: "Now go make it happen 💪",
      });
    } catch (error: any) {
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
          description: error.message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteGoal = async (goalId: string) => {
    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", goalId);

    if (!error) {
      setTodayGoals(todayGoals.filter(g => g.id !== goalId));
      toast({
        title: "Goal removed",
        description: "Goal has been deleted"
      });
    }
  };

  if (todayGoals.length > 0 && !showInput) {
    return (
      <div className="mb-8 space-y-3">
        {todayGoals.map((goalItem) => (
          <Card key={goalItem.id} className="border-success/20 bg-success/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="text-2xl">✅</div>
                <div className="flex-1">
                  <p className="text-lg font-medium text-foreground">{goalItem.goal_text}</p>
                  {goalItem.completed ? (
                    <p className="text-sm text-success mt-2 font-medium">Marked as complete!</p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2">
                      You'll check in later today
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteGoal(goalItem.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowInput(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Another Goal
        </Button>
      </div>
    );
  }

  return (
    <Card className="mb-8 border-primary/20 shadow-lg">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              {todayGoals.length > 0 ? "Add another goal for today" : "What's your #1 goal today?"}
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
          <div className="flex gap-2">
            {todayGoals.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowInput(false);
                  setGoal("");
                }}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              disabled={loading || !goal.trim() || goal.length > maxLength}
            >
              {loading ? "Posting..." : todayGoals.length > 0 ? "Add Goal" : "Post Today's Goal"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default GoalInput;
