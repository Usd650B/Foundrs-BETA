import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Goal {
  id: string;
  goal_text: string;
  created_at: string;
  completed: boolean;
  profiles: {
    username: string;
  };
}

interface GoalFeedProps {
  currentUserId: string;
}

const GoalFeed = ({ currentUserId }: GoalFeedProps) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

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
    const today = new Date().toISOString().split("T")[0];
    
    // First get goals
    const { data: goalsData, error: goalsError } = await supabase
      .from("goals")
      .select("*")
      .eq("date", today)
      .order("created_at", { ascending: false })
      .limit(20);

    if (goalsError || !goalsData) {
      setLoading(false);
      return;
    }

    // Then get profiles for those users
    const userIds = [...new Set(goalsData.map(g => g.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, username")
      .in("user_id", userIds);

    // Combine data
    const goalsWithProfiles = goalsData.map(goal => ({
      ...goal,
      profiles: profilesData?.find(p => p.user_id === goal.user_id) || { username: "Unknown" }
    }));

    setGoals(goalsWithProfiles as any);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-20 bg-muted rounded" />
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
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground mb-4">
        Today's Standup ({goals.length})
      </h2>
      {goals.map((goal) => (
        <Card key={goal.id} className="hover:border-primary/30 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {goal.profiles.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-foreground">
                    {goal.profiles.username}
                  </p>
                  {goal.completed && (
                    <span className="text-success text-xs">✓ Done</span>
                  )}
                </div>
                <p className="text-foreground">{goal.goal_text}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(goal.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default GoalFeed;
