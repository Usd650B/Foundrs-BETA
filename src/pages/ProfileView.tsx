import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";

interface PublicProfile {
  username: string;
  avatar_url?: string | null;
  bio?: string | null;
  founder_stage?: string | null;
  current_streak?: number | null;
  longest_streak?: number | null;
}

const ProfileView = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, avatar_url, bio, founder_stage, current_streak, longest_streak")
        .eq("user_id", userId)
        .single();

      if (!error && data) {
        setProfile(data);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Profile not found.</p>
          <Button onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/90 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            ← Back
          </Button>
          <h1 className="text-lg font-semibold">Founder profile</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center gap-4">
            <UserAvatar
              avatarUrl={profile.avatar_url}
              username={profile.username}
              size="lg"
              className="h-16 w-16"
            />
            <div>
              <CardTitle className="text-2xl">{profile.username}</CardTitle>
              {profile.founder_stage && (
                <Badge className="mt-2 capitalize" variant="secondary">
                  {profile.founder_stage.replace("_", " ")}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Bio</p>
              <p className="text-base">
                {profile.bio || "This founder hasn’t shared a bio yet."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground uppercase">Current streak</p>
                <p className="text-xl font-semibold">{profile.current_streak ?? 0} days</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground uppercase">Longest streak</p>
                <p className="text-xl font-semibold">{profile.longest_streak ?? 0} days</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate(`/partners`, { state: { highlightUser: userId } })}>
                Request friendship
              </Button>
              <Button variant="outline" onClick={() => navigate(`/partners`, { state: { messageUser: userId } })}>
                Message
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProfileView;
