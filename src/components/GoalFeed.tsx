import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import MessageUserDialog from "./MessageUserDialog";
import { UserAvatar } from "./UserAvatar";

interface Goal {
  id: string;
  goal_text: string;
  created_at: string;
  completed: boolean;
  user_id: string;
  profiles?: {
    username: string;
    avatar_url?: string | null;
    founder_stage?: string | null;
  } | null;
  due_at?: string | null;
  priority?: "low" | "medium" | "high" | "critical" | null;
  success_metric?: string | null;
  motivation?: string | null;
  join_conditions?: string | null;
  join_limit?: number | null;
  join_current_count?: number | null;
}

interface GoalFeedProps {
  currentUserId: string;
  hideCurrentUserGoals?: boolean;
}

const GoalFeed = ({ currentUserId, hideCurrentUserGoals = false }: GoalFeedProps) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);

  useEffect(() => {
    fetchGoals();

    // Set up realtime subscription
    const channel = supabase
      .channel("goals-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "goals",
        },
        () => {
          fetchGoals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from("goals")
        .select(`
          id,
          goal_text,
          created_at,
          completed,
          user_id,
          due_at,
          priority,
          success_metric,
          motivation,
          join_conditions,
          join_limit,
          join_current_count,
          profiles (
            username,
            avatar_url,
            founder_stage
          )
        `)
        .eq("date", new Date().toISOString().split("T")[0])
        .order("created_at", { ascending: false });

      if (error) throw error;
      const now = new Date();
      const filtered = (data || [])
        .filter((goal) => (hideCurrentUserGoals ? goal.user_id !== currentUserId : true))
        .filter((goal) => {
          const limit = Math.min(Math.max(goal.join_limit ?? 3, 1), 10);
          const usedSlots = Math.min(goal.join_current_count ?? 0, limit);
          const hasSlots = usedSlots < limit;
          const hasTime = !goal.due_at || new Date(goal.due_at) > now;
          return hasSlots && hasTime;
        });
      setGoals(filtered);
    } catch (error) {
      console.error("Error fetching goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      setDeletingGoalId(goalId);
      const { error } = await supabase.from("goals").delete().eq("id", goalId);
      if (error) throw error;
      setGoals((prev) => prev.filter((goal) => goal.id !== goalId));
    } catch (error) {
      console.error("Error deleting goal", error);
    } finally {
      setDeletingGoalId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-muted"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/4 bg-muted rounded"></div>
                  <div className="h-3 w-3/4 bg-muted rounded"></div>
                  <div className="h-2 w-1/6 bg-muted rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center py-12">
          <p className="text-muted-foreground">
            No goals posted yet today. Be the first! 🚀
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {goals.map((goal) => {
        const limit = Math.min(Math.max(goal.join_limit ?? 3, 1), 10);
        const usedSlots = Math.min(goal.join_current_count ?? 0, limit);
        const remainingSlots = Math.max(0, limit - usedSlots);
        const isFull = remainingSlots <= 0;
        return (
          <Card
            key={goal.id}
            className="border-border/60 shadow-sm hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
          >
            <CardContent className="p-5 space-y-4">
              <div className="flex flex-col items-center text-center space-y-2">
                <UserAvatar
                  avatarUrl={goal.profiles?.avatar_url}
                  username={goal.profiles?.username}
                  size="lg"
                  className="h-20 w-20"
                />
                <div>
                  <p className="text-sm font-semibold">
                    {goal.profiles?.username || "Anonymous"}
                  </p>
                  {goal.profiles?.founder_stage && (
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {goal.profiles.founder_stage.replace("_", " ")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="capitalize text-xs">
                  {goal.priority || "medium"}
                </Badge>
                {goal.due_at && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {new Date(goal.due_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Badge>
                )}
                {goal.completed && (
                  <Badge className="bg-emerald-500/20 text-emerald-700 text-xs">✓ Done</Badge>
                )}
                {!goal.completed && (
                  <Badge className="bg-amber-500/20 text-amber-700 text-xs">In progress</Badge>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold leading-snug">
                  {goal.goal_text}
                </h3>
                {goal.motivation && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {goal.motivation}
                  </p>
                )}
              </div>
              {goal.success_metric && (
                <div className="text-xs text-muted-foreground">
                  Success metric: <span className="text-foreground font-medium">{goal.success_metric}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>
                  Slots left: <span className="text-foreground font-semibold">{remainingSlots}</span>/{limit}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  {new Date(goal.created_at).toLocaleDateString()} · {new Date(goal.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="flex items-center gap-2">
                  {goal.user_id === currentUserId ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-red-600 hover:text-red-700"
                      disabled={deletingGoalId === goal.id}
                      onClick={() => handleDeleteGoal(goal.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {deletingGoalId === goal.id ? "Deleting..." : "Delete"}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      disabled={isFull}
                      onClick={() => setSelectedGoal(goal)}
                    >
                      {isFull ? "Goal full" : "Join Goal"}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <MessageUserDialog
        open={!!selectedGoal}
        onOpenChange={(open) => !open && setSelectedGoal(null)}
        targetUserId={selectedGoal?.user_id || ""}
        targetUsername={selectedGoal?.profiles?.username || ""}
        currentUserId={currentUserId}
        goalId={selectedGoal?.id}
        goalTitle={selectedGoal?.goal_text}
        joinConditions={selectedGoal?.join_conditions}
        joinLimit={selectedGoal?.join_limit}
        joinCurrentCount={selectedGoal?.join_current_count}
      />
    </div>
  );
};

export default GoalFeed;
