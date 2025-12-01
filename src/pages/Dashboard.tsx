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
import { useNotifications } from "@/hooks/use-notifications";
import { Users, LogOut, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { pendingRequests, unreadMessages } = useNotifications(user?.id || "");

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
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card hidden md:flex md:flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Home className="w-5 h-5" />
            Daily Standup
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start font-medium bg-secondary"
            onClick={() => navigate("/dashboard")}
          >
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start font-medium"
            onClick={() => navigate("/partners")}
          >
            <Users className="w-4 h-4 mr-2" />
            Partners
            {(pendingRequests > 0 || unreadMessages > 0) && (
              <Badge variant="destructive" className="ml-auto">
                {pendingRequests + unreadMessages}
              </Badge>
            )}
          </Button>
        </nav>

        <div className="p-4 border-t border-border">
          <StreakDisplay userId={user.id} />
          <Button
            variant="ghost"
            className="w-full justify-start mt-2 text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="border-b border-border bg-card md:hidden">
          <div className="px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">Daily Standup</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/partners")}
                className="relative"
              >
                <Users className="w-5 h-5" />
                {(pendingRequests > 0 || unreadMessages > 0) && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {pendingRequests + unreadMessages}
                  </Badge>
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm hidden md:block sticky top-0 z-10">
          <div className="px-8 py-4">
            <h2 className="text-2xl font-bold text-foreground">Your Daily Standup</h2>
            <p className="text-sm text-muted-foreground mt-1">What's your #1 goal today?</p>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 md:px-8 py-8 max-w-4xl">
            <GoalInput userId={user.id} />
            <GoalFeed currentUserId={user.id} />
          </div>
        </main>
      </div>

      <CheckInDialog
        open={showCheckIn}
        onOpenChange={setShowCheckIn}
        userId={user.id}
      />
    </div>
  );
};

export default Dashboard;
