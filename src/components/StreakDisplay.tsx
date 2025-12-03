import { useState, useEffect } from "react";
import { Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface StreakDisplayProps {
  userId: string;
  className?: string;
  compact?: boolean;
}

const StreakDisplay = ({ userId, className, compact = false }: StreakDisplayProps) => {
  const [streak, setStreak] = useState({ current: 0, longest: 0 });

  useEffect(() => {
    const fetchStreak = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("current_streak, longest_streak")
        .eq("user_id", userId)
        .single();

      if (data) {
        setStreak({
          current: data.current_streak || 0,
          longest: data.longest_streak || 0,
        });
      }
    };

    if (userId) {
      fetchStreak();
    }
  }, [userId]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className={cn(compact ? "pb-1" : "pb-2")}>
        <CardTitle
          className={cn(
            "flex items-center gap-2", 
            compact ? "text-sm font-semibold" : "text-lg font-medium"
          )}
        >
          <Flame className="h-5 w-5 text-orange-500" />
          Streak
        </CardTitle>
      </CardHeader>
      <CardContent className={cn(compact ? "py-2" : undefined)}>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className={cn(compact ? "text-xs text-muted-foreground" : undefined)}>Current Streak</span>
            <span className={cn("font-bold", compact ? "text-sm" : undefined)}>{streak.current} days</span>
          </div>
          <div className="flex justify-between">
            <span className={cn(compact ? "text-xs text-muted-foreground" : undefined)}>Longest Streak</span>
            <span className={cn("font-bold", compact ? "text-sm" : undefined)}>{streak.longest} days</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StreakDisplay;
