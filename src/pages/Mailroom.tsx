import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { ArrowLeft, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserAvatar } from "@/components/UserAvatar";
import PartnershipDetails from "@/components/PartnershipDetails";
import { formatDistanceToNow } from "date-fns";

interface PartnerProfile {
  user_id: string;
  username: string;
  avatar_url?: string | null;
  founder_stage?: string | null;
  bio?: string | null;
}

interface MailroomThread {
  id: string;
  partnerId: string;
  partnerProfile?: PartnerProfile;
  lastMessage?: {
    content: string;
    sender_id: string;
    created_at: string;
  };
  unreadCount: number;
}

const Mailroom = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<MailroomThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [hasUserSelected, setHasUserSelected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    let authSubscription: ReturnType<typeof supabase.auth.onAuthStateChange>["data"]["subscription"];

    const bootstrap = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      await fetchMailroom(session.user.id);

      const partnershipId = searchParams.get("partnership");
      if (partnershipId) {
        setSelectedThreadId(partnershipId);
      }

      setLoading(false);
    };

    bootstrap();

    authSubscription = supabase.auth.onAuthStateChange((_, session) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchMailroom(session.user.id);
      }
    }).data.subscription;

    return () => authSubscription?.unsubscribe();
  }, [navigate, searchParams]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("mailroom-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          fetchMailroom(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchMailroom = async (userId: string) => {
    const { data: partnerships, error } = await supabase
      .from("partnerships")
      .select("id, requester_id, receiver_id, status")
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq("status", "active")
      .order("updated_at", { ascending: false });

    if (error || !partnerships || partnerships.length === 0) {
      setThreads([]);
      return;
    }

    const partnerIds = Array.from(
      new Set(
        partnerships.map((row) => (row.requester_id === userId ? row.receiver_id : row.requester_id))
      )
    );

    const { data: partnerProfiles } = await supabase
      .from("profiles")
      .select("user_id, username, avatar_url, founder_stage, bio")
      .in("user_id", partnerIds);

    const profileMap = new Map(
      (partnerProfiles || []).map((profile) => [profile.user_id, profile as PartnerProfile])
    );

    const partnershipIds = partnerships.map((row) => row.id);

    const { data: messagesData } = await supabase
      .from("messages")
      .select("partnership_id, sender_id, content, created_at, read")
      .in("partnership_id", partnershipIds)
      .order("created_at", { ascending: false });

    const summaryMap = new Map<
      string,
      {
        lastMessage?: { content: string; sender_id: string; created_at: string };
        unreadCount: number;
      }
    >();

    messagesData?.forEach((message) => {
      const existing = summaryMap.get(message.partnership_id) || { unreadCount: 0 };
      if (!existing.lastMessage) {
        existing.lastMessage = {
          content: message.content,
          sender_id: message.sender_id,
          created_at: message.created_at,
        };
      }
      if (!message.read && message.sender_id !== userId) {
        existing.unreadCount += 1;
      }
      summaryMap.set(message.partnership_id, existing);
    });

    const hydratedThreads: MailroomThread[] = partnerships.map((row) => {
      const partnerId = row.requester_id === userId ? row.receiver_id : row.requester_id;
      const summary = summaryMap.get(row.id);
      return {
        id: row.id,
        partnerId,
        partnerProfile: profileMap.get(partnerId),
        lastMessage: summary?.lastMessage,
        unreadCount: summary?.unreadCount || 0,
      };
    });

    hydratedThreads.sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
      return bTime - aTime;
    });

    setThreads(hydratedThreads);
  };

  const filteredThreads = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return threads.filter((thread) =>
      thread.partnerProfile?.username?.toLowerCase().includes(term)
    );
  }, [threads, searchTerm]);

  useEffect(() => {
    if (filteredThreads.length === 0) {
      setSelectedThreadId(null);
      setIsThreadOpen(false);
      return;
    }

    if (!hasUserSelected && (!selectedThreadId || !filteredThreads.some((thread) => thread.id === selectedThreadId))) {
      const firstThread = filteredThreads[0];
      setSelectedThreadId(firstThread.id);
      setIsThreadOpen(true);
      const params = new URLSearchParams(searchParams);
      params.set("partnership", firstThread.id);
      setSearchParams(params, { replace: true });
    }
  }, [filteredThreads, selectedThreadId, hasUserSelected, searchParams, setSearchParams]);

  const markThreadAsRead = async (partnershipId: string) => {
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === partnershipId ? { ...thread, unreadCount: 0 } : thread
      )
    );

    if (!user) return;

    await supabase
      .from("messages")
      .update({ read: true })
      .eq("partnership_id", partnershipId)
      .neq("sender_id", user.id);

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("type", "message")
      .contains("metadata", { partnership_id: partnershipId });

    fetchMailroom(user.id);
  };

  useEffect(() => {
    if (!isThreadOpen || !selectedThreadId) return;
    markThreadAsRead(selectedThreadId);
  }, [isThreadOpen, selectedThreadId]);

  const selectedThread = isThreadOpen
    ? filteredThreads.find((thread) => thread.id === selectedThreadId)
    : undefined;
  const totalUnread = threads.reduce((sum, thread) => sum + thread.unreadCount, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading your mailroom...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Partner Studio</p>
              <h1 className="text-2xl font-semibold">Founder Mailroom</h1>
            </div>
            {totalUnread > 0 && <Badge variant="destructive">{totalUnread} unread</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/partners")}> 
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to partners
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex flex-col gap-6 lg:flex-row">
        <section className="lg:w-80 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Inbox</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Search partners"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <ScrollArea className="h-[60vh] pr-2">
                <div className="space-y-2">
                  {filteredThreads.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-6 text-center">
                      No partners found.
                    </div>
                  ) : (
                    filteredThreads.map((thread) => (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => {
                          setHasUserSelected(true);
                          if (selectedThreadId === thread.id && isThreadOpen) {
                            setSelectedThreadId(null);
                            setIsThreadOpen(false);
                            const params = new URLSearchParams(searchParams);
                            params.delete("partnership");
                            setSearchParams(params, { replace: true });
                            return;
                          }
                          setSelectedThreadId(thread.id);
                          setIsThreadOpen(true);
                          const params = new URLSearchParams(searchParams);
                          params.set("partnership", thread.id);
                          setSearchParams(params, { replace: true });
                        }}
                        className={`w-full rounded-xl border px-3 py-3 text-left transition $ {
                          selectedThreadId === thread.id && isThreadOpen
                            ? "border-primary/50 bg-primary/5"
                            : "border-border hover:bg-muted/60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            avatarUrl={thread.partnerProfile?.avatar_url}
                            username={thread.partnerProfile?.username}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold truncate">
                                {thread.partnerProfile?.username || "Partner"}
                              </p>
                              {thread.unreadCount > 0 && (
                                <Badge variant="destructive" className="text-[10px]">
                                  {thread.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {thread.lastMessage?.content || "No messages yet"}
                            </p>
                            {thread.lastMessage && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(thread.lastMessage.created_at), { addSuffix: true })}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </section>

        <section className="flex-1">
          {selectedThread && selectedThread.partnerProfile ? (
            <Card className="shadow-sm">
              <CardHeader className="border-b border-border/60">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    avatarUrl={selectedThread.partnerProfile.avatar_url}
                    username={selectedThread.partnerProfile.username}
                    size="md"
                  />
                  <div>
                    <CardTitle className="text-lg">
                      {selectedThread.partnerProfile.username}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedThread.partnerProfile.founder_stage?.replace("_", " ") || "Founder"}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <PartnershipDetails
                  partnershipId={selectedThread.id}
                  currentUserId={user.id}
                  partnerId={selectedThread.partnerId}
                  partnerName={selectedThread.partnerProfile.username}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="h-full min-h-[50vh] flex items-center justify-center border border-dashed border-border rounded-2xl">
              <div className="text-center space-y-2">
                <h2 className="text-lg font-semibold">No conversations yet</h2>
                <p className="text-sm text-muted-foreground">
                  Start connecting with founders to see their messages here.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Mailroom;
