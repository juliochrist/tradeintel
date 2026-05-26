import { useState, useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useAuth } from "./hooks/useAuth";
import { useTrades } from "./hooks/useTrades";
import type { Trade } from "./hooks/useTrades";
import Auth from "./components/Auth";
import { useAIUsage } from "./hooks/useAIUsage";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AIResult {
  bias: "buy" | "sell";
  entry: string;
  stop_loss: string;
  take_profit: string;
  confidence: "low" | "medium" | "high";
  reason: string;
  pair?: string;
  timeframe?: string;
  current_price?: number;
  generated_at?: string;
  indicators?: Record<string, unknown>;
}

interface PerfPoint {
  label: string;
  value: number;
}

type PageId = "dashboard" | "journal" | "ai" | "weekly" | "settings";
type FilterType = "All" | "Win" | "Loss";
type MethodType = "scalping" | "smc" | "trend" | "breakout";

type TradeFormData = Omit<Trade, "id" | "created_at" | "status"> & {
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

const SIDEBAR_FULL = 220;
const SIDEBAR_MINI = 60;

// ─── useIsMobile ──────────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return isMobile;
}

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
  const min = Math.min(...data),
    max = Math.max(...data),
    range = max - min || 1;
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
  total,
}: {
  win: number;
  loss: number;
  total: number;
}) {
  const r = 40,
    cx = 50,
    cy = 50,
    stroke = 10,
    circ = 2 * Math.PI * r;
  const winD = (win / total) * circ || 0;
  const lossD = (loss / total) * circ || 0;
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
        minWidth: 150,
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
      <td
        style={{
          padding: "12px 16px",
          color: C.text,
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        {trade.pair}
      </td>
      <td style={{ padding: "12px 8px", whiteSpace: "nowrap" }}>
        <span
          style={{
            color: trade.side === "Buy" ? C.success : C.danger,
            background:
              trade.side === "Buy"
                ? "rgba(34,197,94,0.1)"
                : "rgba(239,68,68,0.1)",
            borderRadius: 6,
            padding: "2px 10px",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {trade.side}
        </span>
      </td>
      <td
        style={{
          padding: "12px 8px",
          color: C.muted,
          fontSize: 12,
          whiteSpace: "nowrap",
        }}
      >
        {trade.open_date?.slice(0, 16).replace("T", " ")}
      </td>
      <td
        style={{
          padding: "12px 8px",
          color: C.muted,
          fontSize: 12,
          whiteSpace: "nowrap",
        }}
      >
        {trade.close_date?.slice(0, 16).replace("T", " ")}
      </td>
      <td
        style={{
          padding: "12px 8px",
          color: C.text,
          fontSize: 13,
          whiteSpace: "nowrap",
        }}
      >
        {trade.entry}
      </td>
      <td
        style={{
          padding: "12px 8px",
          color: C.text,
          fontSize: 13,
          whiteSpace: "nowrap",
        }}
      >
        {trade.exit}
      </td>
      <td
        style={{
          padding: "12px 8px",
          color: C.muted,
          fontSize: 13,
          whiteSpace: "nowrap",
        }}
      >
        {trade.qty}
      </td>
      <td
        style={{
          padding: "12px 8px",
          color: C.muted,
          fontSize: 12,
          whiteSpace: "nowrap",
        }}
      >
        {trade.fee > 0 ? `-$${trade.fee}` : "-"}
      </td>
      <td
        style={{
          padding: "12px 8px",
          color: C.muted,
          fontSize: 12,
          whiteSpace: "nowrap",
        }}
      >
        {trade.swap > 0 ? `-$${trade.swap}` : "-"}
      </td>
      <td
        style={{
          padding: "12px 8px",
          fontWeight: 700,
          fontSize: 13,
          color: (trade.pnl ?? 0) >= 0 ? C.success : C.danger,
          whiteSpace: "nowrap",
        }}
      >
        {(trade.pnl ?? 0) >= 0 ? "+" : ""}${Math.abs(trade.pnl ?? 0).toFixed(2)}
      </td>
      <td style={{ padding: "12px 8px", whiteSpace: "nowrap" }}>
        <span
          style={{
            color: trade.status === "Win" ? C.success : C.danger,
            background:
              trade.status === "Win"
                ? "rgba(34,197,94,0.1)"
                : "rgba(239,68,68,0.1)",
            borderRadius: 6,
            padding: "2px 10px",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {trade.status}
        </span>
      </td>
      <td style={{ padding: "12px 8px", whiteSpace: "nowrap" }}>
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
  const now = new Date().toISOString().slice(0, 16);
  const [form, setForm] = useState<TradeFormData>(
    trade
      ? {
          pair: trade.pair,
          side: trade.side,
          open_date: trade.open_date?.slice(0, 16) || now,
          close_date: trade.close_date?.slice(0, 16) || now,
          entry: trade.entry,
          exit: trade.exit,
          qty: trade.qty,
          fee: trade.fee,
          swap: trade.swap,
          pnl: trade.pnl,
        }
      : {
          pair: "XAUUSD",
          side: "Buy",
          open_date: now,
          close_date: now,
          entry: 0,
          exit: 0,
          qty: 0.01,
          fee: 0,
          swap: 0,
          pnl: 0,
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

  const pnlVal = Number(form.pnl);
  const pnlStatus = pnlVal >= 0 ? "Win" : "Loss";

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
        zIndex: 200,
      }}
    >
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: 32,
          width: 520,
          maxWidth: "90vw",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
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
          {/* Symbol */}
          <div>
            <label
              style={{
                color: C.muted,
                fontSize: 12,
                display: "block",
                marginBottom: 6,
              }}
            >
              Symbol
            </label>
            <input
              style={inp}
              value={form.pair}
              onChange={(e) => set("pair", e.target.value.toUpperCase())}
              placeholder="XAUUSD"
            />
          </div>

          {/* Side */}
          <div>
            <label
              style={{
                color: C.muted,
                fontSize: 12,
                display: "block",
                marginBottom: 6,
              }}
            >
              Side
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["Buy", "Sell"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => set("side", s)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 10,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 14,
                    fontFamily: "inherit",
                    background:
                      form.side === s
                        ? s === "Buy"
                          ? "rgba(34,197,94,0.2)"
                          : "rgba(239,68,68,0.2)"
                        : C.bg,
                    color:
                      form.side === s
                        ? s === "Buy"
                          ? C.success
                          : C.danger
                        : C.muted,
                    outline:
                      form.side === s
                        ? `1px solid ${s === "Buy" ? C.success : C.danger}`
                        : `1px solid ${C.border}`,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Open Date */}
          <div>
            <label
              style={{
                color: C.muted,
                fontSize: 12,
                display: "block",
                marginBottom: 6,
              }}
            >
              Open Date
            </label>
            <input
              style={{ ...inp, colorScheme: "dark" }}
              type="datetime-local"
              value={form.open_date}
              onChange={(e) => set("open_date", e.target.value)}
            />
          </div>

          {/* Close Date */}
          <div>
            <label
              style={{
                color: C.muted,
                fontSize: 12,
                display: "block",
                marginBottom: 6,
              }}
            >
              Close Date
            </label>
            <input
              style={{ ...inp, colorScheme: "dark" }}
              type="datetime-local"
              value={form.close_date}
              onChange={(e) => set("close_date", e.target.value)}
            />
          </div>

          {/* Entry */}
          <div>
            <label
              style={{
                color: C.muted,
                fontSize: 12,
                display: "block",
                marginBottom: 6,
              }}
            >
              Entry Price
            </label>
            <input
              style={inp}
              type="number"
              step="any"
              placeholder="0.00"
              value={form.entry || ""}
              onChange={(e) => set("entry", parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Exit */}
          <div>
            <label
              style={{
                color: C.muted,
                fontSize: 12,
                display: "block",
                marginBottom: 6,
              }}
            >
              Exit Price
            </label>
            <input
              style={inp}
              type="number"
              step="any"
              placeholder="0.00"
              value={form.exit || ""}
              onChange={(e) => set("exit", parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Qty — text input supaya bisa ketik bebas */}
          <div>
            <label
              style={{
                color: C.muted,
                fontSize: 12,
                display: "block",
                marginBottom: 6,
              }}
            >
              Qty (Lot)
            </label>
            <input
              style={inp}
              type="text"
              inputMode="decimal"
              placeholder="0.01"
              value={form.qty}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || val === "." || /^\d*\.?\d*$/.test(val)) {
                  set("qty", val as unknown as number);
                }
              }}
            />
          </div>

          {/* Fee */}
          <div>
            <label
              style={{
                color: C.muted,
                fontSize: 12,
                display: "block",
                marginBottom: 6,
              }}
            >
              Fee ($)
            </label>
            <input
              style={inp}
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={form.fee || ""}
              onChange={(e) => set("fee", parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Swap */}
          <div>
            <label
              style={{
                color: C.muted,
                fontSize: 12,
                display: "block",
                marginBottom: 6,
              }}
            >
              Swap ($)
            </label>
            <input
              style={inp}
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={form.swap || ""}
              onChange={(e) => set("swap", parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* P&L — manual input, bisa minus */}
          <div>
            <label
              style={{
                color: C.muted,
                fontSize: 12,
                display: "block",
                marginBottom: 6,
              }}
            >
              P&L ($)
              <span style={{ color: C.muted, fontSize: 10, marginLeft: 6 }}>
                ketik minus untuk loss
              </span>
            </label>
            <input
              style={{
                ...inp,
                color: pnlVal >= 0 ? C.success : C.danger,
                fontWeight: 700,
                border: `1px solid ${pnlVal >= 0 ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
              }}
              type="number"
              step="any"
              placeholder="0.00"
              value={form.pnl === 0 ? "" : form.pnl}
              onChange={(e) => set("pnl", parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Status — auto dari P&L */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
            }}
          >
            <label
              style={{
                color: C.muted,
                fontSize: 12,
                display: "block",
                marginBottom: 6,
              }}
            >
              Status (Auto)
            </label>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background:
                  pnlStatus === "Win"
                    ? "rgba(34,197,94,0.1)"
                    : "rgba(239,68,68,0.1)",
                border: `1px solid ${pnlStatus === "Win" ? C.success : C.danger}`,
                color: pnlStatus === "Win" ? C.success : C.danger,
                fontWeight: 700,
                fontSize: 15,
                textAlign: "center",
              }}
            >
              {pnlStatus}
            </div>
          </div>
        </div>

        {/* Buttons */}
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
  isMobile,
  onClose,
}: {
  page: PageId;
  setPage: (p: PageId) => void;
  collapsed: boolean;
  onSignOut: () => void;
  userName: string;
  isMobile: boolean;
  onClose: () => void;
}) {
  const handleNav = (id: PageId) => {
    setPage(id);
    if (isMobile) onClose();
  };

  return (
    <>
      {isMobile && !collapsed && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 49,
          }}
        />
      )}
      <div
        style={{
          width: isMobile
            ? SIDEBAR_FULL
            : collapsed
              ? SIDEBAR_MINI
              : SIDEBAR_FULL,
          minHeight: "100vh",
          ...glass,
          borderRight: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          flexDirection: "column",
          padding: !isMobile && collapsed ? "24px 10px" : "24px 16px",
          gap: 4,
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 50,
          boxSizing: "border-box",
          transition: "width 300ms ease, transform 300ms ease",
          transform: isMobile
            ? collapsed
              ? "translateX(-100%)"
              : "translateX(0)"
            : "translateX(0)",
          overflowX: "hidden",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 28,
            overflow: "hidden",
          }}
        >
          <img
            src="/favicon.png"
            alt="TradeIntel"
            style={{
              width: 34,
              height: 34,
              objectFit: "contain",
              filter: "drop-shadow(0 0 6px rgba(59,130,246,0.5))",
              flexShrink: 0,
            }}
          />
          {(!collapsed || isMobile) && (
            <img
              src="/logo_2.png"
              alt="TradeIntel"
              style={{
                width: 140,
                height: 32,
                objectFit: "contain",
                filter: "drop-shadow(0 0 6px rgba(59,130,246,0.5))",
              }}
            />
          )}
        </div>

        {/* Nav Items */}
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => handleNav(n.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              borderRadius: 12,
              border: "none",
              borderLeft:
                page === n.id
                  ? `2px solid ${C.primary}`
                  : "2px solid transparent",
              cursor: "pointer",
              background:
                page === n.id ? "rgba(59,130,246,0.15)" : "transparent",
              color: page === n.id ? C.primary : C.muted,
              fontWeight: page === n.id ? 600 : 400,
              fontSize: 14,
              transition: "all 200ms",
              outline: "none",
              fontFamily: "inherit",
              textAlign: "left",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{n.icon}</span>
            {(!collapsed || isMobile) && n.label}
          </button>
        ))}

        {/* Bottom */}
        {(!collapsed || isMobile) && (
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
    </>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({
  title,
  onToggleSidebar,
  onSignOut,
  onNavigateAI,
  userName,
}: {
  title: string;
  onToggleSidebar: () => void;
  onSignOut: () => void;
  onNavigateAI: () => void;
  userName: string;
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
          onClick={onToggleSidebar}
          style={{
            background: "none",
            border: "none",
            color: C.muted,
            cursor: "pointer",
            fontSize: 18,
            fontFamily: "inherit",
            padding: 4,
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
          onClick={onNavigateAI}
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
          {userName.charAt(0).toUpperCase()}
        </button>
      </div>
    </div>
  );
}

// ─── Build Perf Data ──────────────────────────────────────────────────────────
function buildPerfData(trades: Trade[]): PerfPoint[] {
  if (trades.length === 0) return [{ label: "Now", value: 0 }];
  const sorted = [...trades].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  let cum = 0;
  const grouped: Record<string, number> = {};
  sorted.forEach((t) => {
    cum += t.pnl ?? 0;
    grouped[t.created_at.slice(0, 10)] = cum;
  });
  return Object.entries(grouped).map(([label, value]) => ({ label, value }));
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
function DashboardPage({ trades }: { trades: Trade[] }) {
  const [perfTab, setPerfTab] = useState("Daily");
  const total = trades.length;
  const wins = trades.filter((t) => t.status === "Win").length;
  const losses = trades.filter((t) => t.status === "Loss").length;
  const totalPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const winrate = total ? ((wins / total) * 100).toFixed(1) : "0.0";
  const thisWeekPnl = trades
    .filter(
      (t) =>
        new Date(t.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    )
    .reduce((s, t) => s + (t.pnl ?? 0), 0);
  const perfData = buildPerfData(trades);
  const mockAI: AIResult = {
    bias: "buy",
    entry: "1945.00 – 1948.00",
    stop_loss: "1938.00",
    take_profit: "1960.00",
    confidence: "high",
    reason:
      "Price rebounding from key support with bullish liquidity sweep. SMC structure confirms demand zone.",
  };

  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      {/* Stats */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <StatCard
          label="Total P&L"
          value={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`}
          sub="All time"
          chart={perfData.map((d) => d.value).slice(-6)}
          subColor={totalPnl >= 0 ? C.success : C.danger}
        />
        <StatCard
          label="Winrate"
          value={`${winrate}%`}
          sub={`${wins}W / ${losses}L`}
          chart={[60, 63, 61, 65, 64, parseFloat(winrate)]}
          subColor={C.success}
        />
        <StatCard
          label="Total Trades"
          value={total}
          sub="All time"
          chart={[80, 95, 110, 102, 118, total]}
          subColor={C.primary}
        />
        <StatCard
          label="This Week P&L"
          value={`${thisWeekPnl >= 0 ? "+" : ""}$${thisWeekPnl.toFixed(2)}`}
          sub="Last 7 days"
          chart={[140, 170, 155, 190, 210]}
          subColor={thisWeekPnl >= 0 ? C.success : C.danger}
        />
      </div>

      {/* Chart + AI */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div
          style={{
            flex: 2,
            minWidth: 280,
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
            <PerformanceChart data={perfData} />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
            }}
          >
            {perfData
              .filter(
                (_, i) => i % Math.max(1, Math.ceil(perfData.length / 5)) === 0,
              )
              .map((d) => (
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

      {/* Recent + Donut */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div
          style={{
            flex: 2,
            minWidth: 280,
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
                    color: t.side === "Buy" ? C.success : C.danger,
                    marginLeft: 8,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {t.side}
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    color: (t.pnl ?? 0) >= 0 ? C.success : C.danger,
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {(t.pnl ?? 0) >= 0 ? "+" : ""}$
                  {Math.abs(t.pnl ?? 0).toFixed(2)}
                </div>
                <div style={{ color: C.muted, fontSize: 10 }}>
                  {t.close_date?.slice(0, 10) || t.created_at.slice(0, 10)}
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
            <DonutChart win={wins} loss={losses} total={total || 1} />
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
  const isMobile = useIsMobile();

  const filtered = trades.filter((t) => {
    if (filter !== "All" && t.status !== filter) return false;
    if (search && !t.pair.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const handleSave = async (form: TradeFormData) => {
    const pnl = Number(form.pnl);
    const status: "Win" | "Loss" = pnl >= 0 ? "Win" : "Loss";
    const qty = parseFloat(String(form.qty)) || 0.01;
    if (form.id) {
      await onUpdate(form.id, { ...form, qty, pnl, status } as Partial<Trade>);
    } else {
      await onAdd({ ...form, qty, pnl, status } as Omit<
        Trade,
        "id" | "created_at"
      >);
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
    <div style={{ padding: isMobile ? 12 : 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["All", "Win", "Loss"] as FilterType[]).map((f) => (
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
          {!isMobile && (
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbol…"
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
          )}
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

      {isMobile && (
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search symbol…"
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            color: C.text,
            padding: "8px 14px",
            fontSize: 13,
            outline: "none",
            fontFamily: "inherit",
            width: "100%",
            marginBottom: 12,
            boxSizing: "border-box",
          }}
        />
      )}

      <div style={{ ...glass, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}
          >
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {[
                  "Symbol",
                  "Side",
                  "Open Date",
                  "Close Date",
                  "Entry",
                  "Exit",
                  "Qty",
                  "Fee",
                  "Swap",
                  "P&L",
                  "Status",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 10px",
                      color: C.muted,
                      fontWeight: 600,
                      fontSize: 12,
                      textAlign: "left",
                      whiteSpace: "nowrap",
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
                    colSpan={12}
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
  const [method, setMethod] = useState<MethodType>("scalping");
  const [pair, setPair] = useState("XAUUSD");
  const [tf, setTf] = useState("15m");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    weeklyUsed,
    totalUsed,
    isLocked,
    incrementUsage,
    WEEKLY_LIMIT,
    TOTAL_LIMIT,
  } = useAIUsage();

  const METHODS: { id: MethodType; label: string; sub: string }[] = [
    { id: "scalping", label: "Scalping", sub: "Short-term quick trades" },
    { id: "smc", label: "SMC", sub: "Smart Money Concept" },
    { id: "trend", label: "Trend", sub: "Trend Following" },
    { id: "breakout", label: "Breakout", sub: "Breakout Strategy" },
  ];

  const generate = async () => {
    if (isLocked) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pair, timeframe: tf, method }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      await incrementUsage();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to generate signal.",
      );
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
      {/* Left */}
      <div
        style={{
          flex: 2,
          minWidth: 280,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div style={{ ...glass, borderRadius: 16, padding: 20 }}>
          {/* Method */}
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

          {/* Market */}
          <div
            style={{
              color: C.muted,
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            2. Select Market
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
                {[
                  "XAUUSD",
                  "NAS100",
                  "EURUSD",
                  "GBPJPY",
                  "GBPUSD",
                  "USDJPY",
                  "AUDUSD",
                  "US30",
                  "BTCUSD",
                  "ETHUSD",
                ].map((p) => (
                  <option key={p}>{p}</option>
                ))}
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

          {/* Disclaimer */}
          <div
            style={{
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.2)",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: 11,
              color: "#FBB724",
              lineHeight: 1.5,
            }}
          >
            ⚠️ AI signals are for educational purposes only. Always do your own
            analysis. Trading involves risk of loss.
          </div>

          {isLocked && (
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
                Upgrade to Pro for unlimited AI signals.
              </div>
            </div>
          )}

          <button
            onClick={generate}
            disabled={loading || isLocked}
            style={{
              width: "100%",
              background: isLocked
                ? C.border
                : "linear-gradient(135deg,#3B82F6,#8B5CF6)",
              border: "none",
              borderRadius: 12,
              color: isLocked ? C.muted : "#fff",
              padding: 14,
              fontSize: 15,
              fontWeight: 700,
              cursor: isLocked ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontFamily: "inherit",
            }}
          >
            {loading
              ? "Fetching market data & analyzing…"
              : "✦ Generate Signal"}
          </button>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div
            style={{
              ...glass,
              borderRadius: 16,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>
              Fetching 50 candles + analyzing with {method.toUpperCase()} rules…
            </div>
            {[80, 40, 60, 100].map((w, i) => (
              <div
                key={i}
                style={{
                  height: 16,
                  width: `${w}%`,
                  background: C.border,
                  borderRadius: 8,
                  animation: "pulse 1.5s infinite",
                }}
              />
            ))}
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div style={{ ...glass, borderRadius: 16, padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <span style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>
                Signal Result
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <span
                  style={{
                    background: "rgba(59,130,246,0.15)",
                    borderRadius: 999,
                    padding: "2px 10px",
                    fontSize: 11,
                    color: C.primary,
                  }}
                >
                  {result.pair || pair} · {result.timeframe || tf}
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
            </div>

            {/* Bias */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>
                Signal
              </div>
              <div
                style={{
                  color: result.bias === "buy" ? C.success : C.danger,
                  fontSize: 40,
                  fontWeight: 900,
                  letterSpacing: -1,
                }}
              >
                {result.bias?.toUpperCase()}
              </div>
            </div>

            {/* Levels */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
                marginBottom: 16,
              }}
            >
              {(
                [
                  ["Entry", result.entry, C.primary],
                  ["Stop Loss", result.stop_loss, C.danger],
                  ["Take Profit", result.take_profit, C.success],
                ] as [string, string, string][]
              ).map(([l, v, col]) => (
                <div
                  key={l}
                  style={{
                    background: C.bg,
                    borderRadius: 10,
                    padding: 12,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{ color: C.muted, fontSize: 10, marginBottom: 4 }}
                  >
                    {l}
                  </div>
                  <div style={{ color: col, fontWeight: 700, fontSize: 15 }}>
                    {v}
                  </div>
                </div>
              ))}
            </div>

            {/* Confidence + Current Price */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <span style={{ color: C.muted, fontSize: 12 }}>Confidence:</span>
              <span
                style={{
                  color:
                    result.confidence === "high"
                      ? C.success
                      : result.confidence === "medium"
                        ? "#F59E0B"
                        : C.danger,
                  background:
                    result.confidence === "high"
                      ? "rgba(34,197,94,0.1)"
                      : result.confidence === "medium"
                        ? "rgba(245,158,11,0.1)"
                        : "rgba(239,68,68,0.1)",
                  borderRadius: 6,
                  padding: "2px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {result.confidence?.toUpperCase()}
              </span>
              {result.current_price && (
                <span
                  style={{ color: C.muted, fontSize: 11, marginLeft: "auto" }}
                >
                  Current:{" "}
                  <strong style={{ color: C.text }}>
                    {result.current_price}
                  </strong>
                </span>
              )}
            </div>

            {/* Reason */}
            <div
              style={{
                background: C.bg,
                borderRadius: 10,
                padding: 14,
                color: C.muted,
                fontSize: 13,
                lineHeight: 1.6,
                marginBottom: 12,
              }}
            >
              {result.reason}
            </div>

            {/* Indicators */}
            {result.indicators && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(result.indicators).map(([k, v]) => (
                  <span
                    key={k}
                    style={{
                      background: C.border,
                      borderRadius: 6,
                      padding: "3px 8px",
                      fontSize: 10,
                      color: C.muted,
                    }}
                  >
                    {k.toUpperCase()}: {String(v)}
                  </span>
                ))}
              </div>
            )}

            {result.generated_at && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 10,
                  color: C.muted,
                  textAlign: "right",
                }}
              >
                Generated: {new Date(result.generated_at).toLocaleString()}
              </div>
            )}
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
            ❌ {error}
          </div>
        )}
      </div>

      {/* Right Panel */}
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
              ["1", "Select Method", "Choose your trading strategy."],
              ["2", "Select Market", "Pick symbol and timeframe."],
              [
                "3",
                "Generate",
                "AI fetches 50 real candles, calculates EMA/RSI/ATR, then generates signal.",
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

        {/* Usage */}
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
            ✓ 3 signals per week
            <br />✓ Max 12 signals per account
          </div>
          <div
            style={{
              color: C.text,
              fontWeight: 600,
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            Your Usage
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
                "total",
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
                  {used} / {limit} {label}
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

        {/* Upgrade */}
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
            Unlimited signals, all methods, 24/7 access.
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
  const weekly: Record<string, { wins: number; losses: number; pnl: number }> =
    {};
  trades.forEach((t) => {
    const key = t.close_date?.slice(0, 7) || t.created_at.slice(0, 7);
    if (!weekly[key]) weekly[key] = { wins: 0, losses: 0, pnl: 0 };
    if (t.status === "Win") weekly[key].wins++;
    if (t.status === "Loss") weekly[key].losses++;
    weekly[key].pnl += t.pnl ?? 0;
  });
  const perfData = buildPerfData(trades);

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
          Cumulative P&L
        </div>
        <div style={{ height: 200 }}>
          <PerformanceChart data={perfData} />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 8,
          }}
        >
          {perfData
            .filter(
              (_, i) => i % Math.max(1, Math.ceil(perfData.length / 5)) === 0,
            )
            .map((d) => (
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
        {Object.entries(weekly)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([key, data]) => (
            <div key={key} style={{ ...glass, borderRadius: 16, padding: 20 }}>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>
                {key}
              </div>
              <div
                style={{
                  color: data.pnl >= 0 ? C.success : C.danger,
                  fontSize: 24,
                  fontWeight: 800,
                  marginBottom: 8,
                }}
              >
                {data.pnl >= 0 ? "+" : ""}${data.pnl.toFixed(2)}
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
                "3 AI signals/week",
                "12 total signals",
              ],
              active: true,
            },
            {
              name: "Pro Plan",
              price: "$29/mo",
              features: [
                "Everything in Free",
                "Unlimited AI signals",
                "All methods, 24/7",
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
      <img
        src="/logo.png"
        alt="TradeIntel"
        style={{
          width: 100,
          height: 100,
          objectFit: "contain",
          display: "block",
        }}
      />
      <div style={{ color: C.muted, fontSize: 14 }}>Loading TradeIntel…</div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const { user, loading, signOut } = useAuth();
  const { trades, addTrade, updateTrade, deleteTrade } = useTrades();
  const [page, setPage] = useState<PageId>("dashboard");
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(isMobile ? true : false);
  }, [isMobile]);

  if (loading) return <LoadingScreen />;
  if (!user) return <Auth />;

  const pageTitle = NAV.find((n) => n.id === page)?.label ?? "Dashboard";
  const userName =
    (user.user_metadata?.name as string) ||
    user.email?.split("@")[0] ||
    "Trader";
  const userEmail = user.email ?? "";
  const mainMarginLeft = isMobile ? 0 : collapsed ? SIDEBAR_MINI : SIDEBAR_FULL;

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
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: invert(1); }
      `}</style>

      <Sidebar
        page={page}
        setPage={setPage}
        collapsed={collapsed}
        onSignOut={signOut}
        userName={userName}
        isMobile={isMobile}
        onClose={() => setCollapsed(true)}
      />
      <div
        style={{
          marginLeft: mainMarginLeft,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          transition: "margin-left 300ms ease",
        }}
      >
        <Topbar
          title={pageTitle}
          onToggleSidebar={() => setCollapsed((c) => !c)}
          onSignOut={signOut}
          onNavigateAI={() => setPage("ai")}
          userName={userName}
        />
        <div style={{ flex: 1, overflowY: "auto" }}>{renderPage()}</div>
      </div>
    </div>
  );
}
