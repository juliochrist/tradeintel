import type { VercelRequest, VercelResponse } from "@vercel/node";

// ─── Symbol & Timeframe mapping ───────────────────────────────────────────────
const SYMBOL_MAP: Record<string, string> = {
  XAUUSD: "XAU/USD",
  EURUSD: "EUR/USD",
  GBPJPY: "GBP/JPY",
  GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY",
  AUDUSD: "AUD/USD",
  USDCAD: "USD/CAD",
  NAS100: "NDX",
  US30: "DJI",
  BTCUSD: "BTC/USD",
  ETHUSD: "ETH/USD",
};

const TF_MAP: Record<string, string> = {
  "1m": "1min",
  "5m": "5min",
  "15m": "15min",
  "1h": "1h",
  "4h": "4h",
  "1d": "1day",
};

// ─── Technical Indicators ─────────────────────────────────────────────────────
function calcEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return parseFloat(ema.toFixed(5));
}

function calcRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0,
    losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss =
      (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return parseFloat((100 - 100 / (1 + rs)).toFixed(2));
}

function calcATR(candles: any[], period = 14): number {
  if (candles.length < period) return 0;
  const trs = candles.slice(1).map((c, i) => {
    const prev = candles[i];
    return Math.max(
      c.high - c.low,
      Math.abs(c.high - prev.close),
      Math.abs(c.low - prev.close),
    );
  });
  const atr = trs.slice(-period).reduce((a, b) => a + b, 0) / period;
  return parseFloat(atr.toFixed(5));
}

function detectStructure(candles: any[]): string {
  const last10 = candles.slice(-10);
  const highs = last10.map((c: any) => c.high);
  const lows = last10.map((c: any) => c.low);
  const isHH = highs[highs.length - 1] > highs[highs.length - 3];
  const isHL = lows[lows.length - 1] > lows[lows.length - 3];
  const isLH = highs[highs.length - 1] < highs[highs.length - 3];
  const isLL = lows[lows.length - 1] < lows[lows.length - 3];
  if (isHH && isHL) return "bullish (HH + HL)";
  if (isLH && isLL) return "bearish (LH + LL)";
  return "ranging/consolidation";
}

function findKeyLevels(candles: any[]): {
  support: number;
  resistance: number;
} {
  const highs = candles.map((c: any) => c.high);
  const lows = candles.map((c: any) => c.low);
  // Find most tested levels
  const resistance = parseFloat(Math.max(...highs.slice(-20)).toFixed(5));
  const support = parseFloat(Math.min(...lows.slice(-20)).toFixed(5));
  return { support, resistance };
}

function detectLiquiditySweep(candles: any[]): string {
  const last5 = candles.slice(-5);
  const prev20High = Math.max(
    ...candles.slice(-25, -5).map((c: any) => c.high),
  );
  const prev20Low = Math.min(...candles.slice(-25, -5).map((c: any) => c.low));
  const lastHigh = Math.max(...last5.map((c: any) => c.high));
  const lastLow = Math.min(...last5.map((c: any) => c.low));
  if (lastHigh > prev20High)
    return "bullish liquidity swept (above recent highs)";
  if (lastLow < prev20Low) return "bearish liquidity swept (below recent lows)";
  return "no recent liquidity sweep";
}

// ─── Fetch 50 candles ─────────────────────────────────────────────────────────
async function fetchMarketData(pair: string, timeframe: string) {
  const symbol = SYMBOL_MAP[pair] || pair;
  const interval = TF_MAP[timeframe] || "15min";
  const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&outputsize=50&apikey=${process.env.TWELVEDATA_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status === "error" || !data.values) {
    throw new Error(
      `Market data unavailable: ${data.message || "Check API key or symbol"}`,
    );
  }

  // Parse candles oldest → newest
  const candles = data.values.reverse().map((c: any) => ({
    time: c.datetime,
    open: parseFloat(c.open),
    high: parseFloat(c.high),
    low: parseFloat(c.low),
    close: parseFloat(c.close),
    volume: parseFloat(c.volume || "0"),
  }));

  const closes = candles.map((c: any) => c.close);
  const latest = candles[candles.length - 1];

  // Pre-calculate indicators
  const ema20 = calcEMA(closes, 20);
  const ema50 = calcEMA(closes, 50);
  const rsi = calcRSI(closes, 14);
  const atr = calcATR(candles, 14);
  const structure = detectStructure(candles);
  const { support, resistance } = findKeyLevels(candles);
  const liquiditySweep = detectLiquiditySweep(candles);

  // Last 10 candles summary untuk AI
  const last10Summary = candles
    .slice(-10)
    .map(
      (c: any) => `${c.time} | O:${c.open} H:${c.high} L:${c.low} C:${c.close}`,
    )
    .join("\n");

  return {
    pair,
    timeframe,
    candles_analyzed: candles.length,
    current_price: latest.close,
    current_candle: `O:${latest.open} H:${latest.high} L:${latest.low} C:${latest.close}`,
    ema20,
    ema50,
    rsi,
    atr,
    structure,
    support,
    resistance,
    liquidity_sweep: liquiditySweep,
    price_vs_ema20: latest.close > ema20 ? "above EMA20" : "below EMA20",
    price_vs_ema50: latest.close > ema50 ? "above EMA50" : "below EMA50",
    last_10_candles: last10Summary,
  };
}

// ─── Method Prompts ───────────────────────────────────────────────────────────
function buildPrompt(method: string, marketData: any): string {
  const methodRules: Record<string, string> = {
    scalping: `You are an expert SCALPING trader. Rules:
- Trade with short-term momentum only
- Entry near intraday support/resistance or EMA bounce
- SL = 1x ATR from entry (tight)
- TP = 2x ATR from entry (1:2 RR minimum)
- Confirm with RSI momentum (not extreme overbought/oversold against trade)`,

    smc: `You are an expert SMART MONEY CONCEPTS (SMC) trader. Rules:
- Check if liquidity has been swept recently
- Identify Order Block: last opposite candle before the strong move
- Entry ONLY at valid Order Block after liquidity sweep
- SL = beyond the Order Block (+ 0.5x ATR buffer)
- TP = next liquidity pool or 1:3 RR minimum
- CHoCH or BOS must confirm the trade direction`,

    trend: `You are an expert TREND FOLLOWING trader. Rules:
- Only trade in direction of structure (HH+HL = bullish, LH+LL = bearish)
- Do NOT trade against the trend
- Entry on pullback to EMA20 or EMA50
- SL = below/above the pullback swing (+ 0.3x ATR buffer)
- TP = previous swing high/low or 1:3 RR
- RSI must confirm momentum (not diverging)`,

    breakout: `You are an expert BREAKOUT trader. Rules:
- Identify the consolidation range from last 10-15 candles
- Entry ONLY on confirmed candle CLOSE above resistance or below support
- SL = middle of consolidation range
- TP = measured move (range height projected from breakout)
- Minimum 1:2 RR required
- Avoid if ATR is very low (no momentum)`,
  };

  return `${methodRules[method] || methodRules.scalping}

REAL MARKET DATA (${marketData.pair} | ${marketData.timeframe} | ${marketData.candles_analyzed} candles analyzed):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Price  : ${marketData.current_price}
Current Candle : ${marketData.current_candle}
EMA 20         : ${marketData.ema20} (price is ${marketData.price_vs_ema20})
EMA 50         : ${marketData.ema50} (price is ${marketData.price_vs_ema50})
RSI (14)       : ${marketData.rsi}
ATR (14)       : ${marketData.atr}
Structure      : ${marketData.structure}
Support        : ${marketData.support}
Resistance     : ${marketData.resistance}
Liquidity      : ${marketData.liquidity_sweep}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Last 10 candles (oldest → newest):
${marketData.last_10_candles}

Based on the REAL data above, apply your trading rules and generate a signal.
Calculate EXACT prices for entry, SL, TP based on actual price levels.
If market conditions do NOT meet your rules, still provide best possible setup with "low" confidence.

Respond ONLY with this exact JSON (no markdown):
{"bias":"buy or sell","entry":"exact price","stop_loss":"exact price","take_profit":"exact price","confidence":"low/medium/high","reason":"max 50 words based on actual price action and indicators"}`;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { pair, timeframe, method } = req.body;

  if (!pair || !timeframe || !method) {
    return res
      .status(400)
      .json({ error: "pair, timeframe, and method are required" });
  }

  try {
    // Step 1: Fetch 50 candles + calculate indicators
    const marketData = await fetchMarketData(pair, timeframe);

    // Step 2: Build prompt
    const prompt = buildPrompt(method, marketData);

    // Step 3: Call Claude
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const aiData = await aiRes.json();
    const text =
      aiData.content?.find((b: any) => b.type === "text")?.text ?? "";
    const signal = JSON.parse(text.replace(/```json|```/g, "").trim());

    return res.status(200).json({
      ...signal,
      pair,
      timeframe,
      method,
      current_price: marketData.current_price,
      indicators: {
        ema20: marketData.ema20,
        ema50: marketData.ema50,
        rsi: marketData.rsi,
        atr: marketData.atr,
        structure: marketData.structure,
      },
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Signal error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to generate signal" });
  }
}
