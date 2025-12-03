import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNotifications } from "@/hooks/use-notifications";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, LogOut, UserPlus, MessageCircle, Flag, CalendarDays, Mail } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { notifyMailroomMessage } from "@/lib/mailroom";

interface PartnerProfile {
  user_id: string;
  username: string;
  avatar_url?: string | null;
  founder_stage?: string | null;
  bio?: string | null;
  current_streak?: number | null;
}

interface PartnershipCard {
  id: string;
  status: string;
  partnerId: string;
  partnerProfile?: PartnerProfile;
  isIncomingPending: boolean;
}

const formatDisplayName = (raw?: string | null) => {
  if (!raw) return "Founder";
  const trimmed = raw.trim();
  if (!trimmed) return "Founder";
  const [localPart] = trimmed.split("@");
  return localPart || "Founder";
};

const Partners = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [discoverProfiles, setDiscoverProfiles] = useState<PartnerProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("all");

  const [partnerships, setPartnerships] = useState<PartnershipCard[]>([]);
  const [requestTarget, setRequestTarget] = useState<PartnerProfile | null>(null);
  const [requestNote, setRequestNote] = useState("");
  const [messagePartner, setMessagePartner] = useState<PartnershipCard | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [milestonePartner, setMilestonePartner] = useState<PartnershipCard | null>(null);
  const [milestoneForm, setMilestoneForm] = useState({ title: "", description: "", targetDate: "" });
  const [meetingPartner, setMeetingPartner] = useState<PartnershipCard | null>(null);
  const [meetingForm, setMeetingForm] = useState({ meetingUrl: "", scheduledAt: "", notes: "" });
  const [actionLoading, setActionLoading] = useState(false);
  const [activePanel, setActivePanel] = useState<"discover" | "circles">("discover");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { unreadMessages, pendingRequests } = useNotifications(user?.id || "");

  const viewOptions = [
    { id: "discover" as const, label: "Discover founders", description: "Find new partners" },
    { id: "circles" as const, label: "Your circles", description: "Stay close with your matches" },
  ];

  const incomingRequests = partnerships.filter((p) => p.isIncomingPending).length;
  const totalAlerts = incomingRequests + unreadMessages + pendingRequests;

  const filteredDiscoverProfiles = discoverProfiles.filter((founder) => {
    const matchesStage = stageFilter === "all" || founder.founder_stage === stageFilter;
    const term = searchTerm.toLowerCase();
    const displayName = formatDisplayName(founder.username).toLowerCase();
    const matchesTerm = displayName.includes(term) ||
      (founder.bio || "").toLowerCase().includes(term);
    const alreadyConnected = partnerships.some(
      (p) => p.partnerId === founder.user_id && p.status !== "declined"
    );
    return matchesStage && matchesTerm && !alreadyConnected;
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchProfile(session.user.id);
        fetchDiscoverProfiles(session.user.id);
        fetchPartnerships(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
        if (session?.user) {
          fetchDiscoverProfiles(session.user.id);
          fetchPartnerships(session.user.id);
        }
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
    if (!profile?.founder_stage || !profile?.bio?.trim()) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please fill in your founder stage and bio",
      });
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        founder_stage: profile.founder_stage,
        bio: profile.bio,
      })
      .eq("user_id", user?.id);

    if (!error) {
      toast({ title: "Profile updated" });
      setIsEditingProfile(false);
    }
  };

  const fetchDiscoverProfiles = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, username, avatar_url, bio, founder_stage, current_streak")
      .neq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(18);

    if (!error && data) {
      setDiscoverProfiles(data);
    }
  };

  const fetchPartnerships = async (userId: string) => {
    const { data, error } = await supabase
      .from("partnerships")
      .select("*")
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error || !data) {
      setPartnerships([]);
      return;
    }

    const partnerIds = Array.from(
      new Set(
        data.map((row) => (row.requester_id === userId ? row.receiver_id : row.requester_id))
      )
    );

    if (partnerIds.length === 0) {
      setPartnerships([]);
      return;
    }

    const { data: partnerProfiles } = await supabase
      .from("profiles")
      .select("user_id, username, avatar_url, founder_stage, bio")
      .in("user_id", partnerIds);

    const profileMap = new Map(
      (partnerProfiles || []).map((profile) => [profile.user_id, profile as PartnerProfile])
    );

    setPartnerships(
      data.map((row) => {
        const partnerId = row.requester_id === userId ? row.receiver_id : row.requester_id;
        const isIncomingPending = row.status === "pending" && row.receiver_id === userId;
        return {
          id: row.id,
          status: row.status,
          partnerId,
          partnerProfile: profileMap.get(partnerId),
          isIncomingPending,
        } satisfies PartnershipCard;
      })
    );
  };

  const handleFriendRequest = async () => {
    if (!user || !requestTarget) return;
    setActionLoading(true);
    try {
      const alreadyPartner = partnerships.some(
        (p) => p.partnerId === requestTarget.user_id && p.status !== "declined"
      );

      if (alreadyPartner) {
        toast({
          title: "Already connected",
          description: "You already have a partnership with this founder.",
        });
        return;
      }

      const { error } = await supabase.from("partnerships").insert({
        requester_id: user.id,
        receiver_id: requestTarget.user_id,
        status: "pending",
        message: requestNote || null,
      });

      if (error) throw error;

      toast({
        title: "Friendship request sent",
        description: `We'll notify ${requestTarget.username}.`,
      });
      setRequestTarget(null);
      setRequestNote("");
      fetchPartnerships(user.id);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Unable to send request",
        description: "Please try again in a moment",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messagePartner || !user) return;
    if (!messageContent.trim()) {
      toast({ variant: "destructive", title: "Message is empty" });
      return;
    }
    setActionLoading(true);
    try {
      const trimmed = messageContent.trim();
      const { error } = await supabase.from("messages").insert({
        partnership_id: messagePartner.id,
        sender_id: user.id,
        content: trimmed,
      });
      if (error) throw error;
      await notifyMailroomMessage({
        recipientId: messagePartner.partnerId,
        senderName: profile?.username || user.email,
        preview: trimmed,
        partnershipId: messagePartner.id,
        partnerName: messagePartner.partnerProfile?.username,
      });
      toast({ title: "Message sent" });
      setMessagePartner(null);
      setMessageContent("");
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to send message" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateMilestone = async () => {
    if (!milestonePartner || !user) return;
    if (!milestoneForm.title.trim()) {
      toast({ variant: "destructive", title: "Milestone title required" });
      return;
    }
    setActionLoading(true);
    try {
      const { error } = await supabase.from("shared_milestones").insert({
        partnership_id: milestonePartner.id,
        created_by: user.id,
        title: milestoneForm.title.trim(),
        description: milestoneForm.description.trim() || null,
        target_date: milestoneForm.targetDate || null,
      });
      if (error) throw error;
      toast({ title: "Milestone created" });
      setMilestonePartner(null);
      setMilestoneForm({ title: "", description: "", targetDate: "" });
    } catch (error) {
      toast({ variant: "destructive", title: "Unable to create milestone" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleScheduleMeeting = async () => {
    if (!meetingPartner || !user) return;
    if (!meetingForm.scheduledAt) {
      toast({ variant: "destructive", title: "Pick a meeting date/time" });
      return;
    }
    setActionLoading(true);
    try {
      const { error } = await supabase.from("video_sessions").insert({
        partnership_id: meetingPartner.id,
        meeting_url: meetingForm.meetingUrl || null,
        notes: meetingForm.notes || null,
        scheduled_at: meetingForm.scheduledAt,
      });
      if (error) throw error;
      toast({ title: "Meeting shared" });
      setMeetingPartner(null);
      setMeetingForm({ meetingUrl: "", scheduledAt: "", notes: "" });
    } catch (error) {
      toast({ variant: "destructive", title: "Unable to share meeting" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleAcceptPartnership = async (partnershipId: string) => {
    if (!user) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("partnerships")
        .update({ status: "active" })
        .eq("id", partnershipId)
        .eq("receiver_id", user.id);

      if (error) throw error;

      toast({ title: "Request accepted" });
      fetchPartnerships(user.id);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Unable to accept",
        description: "Please try again in a moment",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Accountability Partners</p>
              <h1 className="text-2xl font-bold text-foreground">Partner Studio</h1>
            </div>
            {totalAlerts > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {totalAlerts} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/mailroom")}>
              <Mail className="w-4 h-4 mr-2" />
              Mailroom
            </Button>
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

      <main className="container mx-auto px-4 py-8 max-w-5xl lg:max-w-6xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
          <aside className="lg:w-60">
            <div className="rounded-2xl border border-border/70 bg-card/70 p-4 space-y-4 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Views</p>
                <p className="text-sm text-muted-foreground mt-1">Switch between discovery and active circles.</p>
              </div>
              <div className="flex flex-col gap-2">
                {viewOptions.map((view) => {
                  const isActive = activePanel === view.id;
                  return (
                    <button
                      key={view.id}
                      type="button"
                      onClick={() => setActivePanel(view.id)}
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        isActive
                          ? "border-primary/40 bg-primary/10 text-foreground shadow-sm"
                          : "border-border text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      <p className="text-sm font-semibold">{view.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {view.id === "circles"
                          ? `${partnerships.length} active connection${partnerships.length === 1 ? "" : "s"}`
                          : view.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className="flex-1 space-y-8 lg:border-l lg:border-border/60 lg:pl-8">
            {activePanel === "discover" && (
              <section className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Discover founders</h2>
                    <span className="text-xs text-muted-foreground">Curated for your stage</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Input
                      placeholder="Search by name or bio"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="sm:w-56"
                    />
                    <Select value={stageFilter} onValueChange={setStageFilter}>
                      <SelectTrigger className="sm:w-40">
                        <SelectValue placeholder="Stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All stages</SelectItem>
                        <SelectItem value="idea">Idea</SelectItem>
                        <SelectItem value="mvp">MVP</SelectItem>
                        <SelectItem value="early_revenue">Early revenue</SelectItem>
                        <SelectItem value="scaling">Scaling</SelectItem>
                        <SelectItem value="established">Established</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {searchTerm && (
                  <p className="text-xs text-muted-foreground">Showing results for “{searchTerm}”</p>
                )}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {discoverProfiles.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="py-10 text-center text-muted-foreground">
                        No founders to show yet. We’ll recommend more soon.
                      </CardContent>
                    </Card>
                  ) : filteredDiscoverProfiles.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="py-5 text-center text-muted-foreground">
                        No founders match those filters.
                      </CardContent>
                    </Card>
                  ) : (
                    filteredDiscoverProfiles.map((founder) => {
                      const displayName = formatDisplayName(founder.username);
                      return (
                        <Card
                          key={founder.user_id}
                          className="border-border/60 bg-background/70 shadow-sm hover:shadow-md transition-all"
                        >
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-start gap-3">
                              <UserAvatar
                                avatarUrl={founder.avatar_url}
                                username={displayName}
                                size="md"
                                className="h-9 w-9"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-semibold leading-tight">
                                  {displayName}
                                </p>
                                {founder.founder_stage && (
                                  <Badge variant="outline" className="capitalize text-[10px]">
                                    {founder.founder_stage.replace("_", " ")}
                                  </Badge>
                                )}
                                <p className="mt-2 text-xs text-muted-foreground line-clamp-3">
                                  {founder.bio || "No bio yet."}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 h-8 px-3 text-xs"
                                onClick={() => {
                                  setRequestTarget(founder);
                                  setRequestNote("");
                                }}
                              >
                                <UserPlus className="h-3.5 w-3.5" />
                                Request
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </section>
            )}

            {activePanel === "circles" && (
              <section className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Your circles</h2>
                    <p className="text-xs text-muted-foreground">Keep tabs on active accountability partners.</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {partnerships.length} connection{partnerships.length === 1 ? "" : "s"}
                  </span>
                </div>
                {partnerships.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-5 text-center text-muted-foreground">
                      No partners yet. Send a request to get matched.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {partnerships.map((partner) => {
                      const partnerName = formatDisplayName(partner.partnerProfile?.username);
                      return (
                        <Card
                          key={partner.id}
                          className="border-border/60 bg-background/70 shadow-sm hover:shadow-md transition-all"
                        >
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-start gap-3">
                              <UserAvatar
                                avatarUrl={partner.partnerProfile?.avatar_url}
                                username={partnerName}
                                size="md"
                                className="h-9 w-9"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-semibold leading-tight">
                                      {partnerName}
                                    </p>
                                    {partner.partnerProfile?.founder_stage && (
                                      <Badge variant="outline" className="capitalize text-[10px]">
                                        {partner.partnerProfile.founder_stage.replace("_", " ")}
                                      </Badge>
                                    )}
                                  </div>
                                  <Badge
                                    variant="secondary"
                                    className={
                                      partner.status === "active" ? "bg-emerald-500/20 text-emerald-700" : undefined
                                    }
                                  >
                                    {partner.status}
                                  </Badge>
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground line-clamp-3">
                                  {partner.partnerProfile?.bio || "No bio yet."}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 h-8 px-3 text-xs"
                                onClick={() => setMessagePartner(partner)}
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                Message
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 h-8 px-3 text-xs"
                                onClick={() => setMilestonePartner(partner)}
                                disabled={partner.status !== "active"}
                              >
                                <Flag className="h-3.5 w-3.5" />
                                Milestone
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 h-8 px-3 text-xs"
                                onClick={() => setMeetingPartner(partner)}
                                disabled={partner.status !== "active"}
                              >
                                <CalendarDays className="h-3.5 w-3.5" />
                                Meeting link
                              </Button>
                              {partner.isIncomingPending && (
                                <Button
                                  size="sm"
                                  className="gap-1 h-8 px-3 text-xs"
                                  disabled={actionLoading}
                                  onClick={() => handleAcceptPartnership(partner.id)}
                                >
                                  Accept request
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </main>

      {/* Friendship request dialog */}
      <Dialog open={!!requestTarget} onOpenChange={(open) => !open && setRequestTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request friendship</DialogTitle>
            <DialogDescription>
              Send a quick note to {requestTarget?.username} so they know why you want to connect.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Hey! I'm also building an AI copilot for finance—let's keep each other accountable."
            value={requestNote}
            onChange={(e) => setRequestNote(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRequestTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleFriendRequest} disabled={actionLoading}>
              {actionLoading ? "Sending..." : "Send request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Message dialog */}
      <Dialog open={!!messagePartner} onOpenChange={(open) => !open && setMessagePartner(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message {messagePartner?.partnerProfile?.username}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            rows={4}
            placeholder="Share a quick update or idea..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMessagePartner(null)}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage} disabled={actionLoading}>
              {actionLoading ? "Sending..." : "Send"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Milestone dialog */}
      <Dialog open={!!milestonePartner} onOpenChange={(open) => !open && setMilestonePartner(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New milestone</DialogTitle>
            <DialogDescription>
              Align on the next measurable win with {milestonePartner?.partnerProfile?.username}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={milestoneForm.title}
                onChange={(e) => setMilestoneForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ship onboarding revamp"
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={milestoneForm.description}
                onChange={(e) => setMilestoneForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="Define success, owners, or context"
              />
            </div>
            <div className="space-y-1">
              <Label>Target date</Label>
              <Input
                type="date"
                value={milestoneForm.targetDate}
                onChange={(e) => setMilestoneForm((prev) => ({ ...prev, targetDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMilestonePartner(null)}>
              Cancel
            </Button>
            <Button onClick={handleCreateMilestone} disabled={actionLoading}>
              {actionLoading ? "Saving..." : "Save milestone"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meeting dialog */}
      <Dialog open={!!meetingPartner} onOpenChange={(open) => !open && setMeetingPartner(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share meeting info</DialogTitle>
            <DialogDescription>
              Drop a calendar invite link or meeting location for {meetingPartner?.partnerProfile?.username}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Meeting link / address</Label>
              <Input
                placeholder="https://meet.google.com/... or 123 Main St"
                value={meetingForm.meetingUrl}
                onChange={(e) => setMeetingForm((prev) => ({ ...prev, meetingUrl: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Date & time</Label>
              <Input
                type="datetime-local"
                value={meetingForm.scheduledAt}
                onChange={(e) => setMeetingForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={meetingForm.notes}
                onChange={(e) => setMeetingForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Agenda, topics, prep..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMeetingPartner(null)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleMeeting} disabled={actionLoading}>
              {actionLoading ? "Sharing..." : "Share invite"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Partners;