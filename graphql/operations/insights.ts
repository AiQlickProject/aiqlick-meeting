import { gql } from "@apollo/client";

/**
 * AI Meeting Insights. The aiqlick-frontend hook
 * `useMeetingInsights` plumbs progress events through a streaming AI
 * gateway; we keep the wrapper simpler — kick off generation with
 * `initializeMeetingInsight` and poll `latestMeetingInsight` until it
 * lands on COMPLETED or FAILED.
 *
 * Selection set mirrors `GET_LATEST_MEETING_INSIGHT` from
 * aiqlick-frontend/graphql/operations/meetingInsights/queries.ts.
 */

export const GET_LATEST_MEETING_INSIGHT = gql`
  query GetLatestMeetingInsight($meetingId: ID!) {
    latestMeetingInsight(meetingId: $meetingId) {
      id
      version
      status
      fullReport
      skillsAssessment
      communicationAnalysis
      keyTopicsSummary
      redFlagsAndConcerns
      generatedAt
      transcriptLength
      llmModel
      llmTokensUsed
      processingTimeMs
      errorMessage
      createdAt
    }
  }
`;

export const INITIALIZE_MEETING_INSIGHT = gql`
  mutation InitializeMeetingInsight($input: GenerateMeetingInsightInput!) {
    initializeMeetingInsight(input: $input) {
      id
      status
      version
      meetingId
      interviewId
      createdAt
    }
  }
`;

export type InsightStatus =
  | "PENDING"
  | "GENERATING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "STALE";

export interface MeetingInsight {
  id: string;
  version: number;
  status: InsightStatus;
  fullReport: string | null;
  skillsAssessment: string | null;
  communicationAnalysis: string | null;
  keyTopicsSummary: string | null;
  redFlagsAndConcerns: string | null;
  generatedAt: string | null;
  transcriptLength: number | null;
  llmModel: string | null;
  llmTokensUsed: number | null;
  processingTimeMs: number | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface GetLatestMeetingInsightResult {
  latestMeetingInsight: MeetingInsight | null;
}

export interface InitializeMeetingInsightResult {
  initializeMeetingInsight: {
    id: string;
    status: InsightStatus;
    version: number;
    meetingId: string;
    interviewId: string | null;
    createdAt: string;
  };
}

export interface GenerateMeetingInsightInput {
  meetingId: string;
  interviewId?: string | null;
}
