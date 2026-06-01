import { useEffect } from "react";
import { useQuery } from "@apollo/client";

import {
  GET_CREDIT_BALANCE,
  type CreditBalance,
  type GetCreditBalanceResult,
} from "@/graphql/operations/credits";
import { useUserAuth } from "@/contexts/UserAuthProvider";

/**
 * Wraps `creditBalance` with auth-context awareness. The backend
 * routes balance lookup off the JWT (user vs `selectedCompanyId`),
 * so when the user switches between Personal and a Company we need
 * to refetch — Apollo's cache key (no args) would otherwise return
 * stale data.
 *
 * Returns:
 *   - `balance`: the typed CreditBalance row, or null while loading /
 *     when the user has no record yet.
 *   - `loading` / `error`: standard Apollo passthrough.
 *   - `refetch`: manual trigger, e.g. after Stripe checkout returns
 *     and we want the new pack to show up immediately.
 */
export function useCreditBalance() {
  const { user, isLoggedIn } = useUserAuth();
  const accountKey = `${user?.id ?? ""}:${user?.selectedCompanyId ?? "personal"}`;

  const { data, loading, error, refetch } = useQuery<GetCreditBalanceResult>(
    GET_CREDIT_BALANCE,
    {
      skip: !isLoggedIn,
      fetchPolicy: "cache-and-network",
      // Don't suppress the error — components may want to render a
      // small inline failure note instead of pretending balance is 0.
      errorPolicy: "all",
    },
  );

  // Refetch when the auth context flips between Personal and a
  // Company. We can't put `accountKey` into the variables because
  // the query has no args — instead we let Apollo cache the result
  // under the auth header and just trigger a fresh fetch on change.
  useEffect(() => {
    if (isLoggedIn) {
      void refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountKey]);

  const balance: CreditBalance | null = data?.creditBalance ?? null;
  return { balance, loading, error, refetch };
}
