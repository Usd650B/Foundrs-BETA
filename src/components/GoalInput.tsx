import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [dueAt, setDueAt] = useState<string>("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [successMetric, setSuccessMetric] = useState("");
  const [blockers, setBlockers] = useState("");
  const [motivation, setMotivation] = useState("");
  const [joinLimit, setJoinLimit] = useState<number>(3);
  const [joinConditions, setJoinConditions] = useState("");
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
          due_at: dueAt ? new Date(dueAt).toISOString() : null,
          priority,
          success_metric: successMetric.trim() || null,
          blockers: blockers.trim() || null,
          motivation: motivation.trim() || null,
          join_conditions: joinConditions.trim() || null,
          join_limit: joinLimit,
        })
        .select()
        .single();

      if (error) throw error;

      setTodayGoals([...todayGoals, data]);
      setGoal("");
      setDueAt("");
      setPriority("medium");
      setSuccessMetric("");
      setBlockers("");
      setMotivation("");
      setJoinConditions("");
      setJoinLimit(3);
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Time limit</Label>
              <Input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as typeof priority)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Join limit (max 10)</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={joinLimit}
                onChange={(e) => {
                  const value = Math.min(10, Math.max(1, Number(e.target.value)));
                  setJoinLimit(value);
                }}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">Only {joinLimit} people can join this goal.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Success metric</Label>
              <Input
                placeholder="e.g. Close 3 new leads"
                value={successMetric}
                onChange={(e) => setSuccessMetric(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Potential blockers</Label>
              <Input
                placeholder="What could slow you down?"
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium text-foreground">Motivation / Why it matters</Label>
              <Textarea
                placeholder="Remind yourself why this goal matters"
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                className="resize-none"
                disabled={loading}
                maxLength={200}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium text-foreground">Join conditions</Label>
              <Textarea
                placeholder="List any requirements someone must meet before joining this goal"
                value={joinConditions}
                onChange={(e) => setJoinConditions(e.target.value)}
                className="resize-none"
                disabled={loading}
                maxLength={200}
              />
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
                  setDueAt("");
                  setPriority("medium");
                  setSuccessMetric("");
                  setBlockers("");
                  setMotivation("");
                  setJoinConditions("");
                  setJoinLimit(3);
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
