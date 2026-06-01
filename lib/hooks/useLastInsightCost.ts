import { useMemo } from "react";
import { useQuery } from "@apollo/client";

import {
  GET_AI_OPERATION_LOGS,
  type AIOperationLog,
  type GetAiOperationLogsResult,
} from "@/graphql/operations/credits";

/**
 * Fetches the most recent SUCCESSFUL MEETING_INSIGHT operation log
 * for a given meeting so the UI can show "Last regenerate: 0.13 cr"
 * in the meta row.
 *
 * Implementation note: the backend's `AIOperationLogFilterInput`
 * supports `operationType` + `status` + date range + `limit` /
 * `offset` — but NOT `referenceId`. So we fetch up to 50 recent
 * SUCCESSFUL MEETING_INSIGHTs for the current auth context and pick
 * the one whose `referenceId` matches client-side.
 *
 * For very high-volume users (>50 regenerates across all meetings
 * before the one we want), this falls back to `null`. Adding
 * `referenceId` to the backend filter is part of the handoff (TODO).
 *
 * Returns `null` if the user has no matching log entry.
 */
export function useLastInsightCost(meetingId: string | null | undefined) {
  const { data, loading, refetch } = useQuery<GetAiOperationLogsResult>(
    GET_AI_OPERATION_LOGS,
    {
      variables: {
        filter: {
          operationType: "MEETING_INSIGHT",
          status: "SUCCESS",
          limit: 50,
        },
      },
      skip: !meetingId,
      fetchPolicy: "cache-and-network",
      errorPolicy: "ignore",
    },
  );

  const log: AIOperationLog | null = useMemo(() => {
    if (!meetingId) return null;
    const logs = data?.aiOperationLogs ?? [];
    return logs.find((l) => l.referenceId === meetingId) ?? null;
  }, [data, meetingId]);

  return { log, loading, refetch };
}
