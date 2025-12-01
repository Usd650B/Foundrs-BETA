import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read: boolean;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  target_date: string;
  completed: boolean;
  created_at: string;
}

interface VideoSession {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string;
  notes: string;
  completed: boolean;
}

interface PartnershipDetailsProps {
  partnershipId: string;
  currentUserId: string;
  partnerId: string;
  partnerName: string;
}

const PartnershipDetails = ({ 
  partnershipId, 
  currentUserId, 
  partnerId,
  partnerName 
}: PartnershipDetailsProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [videoSessions, setVideoSessions] = useState<VideoSession[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newMilestone, setNewMilestone] = useState({ title: "", description: "", target_date: new Date() });
  const [newSession, setNewSession] = useState({ scheduled_at: new Date(), meeting_url: "" });
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
    fetchMilestones();
    fetchVideoSessions();

    const messagesChannel = supabase
      .channel(`messages-${partnershipId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `partnership_id=eq.${partnershipId}` },
        () => fetchMessages()
      )
      .subscribe();

    const milestonesChannel = supabase
      .channel(`milestones-${partnershipId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shared_milestones", filter: `partnership_id=eq.${partnershipId}` },
        () => fetchMilestones()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(milestonesChannel);
    };
  }, [partnershipId]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("partnership_id", partnershipId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  const fetchMilestones = async () => {
    const { data } = await supabase
      .from("shared_milestones")
      .select("*")
      .eq("partnership_id", partnershipId)
      .order("target_date", { ascending: true });
    if (data) setMilestones(data);
  };

  const fetchVideoSessions = async () => {
    const { data } = await supabase
      .from("video_sessions")
      .select("*")
      .eq("partnership_id", partnershipId)
      .order("scheduled_at", { ascending: true });
    if (data) setVideoSessions(data);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const { error } = await supabase.from("messages").insert({
      partnership_id: partnershipId,
      sender_id: currentUserId,
      content: newMessage
    });

    if (!error) {
      setNewMessage("");
      fetchMessages();
    }
  };

  const createMilestone = async () => {
    if (!newMilestone.title.trim()) return;

    const { error } = await supabase.from("shared_milestones").insert({
      partnership_id: partnershipId,
      created_by: currentUserId,
      title: newMilestone.title,
      description: newMilestone.description,
      target_date: format(newMilestone.target_date, "yyyy-MM-dd")
    });

    if (!error) {
      setNewMilestone({ title: "", description: "", target_date: new Date() });
      toast({ title: "Milestone Created!", description: "Your shared milestone has been added" });
      fetchMilestones();
    }
  };

  const toggleMilestone = async (milestoneId: string, completed: boolean) => {
    await supabase
      .from("shared_milestones")
      .update({ completed: !completed, completed_at: !completed ? new Date().toISOString() : null })
      .eq("id", milestoneId);
    fetchMilestones();
  };

  const scheduleSession = async () => {
    if (!newSession.meeting_url.trim()) return;

    const { error } = await supabase.from("video_sessions").insert({
      partnership_id: partnershipId,
      scheduled_at: newSession.scheduled_at.toISOString(),
      meeting_url: newSession.meeting_url,
      duration_minutes: 30
    });

    if (!error) {
      setNewSession({ scheduled_at: new Date(), meeting_url: "" });
      toast({ title: "Session Scheduled!", description: "Video standup scheduled successfully" });
      fetchVideoSessions();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Partnership with {partnerName}</CardTitle>
        </CardHeader>
      </Card>

      <Tabs defaultValue="messages" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="sessions">Standups</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <ScrollArea className="h-96 pr-4">
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === currentUserId ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.sender_id === currentUserId
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex gap-2 mt-4">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                />
                <Button onClick={sendMessage}>Send</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create Milestone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Milestone title"
                value={newMilestone.title}
                onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
              />
              <Textarea
                placeholder="Description (optional)"
                value={newMilestone.description}
                onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full">
                    {format(newMilestone.target_date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={newMilestone.target_date}
                    onSelect={(date) => date && setNewMilestone({ ...newMilestone, target_date: date })}
                  />
                </PopoverContent>
              </Popover>
              <Button onClick={createMilestone} className="w-full">Add Milestone</Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {milestones.map((milestone) => (
              <Card key={milestone.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-semibold ${milestone.completed ? "line-through text-muted-foreground" : ""}`}>
                          {milestone.title}
                        </h4>
                        {milestone.completed && <Badge variant="outline" className="bg-success/10">✓ Done</Badge>}
                      </div>
                      {milestone.description && (
                        <p className="text-sm text-muted-foreground mt-1">{milestone.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Target: {format(new Date(milestone.target_date), "PP")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleMilestone(milestone.id, milestone.completed)}
                    >
                      {milestone.completed ? "Undo" : "Complete"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Schedule Video Standup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full">
                    {format(newSession.scheduled_at, "PPP p")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={newSession.scheduled_at}
                    onSelect={(date) => date && setNewSession({ ...newSession, scheduled_at: date })}
                  />
                </PopoverContent>
              </Popover>
              <Input
                placeholder="Meeting URL (Zoom, Google Meet, etc.)"
                value={newSession.meeting_url}
                onChange={(e) => setNewSession({ ...newSession, meeting_url: e.target.value })}
              />
              <Button onClick={scheduleSession} className="w-full">Schedule Session</Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {videoSessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{format(new Date(session.scheduled_at), "PPP")}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(session.scheduled_at), "p")} · {session.duration_minutes} min
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={session.meeting_url} target="_blank" rel="noopener noreferrer">
                        Join Meeting
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PartnershipDetails;