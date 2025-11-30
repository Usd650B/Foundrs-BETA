import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface StreakDisplayProps {
  userId: string;
}

const StreakDisplay = ({ userId }: StreakDisplayProps) => {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    fetchStreak();
  }, [userId]);

  const fetchStreak = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("current_streak")
      .eq("user_id", userId)
      .single();

    if (!error && data) {
      setStreak(data.current_streak || 0);
    }
  };

  return (
    <Badge
      variant="outline"
      className="border-accent bg-accent/10 text-accent-foreground font-semibold px-4 py-2"
    >
      🔥 {streak} day streak
    </Badge>
  );
};

export default StreakDisplay;
