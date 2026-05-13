import { gql } from "@apollo/client";

/**
 * Calendar / events queries. We use the *unified* events feed from
 * aiqlick-backend (the same one aiqlick-frontend's calendar page
 * consumes) so the meeting client sees both `MEETING` and
 * `INTERVIEW` events without any join logic on the client. Field
 * set mirrors `CALENDAR_EVENT_FIELDS` in
 * aiqlick-frontend/graphql/operations/calendar/queries.ts so the
 * backend resolver doesn't have to grow a new projection.
 */

const CALENDAR_EVENT_FIELDS = `
  id
  type
  title
  description
  scheduledAt
  endTime
  duration
  timezone
  status
  meetingUrl
  meetingId
  interviewId
  bookingId
  candidateName
  jobTitle
  companyId
  companyName
  organizerName
  organizerEmail
  myResponseStatus
  isOrganizer
  location
`;

export const GET_UPCOMING_EVENTS = gql`
  query GetUpcomingEvents($input: UpcomingEventsInput) {
    upcomingEvents(input: $input) {
      ${CALENDAR_EVENT_FIELDS}
    }
  }
`;

export const GET_MY_CALENDAR = gql`
  query GetMyCalendar($input: MyCalendarInput!) {
    myCalendar(input: $input) {
      from
      to
      meetingCount
      interviewCount
      events {
        ${CALENDAR_EVENT_FIELDS}
      }
    }
  }
`;

export type EventType = "MEETING" | "INTERVIEW";

export interface CalendarEvent {
  id: string;
  type: EventType;
  title: string;
  description: string | null;
  scheduledAt: string;
  endTime: string | null;
  duration: number | null;
  timezone: string | null;
  status: string;
  meetingUrl: string | null;
  meetingId: string | null;
  interviewId: string | null;
  bookingId: string | null;
  candidateName: string | null;
  jobTitle: string | null;
  companyId: string | null;
  companyName: string | null;
  organizerName: string | null;
  organizerEmail: string | null;
  myResponseStatus: string | null;
  isOrganizer: boolean;
  location: string | null;
}

export interface UpcomingEventsResult {
  upcomingEvents: CalendarEvent[];
}

export interface MyCalendarResult {
  myCalendar: {
    from: string;
    to: string;
    meetingCount: number;
    interviewCount: number;
    events: CalendarEvent[];
  };
}
