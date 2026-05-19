import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useAuth } from "./hooks/useAuth";
import { useTrades } from "./hooks/useTrades";
import type { Trade } from "./hooks/useTrades";
import Auth from "./components/Auth";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AIResult {
  bias: "buy" | "sell";
  entry: string;
  stop_loss: string;
  take_profit: string;
  confidence: "low" | "medium" | "high";
  reason: string;
}

interface PerfPoint {
  label: string;
  value: number;
}

type PageId = "dashboard" | "journal" | "ai" | "weekly" | "settings";
type FilterType = "All" | "Win" | "Loss" | "Breakeven";
type MethodType = "scalping" | "smc" | "trend" | "breakout";
type TabType = "Short-Term" | "Weekly Analysis";
type TradeFormData = Omit<Trade, "id" | "created_at"> & {
  id?: number;
  created_at?: string;
};

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0B0F17",
  card: "#111827",
  border: "#1F2937",
  text: "#E5E7EB",
  primary: "#3B82F6",
  accent: "#8B5CF6",
  success: "#22C55E",
  danger: "#EF4444",
  muted: "#6B7280",
} as const;

const glass: CSSProperties = {
  background: "rgba(17,24,39,0.6)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.05)",
};

// ─── Perf Data ────────────────────────────────────────────────────────────────
const PERF_DATA: PerfPoint[] = [
  { label: "May 1", value: -200 },
  { label: "May 5", value: 150 },
  { label: "May 8", value: 420 },
  { label: "May 12", value: 280 },
  { label: "May 15", value: 680 },
  { label: "May 19", value: 950 },
  { label: "May 22", value: 1100 },
  { label: "May 26", value: 890 },
  { label: "May 29", value: 1240 },
  { label: "Jun 2", value: 1475 },
];

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({
  data,
  color = C.primary,
  width = 80,
  height = 32,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map(
      (v, i) =>
        `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`,
    )
    .join(" ");
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Performance Chart ────────────────────────────────────────────────────────
function PerformanceChart({ data }: { data: PerfPoint[] }) {
  const vals = data.map((d) => d.value);
  const min = Math.min(...vals),
    max = Math.max(...vals),
    range = max - min || 1;
  const w = 100,
    h = 100;
  const pts = vals
    .map(
      (v, i) =>
        `${((i / (vals.length - 1)) * w).toFixed(2)},${(h - ((v - min) / range) * h * 0.8 - h * 0.1).toFixed(2)}`,
    )
    .join(" ");
  const ly = h - ((vals[vals.length - 1] - min) / range) * h * 0.8 - h * 0.1;
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ width: "100%", height: "100%" }}
    >
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.primary} stopOpacity="0.4" />
          <stop offset="100%" stopColor={C.primary} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#chartGrad)" />
      <polyline
        points={pts}
        fill="none"
        stroke={C.primary}
        strokeWidth="1.5"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={w}
        cy={ly}
        r="2"
        fill={C.primary}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({
  win,
  loss,
  be,
  total,
}: {
  win: number;
  loss: number;
  be: number;
  total: number;
}) {
  const r = 40,
    cx = 50,
    cy = 50,
    stroke = 10,
    circ = 2 * Math.PI * r;
  const winD = (win / total) * circ || 0;
  const lossD = (loss / total) * circ || 0;
  const beD = (be / total) * circ || 0;
  return (
    <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={C.border}
        strokeWidth={stroke}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={C.success}
        strokeWidth={stroke}
        strokeDasharray={`${winD} ${circ}`}
        strokeDashoffset={0}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={C.danger}
        strokeWidth={stroke}
        strokeDasharray={`${lossD} ${circ}`}
        strokeDashoffset={-winD}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={C.muted}
        strokeWidth={stroke}
        strokeDasharray={`${beD} ${circ}`}
        strokeDashoffset={-(winD + lossD)}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fill={C.text}
        fontSize="14"
        fontWeight="700"
      >
        {total}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill={C.muted} fontSize="6">
        Total
      </text>
    </svg>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  subColor = C.success,
  chart,
}: {
  label: string;
  value: string | number;
  sub?: string;
  subColor?: string;
  chart?: number[];
}) {
  return (
    <div
      style={{
        ...glass,
        borderRadius: 16,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        flex: 1,
        minWidth: 160,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span style={{ color: C.muted, fontSize: 12, fontWeight: 500 }}>
        {label}
      </span>
      <span style={{ color: C.text, fontSize: 22, fontWeight: 700 }}>
        {value}
      </span>
      {sub && <span style={{ color: subColor, fontSize: 12 }}>{sub}</span>}
      {chart && (
        <div style={{ position: "absolute", right: 16, top: 16, opacity: 0.8 }}>
          <Sparkline data={chart} color={subColor} />
        </div>
      )}
    </div>
  );
}

// ─── AI Insight Card ──────────────────────────────────────────────────────────
function AIInsightCard({ insight }: { insight: AIResult }) {
  const confColor =
    insight.confidence === "high"
      ? C.success
      : insight.confidence === "medium"
        ? "#F59E0B"
        : C.danger;
  return (
    <div
      style={{
        ...glass,
        borderRadius: 16,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ color: C.muted, fontSize: 12, fontWeight: 500 }}>
          AI Insight
        </span>
        <span
          style={{
            background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
            borderRadius: 999,
            padding: "2px 10px",
            fontSize: 11,
            color: "#fff",
            fontWeight: 600,
          }}
        >
          Scalping
        </span>
      </div>
      <div>
        <div style={{ color: C.muted, fontSize: 11 }}>Bias</div>
        <div
          style={{
            color: insight.bias === "buy" ? C.success : C.danger,
            fontSize: 28,
            fontWeight: 800,
          }}
        >
          {insight.bias.toUpperCase()}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {(
          [
            ["Entry Zone", insight.entry, C.text],
            [
              "Confidence",
              insight.confidence.charAt(0).toUpperCase() +
                insight.confidence.slice(1),
              confColor,
            ],
            ["Stop Loss", insight.stop_loss, C.danger],
            ["Take Profit", insight.take_profit, C.success],
          ] as [string, string, string][]
        ).map(([l, v, col]) => (
          <div key={l}>
            <div style={{ color: C.muted, fontSize: 10 }}>{l}</div>
            <div style={{ color: col, fontSize: 13, fontWeight: 600 }}>{v}</div>
          </div>
        ))}
      </div>
      <div
        style={{
          background: C.bg,
          borderRadius: 10,
          padding: 12,
          fontSize: 12,
          color: C.muted,
          lineHeight: 1.5,
        }}
      >
        {insight.reason}
      </div>
    </div>
  );
}

// ─── Trade Row ────────────────────────────────────────────────────────────────
function TradeRow({
  trade,
  onEdit,
  onDelete,
}: {
  trade: Trade;
  onEdit: (t: Trade) => void;
  onDelete: (id: number) => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <tr
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "rgba(59,130,246,0.04)" : "transparent",
        transition: "background 200ms",
      }}
    >
      <td style={{ padding: "12px 16px", color: C.text, fontWeight: 600 }}>
        {trade.pair}
      </td>
      <td style={{ padding: "12px 8px", color: C.muted, fontSize: 13 }}>
        {trade.timeframe}
      </td>
      <td style={{ padding: "12px 8px" }}>
        <span
          style={{
            color: trade.direction === "Buy" ? C.success : C.danger,
            background:
              trade.direction === "Buy"
                ? "rgba(34,197,94,0.1)"
                : "rgba(239,68,68,0.1)",
            borderRadius: 6,
            padding: "2px 10px",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {trade.direction}
        </span>
      </td>
      <td style={{ padding: "12px 8px", color: C.text, fontSize: 13 }}>
        {trade.entry}
      </td>
      <td style={{ padding: "12px 8px", color: C.danger, fontSize: 13 }}>
        {trade.sl}
      </td>
      <td style={{ padding: "12px 8px", color: C.success, fontSize: 13 }}>
        {trade.tp}
      </td>
      <td style={{ padding: "12px 8px" }}>
        <span
          style={{
            color:
              trade.result === "Win"
                ? C.success
                : trade.result === "Loss"
                  ? C.danger
                  : C.muted,
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {trade.result}
        </span>
      </td>
      <td
        style={{
          padding: "12px 8px",
          fontWeight: 700,
          fontSize: 13,
          color: trade.profit >= 0 ? C.success : C.danger,
        }}
      >
        {trade.profit >= 0 ? "+" : ""}${Math.abs(trade.profit).toFixed(2)}
      </td>
      <td style={{ padding: "12px 8px", color: C.muted, fontSize: 12 }}>
        {trade.created_at.slice(0, 10)}
      </td>
      <td style={{ padding: "12px 8px" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => onEdit(trade)}
            style={{
              background: "rgba(59,130,246,0.1)",
              border: "none",
              borderRadius: 6,
              color: C.primary,
              cursor: "pointer",
              padding: "4px 10px",
              fontSize: 12,
              fontFamily: "inherit",
            }}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(trade.id)}
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "none",
              borderRadius: 6,
              color: C.danger,
              cursor: "pointer",
              padding: "4px 10px",
              fontSize: 12,
              fontFamily: "inherit",
            }}
          >
            Del
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Trade Modal ──────────────────────────────────────────────────────────────
function TradeModal({
  trade,
  onSave,
  onClose,
}: {
  trade: Trade | null;
  onSave: (form: TradeFormData) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<TradeFormData>(
    trade ?? {
      pair: "",
      timeframe: "15m",
      direction: "Buy",
      entry: 0,
      sl: 0,
      tp: 0,
      result: "Win",
      profit: 0,
      notes: "",
    },
  );
  const set = <K extends keyof TradeFormData>(k: K, v: TradeFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const inp: CSSProperties = {
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: C.text,
    padding: "10px 14px",
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: 32,
          width: 480,
          maxWidth: "90vw",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <h3
            style={{ color: C.text, margin: 0, fontSize: 18, fontWeight: 700 }}
          >
            {trade?.id ? "Edit Trade" : "Add Trade"}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: C.muted,
              cursor: "pointer",
              fontSize: 20,
              fontFamily: "inherit",
            }}
          >
            ✕
          </button>
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          <div>
            <label
              style={{
                color: C.muted,
                fontSize: 12,
                display: "block",
                marginBottom: 6,
              }}
            >
              Pair
            </label>
            <input
              style={inp}
              value={form.pair}
              onChange={(e) => set("pair", e.target.value)}
            />
          </div>
          <div>
            <label
              style={{
                color: C.muted,
                fontSize: 12,
                display: "block",
                marginBottom: 6,
              }}
            >
              Timeframe
            </label>
            <input
              style={inp}
              value={form.timeframe}
              onChange={(e) => set("timeframe", e.target.value)}
            />
          </div>
          <div>
            <label
              style={{
                color: C.muted,
                fontSize: 12,
                display: "block",
                marginBottom: 6,
              }}
            >
              Entry
            </label>
            <input
              style={inp}
              type="number"
              value={form.entry}
              onChange={(e) => set("entry", parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label
              style={{
                color: C.muted,
                fontSize: 12,
                display: "block",
                marginBottom: 6,
              }}
            >
              Stop Loss
            </label>
            <input
              style={inp}
              type="number"
              value={form.sl}
              onChange={(e) => set("sl", parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label
              style={{
                color: C.muted,
                fontSize: 12,
                display: "block",
                marginBottom: 6,
              }}
            >
              Take Profit
            </label>
            <input
              style={inp}
              type="number"
              value={form.tp}
              onChange={(e) => set("tp", parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label
              style={{
                color: C.muted,
                fontSize: 12,
                display: "block",
                marginBottom: 6,
              }}
            >
              Profit/Loss $
            </label>
            <input
              style={inp}
              type="number"
              value={form.profit}
              onChange={(e) => set("profit", parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label
              style={{
                color: C.muted,
                fontSize: 12,
                display: "block",
                marginBottom: 6,
              }}
            >
              Direction
            </label>
            <select
              style={inp}
              value={form.direction}
              onChange={(e) =>
                set("direction", e.target.value as "Buy" | "Sell")
              }
            >
              <option value="Buy">Buy</option>
              <option value="Sell">Sell</option>
            </select>
          </div>
          <div>
            <label
              style={{
                color: C.muted,
                fontSize: 12,
                display: "block",
                marginBottom: 6,
              }}
            >
              Result
            </label>
            <select
              style={inp}
              value={form.result}
              onChange={(e) =>
                set("result", e.target.value as "Win" | "Loss" | "Breakeven")
              }
            >
              <option value="Win">Win</option>
              <option value="Loss">Loss</option>
              <option value="Breakeven">Breakeven</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label
            style={{
              color: C.muted,
              fontSize: 12,
              display: "block",
              marginBottom: 6,
            }}
          >
            Notes
          </label>
          <textarea
            style={{ ...inp, height: 80, resize: "vertical" }}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: C.border,
              border: "none",
              borderRadius: 10,
              color: C.text,
              cursor: "pointer",
              padding: 12,
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            style={{
              flex: 1,
              background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
              border: "none",
              borderRadius: 10,
              color: "#fff",
              cursor: "pointer",
              padding: 12,
              fontWeight: 700,
              fontFamily: "inherit",
            }}
          >
            Save Trade
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV: { id: PageId; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "⊞" },
  { id: "journal", label: "Journal", icon: "✎" },
  { id: "ai", label: "AI Analysis", icon: "✦" },
  { id: "weekly", label: "Weekly Analysis", icon: "⚡︎" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

function Sidebar({
  page,
  setPage,
  collapsed,
  onSignOut,
  userName,
}: {
  page: PageId;
  setPage: (p: PageId) => void;
  collapsed: boolean;
  onSignOut: () => void;
  userName: string;
}) {
  return (
    <div
      style={{
        width: collapsed ? 60 : 220,
        minHeight: "100vh",
        ...glass,
        borderRight: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        flexDirection: "column",
        padding: collapsed ? "24px 10px" : "24px 16px",
        gap: 4,
        transition: "width 300ms",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 50,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 900,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          T
        </div>
        {!collapsed && (
          <div>
            <div
              style={{
                color: C.text,
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: -0.5,
              }}
            >
              TradeIntel
            </div>
            <div style={{ color: C.muted, fontSize: 9 }}>
              Your AI Trading Intelligence
            </div>
          </div>
        )}
      </div>
      {NAV.map((n) => (
        <button
          key={n.id}
          onClick={() => setPage(n.id)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: collapsed ? "10px 12px" : "10px 14px",
            borderRadius: 12,
            border: "none",
            borderLeft:
              page === n.id
                ? `2px solid ${C.primary}`
                : "2px solid transparent",
            cursor: "pointer",
            background: page === n.id ? "rgba(59,130,246,0.15)" : "transparent",
            color: page === n.id ? C.primary : C.muted,
            fontWeight: page === n.id ? 600 : 400,
            fontSize: 14,
            transition: "all 200ms",
            outline: "none",
            fontFamily: "inherit",
            textAlign: "left",
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>{n.icon}</span>
          {!collapsed && n.label}
        </button>
      ))}
      {!collapsed && (
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              background:
                "linear-gradient(135deg,rgba(59,130,246,0.15),rgba(139,92,246,0.15))",
              border: "1px solid rgba(59,130,246,0.2)",
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div
              style={{
                color: C.text,
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              Upgrade to Pro
            </div>
            <div style={{ color: C.muted, fontSize: 10, marginBottom: 12 }}>
              Unlock unlimited AI analysis and advanced features.
            </div>
            <button
              style={{
                width: "100%",
                background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                padding: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Upgrade Now
            </button>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 4px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>
                  {userName}
                </div>
                <div style={{ color: C.muted, fontSize: 10 }}>Free Plan</div>
              </div>
            </div>
            <button
              onClick={onSignOut}
              title="Sign Out"
              style={{
                background: "none",
                border: "none",
                color: C.muted,
                cursor: "pointer",
                fontSize: 16,
                padding: 4,
                fontFamily: "inherit",
              }}
            >
              ⏻
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({
  title,
  setCollapsed,
  onSignOut,
}: {
  title: string;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  onSignOut: () => void;
}) {
  return (
    <div
      style={{
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(11,15,23,0.8)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={() => setCollapsed((c) => !c)}
          style={{
            background: "none",
            border: "none",
            color: C.muted,
            cursor: "pointer",
            fontSize: 18,
            fontFamily: "inherit",
          }}
        >
          ☰
        </button>
        <h2 style={{ color: C.text, margin: 0, fontSize: 18, fontWeight: 700 }}>
          {title}
        </h2>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          style={{
            background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
            border: "none",
            borderRadius: 10,
            color: "#fff",
            padding: "7px 16px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          ✦ AI Analysis
        </button>
        <div
          style={{
            width: 8,
            height: 8,
            background: C.success,
            borderRadius: "50%",
          }}
        />
        <button
          onClick={onSignOut}
          style={{
            width: 34,
            height: 34,
            background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          J
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
function DashboardPage({ trades }: { trades: Trade[] }) {
  const [perfTab, setPerfTab] = useState("Daily");
  const total = trades.length;
  const wins = trades.filter((t) => t.result === "Win").length;
  const losses = trades.filter((t) => t.result === "Loss").length;
  const be = trades.filter((t) => t.result === "Breakeven").length;
  const totalPnl = trades.reduce((s, t) => s + t.profit, 0);
  const winrate = total ? ((wins / total) * 100).toFixed(1) : "0.0";
  const perfVals = PERF_DATA.map((d) => d.value);
  const mockAI: AIResult = {
    bias: "buy",
    entry: "1945.00 – 1948.00",
    stop_loss: "1938.00",
    take_profit: "1960.00",
    confidence: "high",
    reason:
      "Price is rebounding from key support with strong bullish liquidity sweep. SMC structure confirms demand zone.",
  };

  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <StatCard
          label="Total Profit"
          value={`$${totalPnl.toFixed(2)}`}
          sub="+12.5% from last month"
          chart={perfVals.slice(-6)}
          subColor={C.success}
        />
        <StatCard
          label="Winrate"
          value={`${winrate}%`}
          sub="+4.2% from last month"
          chart={[60, 63, 61, 65, 64, parseFloat(winrate)]}
          subColor={C.success}
        />
        <StatCard
          label="Total Trades"
          value={total}
          sub="+18 from last month"
          chart={[80, 95, 110, 102, 118, total]}
          subColor={C.primary}
        />
        <StatCard
          label="This Week PnL"
          value={`$${trades
            .filter(
              (t) =>
                new Date(t.created_at) >
                new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            )
            .reduce((s, t) => s + t.profit, 0)
            .toFixed(2)}`}
          sub="+8.3% from last week"
          chart={[140, 170, 155, 190, 210]}
          subColor={C.success}
        />
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div
          style={{
            flex: 2,
            minWidth: 300,
            ...glass,
            borderRadius: 16,
            padding: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <span style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>
              Performance
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              {["Daily", "Weekly", "Monthly", "All Time"].map((t) => (
                <button
                  key={t}
                  onClick={() => setPerfTab(t)}
                  style={{
                    background: perfTab === t ? C.primary : "transparent",
                    border: "none",
                    borderRadius: 8,
                    color: perfTab === t ? "#fff" : C.muted,
                    padding: "4px 10px",
                    fontSize: 12,
                    cursor: "pointer",
                    fontWeight: perfTab === t ? 600 : 400,
                    fontFamily: "inherit",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: 160 }}>
            <PerformanceChart data={PERF_DATA} />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
            }}
          >
            {PERF_DATA.filter((_, i) => i % 2 === 0).map((d) => (
              <span key={d.label} style={{ color: C.muted, fontSize: 10 }}>
                {d.label}
              </span>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <AIInsightCard insight={mockAI} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div
          style={{
            flex: 2,
            minWidth: 300,
            ...glass,
            borderRadius: 16,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <span style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>
              Recent Trades
            </span>
            <span style={{ color: C.primary, fontSize: 13, cursor: "pointer" }}>
              View All
            </span>
          </div>
          {trades.length === 0 && (
            <div
              style={{
                color: C.muted,
                fontSize: 13,
                textAlign: "center",
                padding: 24,
              }}
            >
              No trades yet. Add your first trade in Journal!
            </div>
          )}
          {trades.slice(0, 5).map((t) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <div>
                <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>
                  {t.pair}
                </span>
                <span
                  style={{
                    color: t.direction === "Buy" ? C.success : C.danger,
                    marginLeft: 8,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {t.direction}
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    color: t.profit >= 0 ? C.success : C.danger,
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {t.profit >= 0 ? "+" : ""}${Math.abs(t.profit).toFixed(2)}
                </div>
                <div style={{ color: C.muted, fontSize: 10 }}>
                  {t.created_at.slice(0, 10)}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 200,
            ...glass,
            borderRadius: 16,
            padding: 20,
          }}
        >
          <div
            style={{
              color: C.text,
              fontWeight: 700,
              fontSize: 15,
              marginBottom: 16,
            }}
          >
            Trades Overview
          </div>
          <div style={{ height: 140 }}>
            <DonutChart win={wins} loss={losses} be={be} total={total || 1} />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginTop: 12,
            }}
          >
            {(
              [
                ["Win", wins, C.success],
                ["Loss", losses, C.danger],
                ["Breakeven", be, C.muted],
              ] as [string, number, string][]
            ).map(([label, count, color]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      background: color,
                      borderRadius: 2,
                    }}
                  />
                  <span style={{ color: C.muted }}>{label}</span>
                </div>
                <span style={{ color, fontWeight: 600 }}>
                  {count} ({total ? ((count / total) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Journal Page ─────────────────────────────────────────────────────────────
function JournalPage({
  trades,
  onAdd,
  onUpdate,
  onDelete,
}: {
  trades: Trade[];
  onAdd: (t: Omit<Trade, "id" | "created_at">) => Promise<void>;
  onUpdate: (id: number, t: Partial<Trade>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [filter, setFilter] = useState<FilterType>("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Trade | null | "new">(null);

  const filtered = trades.filter((t) => {
    if (filter !== "All" && t.result !== filter) return false;
    if (search && !t.pair.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const handleSave = async (form: TradeFormData) => {
    if (form.id) {
      await onUpdate(form.id, form);
    } else {
      await onAdd(form as Omit<Trade, "id" | "created_at">);
    }
    setModal(null);
  };

  const btnStyle = (active: boolean): CSSProperties => ({
    background: active ? C.primary : "transparent",
    border: `1px solid ${active ? C.primary : C.border}`,
    borderRadius: 8,
    color: active ? "#fff" : C.muted,
    padding: "6px 16px",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: active ? 600 : 400,
    fontFamily: "inherit",
  });

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["All", "Win", "Loss", "Breakeven"] as FilterType[]).map((f) => (
            <button
              key={f}
              style={btnStyle(filter === f)}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trades…"
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              color: C.text,
              padding: "8px 14px",
              fontSize: 13,
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={() => setModal("new")}
            style={{
              background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
              border: "none",
              borderRadius: 10,
              color: "#fff",
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            + Add Trade
          </button>
        </div>
      </div>
      <div style={{ ...glass, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {[
                  "Pair",
                  "Timeframe",
                  "Direction",
                  "Entry",
                  "SL",
                  "TP",
                  "Result",
                  "P/L",
                  "Date",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
                      color: C.muted,
                      fontWeight: 600,
                      fontSize: 12,
                      textAlign: "left",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <TradeRow
                  key={t.id}
                  trade={t}
                  onEdit={(tr) => setModal(tr)}
                  onDelete={onDelete}
                />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    style={{ padding: 40, textAlign: "center", color: C.muted }}
                  >
                    No trades found. Add your first trade!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {modal !== null && (
        <TradeModal
          trade={modal === "new" ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ─── AI Page ──────────────────────────────────────────────────────────────────
function AIPage() {
  const [tab, setTab] = useState<TabType>("Short-Term");
  const [method, setMethod] = useState<MethodType>("scalping");
  const [pair, setPair] = useState("XAUUSD");
  const [tf, setTf] = useState("15m");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weeklyUsed, setWeeklyUsed] = useState(0);
  const [totalUsed, setTotalUsed] = useState(0);
  const WEEKLY_LIMIT = 3,
    TOTAL_LIMIT = 12;
  const locked = weeklyUsed >= WEEKLY_LIMIT || totalUsed >= TOTAL_LIMIT;

  const METHODS: { id: MethodType; label: string; sub: string }[] = [
    { id: "scalping", label: "Scalping", sub: "Short-term quick trades" },
    { id: "smc", label: "SMC", sub: "Smart Money Concept" },
    { id: "trend", label: "Trend", sub: "Trend Following" },
    { id: "breakout", label: "Breakout", sub: "Breakout Strategy" },
  ];

  const buildPrompt = () => {
    const methodMap: Record<MethodType, string> = {
      scalping:
        "Use scalping methodology: look for quick momentum entries, tight S/L, 1:2 R:R minimum.",
      smc: "Use Smart Money Concepts: identify liquidity sweeps, order blocks, fair value gaps, and institutional entry zones.",
      trend:
        "Use trend following: identify HTF trend direction, look for pullback entries aligned with the trend.",
      breakout:
        "Use breakout strategy: identify key consolidation zones, enter on confirmed breakout with volume.",
    };
    return `You are a professional forex/crypto trader. ${methodMap[method]}
Analyze ${pair} on ${tf} timeframe. ${notes ? `Trader notes: ${notes}` : ""}
Respond ONLY with this exact JSON (no markdown, no extra text):
{"bias":"buy or sell","entry":"price zone","stop_loss":"price","take_profit":"price","confidence":"low/medium/high","reason":"short explanation under 40 words"}`;
  };

  const generate = async () => {
    if (locked) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: buildPrompt() }],
        }),
      });
      const data = await res.json();
      const text: string =
        data.content?.find((b: { type: string }) => b.type === "text")?.text ??
        "";
      const parsed: AIResult = JSON.parse(
        text.replace(/```json|```/g, "").trim(),
      );
      setResult(parsed);
      setWeeklyUsed((w) => w + 1);
      setTotalUsed((t) => t + 1);
    } catch {
      setError("Failed to generate analysis. Please try again.");
    }
    setLoading(false);
  };

  const inp: CSSProperties = {
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: C.text,
    padding: "10px 14px",
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <div style={{ padding: 24, display: "flex", gap: 24, flexWrap: "wrap" }}>
      <div
        style={{
          flex: 2,
          minWidth: 300,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div style={{ ...glass, borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {(["Short-Term", "Weekly Analysis"] as TabType[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background: tab === t ? C.primary : "transparent",
                  border: `1px solid ${tab === t ? C.primary : C.border}`,
                  borderRadius: 8,
                  color: tab === t ? "#fff" : C.muted,
                  padding: "6px 16px",
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: tab === t ? 600 : 400,
                  fontFamily: "inherit",
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <div
            style={{
              color: C.muted,
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            1. Select Method
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 20,
            }}
          >
            {METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                style={{
                  background: method === m.id ? "rgba(59,130,246,0.15)" : C.bg,
                  border: `1px solid ${method === m.id ? C.primary : C.border}`,
                  borderRadius: 12,
                  color: method === m.id ? C.primary : C.text,
                  padding: "12px 14px",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14 }}>{m.label}</div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                  {m.sub}
                </div>
              </button>
            ))}
          </div>
          <div
            style={{
              color: C.muted,
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            2. Market
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  color: C.muted,
                  fontSize: 11,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Symbol
              </label>
              <select
                style={inp}
                value={pair}
                onChange={(e) => setPair(e.target.value)}
              >
                {["XAUUSD", "NAS100", "EURUSD", "GBPJPY", "US30", "BTCUSD"].map(
                  (p) => (
                    <option key={p}>{p}</option>
                  ),
                )}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  color: C.muted,
                  fontSize: 11,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Timeframe
              </label>
              <select
                style={inp}
                value={tf}
                onChange={(e) => setTf(e.target.value)}
              >
                {["1m", "5m", "15m", "1h", "4h", "1d"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div
            style={{
              color: C.muted,
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            3. Additional Notes (Optional)
          </div>
          <textarea
            style={{ ...inp, height: 80, resize: "vertical", marginBottom: 4 }}
            placeholder="Tell the AI what you want to focus on…"
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 500))}
          />
          <div
            style={{
              color: C.muted,
              fontSize: 10,
              textAlign: "right",
              marginBottom: 16,
            }}
          >
            {notes.length}/500
          </div>
          {locked && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 12,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  color: C.danger,
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 4,
                }}
              >
                Trial Limit Reached
              </div>
              <div style={{ color: C.muted, fontSize: 12 }}>
                Upgrade to Pro for unlimited AI analysis.
              </div>
            </div>
          )}
          <button
            onClick={generate}
            disabled={loading || locked}
            style={{
              width: "100%",
              background: locked
                ? C.border
                : "linear-gradient(135deg,#3B82F6,#8B5CF6)",
              border: "none",
              borderRadius: 12,
              color: locked ? C.muted : "#fff",
              padding: 14,
              fontSize: 15,
              fontWeight: 700,
              cursor: locked ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontFamily: "inherit",
            }}
          >
            {loading ? "Analyzing…" : "✦ Generate AI Analysis"}
          </button>
        </div>
        {result && (
          <div style={{ ...glass, borderRadius: 16, padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <span style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>
                AI Result
              </span>
              <span
                style={{
                  background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
                  borderRadius: 999,
                  padding: "2px 10px",
                  fontSize: 11,
                  color: "#fff",
                }}
              >
                {method.toUpperCase()}
              </span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: C.muted, fontSize: 11 }}>Bias</div>
              <div
                style={{
                  color: result.bias === "buy" ? C.success : C.danger,
                  fontSize: 36,
                  fontWeight: 800,
                }}
              >
                {result.bias.toUpperCase()}
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 16,
              }}
            >
              {(
                [
                  ["Entry Zone", result.entry, C.text],
                  ["Stop Loss", result.stop_loss, C.danger],
                  ["Take Profit", result.take_profit, C.success],
                  [
                    "Confidence",
                    result.confidence,
                    result.confidence === "high" ? C.success : "#F59E0B",
                  ],
                ] as [string, string, string][]
              ).map(([l, v, col]) => (
                <div
                  key={l}
                  style={{ background: C.bg, borderRadius: 10, padding: 12 }}
                >
                  <div style={{ color: C.muted, fontSize: 10 }}>{l}</div>
                  <div
                    style={{
                      color: col,
                      fontWeight: 700,
                      fontSize: 14,
                      marginTop: 4,
                    }}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                background: C.bg,
                borderRadius: 10,
                padding: 14,
                color: C.muted,
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {result.reason}
            </div>
          </div>
        )}
        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 12,
              padding: 14,
              color: C.danger,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 240,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ ...glass, borderRadius: 16, padding: 20 }}>
          <div style={{ color: C.text, fontWeight: 700, marginBottom: 16 }}>
            How it works?
          </div>
          {(
            [
              [
                "1",
                "Choose Method",
                "Select the analysis method you want to use.",
              ],
              [
                "2",
                "Provide Context",
                "Add notes or context about the market.",
              ],
              [
                "3",
                "Get AI Insight",
                "AI will analyze and give an actionable insight.",
              ],
            ] as [string, string, string][]
          ).map(([n, t, d]) => (
            <div key={n} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                {n}
              </div>
              <div>
                <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>
                  {t}
                </div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                  {d}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ ...glass, borderRadius: 16, padding: 20 }}>
          <div
            style={{
              color: C.danger,
              fontWeight: 700,
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            Trial Limit (Free Plan)
          </div>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 12 }}>
            ✓ 3 analyses per week
            <br />✓ Max 12 analyses per account (6 months)
          </div>
          <div
            style={{
              color: C.text,
              fontWeight: 600,
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            Your AI Trial Usage
          </div>
          {(
            [
              [
                "this week",
                weeklyUsed,
                WEEKLY_LIMIT,
                "linear-gradient(90deg,#3B82F6,#8B5CF6)",
              ],
              [
                "total (6 months)",
                totalUsed,
                TOTAL_LIMIT,
                "linear-gradient(90deg,#EF4444,#F59E0B)",
              ],
            ] as [string, number, number, string][]
          ).map(([label, used, limit, grad]) => (
            <div key={label} style={{ marginBottom: 10 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: C.muted,
                  marginBottom: 4,
                }}
              >
                <span>
                  {used} / {limit} used {label}
                </span>
                <span>{Math.round((used / limit) * 100)}%</span>
              </div>
              <div style={{ height: 6, background: C.bg, borderRadius: 3 }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min((used / limit) * 100, 100)}%`,
                    background: grad,
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            background:
              "linear-gradient(135deg,rgba(59,130,246,0.15),rgba(139,92,246,0.15))",
            border: "1px solid rgba(59,130,246,0.2)",
            borderRadius: 16,
            padding: 20,
          }}
        >
          <div style={{ color: C.text, fontWeight: 700, marginBottom: 6 }}>
            Upgrade to Pro
          </div>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>
            Unlock unlimited AI analysis and advanced methods.
          </div>
          <button
            style={{
              width: "100%",
              background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
              border: "none",
              borderRadius: 10,
              color: "#fff",
              padding: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Weekly Page ──────────────────────────────────────────────────────────────
function WeeklyPage({ trades }: { trades: Trade[] }) {
  const weekly: Record<
    string,
    { wins: number; losses: number; profit: number }
  > = {};
  trades.forEach((t) => {
    const key = t.created_at.slice(0, 7);
    if (!weekly[key]) weekly[key] = { wins: 0, losses: 0, profit: 0 };
    if (t.result === "Win") weekly[key].wins++;
    if (t.result === "Loss") weekly[key].losses++;
    weekly[key].profit += t.profit;
  });
  return (
    <div style={{ padding: 24 }}>
      <div
        style={{ ...glass, borderRadius: 16, padding: 24, marginBottom: 24 }}
      >
        <div
          style={{
            color: C.text,
            fontWeight: 700,
            fontSize: 16,
            marginBottom: 20,
          }}
        >
          Weekly Performance Summary
        </div>
        <div style={{ height: 200 }}>
          <PerformanceChart data={PERF_DATA} />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 8,
          }}
        >
          {PERF_DATA.map((d) => (
            <span key={d.label} style={{ color: C.muted, fontSize: 10 }}>
              {d.label}
            </span>
          ))}
        </div>
      </div>
      {Object.keys(weekly).length === 0 && (
        <div style={{ color: C.muted, textAlign: "center", padding: 40 }}>
          No trade data yet.
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
          gap: 16,
        }}
      >
        {Object.entries(weekly).map(([key, data]) => (
          <div key={key} style={{ ...glass, borderRadius: 16, padding: 20 }}>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>
              {key}
            </div>
            <div
              style={{
                color: data.profit >= 0 ? C.success : C.danger,
                fontSize: 24,
                fontWeight: 800,
                marginBottom: 8,
              }}
            >
              {data.profit >= 0 ? "+" : ""}${data.profit.toFixed(2)}
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
              <span style={{ color: C.success }}>✓ {data.wins} wins</span>
              <span style={{ color: C.danger }}>✗ {data.losses} losses</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────
function SettingsPage({
  userEmail,
  userName,
  onSignOut,
}: {
  userEmail: string;
  userName: string;
  onSignOut: () => void;
}) {
  const [name, setName] = useState(userName);
  const [saved, setSaved] = useState(false);
  const inp: CSSProperties = {
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: C.text,
    padding: "10px 14px",
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };
  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <div
        style={{ ...glass, borderRadius: 16, padding: 28, marginBottom: 20 }}
      >
        <div
          style={{
            color: C.text,
            fontWeight: 700,
            fontSize: 16,
            marginBottom: 20,
          }}
        >
          Profile Settings
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label
              style={{
                color: C.muted,
                fontSize: 12,
                display: "block",
                marginBottom: 6,
              }}
            >
              Display Name
            </label>
            <input
              style={inp}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label
              style={{
                color: C.muted,
                fontSize: 12,
                display: "block",
                marginBottom: 6,
              }}
            >
              Email
            </label>
            <input
              style={{ ...inp, opacity: 0.6, cursor: "not-allowed" }}
              value={userEmail}
              disabled
            />
          </div>
          <button
            onClick={() => {
              setSaved(true);
              setTimeout(() => setSaved(false), 2000);
            }}
            style={{
              background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
              border: "none",
              borderRadius: 10,
              color: "#fff",
              padding: 12,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {saved ? "✓ Saved!" : "Save Changes"}
          </button>
        </div>
      </div>
      <div
        style={{ ...glass, borderRadius: 16, padding: 28, marginBottom: 20 }}
      >
        <div
          style={{
            color: C.text,
            fontWeight: 700,
            fontSize: 16,
            marginBottom: 16,
          }}
        >
          Subscription Plan
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            {
              name: "Free Plan",
              price: "$0/mo",
              features: [
                "Dashboard & Journal",
                "3 AI analyses/week",
                "12 total AI uses",
              ],
              active: true,
            },
            {
              name: "Pro Plan",
              price: "$29/mo",
              features: [
                "Everything in Free",
                "Unlimited AI analyses",
                "All methods + Weekly",
              ],
              active: false,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              style={{
                flex: 1,
                minWidth: 160,
                background: plan.active ? "rgba(59,130,246,0.1)" : C.bg,
                border: `1px solid ${plan.active ? C.primary : C.border}`,
                borderRadius: 14,
                padding: 20,
              }}
            >
              <div style={{ color: C.text, fontWeight: 700, marginBottom: 4 }}>
                {plan.name}
              </div>
              <div
                style={{
                  color: plan.active ? C.primary : C.accent,
                  fontSize: 22,
                  fontWeight: 800,
                  marginBottom: 12,
                }}
              >
                {plan.price}
              </div>
              {plan.features.map((f) => (
                <div
                  key={f}
                  style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}
                >
                  ✓ {f}
                </div>
              ))}
              {plan.active ? (
                <div
                  style={{
                    color: C.primary,
                    fontSize: 12,
                    marginTop: 10,
                    fontWeight: 600,
                  }}
                >
                  Current Plan
                </div>
              ) : (
                <button
                  style={{
                    width: "100%",
                    background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    padding: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    marginTop: 10,
                    fontFamily: "inherit",
                  }}
                >
                  Upgrade Now
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={onSignOut}
        style={{
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 12,
          color: C.danger,
          padding: "12px 24px",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        ⏻ Sign Out
      </button>
    </div>
  );
}

// ─── Loading Screen ───────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        fontFamily: "'Plus Jakarta Sans','Inter',sans-serif",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          fontWeight: 900,
          color: "#fff",
        }}
      >
        T
      </div>
      <div style={{ color: C.muted, fontSize: 14 }}>Loading TradeIntel…</div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const { user, loading, signOut } = useAuth();
  const { trades, addTrade, updateTrade, deleteTrade } = useTrades();
  const [page, setPage] = useState<PageId>("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  if (loading) return <LoadingScreen />;
  if (!user) return <Auth />;

  const sideW = collapsed ? 60 : 220;
  const pageTitle = NAV.find((n) => n.id === page)?.label ?? "Dashboard";
  const userName =
    (user.user_metadata?.name as string) ||
    user.email?.split("@")[0] ||
    "Trader";
  const userEmail = user.email ?? "";

  const renderPage = (): ReactNode => {
    switch (page) {
      case "dashboard":
        return <DashboardPage trades={trades} />;
      case "journal":
        return (
          <JournalPage
            trades={trades}
            onAdd={addTrade}
            onUpdate={updateTrade}
            onDelete={deleteTrade}
          />
        );
      case "ai":
        return <AIPage />;
      case "weekly":
        return <WeeklyPage trades={trades} />;
      case "settings":
        return (
          <SettingsPage
            userEmail={userEmail}
            userName={userName}
            onSignOut={signOut}
          />
        );
    }
  };

  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100vh",
        fontFamily: "'Plus Jakarta Sans','Inter',sans-serif",
        color: C.text,
        display: "flex",
      }}
    >
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0B0F17; }
        ::-webkit-scrollbar-thumb { background: #1F2937; border-radius: 3px; }
        button { font-family: inherit; }
        select option { background: #111827; color: #E5E7EB; }
      `}</style>
      <Sidebar
        page={page}
        setPage={setPage}
        collapsed={collapsed}
        onSignOut={signOut}
        userName={userName}
      />
      <div
        style={{
          marginLeft: sideW,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          transition: "margin-left 300ms",
        }}
      >
        <Topbar
          title={pageTitle}
          setCollapsed={setCollapsed}
          onSignOut={signOut}
        />
        <div style={{ flex: 1, overflowY: "auto" }}>{renderPage()}</div>
      </div>
    </div>
  );
}
