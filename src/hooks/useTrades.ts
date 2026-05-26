import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export interface Trade {
  id: number;
  user_id?: string;
  pair: string;
  side: "Buy" | "Sell";
  open_date: string;
  close_date: string;
  entry: number;
  exit: number;
  qty: number;
  fee: number;
  swap: number;
  pnl: number; // user input manual
  status: "Win" | "Loss"; // auto dari pnl
  created_at: string;
}

export function useTrades() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

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

  const addTrade = async (trade: Omit<Trade, "id" | "created_at">) => {
    if (!user) return;
    // Status auto dari pnl
    const status: "Win" | "Loss" = trade.pnl >= 0 ? "Win" : "Loss";
    const { data, error } = await supabase
      .from("trades")
      .insert([{ ...trade, status, user_id: user.id }])
      .select()
      .single();
    if (!error && data) setTrades((prev) => [data, ...prev]);
  };

  const updateTrade = async (id: number, trade: Partial<Trade>) => {
    // Status auto dari pnl kalau pnl diupdate
    const status: "Win" | "Loss" | undefined =
      trade.pnl !== undefined ? (trade.pnl >= 0 ? "Win" : "Loss") : undefined;
    const { data, error } = await supabase
      .from("trades")
      .update({ ...trade, ...(status ? { status } : {}) })
      .eq("id", id)
      .select()
      .single();
    if (!error && data)
      setTrades((prev) => prev.map((t) => (t.id === id ? data : t)));
  };

  const deleteTrade = async (id: number) => {
    const { error } = await supabase.from("trades").delete().eq("id", id);
    if (!error) setTrades((prev) => prev.filter((t) => t.id !== id));
  };

  return { trades, loading, addTrade, updateTrade, deleteTrade, fetchTrades };
}
