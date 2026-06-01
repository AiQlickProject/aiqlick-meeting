import { gql } from "@apollo/client";

/**
 * Calendar / events queries.
 *
 * Previously we consumed the unified `myCalendar` / `upcomingEvents`
 * feed from the backend. That feed pre-filtered by status and dropped
 * interview-linked meetings on the meeting side, which made the
 * in-app calendar miss anything that wasn't "upcoming + scheduled".
 *
 * For now the meetings client fetches `myMeetings` and `myInterviews`
 * directly and merges them client-side — same data the frontend's
 * standalone meetings and interviews pages use. The UI still consumes
 * the `CalendarEvent` shape, so the call sites convert raw rows into
 * that shape via the helpers at the bottom of this file.
 */

const MY_MEETINGS_FIELDS = `
  id
  interviewBookingId
  title
  description
  status
  scheduledAt
  endTime
  duration
  timezone
  meetingUrl
  roomName
  organizerId
  companyId
  organizer {
    id
    firstName
    lastName
    email
  }
  company {
    id
    companyName
  }
  attendees {
    id
    userId
    email
    role
    responseStatus
  }
`;

export const GET_MY_MEETINGS = gql`
  query GetMyMeetings($input: ListMeetingsInput) {
    myMeetings(input: $input) {
      ${MY_MEETINGS_FIELDS}
    }
  }
`;

export const GET_MY_INTERVIEWS = gql`
  query GetMyInterviews($input: MyInterviewsFilterInput) {
    myInterviews(input: $input) {
      edges {
        node {
          id
          interviewId
          meetingUrl
          status
          scheduledAt
          endTime
          duration
          timezone
          interview {
            id
            candidate {
              id
              user {
                firstName
                lastName
                email
              }
            }
            job {
              id
              title
              hiringCompany {
                id
                companyName
              }
            }
          }
          organizer {
            id
            firstName
            lastName
            email
          }
          attendees {
            id
            email
            name
            role
            responseStatus
            userId
          }
          meeting {
            id
            meetingUrl
            roomName
            companyId
          }
        }
      }
      totalCount
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

export interface MyMeeting {
  id: string;
  interviewBookingId: string | null;
  title: string;
  description: string | null;
  status: string;
  scheduledAt: string;
  endTime: string | null;
  duration: number | null;
  timezone: string | null;
  meetingUrl: string | null;
  roomName: string | null;
  organizerId: string;
  companyId: string | null;
  organizer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  company: {
    id: string;
    companyName: string | null;
  } | null;
  attendees: Array<{
    id: string;
    userId: string | null;
    email: string | null;
    role: string | null;
    responseStatus: string | null;
  }>;
}

export interface MyInterviewBooking {
  id: string;
  interviewId: string;
  meetingUrl: string | null;
  status: string;
  scheduledAt: string;
  endTime: string | null;
  duration: number | null;
  timezone: string | null;
  interview: {
    id: string;
    candidate: {
      id: string;
      user: {
        firstName: string | null;
        lastName: string | null;
        email: string | null;
      } | null;
    } | null;
    job: {
      id: string;
      title: string | null;
      hiringCompany: {
        id: string;
        companyName: string | null;
      } | null;
    } | null;
  } | null;
  organizer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  attendees: Array<{
    id: string;
    userId: string | null;
    email: string | null;
    name: string | null;
    role: string | null;
    responseStatus: string | null;
  }>;
  meeting: {
    id: string;
    meetingUrl: string | null;
    roomName: string | null;
    companyId: string | null;
  } | null;
}

export interface MyMeetingsResult {
  myMeetings: MyMeeting[];
}

export interface MyInterviewsResult {
  myInterviews: {
    edges: Array<{ node: MyInterviewBooking }>;
    totalCount: number;
  };
}

/**
 * Build the `myResponseStatus` / `isOrganizer` fields from the raw
 * attendee list and the current user's id / email. The unified
 * calendar feed used to compute these on the server; we replicate the
 * logic client-side now that we read the bare entities directly.
 */
function attendeeContext(
  attendees: Array<{ userId: string | null; email: string | null; responseStatus: string | null }>,
  organizerId: string | null,
  currentUserId: string | null | undefined,
  currentUserEmail: string | null | undefined,
): { myResponseStatus: string | null; isOrganizer: boolean } {
  const isOrganizer =
    !!currentUserId && !!organizerId && currentUserId === organizerId;
  const me = attendees.find(
    (a) =>
      (currentUserId && a.userId === currentUserId) ||
      (currentUserEmail &&
        a.email &&
        a.email.toLowerCase() === currentUserEmail.toLowerCase()),
  );
  return {
    myResponseStatus: isOrganizer ? "ACCEPTED" : me?.responseStatus ?? null,
    isOrganizer,
  };
}

function fullName(p: { firstName: string | null; lastName: string | null } | null): string | null {
  if (!p) return null;
  const joined = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
  return joined.length > 0 ? joined : null;
}

export function meetingToCalendarEvent(
  m: MyMeeting,
  user: { id?: string | null; email?: string | null } | null | undefined,
): CalendarEvent {
  const { myResponseStatus, isOrganizer } = attendeeContext(
    m.attendees,
    m.organizerId,
    user?.id ?? null,
    user?.email ?? null,
  );
  // Meetings with a linked interview booking are surfaced as INTERVIEW
  // type so they line up with the user's mental model — the meetings
  // pill shouldn't include rows that originated from a scheduled
  // interview.
  const type: EventType = m.interviewBookingId ? "INTERVIEW" : "MEETING";
  return {
    id: type === "INTERVIEW" ? `interview-${m.interviewBookingId}` : `meeting-${m.id}`,
    type,
    title: m.title,
    description: m.description,
    scheduledAt: m.scheduledAt,
    endTime: m.endTime,
    duration: m.duration,
    timezone: m.timezone,
    status: m.status,
    meetingUrl: m.meetingUrl,
    meetingId: m.id,
    interviewId: m.interviewBookingId,
    bookingId: m.interviewBookingId,
    candidateName: null,
    jobTitle: null,
    companyId: m.companyId,
    companyName: m.company?.companyName ?? null,
    organizerName: fullName(m.organizer),
    organizerEmail: m.organizer?.email ?? null,
    myResponseStatus,
    isOrganizer,
    location: null,
  };
}

export function interviewToCalendarEvent(
  b: MyInterviewBooking,
  user: { id?: string | null; email?: string | null } | null | undefined,
): CalendarEvent {
  const { myResponseStatus, isOrganizer } = attendeeContext(
    b.attendees,
    b.organizer?.id ?? null,
    user?.id ?? null,
    user?.email ?? null,
  );
  const candidateUser = b.interview?.candidate?.user;
  const candidateName = candidateUser
    ? `${candidateUser.firstName ?? ""} ${candidateUser.lastName ?? ""}`.trim() || null
    : null;
  return {
    id: `interview-${b.id}`,
    type: "INTERVIEW",
    // myInterviews has no `title` column — synthesise something
    // descriptive enough for the list view, matching the backend's
    // calendar interview mapper.
    title: candidateName && b.interview?.job?.title
      ? `Interview: ${candidateName} for ${b.interview.job.title}`
      : candidateName
        ? `Interview with ${candidateName}`
        : b.interview?.job?.title
          ? `Interview for ${b.interview.job.title}`
          : "Interview",
    description: null,
    scheduledAt: b.scheduledAt,
    endTime: b.endTime,
    duration: b.duration,
    timezone: b.timezone,
    status: b.status,
    meetingUrl: b.meetingUrl ?? b.meeting?.meetingUrl ?? null,
    meetingId: b.meeting?.id ?? null,
    interviewId: b.interview?.id ?? null,
    bookingId: b.id,
    candidateName,
    jobTitle: b.interview?.job?.title ?? null,
    companyId: b.interview?.job?.hiringCompany?.id ?? b.meeting?.companyId ?? null,
    companyName: b.interview?.job?.hiringCompany?.companyName ?? null,
    organizerName: fullName(b.organizer),
    organizerEmail: b.organizer?.email ?? null,
    myResponseStatus,
    isOrganizer,
    location: null,
  };
}
