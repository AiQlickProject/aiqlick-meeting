import { gql } from "@apollo/client";

/**
 * Full meeting / interview detail. We don't know which kind we have
 * until the calendar query returns the event, so the detail page
 * issues whichever query is appropriate based on `event.type`.
 * Field set mirrors `GET_MEETING_BY_ID` and `GET_INTERVIEW_BOOKING`
 * in aiqlick-frontend.
 *
 * `GET_MY_MEETING_LINK` is the **per-user, freshly-signed** join URL.
 * The `meetingUrl` cached on the meeting record itself is whatever
 * was generated when the meeting was created — that JWT is short-
 * lived (24h) and is *always* stale by the time anyone clicks Join.
 * Calling this query on each join request gets a brand-new JWT for
 * the *current* signed-in user and avoids the
 * `JWT error: Not acceptable by exp` Prosody rejection we'd otherwise
 * hit. Mirrors `GET_MY_MEETING_LINK` in aiqlick-frontend.
 */

export const GET_MY_MEETING_LINK = gql`
  query GetMyMeetingLink($meetingId: ID!) {
    getMyMeetingLink(meetingId: $meetingId) {
      meetingUrl
      roomName
    }
  }
`;

export interface GetMyMeetingLinkResult {
  getMyMeetingLink: {
    meetingUrl: string;
    roomName: string | null;
  } | null;
}

export const GET_MEETING_BY_ID = gql`
  query GetMeetingById($id: ID!) {
    meeting(id: $id) {
      id
      roomName
      meetingUrl
      title
      description
      status
      scheduledAt
      duration
      interviewBookingId
      organizerId
      metadata
      createdAt
      updatedAt
      organizer {
        id
        firstName
        lastName
        email
        profileImageUrl
      }
      attendees {
        id
        email
        name
        role
        responseStatus
        user {
          id
          firstName
          lastName
          profileImageUrl
        }
      }
      # The backend initializeMeetingInsight mutation expects
      # interviewId to be an Interview.id, NOT an
      # InterviewBooking.id. We previously passed
      # meeting.interviewBookingId directly, which 404'd with
      # "Interview not found" on every regenerate of an
      # interview-linked meeting. Fetch the real Interview.id
      # via the booking relation so the mutation works.
      interviewBooking {
        id
        interviewId
      }
    }
  }
`;

export interface MeetingDetail {
  id: string;
  roomName: string | null;
  meetingUrl: string | null;
  title: string;
  description: string | null;
  status: string;
  scheduledAt: string;
  duration: number | null;
  interviewBookingId: string | null;
  organizerId: string | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  organizer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl: string | null;
  } | null;
  attendees: Array<{
    id: string;
    email: string | null;
    name: string | null;
    role: string | null;
    responseStatus: string | null;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      profileImageUrl: string | null;
    } | null;
  }>;
  /**
   * The InterviewBooking row this meeting is linked to (null for
   * general/ad-hoc meetings). We need `interviewId` from it because
   * the backend's `initializeMeetingInsight` mutation validates
   * `Interview.id`, not `InterviewBooking.id`.
   */
  interviewBooking: {
    id: string;
    interviewId: string;
  } | null;
}

export interface MeetingDetailResult {
  meeting: MeetingDetail | null;
}
