import { gql } from "@apollo/client";

/**
 * Credit / billing GraphQL operations for the meeting client.
 *
 * The backend resolvers auto-route on the JWT's auth context — there
 * is no `companyId` arg on these queries; whoever calls is the one
 * whose balance is checked / consumed. That matches the user
 * expectation that "the person clicking Regenerate is the one billed,
 * not the meeting organizer." When the user has a `selectedCompanyId`
 * in EMPLOYER view-mode the company wallet is charged; otherwise the
 * personal balance is charged. We don't have to encode that here.
 *
 * Buy-credits is handled by deep-linking to the main aiqlick web app
 * (`app.aiqlick.com/userprofile/credits`) — see Phase C — so the
 * `creditPacks` / `purchaseCreditPack` ops live on the main app, not
 * in this file.
 */

export const GET_CREDIT_BALANCE = gql`
  query GetCreditBalance {
    creditBalance {
      id
      balance
      totalEarned
      totalConsumed
      lastReplenishedAt
      updatedAt
    }
  }
`;

export interface CreditBalance {
  id: string;
  balance: number;
  totalEarned: number;
  totalConsumed: number;
  lastReplenishedAt: string | null;
  updatedAt: string;
}

export interface GetCreditBalanceResult {
  creditBalance: CreditBalance | null;
}

/**
 * All active CreditCostConfig rows. We filter client-side for
 * `operationType === "MEETING_INSIGHT"` (preferring an op-specific
 * row) and fall back to the model-wide default (operationType null).
 *
 * `markupPercent` on each row is row-level; if it's 0 we apply the
 * platform-wide default from `billingSettings.defaultMarkupPercent`.
 */
export const GET_ACTIVE_CREDIT_COST_CONFIGS = gql`
  query GetActiveCreditCostConfigs {
    activeCreditCostConfigs {
      id
      modelId
      displayName
      operationType
      inputCostPer1k
      outputCostPer1k
      flatCostPerCall
      markupPercent
      isActive
    }
  }
`;

export interface CreditCostConfig {
  id: string;
  modelId: string;
  displayName: string;
  operationType: string | null;
  inputCostPer1k: number;
  outputCostPer1k: number;
  flatCostPerCall: number;
  markupPercent: number;
  isActive: boolean;
}

export interface GetActiveCreditCostConfigsResult {
  activeCreditCostConfigs: CreditCostConfig[];
}

export const GET_BILLING_SETTINGS = gql`
  query GetBillingSettings {
    billingSettings {
      defaultMarkupPercent
      billingEnabled
    }
  }
`;

export interface BillingSettings {
  defaultMarkupPercent: number;
  billingEnabled: boolean;
}

export interface GetBillingSettingsResult {
  billingSettings: BillingSettings;
}

/**
 * Recent AIOperationLog entries — used to display "Last regenerate
 * cost X credits" on the insight card. We filter to MEETING_INSIGHT
 * for the current meeting via `referenceId`.
 *
 * Auth context: scoped to the current user's selectedCompanyId in
 * EMPLOYER view-mode; personal otherwise.
 */
export const GET_AI_OPERATION_LOGS = gql`
  query GetAiOperationLogs($filter: AIOperationLogFilterInput) {
    aiOperationLogs(filter: $filter) {
      id
      operationType
      referenceId
      modelId
      inputTokens
      outputTokens
      totalTokens
      creditsCost
      durationMs
      status
      createdAt
    }
  }
`;

export type AIOperationStatus =
  | "SUCCESS"
  | "FAILED"
  | "INSUFFICIENT_CREDITS"
  | "PLAN_LIMIT_EXCEEDED"
  | "SUBSCRIPTION_INACTIVE"
  | "RATE_LIMITED";

export interface AIOperationLog {
  id: string;
  operationType: string;
  referenceId: string | null;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  creditsCost: number;
  durationMs: number | null;
  status: AIOperationStatus;
  createdAt: string;
}

export interface GetAiOperationLogsResult {
  aiOperationLogs: AIOperationLog[];
}
