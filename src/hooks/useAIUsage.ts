import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export function useAIUsage() {
  const { user } = useAuth();
  const [weeklyUsed, setWeeklyUsed] = useState(0);
  const [totalUsed, setTotalUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  const WEEKLY_LIMIT = 3;
  const TOTAL_LIMIT = 12;

  const fetchUsage = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("ai_usage_weekly, ai_usage_total, ai_usage_reset_date")
      .eq("id", user.id)
      .single();

    if (data) {
      // Cek apakah perlu reset weekly usage
      const lastReset = new Date(data.ai_usage_reset_date);
      const now = new Date();
      const diffDays =
        (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays >= 7) {
        // Reset weekly usage
        await supabase
          .from("profiles")
          .update({
            ai_usage_weekly: 0,
            ai_usage_reset_date: now.toISOString(),
          })
          .eq("id", user.id);
        setWeeklyUsed(0);
      } else {
        setWeeklyUsed(data.ai_usage_weekly ?? 0);
      }

      setTotalUsed(data.ai_usage_total ?? 0);
    }
    setLoading(false);
  };

  const incrementUsage = async () => {
    if (!user) return false;

    const newWeekly = weeklyUsed + 1;
    const newTotal = totalUsed + 1;

    const { error } = await supabase
      .from("profiles")
      .update({
        ai_usage_weekly: newWeekly,
        ai_usage_total: newTotal,
      })
      .eq("id", user.id);

    if (!error) {
      setWeeklyUsed(newWeekly);
      setTotalUsed(newTotal);
      return true;
    }
    return false;
  };

  const isLocked = weeklyUsed >= WEEKLY_LIMIT || totalUsed >= TOTAL_LIMIT;

  useEffect(() => {
    fetchUsage();
  }, [user]);

  return {
    weeklyUsed,
    totalUsed,
    loading,
    isLocked,
    incrementUsage,
    WEEKLY_LIMIT,
    TOTAL_LIMIT,
  };
}
