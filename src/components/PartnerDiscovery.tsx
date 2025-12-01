import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Profile {
  user_id: string;
  username: string;
  bio: string;
  founder_stage: string;
  current_streak: number;
}

interface PartnerDiscoveryProps {
  currentUserId: string;
  currentStage: string;
}

const PartnerDiscovery = ({ currentUserId, currentStage }: PartnerDiscoveryProps) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchPotentialPartners();
  }, [currentUserId, currentStage]);

  const fetchPotentialPartners = async () => {
    const { data: existingPartnerships } = await supabase
      .from("partnerships")
      .select("requester_id, receiver_id")
      .or(`requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

    const existingPartnerIds = existingPartnerships?.flatMap(p => 
      [p.requester_id, p.receiver_id]
    ).filter(id => id !== currentUserId) || [];

    let query = supabase
      .from("profiles")
      .select("*")
      .neq("user_id", currentUserId);
    
    if (currentStage) {
      query = query.eq("founder_stage", currentStage as any);
    }
    
    if (existingPartnerIds.length > 0) {
      query = query.not("user_id", "in", `(${existingPartnerIds.join(",")})`);
    }
    
    const { data, error } = await query.limit(10);

    if (!error && data) {
      setProfiles(data);
    }
    setLoading(false);
  };

  const sendPartnerRequest = async () => {
    if (!selectedProfile) return;

    const { error } = await supabase
      .from("partnerships")
      .insert({
        requester_id: currentUserId,
        receiver_id: selectedProfile.user_id,
        message,
        status: "pending"
      });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send partner request"
      });
    } else {
      toast({
        title: "Request Sent!",
        description: `Partner request sent to ${selectedProfile.username}`
      });
      setSelectedProfile(null);
      setMessage("");
      fetchPotentialPartners();
    }
  };

  const stageLabels = {
    idea: "💡 Idea Stage",
    mvp: "🚀 Building MVP",
    early_revenue: "💰 Early Revenue",
    scaling: "📈 Scaling",
    established: "🏢 Established"
  };

  if (loading) {
    return <div className="text-muted-foreground">Finding founders like you...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          Find Your Accountability Partner
        </h2>
        
        {profiles.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center py-12">
              <p className="text-muted-foreground">
                No founders at your stage right now. Check back soon! 🔍
              </p>
            </CardContent>
          </Card>
        ) : (
          profiles.map((profile) => (
            <Card key={profile.user_id} className="hover:border-primary/30 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                      {profile.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-foreground">{profile.username}</h3>
                      <Badge variant="secondary">
                        {stageLabels[profile.founder_stage as keyof typeof stageLabels]}
                      </Badge>
                      {profile.current_streak > 0 && (
                        <Badge variant="outline" className="bg-accent/10">
                          🔥 {profile.current_streak} day streak
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {profile.bio || "Building something awesome 🚀"}
                    </p>
                    <Button 
                      onClick={() => setSelectedProfile(profile)}
                      variant="outline"
                      size="sm"
                    >
                      Request Partnership
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Partnership with {selectedProfile?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Introduce yourself and why you'd like to be accountability partners..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSelectedProfile(null)}>
                Cancel
              </Button>
              <Button onClick={sendPartnerRequest} disabled={!message.trim()}>
                Send Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PartnerDiscovery;