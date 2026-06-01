import type {
  BillingSettings,
  CreditCostConfig,
} from "@/graphql/operations/credits";

/**
 * Client-side cost estimator for `MEETING_INSIGHT` operations.
 *
 * The backend doesn't currently expose a `previewCreditCost` query,
 * so the meeting client estimates locally from
 * `activeCreditCostConfigs` + `billingSettings.defaultMarkupPercent`
 * + the transcript char count we already know.
 *
 * The estimate is intentionally conservative — we'd rather quote
 * slightly high than slightly low. Three things drive that:
 *
 *   - input tokens come from `chars / 4` (the standard Anthropic
 *     tokenizer ratio for English; non-English skews ~10-20% higher,
 *     but the markup absorbs that).
 *   - output tokens are fixed at `DEFAULT_OUTPUT_TOKENS` because we
 *     don't know what the model will emit. The bg-tasks pipeline
 *     budgets `bedrock_max_tokens * 2 = 8192` for the structured
 *     tool call (see handoff #01); 4000 is a reasonable typical
 *     completion for a populated 4-section report.
 *   - markup is whichever is higher of the row-level
 *     `markupPercent` and the platform-wide
 *     `defaultMarkupPercent`, since some rows leave it at zero and
 *     rely on the global fallback.
 *
 * The result is a number in **credits** (1 credit ≈ $1).
 */

const DEFAULT_OUTPUT_TOKENS = 4000;
const CHARS_PER_TOKEN = 4;
const FALLBACK_ESTIMATE_CREDITS = 0.25;

export interface EstimateInput {
  transcriptChars: number;
  configs: CreditCostConfig[];
  billing: BillingSettings | null | undefined;
}

export interface EstimateResult {
  /** Credits expected to be charged. May be `null` if billing is disabled. */
  credits: number | null;
  /** Which config the estimate is based on (for tooltips / display). */
  basis: CreditCostConfig | null;
  /** Effective markup % applied. */
  markupPercent: number;
  /** Effective input + output tokens used in the math. */
  inputTokens: number;
  outputTokens: number;
  /** True when the estimate is a fallback because no config matched. */
  isFallback: boolean;
}

/**
 * Find the best CreditCostConfig for MEETING_INSIGHT. Prefers a row
 * with `operationType === "MEETING_INSIGHT"`; falls back to a row
 * where `operationType` is null (model-wide default).
 */
function pickConfig(configs: CreditCostConfig[]): CreditCostConfig | null {
  const active = configs.filter((c) => c.isActive);
  const opMatch = active.find((c) => c.operationType === "MEETING_INSIGHT");
  if (opMatch) return opMatch;
  const generic = active.find((c) => c.operationType == null);
  return generic ?? null;
}

export function estimateInsightCost(input: EstimateInput): EstimateResult {
  const { transcriptChars, configs, billing } = input;

  // Billing kill-switch on the backend — operations are free in test mode.
  if (billing && billing.billingEnabled === false) {
    return {
      credits: 0,
      basis: null,
      markupPercent: 0,
      inputTokens: 0,
      outputTokens: 0,
      isFallback: false,
    };
  }

  const config = pickConfig(configs);
  if (!config) {
    // No config available — return a hand-wavy fallback so the UI
    // can still surface *something* rather than blanking out.
    return {
      credits: FALLBACK_ESTIMATE_CREDITS,
      basis: null,
      markupPercent: 0,
      inputTokens: 0,
      outputTokens: 0,
      isFallback: true,
    };
  }

  const inputTokens = Math.max(0, Math.ceil(transcriptChars / CHARS_PER_TOKEN));
  const outputTokens = DEFAULT_OUTPUT_TOKENS;

  const rawCost =
    (inputTokens / 1000) * config.inputCostPer1k +
    (outputTokens / 1000) * config.outputCostPer1k +
    config.flatCostPerCall;

  const effectiveMarkup = Math.max(
    config.markupPercent || 0,
    billing?.defaultMarkupPercent ?? 0,
  );
  const withMarkup = rawCost * (1 + effectiveMarkup / 100);

  return {
    credits: round4(withMarkup),
    basis: config,
    markupPercent: effectiveMarkup,
    inputTokens,
    outputTokens,
    isFallback: false,
  };
}

/** Round to 4 decimals so the display doesn't show 0.123456789. */
function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

/**
 * Pretty-print a credit number for inline labels. 0.15 → "0.15 cr";
 * 12.4 → "12.4 cr"; 5000 → "5,000 cr". Keeps the unit terse so it
 * fits next to a button label.
 */
export function formatCredits(credits: number | null): string {
  if (credits == null) return "—";
  if (credits === 0) return "free";
  if (credits < 1) return `${credits.toFixed(2)} cr`;
  if (credits < 100) return `${credits.toFixed(1)} cr`;
  return `${Math.round(credits).toLocaleString()} cr`;
}
