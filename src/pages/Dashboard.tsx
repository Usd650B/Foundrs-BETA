import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import GoalInput from "@/components/GoalInput";
import GoalFeed from "@/components/GoalFeed";
import StreakDisplay from "@/components/StreakDisplay";
import CheckInDialog from "@/components/CheckInDialog";
import { User } from "@supabase/supabase-js";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
      setLoading(false);
    });

    // Check if it's evening time (after 6 PM) and user hasn't checked in today
    const checkEveningCheckIn = () => {
      const hour = new Date().getHours();
      if (hour >= 18) {
        // Check if user has already checked in today
        const lastCheckIn = localStorage.getItem("lastCheckIn");
        const today = new Date().toDateString();
        if (lastCheckIn !== today) {
          setShowCheckIn(true);
        }
      }
    };

    checkEveningCheckIn();
    const interval = setInterval(checkEveningCheckIn, 60000); // Check every minute

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [navigate]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message,
      });
    } else {
      navigate("/");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Daily Standup</h1>
          <div className="flex items-center gap-4">
            <StreakDisplay userId={user.id} />
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <GoalInput userId={user.id} />
        <GoalFeed currentUserId={user.id} />
      </main>

      <CheckInDialog
        open={showCheckIn}
        onOpenChange={setShowCheckIn}
        userId={user.id}
      />
    </div>
  );
};

export default Dashboard;
