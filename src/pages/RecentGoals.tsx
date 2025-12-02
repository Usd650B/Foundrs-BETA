import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, Clock, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Goal {
  id: string;
  goal_text: string;
  created_at: string;
  date: string;
  completed: boolean;
  due_at: string | null;
  priority: "low" | "medium" | "high" | "critical" | null;
  success_metric: string | null;
  blockers: string | null;
  motivation: string | null;
  profiles: {
    username: string;
    avatar_url: string | null;
  } | null;
}

const RecentGoals = () => {
  const [user, setUser] = useState<User | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await fetchGoals(session.user.id);
      setLoading(false);
    };

    loadUser();
  }, [navigate]);

  const fetchGoals = async (userId: string) => {
    const { data, error } = await supabase
      .from("goals")
      .select(`
        id,
        goal_text,
        created_at,
        date,
        completed,
        due_at,
        priority,
        success_metric,
        blockers,
        motivation,
        profiles ( username, avatar_url )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      toast({
        variant: "destructive",
        title: "Unable to load goals",
        description: error.message,
      });
      return;
    }

    setGoals(data || []);
  };

  const handleClaimGoal = async (goal: Goal) => {
    if (!user || goal.completed || claimingId) return;

    setClaimingId(goal.id);
    try {
      const { error: goalError } = await supabase
        .from("goals")
        .update({ completed: true })
        .eq("id", goal.id);

      if (goalError) throw goalError;

      const today = new Date().toISOString().split("T")[0];
      if (goal.date === today) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("current_streak, longest_streak")
          .eq("user_id", user.id)
          .single();

        if (!profileError && profile) {
          const current = profile.current_streak || 0;
          const longest = profile.longest_streak || 0;
          const newCurrent = current + 1;
          const newLongest = Math.max(newCurrent, longest);

          await supabase
            .from("profiles")
            .update({
              current_streak: newCurrent,
              longest_streak: newLongest,
            })
            .eq("user_id", user.id);
        }
      }

      setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, completed: true } : g)));
      toast({
        title: "Goal claimed!",
        description: "Streak updated. Keep going!",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Unable to claim goal",
        description: error.message,
      });
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95">
        <div className="flex items-center h-14 px-4 gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-lg font-semibold">Recent Goals</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Review your last 20 goals, claim completions, and keep the streak alive.
            </p>
          </div>
          <Button size="sm" onClick={() => navigate("/goals/add")}>Add new goal</Button>
        </div>

        {goals.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No goals yet. Start by adding one!</p>
            </CardContent>
          </Card>
        ) : (
          goals.map((goal) => (
            <Card key={goal.id} className="border-border/60">
              <CardHeader className="flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold">
                    {goal.goal_text}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {goal.due_at ? new Date(goal.due_at).toLocaleString() : "No time limit"}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={`capitalize ${goal.priority === "critical" ? "bg-red-500/20 text-red-700" : goal.priority === "high" ? "bg-amber-500/20 text-amber-700" : goal.priority === "low" ? "bg-emerald-500/20 text-emerald-700" : ""}`}
                    >
                      {goal.priority || "medium"} priority
                    </Badge>
                    {goal.completed && (
                      <Badge className="bg-emerald-500/20 text-emerald-700 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Completed
                      </Badge>
                    )}
                  </div>
                </div>
                {!goal.completed && (
                  <Button
                    size="sm"
                    onClick={() => handleClaimGoal(goal)}
                    disabled={claimingId === goal.id}
                  >
                    {claimingId === goal.id ? "Claiming..." : "Claim finish"}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {goal.success_metric && (
                  <div>
                    <p className="text-muted-foreground">Success metric</p>
                    <p className="font-medium">{goal.success_metric}</p>
                  </div>
                )}
                {goal.blockers && (
                  <div>
                    <p className="text-muted-foreground">Potential blockers</p>
                    <p className="font-medium">{goal.blockers}</p>
                  </div>
                )}
                {goal.motivation && (
                  <div>
                    <p className="text-muted-foreground">Motivation</p>
                    <p className="font-medium flex items-center gap-1">
                      <Sparkles className="h-4 w-4 text-primary" />
                      {goal.motivation}
                    </p>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Created {new Date(goal.created_at).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
};

export default RecentGoals;
