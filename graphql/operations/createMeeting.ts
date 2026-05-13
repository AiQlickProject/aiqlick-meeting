import { gql } from "@apollo/client";

/**
 * Create-meeting mutation. Mirrors `CREATE_MEETING` in
 * aiqlick-frontend/graphql/operations/interview/mutations.ts — same
 * `CreateMeetingInput` shape so the backend resolver requires no
 * changes. Recurrence info is passed through `metadata.recurrence`
 * exactly as the frontend does (the backend stores it as a JSON
 * blob and the client expands it on render).
 */

export const CREATE_MEETING = gql`
  mutation CreateMeeting($input: CreateMeetingInput!) {
    createMeeting(input: $input) {
      id
      title
      description
      type
      status
      roomName
      meetingUrl
      scheduledAt
      endTime
      duration
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
      }
    }
  }
`;

export type MeetingType =
  | "GENERAL"
  | "ONE_ON_ONE"
  | "ALL_HANDS"
  | "TRAINING"
  | "PANEL";

export type AttendeeRole = "PARTICIPANT" | "GUEST" | "ORGANIZER";

export type RecurrenceType =
  | "NONE"
  | "DAILY"
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY";

export interface RecurrenceMetadata {
  type: RecurrenceType;
  days?: number[]; // 0=Sun..6=Sat (WEEKLY/BIWEEKLY only)
  endType: "OCCURRENCES" | "UNTIL";
  occurrences?: number;
  endDate?: string; // ISO date
}

export interface CreateMeetingAttendee {
  email: string;
  name?: string;
  role?: AttendeeRole;
}

export interface CreateMeetingInput {
  title: string;
  description?: string;
  type?: MeetingType;
  companyId?: string | null;
  scheduledAt?: string; // ISO
  duration?: number; // minutes
  timezone?: string; // IANA
  attendees?: CreateMeetingAttendee[];
  metadata?: {
    createdFrom: "meeting-client";
    createdAt: string;
    recurrence?: RecurrenceMetadata;
  };
  interviewBookingId?: string | null;
}

export interface CreateMeetingResult {
  createMeeting: {
    id: string;
    title: string;
    description: string | null;
    type: MeetingType;
    status: string;
    roomName: string | null;
    meetingUrl: string | null;
    scheduledAt: string;
    endTime: string | null;
    duration: number | null;
    organizer: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    } | null;
    attendees: Array<{
      id: string;
      email: string | null;
      name: string | null;
      role: string | null;
    }>;
  };
}
