import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export interface Trade {
  id: number;
  pair: string;
  timeframe: string;
  direction: "Buy" | "Sell";
  entry: number;
  sl: number;
  tp: number;
  result: "Win" | "Loss" | "Breakeven";
  profit: number;
  notes: string;
  created_at: string;
}

export function useTrades() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch semua trades user
  const fetchTrades = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setTrades(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTrades();
  }, [user]);

  // Add trade
  const addTrade = async (trade: Omit<Trade, "id" | "created_at">) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("trades")
      .insert([{ ...trade, user_id: user.id }])
      .select()
      .single();

    if (!error && data) setTrades((prev) => [data, ...prev]);
  };

  // Update trade
  const updateTrade = async (id: number, trade: Partial<Trade>) => {
    const { data, error } = await supabase
      .from("trades")
      .update(trade)
      .eq("id", id)
      .select()
      .single();

    if (!error && data)
      setTrades((prev) => prev.map((t) => (t.id === id ? data : t)));
  };

  // Delete trade
  const deleteTrade = async (id: number) => {
    const { error } = await supabase.from("trades").delete().eq("id", id);

    if (!error) setTrades((prev) => prev.filter((t) => t.id !== id));
  };

  return { trades, loading, addTrade, updateTrade, deleteTrade, fetchTrades };
}
