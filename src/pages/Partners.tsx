import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import PartnerDiscovery from "@/components/PartnerDiscovery";
import PartnershipManager from "@/components/PartnershipManager";
import PartnershipDetails from "@/components/PartnershipDetails";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotifications } from "@/hooks/use-notifications";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, LogOut } from "lucide-react";

const Partners = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPartnership, setSelectedPartnership] = useState<{ id: string; partnerId: string; partnerName: string } | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { pendingRequests, unreadMessages } = useNotifications(user?.id || "");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (data) {
      setProfile(data);
      if (!data.founder_stage || !data.bio) {
        setIsEditingProfile(true);
      }
    }
  };

  const updateProfile = async () => {
    if (!profile.founder_stage || !profile.bio?.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in your founder stage and bio"
      });
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        founder_stage: profile.founder_stage,
        bio: profile.bio
      })
      .eq("user_id", user?.id);

    if (!error) {
      toast({ title: "Profile Updated!", description: "Your profile is now complete" });
      setIsEditingProfile(false);
    }
  };

  const handlePartnerClick = async (partnershipId: string, partnerId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", partnerId)
      .single();

    setSelectedPartnership({
      id: partnershipId,
      partnerId,
      partnerName: data?.username || "Partner"
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user || !profile) return null;

  if (isEditingProfile) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Complete Your Profile</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Tell us about your journey</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>What stage is your startup at?</Label>
                <Select
                  value={profile.founder_stage}
                  onValueChange={(value) => setProfile({ ...profile, founder_stage: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">💡 Idea Stage</SelectItem>
                    <SelectItem value="mvp">🚀 Building MVP</SelectItem>
                    <SelectItem value="early_revenue">💰 Early Revenue</SelectItem>
                    <SelectItem value="scaling">📈 Scaling</SelectItem>
                    <SelectItem value="established">🏢 Established</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea
                  value={profile.bio || ""}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell potential partners about what you're building..."
                  rows={4}
                />
              </div>

              <Button onClick={updateProfile} className="w-full">
                Save & Continue
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-foreground">Accountability Partners</h1>
            {(pendingRequests > 0 || unreadMessages > 0) && (
              <Badge variant="destructive" className="animate-pulse">
                {pendingRequests + unreadMessages} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {selectedPartnership ? (
          <div className="space-y-4">
            <Button variant="outline" onClick={() => setSelectedPartnership(null)}>
              ← Back to Partnerships
            </Button>
            <PartnershipDetails
              partnershipId={selectedPartnership.id}
              currentUserId={user.id}
              partnerId={selectedPartnership.partnerId}
              partnerName={selectedPartnership.partnerName}
            />
          </div>
        ) : (
          <div className="space-y-8">
            <PartnershipManager
              currentUserId={user.id}
              onPartnerClick={handlePartnerClick}
            />
            <PartnerDiscovery
              currentUserId={user.id}
              currentStage={profile.founder_stage}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default Partners;