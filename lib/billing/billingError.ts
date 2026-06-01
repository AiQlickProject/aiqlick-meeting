import type { ApolloError } from "@apollo/client";

/**
 * Billing error decoding — port of the frontend's `useBillingError`
 * utilities. Detects the four billing-related error codes the
 * backend / bg-tasks can return and gives the UI enough info to
 * decide between "buy credits" vs "renew subscription" vs "you hit a
 * plan limit" CTAs.
 *
 * Looks at three signals because the same logical error can surface
 * three different ways depending on whether it came through the
 * GraphQL `extensions.code`, an `AiEvent.error` string, or just an
 * HTTP 402 with no code in the body:
 *   1. `error.graphQLErrors[].extensions.code`
 *   2. `error.networkError.statusCode === 402`
 *   3. case-insensitive substring match on the `message`
 *
 * Each match resolves to a `BillingErrorInfo` carrying the CTA hint
 * and a copy block so the caller doesn't have to rewrite the same
 * messaging in five places.
 */

export type BillingErrorCode =
  | "INSUFFICIENT_CREDITS"
  | "PLAN_LIMIT_EXCEEDED"
  | "SUBSCRIPTION_INACTIVE"
  | "INVALID_PLAN_PRICING";

export interface BillingErrorInfo {
  code: BillingErrorCode;
  title: string;
  description: string;
  /** Which kind of recovery affordance fits this error. */
  cta: "buy-credits" | "renew-subscription" | "upgrade-plan" | "contact-support";
  /** Backend's `details` payload, e.g. `{ required, available }`. */
  details?: Record<string, unknown>;
}

const CODE_TO_INFO: Record<BillingErrorCode, Omit<BillingErrorInfo, "details" | "code">> = {
  INSUFFICIENT_CREDITS: {
    title: "Not enough credits",
    description:
      "Your account doesn't have enough credits to run this operation. Top up to continue.",
    cta: "buy-credits",
  },
  PLAN_LIMIT_EXCEEDED: {
    title: "Plan limit reached",
    description:
      "This action hit a monthly limit on your current plan. Upgrade for higher quotas.",
    cta: "upgrade-plan",
  },
  SUBSCRIPTION_INACTIVE: {
    title: "Subscription inactive",
    description:
      "Your subscription needs attention before AI operations can run. Renew or fix payment to continue.",
    cta: "renew-subscription",
  },
  INVALID_PLAN_PRICING: {
    title: "Plan pricing misconfigured",
    description:
      "Your plan is missing pricing config. Contact support to resolve.",
    cta: "contact-support",
  },
};

const MESSAGE_PATTERNS: Array<{ pattern: RegExp; code: BillingErrorCode }> = [
  { pattern: /insufficient\s+credits?/i, code: "INSUFFICIENT_CREDITS" },
  { pattern: /not\s+enough\s+credits?/i, code: "INSUFFICIENT_CREDITS" },
  { pattern: /plan\s+limit/i, code: "PLAN_LIMIT_EXCEEDED" },
  { pattern: /subscription\s+(inactive|not\s+active)/i, code: "SUBSCRIPTION_INACTIVE" },
  { pattern: /no\s+active\s+subscription/i, code: "SUBSCRIPTION_INACTIVE" },
  { pattern: /invalid\s+plan\s+pricing/i, code: "INVALID_PLAN_PRICING" },
];

/**
 * Decode an arbitrary error-ish input into a structured billing
 * descriptor. Returns null if nothing billing-related matches —
 * callers should fall back to the generic <ErrorDisplay> in that
 * case.
 */
export function detectBillingError(
  input: ApolloError | Error | string | null | undefined,
): BillingErrorInfo | null {
  if (!input) return null;

  // 1. Pure string (e.g. AiEvent.error)
  if (typeof input === "string") return matchByMessage(input);

  // 2. ApolloError or generic Error
  const err = input as ApolloError;
  const graphqlErrors = (err.graphQLErrors ?? []) as ReadonlyArray<{
    message: string;
    extensions?: Record<string, unknown>;
  }>;

  for (const g of graphqlErrors) {
    const ext = (g.extensions ?? {}) as Record<string, unknown>;
    const code = typeof ext.code === "string" ? (ext.code as string) : null;
    if (code && code in CODE_TO_INFO) {
      const billingCode = code as BillingErrorCode;
      return {
        code: billingCode,
        ...CODE_TO_INFO[billingCode],
        details:
          typeof ext.details === "object" && ext.details !== null
            ? (ext.details as Record<string, unknown>)
            : undefined,
      };
    }
    // Fall back to message-substring for cases where the resolver
    // raised a stock BadRequest without a billing code.
    const fromMessage = matchByMessage(g.message);
    if (fromMessage) return fromMessage;
  }

  // 3. Network HTTP 402 — treat as INSUFFICIENT_CREDITS by convention
  const networkErr = err.networkError as
    | (Error & { statusCode?: number; status?: number })
    | null
    | undefined;
  const status = networkErr?.statusCode ?? networkErr?.status;
  if (status === 402) {
    return { code: "INSUFFICIENT_CREDITS", ...CODE_TO_INFO.INSUFFICIENT_CREDITS };
  }

  // 4. Last resort — substring match on the top-level message
  return matchByMessage(err.message);
}

function matchByMessage(message: string | undefined | null): BillingErrorInfo | null {
  if (!message) return null;
  for (const { pattern, code } of MESSAGE_PATTERNS) {
    if (pattern.test(message)) {
      return { code, ...CODE_TO_INFO[code] };
    }
  }
  return null;
}

/**
 * Convenience extractor for the INSUFFICIENT_CREDITS detail payload.
 * The backend includes `{ required, available }` in the GraphQL
 * extension's `details` block — this normalises whatever shape comes
 * back into typed numbers (or null).
 */
export function extractCreditShortfall(info: BillingErrorInfo): {
  required: number | null;
  available: number | null;
} {
  const details = info.details ?? {};
  const required = typeof details.required === "number" ? details.required : null;
  const available = typeof details.available === "number" ? details.available : null;
  return { required, available };
}
