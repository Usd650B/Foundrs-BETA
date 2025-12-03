import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import GoalInput from "@/components/GoalInput";
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

const sectionConfig = [
  { id: "add-goal", label: "Add new goal", description: "Plan today's focus" },
  { id: "recent-goals", label: "Recent goals", description: "Latest commitments" },
  { id: "goal-library", label: "Goals library", description: "Archive & references" },
];

const MyGoals = () => {
  const [user, setUser] = useState<User | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState(sectionConfig[0].id);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await fetchGoals(session.user.id);
      setLoading(false);
    };

    init();
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
      .limit(50);

    if (error) {
      toast({
        variant: "destructive",
        title: "Unable to load your goals",
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
        description: "Nice streak boost 🔥",
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

  const recentGoals = goals.slice(0, 5);
  const libraryGoals = goals;

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-lg font-semibold">My Goals</h1>
            <div className="h-4 w-px bg-border"></div>
            <p className="text-sm text-muted-foreground">Draft, edit, and track your own commitments</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-2 border border-border rounded-2xl p-4 h-fit">
          <div className="mb-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Navigate</p>
          </div>
          {sectionConfig.map(({ id, label, description }) => (
            <button
              key={id}
              onClick={() => {
                setActiveSection(id);
              }}
              className={`w-full text-left rounded-xl border px-3 py-2 transition ${
                activeSection === id
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : "border-border bg-background hover:border-primary/30"
              }`}
            >
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </button>
          ))}
          <Button variant="outline" size="sm" className="w-full" onClick={() => fetchGoals(user.id)}>
            Refresh data
          </Button>
        </aside>

        <div className="space-y-10">
          {activeSection === "add-goal" && (
            <section>
              <GoalInput userId={user.id} />
            </section>
          )}

          {activeSection === "recent-goals" && (
            <section className="space-y-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Latest</p>
                    <h2 className="text-lg font-semibold">Recent goals</h2>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Showing {recentGoals.length} of {goals.length}
                  </Badge>
                </div>
              </div>

              {recentGoals.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-10 text-center">
                    <p className="text-muted-foreground">No recent goals yet. Add one from the Add Goal tab.</p>
                  </CardContent>
                </Card>
              ) : (
                recentGoals.map((goal) => (
                  <Card key={goal.id} className="border-border/60">
                    <CardHeader className="flex-row items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-base font-semibold">{goal.goal_text}</CardTitle>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {goal.due_at ? new Date(goal.due_at).toLocaleString() : "No time limit"}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={`capitalize ${
                              goal.priority === "critical"
                                ? "bg-red-500/20 text-red-700"
                                : goal.priority === "high"
                                  ? "bg-amber-500/20 text-amber-700"
                                  : goal.priority === "low"
                                    ? "bg-emerald-500/20 text-emerald-700"
                                    : ""
                            }`}
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
                        <Button size="sm" onClick={() => handleClaimGoal(goal)} disabled={claimingId === goal.id}>
                          {claimingId === goal.id ? "Claiming..." : "Mark complete"}
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
                        Added {new Date(goal.created_at).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </section>
          )}

          {activeSection === "goal-library" && (
            <section className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Archive</p>
                  <h2 className="text-lg font-semibold">Goals library</h2>
                </div>
                <Badge variant="outline" className="text-xs">
                  Total saved: {libraryGoals.length}
                </Badge>
              </div>

              {libraryGoals.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-10 text-center">
                    <p className="text-muted-foreground">Once you start shipping, your archive will live here.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {libraryGoals.map((goal) => (
                    <Card key={`library-${goal.id}`} className="border-border/60">
                      <CardContent className="pt-6 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold leading-snug">{goal.goal_text}</p>
                            <p className="text-xs text-muted-foreground">
                              Added {new Date(goal.created_at).toLocaleDateString()} · {goal.priority || "medium"} priority
                            </p>
                          </div>
                          <Badge variant={goal.completed ? "default" : "secondary"} className="capitalize">
                            {goal.completed ? "Completed" : "In progress"}
                          </Badge>
                        </div>
                        {goal.motivation && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{goal.motivation}</p>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            Due {goal.due_at ? new Date(goal.due_at).toLocaleDateString() : "Flexible"}
                          </span>
                          {!goal.completed && (
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleClaimGoal(goal)}>
                              Mark finished
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default MyGoals;
