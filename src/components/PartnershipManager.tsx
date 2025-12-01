import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Partnership {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: string;
  message: string;
  created_at: string;
  requester_profile?: { username: string; founder_stage: string };
  receiver_profile?: { username: string; founder_stage: string };
}

interface PartnershipManagerProps {
  currentUserId: string;
  onPartnerClick: (partnershipId: string, partnerId: string) => void;
}

const PartnershipManager = ({ currentUserId, onPartnerClick }: PartnershipManagerProps) => {
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPartnerships();

    const channel = supabase
      .channel("partnerships-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "partnerships",
        },
        () => fetchPartnerships()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const fetchPartnerships = async () => {
    // First get partnerships
    const { data: partnershipsData, error } = await supabase
      .from("partnerships")
      .select("*")
      .or(`requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false });

    if (error || !partnershipsData) {
      setLoading(false);
      return;
    }

    // Get all unique user IDs we need profiles for
    const userIds = [...new Set([
      ...partnershipsData.map(p => p.requester_id),
      ...partnershipsData.map(p => p.receiver_id)
    ])];

    // Fetch profiles for those users
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, username, founder_stage")
      .in("user_id", userIds);

    // Combine data
    const partnershipsWithProfiles = partnershipsData.map(partnership => ({
      ...partnership,
      requester_profile: profilesData?.find(p => p.user_id === partnership.requester_id),
      receiver_profile: profilesData?.find(p => p.user_id === partnership.receiver_id)
    }));

    setPartnerships(partnershipsWithProfiles as any);
    setLoading(false);
  };

  const updatePartnershipStatus = async (partnershipId: string, newStatus: "active" | "declined") => {
    const { error } = await supabase
      .from("partnerships")
      .update({ status: newStatus })
      .eq("id", partnershipId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update partnership"
      });
    } else {
      toast({
        title: newStatus === "active" ? "Partnership Accepted!" : "Request Declined",
        description: newStatus === "active" 
          ? "You can now chat and track milestones together"
          : "Partnership request declined"
      });
      fetchPartnerships();
    }
  };

  const getPartnerInfo = (partnership: Partnership) => {
    const isRequester = partnership.requester_id === currentUserId;
    return {
      partnerId: isRequester ? partnership.receiver_id : partnership.requester_id,
      partnerName: isRequester 
        ? partnership.receiver_profile?.username 
        : partnership.requester_profile?.username,
      partnerStage: isRequester
        ? partnership.receiver_profile?.founder_stage
        : partnership.requester_profile?.founder_stage
    };
  };

  const activePartnerships = partnerships.filter(p => p.status === "active");
  const pendingReceived = partnerships.filter(
    p => p.status === "pending" && p.receiver_id === currentUserId
  );
  const pendingSent = partnerships.filter(
    p => p.status === "pending" && p.requester_id === currentUserId
  );

  if (loading) {
    return <div className="text-muted-foreground">Loading partnerships...</div>;
  }

  const stageLabels = {
    idea: "💡 Idea",
    mvp: "🚀 MVP",
    early_revenue: "💰 Revenue",
    scaling: "📈 Scaling",
    established: "🏢 Established"
  };

  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="active">Active ({activePartnerships.length})</TabsTrigger>
        <TabsTrigger value="requests">Requests ({pendingReceived.length})</TabsTrigger>
        <TabsTrigger value="sent">Sent ({pendingSent.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="space-y-4">
        {activePartnerships.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center py-12">
              <p className="text-muted-foreground">
                No active partnerships yet. Find a partner below! 🤝
              </p>
            </CardContent>
          </Card>
        ) : (
          activePartnerships.map((partnership) => {
            const { partnerId, partnerName, partnerStage } = getPartnerInfo(partnership);
            return (
              <Card key={partnership.id} className="hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => onPartnerClick(partnership.id, partnerId)}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-primary/20">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {partnerName?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">{partnerName}</p>
                        <Badge variant="secondary" className="text-xs">
                          {stageLabels[partnerStage as keyof typeof stageLabels]}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      View Partnership
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </TabsContent>

      <TabsContent value="requests" className="space-y-4">
        {pendingReceived.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center py-12">
              <p className="text-muted-foreground">No pending requests 📭</p>
            </CardContent>
          </Card>
        ) : (
          pendingReceived.map((partnership) => {
            const { partnerName, partnerStage } = getPartnerInfo(partnership);
            return (
              <Card key={partnership.id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-primary/20">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {partnerName?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">{partnerName}</p>
                        <Badge variant="secondary" className="text-xs">
                          {stageLabels[partnerStage as keyof typeof stageLabels]}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{partnership.message}</p>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => updatePartnershipStatus(partnership.id, "active")}
                        size="sm"
                      >
                        Accept
                      </Button>
                      <Button 
                        onClick={() => updatePartnershipStatus(partnership.id, "declined")}
                        variant="outline"
                        size="sm"
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </TabsContent>

      <TabsContent value="sent" className="space-y-4">
        {pendingSent.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center py-12">
              <p className="text-muted-foreground">No pending requests sent 📤</p>
            </CardContent>
          </Card>
        ) : (
          pendingSent.map((partnership) => {
            const { partnerName, partnerStage } = getPartnerInfo(partnership);
            return (
              <Card key={partnership.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-primary/20">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {partnerName?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">{partnerName}</p>
                        <Badge variant="secondary" className="text-xs">
                          {stageLabels[partnerStage as keyof typeof stageLabels]}
                        </Badge>
                      </div>
                    </div>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </TabsContent>
    </Tabs>
  );
};

export default PartnershipManager;