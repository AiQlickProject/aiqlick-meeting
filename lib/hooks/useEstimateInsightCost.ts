import { useMemo } from "react";
import { useQuery } from "@apollo/client";

import {
  GET_ACTIVE_CREDIT_COST_CONFIGS,
  GET_BILLING_SETTINGS,
  type GetActiveCreditCostConfigsResult,
  type GetBillingSettingsResult,
} from "@/graphql/operations/credits";
import {
  estimateInsightCost,
  type EstimateResult,
} from "@/lib/billing/estimateInsightCost";

/**
 * Combines `activeCreditCostConfigs` + `billingSettings` queries with
 * the pure `estimateInsightCost` util so callers can hand in a
 * transcript char count and get a credits estimate back.
 *
 * The two queries are intentionally fetched with `cache-first` — they
 * change rarely (admin-managed config) and we don't want every
 * regenerate-confirm modal open to hit the network. Apollo will
 * still serve from cache across remounts.
 *
 * If either query hasn't returned yet, `estimate` is null (loading).
 * Callers can render a spinner or fall back to a generic "Charge
 * applies" copy until it lands.
 */
export function useEstimateInsightCost(transcriptChars: number | null | undefined) {
  const { data: configsData, loading: configsLoading } =
    useQuery<GetActiveCreditCostConfigsResult>(GET_ACTIVE_CREDIT_COST_CONFIGS, {
      fetchPolicy: "cache-first",
      errorPolicy: "ignore",
    });

  const { data: billingData, loading: billingLoading } =
    useQuery<GetBillingSettingsResult>(GET_BILLING_SETTINGS, {
      fetchPolicy: "cache-first",
      errorPolicy: "ignore",
    });

  const estimate: EstimateResult | null = useMemo(() => {
    if (transcriptChars == null) return null;
    if (configsLoading || billingLoading) return null;
    return estimateInsightCost({
      transcriptChars,
      configs: configsData?.activeCreditCostConfigs ?? [],
      billing: billingData?.billingSettings ?? null,
    });
  }, [transcriptChars, configsData, billingData, configsLoading, billingLoading]);

  return {
    estimate,
    loading: configsLoading || billingLoading,
  };
}
