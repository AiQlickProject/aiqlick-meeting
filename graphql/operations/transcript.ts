import { gql } from "@apollo/client";

/**
 * Meeting transcript queries. The backend stores each utterance as a
 * `Transcription` row keyed by meeting id (Jitsi room name). Two
 * shapes are exposed:
 *
 *   - `transcriptText(meetingId)` — server-formatted whole transcript
 *      `[HH:MM:SS] Speaker: text` joined by newlines. Cheapest path
 *      for the "view + download" use case on the detail page.
 *   - `transcriptionsByMeeting(meetingId, limit, offset)` — raw
 *      segments. Use when we need timestamp/speaker chips or live
 *      polling. Not wired here yet — kept as a follow-up if the
 *      simple text view isn't enough.
 *
 * No subscription on the backend — there's no live event stream for
 * transcripts. Refresh on demand (Apollo refetch) or via Apollo
 * polling. Authorization: any meeting attendee (organizer, candidate,
 * interviewer), enforced by `verifyMeetingAccess`.
 */

// Backend signature: `transcriptText(meetingId: String!)` — NOT `ID!`.
// The resolver registers `@Args('meetingId')` without an explicit
// `{ type: () => ID }`, so NestJS infers String. Variable type below
// must match, otherwise GraphQL validation rejects the request with
// "used in position expecting type String!".
export const GET_MEETING_TRANSCRIPT = gql`
  query GetMeetingTranscript($meetingId: String!) {
    transcriptText(meetingId: $meetingId) {
      meetingId
      transcript
      segmentCount
    }
  }
`;

export interface GetMeetingTranscriptResult {
  transcriptText: {
    meetingId: string;
    transcript: string;
    segmentCount: number;
  } | null;
}
