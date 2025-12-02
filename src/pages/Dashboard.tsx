import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import GoalInput from "@/components/GoalInput";
import GoalFeed from "@/components/GoalFeed";
import StreakDisplay from "@/components/StreakDisplay";
import { NotificationSettings } from "@/components/NotificationSettings";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { User } from "@supabase/supabase-js";
import { Users, LogOut, Home, Settings, Bell, User as UserIcon, ListChecks, PlusCircle, Menu } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"notifications" | "profile">("notifications");
  const [profile, setProfile] = useState<{ username: string; avatar_url?: string | null } | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Mock data for notifications - replace with actual data fetching
  const pendingRequests = 0;
  const unreadMessages = 0;

  useEffect(() => {
    // Set up auth listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      if (!session?.user) {
        navigate("/auth");
      }
    });

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
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
          // Show check-in prompt
          toast({
            title: "Evening Check-in",
            description: "How was your day? Don't forget to check in!",
            variant: "default",
          });
        }
      }
    };

    checkEveningCheckIn();
    const interval = setInterval(checkEveningCheckIn, 60000); // Check every minute

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [navigate, toast]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile(data);
        setNewUsername(data.username);
      } else {
        // Create profile if it doesn't exist
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              user_id: userId,
              username: userData.user.email || 'user',
            });

          if (!insertError) {
            // Fetch the newly created profile
            await fetchProfile(userId);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateUsername = async () => {
    if (!user || !newUsername.trim()) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: newUsername.trim() })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, username: newUsername.trim() } : null);
      setEditingUsername(false);
      
      toast({
        title: "Username updated",
        description: "Your username has been updated successfully.",
      });
      
    } catch (error) {
      console.error('Error updating username:', error);
      toast({
        title: "Update failed",
        description: "Failed to update username. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAvatarUpdate = async (url: string) => {
    setProfile(prev => prev ? { ...prev, avatar_url: url } : null);
    
    // Also refresh the profile data from database
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/");
    } catch (error) {
      toast({
        title: "Error signing out",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-lg font-semibold">Goal Feed</h1>
            <div className="h-4 w-px bg-border"></div>
            <p className="text-sm text-muted-foreground">See what other founders are shipping today</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        {/* Sidebar */}
        <aside
          className={cn(
            "bg-background/50 border-border z-50 lg:z-auto",
            "w-72 max-w-full lg:w-64 border-b lg:border-b-0 lg:border-r",
            sidebarOpen ? "fixed inset-y-0 left-0 shadow-2xl lg:relative" : "hidden lg:block"
          )}
        >
          <div className="p-4 space-y-6">
            {/* User Info Card */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Profile" 
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {profile?.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile?.username || user.email}</p>
                  <p className="text-xs text-muted-foreground">Welcome back</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-1">
              <Button 
                variant="ghost" 
                className="w-full justify-start h-8 text-sm"
                onClick={() => navigate("/dashboard")}
              >
                <Home className="mr-2 h-4 w-4" />
                Goal Feed
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start h-8 text-sm"
                onClick={() => navigate("/my-goals")}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                My Goals
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start h-8 text-sm"
                onClick={() => navigate("/partners")}
              >
                <Users className="mr-2 h-4 w-4" />
                Partners
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start h-8 text-sm"
                onClick={() => navigate("/notifications")}
              >
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </Button>
            </nav>

            {/* Daily pulse */}
            <div className="p-4 rounded-lg border border-border bg-card/60 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Daily pulse</p>
              <p className="text-sm text-foreground">
                {profile?.username ? `${profile.username}, keep your streak alive before 11pm.` : "Lock today's goal before the day ends."}
              </p>
            </div>

            {/* Streak Display */}
            <div className="pt-4 border-t border-border">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Your Progress
              </h3>
              <StreakDisplay userId={user.id} />
            </div>

            {/* Account Actions */}
            <div className="pt-4 border-t border-border space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-sm"
                onClick={() => navigate("/profile")}
              >
                <UserIcon className="mr-2 h-4 w-4" />
                Profile
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowSettings(!showSettings);
                  setSettingsTab("notifications");
                }}
                className="w-full justify-start h-8 text-sm"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSignOut} 
                className="w-full justify-start h-8 text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>

            {/* Settings Section */}
            {showSettings && (
              <div className="pt-4 border-t border-border">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Settings
                </h3>
                
                {/* Settings Tabs */}
                <div className="flex gap-1 mb-3">
                  <Button
                    variant={settingsTab === "notifications" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSettingsTab("notifications")}
                    className="flex-1 h-7 text-xs"
                  >
                    <Bell className="h-3 w-3 mr-1" />
                    Notifications
                  </Button>
                  <Button
                    variant={settingsTab === "profile" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSettingsTab("profile")}
                    className="flex-1 h-7 text-xs"
                  >
                    <UserIcon className="h-3 w-3 mr-1" />
                    Profile
                  </Button>
                </div>

                {/* Settings Content */}
                <div className="space-y-3">
                  {settingsTab === "notifications" && (
                    <NotificationSettings userId={user.id} />
                  )}
                  
                  {settingsTab === "profile" && (
                    <div className="space-y-4">
                      {/* Profile Photo */}
                      <ProfilePhotoUpload
                        userId={user.id}
                        currentAvatar={profile?.avatar_url}
                        username={profile?.username || user.email || ''}
                        onAvatarUpdate={handleAvatarUpdate}
                      />
                      
                      {/* Username Edit */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Username
                        </Label>
                        {editingUsername ? (
                          <div className="flex gap-2">
                            <Input
                              value={newUsername}
                              onChange={(e) => setNewUsername(e.target.value)}
                              placeholder="Enter username"
                              className="h-8 text-sm"
                            />
                            <Button
                              size="sm"
                              onClick={updateUsername}
                              disabled={!newUsername.trim()}
                              className="h-8"
                            >
                              Save
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingUsername(false);
                                setNewUsername(profile?.username || '');
                              }}
                              className="h-8"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{profile?.username || 'Not set'}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingUsername(true)}
                              className="h-6 px-2 text-xs"
                            >
                              Edit
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      <div className="pt-3 border-t border-border text-xs text-muted-foreground">
                        Need more controls? Visit the full profile page from the button above.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Goal Feed</h2>
              <span className="text-xs text-muted-foreground">Live from the community</span>
            </div>
            <GoalFeed currentUserId={user.id} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
