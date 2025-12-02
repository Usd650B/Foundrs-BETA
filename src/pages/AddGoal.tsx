import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import GoalInput from "@/components/GoalInput";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const AddGoal = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      setLoading(false);
    };

    init();
  }, [navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
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
          <h1 className="text-lg font-semibold">Add a Goal</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Capture more context with time limit, priority, success metrics, blockers, and motivation.
          </p>
        </div>
        <GoalInput userId={user.id} />
      </main>
    </div>
  );
};

export default AddGoal;
