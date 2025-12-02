import { useState, useEffect } from "react";
import { Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface StreakDisplayProps {
  userId: string;
}

const StreakDisplay = ({ userId }: StreakDisplayProps) => {
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
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Streak
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Current Streak:</span>
            <span className="font-bold">{streak.current} days</span>
          </div>
          <div className="flex justify-between">
            <span>Longest Streak:</span>
            <span className="font-bold">{streak.longest} days</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StreakDisplay;
