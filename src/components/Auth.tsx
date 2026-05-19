import { useState } from "react";
import { supabase } from "../lib/supabase";

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
};

export default function Auth() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (mode === "register") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) setError(error.message);
      else setSuccess("Check your email to confirm your account!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setError(error.message);
    }

    setLoading(false);
  };

  const inp: React.CSSProperties = {
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: C.text,
    padding: "12px 16px",
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      }}
    >
      <div style={{ width: 420, maxWidth: "90vw" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
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
              margin: "0 auto 16px",
            }}
          >
            T
          </div>
          <div
            style={{
              color: C.text,
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: -0.5,
            }}
          >
            TradeIntel
          </div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
            Your AI Trading Intelligence
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            background: "rgba(17,24,39,0.6)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 20,
            padding: 32,
          }}
        >
          {/* Tabs */}
          <div
            style={{
              display: "flex",
              background: C.bg,
              borderRadius: 12,
              padding: 4,
              marginBottom: 28,
            }}
          >
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                  setSuccess(null);
                }}
                style={{
                  flex: 1,
                  background:
                    mode === m
                      ? "linear-gradient(135deg,#3B82F6,#8B5CF6)"
                      : "transparent",
                  border: "none",
                  borderRadius: 10,
                  color: mode === m ? "#fff" : C.muted,
                  padding: "10px",
                  fontSize: 14,
                  fontWeight: mode === m ? 700 : 400,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "register" && (
              <div>
                <label
                  style={{
                    color: C.muted,
                    fontSize: 12,
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Full Name
                </label>
                <input
                  style={inp}
                  placeholder="John Trader"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
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
                style={inp}
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                Password
              </label>
              <input
                style={inp}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 10,
                padding: "10px 14px",
                color: C.danger,
                fontSize: 13,
                marginTop: 16,
              }}
            >
              {error}
            </div>
          )}
          {success && (
            <div
              style={{
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: 10,
                padding: "10px 14px",
                color: C.success,
                fontSize: 13,
                marginTop: 16,
              }}
            >
              {success}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              background: "linear-gradient(135deg,#3B82F6,#8B5CF6)",
              border: "none",
              borderRadius: 12,
              color: "#fff",
              padding: 14,
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: 24,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? "Loading…"
              : mode === "login"
                ? "Sign In"
                : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
