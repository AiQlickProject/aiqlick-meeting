import { useApolloClient, useQuery } from "@apollo/client";
import {
  ArrowLeft,
  Briefcase,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Pencil,
  Link as LinkIcon,
  Mail,
  Trash2,
  User,
  Video,
} from "@tamagui/lucide-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Platform } from "react-native";
import { ScrollView, View, XStack, YStack, Text } from "tamagui";

import AuthGuard from "@/components/AuthGuard";
import { useUserAuth } from "@/contexts/UserAuthProvider";
import { TWAvatar } from "@/components/ux/TWAvatar";
import { TWButton } from "@/components/ux/TWButton";
import {
  TWCard,
  TWCardBody,
  TWCardHeader,
  TWDivider,
} from "@/components/ux/TWCard";
import { TWChip } from "@/components/ux/TWChip";
import {
  GET_MEETING_BY_ID,
  GET_MY_MEETING_LINK,
  type GetMyMeetingLinkResult,
  type MeetingDetail,
  type MeetingDetailResult,
} from "@/graphql/operations/meetingDetail";
import { aiqlickTokens } from "@/tamagui.config";

/**
 * Meeting / Interview detail page. Mirrors
 * aiqlick-frontend/app/company/calendar/[meetingId]/page.tsx —
 * top action bar, header card with status chip, two-column body
 * (Schedule + Access), full-width Attendees card, and slots for
 * AI Insights and Transcription which the in-meeting client will
 * populate as separate sub-components later.
 *
 * For now we only call `GET_MEETING_BY_ID` — interviews funnel
 * through the same backend resolver. If the user opens a booking-
 * only record this query returns null and we show a friendly fallback.
 */
export default function MeetingDetailPage() {
  return (
    <AuthGuard>
      <Inner />
    </AuthGuard>
  );
}

function Inner() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const rawId = Array.isArray(id) ? id[0] : id;
  // The calendar feed produces composite ids (`meeting-<uuid>` /
  // `interview-<uuid>`). The detail query takes the raw UUID, so we
  // strip the type prefix defensively here too — that way an old
  // bookmark / shared link that still carries the prefix resolves.
  const meetingId = rawId?.replace(/^(meeting|interview|booking)-/i, "") ?? null;
  const { user } = useUserAuth();

  const { data, loading, error } = useQuery<MeetingDetailResult>(
    GET_MEETING_BY_ID,
    {
      variables: { id: meetingId },
      fetchPolicy: "cache-and-network",
      skip: !meetingId,
    },
  );

  const meeting = data?.meeting ?? null;

  return (
    <YStack flex={1} backgroundColor={aiqlickTokens.gray50}>
      {/* App bar (same look as the dashboard for visual continuity) */}
      <XStack
        height={56}
        paddingHorizontal={20}
        alignItems="center"
        justifyContent="space-between"
        backgroundColor={aiqlickTokens.surface}
        borderBottomWidth={1}
        borderColor={aiqlickTokens.gray200}
      >
        <XStack alignItems="center" gap={10}>
          <TWButton
            variant="ghost"
            color="default"
            size="sm"
            isIconOnly
            icon={<ArrowLeft size={16} color={aiqlickTokens.gray700} />}
            onPress={() => router.back()}
          />
          <Text color={aiqlickTokens.gray700} fontSize={13} fontWeight="600">
            Back to calendar
          </Text>
        </XStack>
      </XStack>

      <ScrollView
        flex={1}
        contentContainerStyle={{ padding: 20, gap: 16, alignItems: "center" }}
      >
        <YStack width="100%" maxWidth={1080} gap={16}>
          {loading && !data && (
            <YStack alignItems="center" paddingVertical={48}>
              <ActivityIndicator color={aiqlickTokens.primary} />
            </YStack>
          )}

          {error && !meeting && (
            <View
              padding={16}
              borderRadius={12}
              backgroundColor={aiqlickTokens.dangerLight}
              borderWidth={1}
              borderColor="rgba(220, 38, 38, 0.3)"
            >
              <Text color={aiqlickTokens.danger} fontSize={13}>
                {error.message}
              </Text>
            </View>
          )}

          {!loading && !meeting && !error && (
            <NotFound onBack={() => router.replace("/")} />
          )}

          {meeting && (() => {
            // Edit / Complete / Cancel and the attendee-add button are
            // restricted to the organizer. The backend already enforces
            // this on every mutation; we hide the UI affordances so
            // non-organizers don't see (and tap) buttons that would
            // immediately error out.
            const isOrganizer =
              !!user?.id &&
              !!meeting.organizer?.id &&
              user.id === meeting.organizer.id;
            return (
              <>
                <HeaderCard meeting={meeting} />
                {isOrganizer && <ActionsCard meeting={meeting} />}
                <XStack gap={16} flexWrap="wrap">
                  <View flex={1} minWidth={320}>
                    <ScheduleCard meeting={meeting} />
                  </View>
                  <View flex={1} minWidth={320}>
                    <AccessCard meeting={meeting} />
                  </View>
                </XStack>
                <AttendeesCard meeting={meeting} isOrganizer={isOrganizer} />
                <InsightsSection />
                <TranscriptionSection />
              </>
            );
          })()}
        </YStack>
      </ScrollView>
    </YStack>
  );
}

function HeaderCard({ meeting }: { meeting: MeetingDetail }) {
  return (
    <TWCard shadow="sm">
      <TWCardBody gap={12}>
        <XStack alignItems="flex-start" justifyContent="space-between" gap={16}>
          <YStack flex={1} gap={6}>
            <Text color={aiqlickTokens.gray900} fontSize={20} fontWeight="700" numberOfLines={2}>
              {meeting.title || "Untitled meeting"}
            </Text>
            {meeting.roomName && (
              <Text color={aiqlickTokens.gray500} fontSize={12}>
                Room: {meeting.roomName}
              </Text>
            )}
            {meeting.description && (
              <Text color={aiqlickTokens.gray700} fontSize={13}>
                {meeting.description}
              </Text>
            )}
          </YStack>
          <TWChip
            label={(meeting.status ?? "").toUpperCase() || "—"}
            color={statusColor(meeting.status)}
            variant="flat"
            size="lg"
          />
        </XStack>
      </TWCardBody>
    </TWCard>
  );
}

function ActionsCard({ meeting }: { meeting: MeetingDetail }) {
  const canModify = !["CANCELLED", "COMPLETED"].includes(
    (meeting.status ?? "").toUpperCase(),
  );
  if (!canModify) return null;
  return (
    <TWCard shadow="sm">
      <TWCardBody>
        <XStack gap={10} flexWrap="wrap">
          <TWButton
            label="Edit Meeting"
            variant="flat"
            color="primary"
            size="sm"
            icon={<Pencil size={14} color={aiqlickTokens.primary} />}
            disabled
          />
          <TWButton
            label="Mark as Completed"
            variant="flat"
            color="success"
            size="sm"
            icon={<CheckCircle2 size={14} color={aiqlickTokens.success} />}
            disabled
          />
          <TWButton
            label="Cancel Meeting"
            variant="ghost"
            color="danger"
            size="sm"
            icon={<Trash2 size={14} color={aiqlickTokens.danger} />}
            disabled
          />
        </XStack>
      </TWCardBody>
    </TWCard>
  );
}

function ScheduleCard({ meeting }: { meeting: MeetingDetail }) {
  const start = new Date(meeting.scheduledAt);
  const date = start.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = start.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <TWCard shadow="sm">
      <TWCardHeader>
        <Text color={aiqlickTokens.gray900} fontSize={14} fontWeight="700">
          Schedule
        </Text>
      </TWCardHeader>
      <TWDivider />
      <TWCardBody gap={14}>
        <Row
          icon={<CalendarIcon size={18} color={aiqlickTokens.primary} />}
          label="Date & Time"
          primary={date}
          secondary={time}
        />
        <Row
          icon={<Clock size={18} color={aiqlickTokens.primary} />}
          label="Duration"
          primary={meeting.duration ? `${meeting.duration} minutes` : "—"}
        />
      </TWCardBody>
    </TWCard>
  );
}

function AccessCard({ meeting }: { meeting: MeetingDetail }) {
  const canJoin = !!meeting.meetingUrl;
  const apollo = useApolloClient();
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const onJoin = async () => {
    setJoining(true);
    setJoinError(null);
    try {
      // Always fetch a freshly-signed link rather than reusing the
      // 24h-stale JWT baked into `meeting.meetingUrl`.
      const { data } = await apollo.query<GetMyMeetingLinkResult>({
        query: GET_MY_MEETING_LINK,
        variables: { meetingId: meeting.id },
        fetchPolicy: "network-only",
      });
      const url = data.getMyMeetingLink?.meetingUrl;
      const parsed = url ? parseMeetingUrl(url) : null;
      if (!parsed) {
        setJoinError("Could not get a join link for this meeting.");
        return;
      }
      const qs = new URLSearchParams();
      if (parsed.jwt) qs.set("jwt", parsed.jwt);
      if (parsed.domain) qs.set("domain", parsed.domain);
      if (meeting.title) qs.set("subject", meeting.title);
      qs.set("meetingId", meeting.id);
      const target = `/${parsed.room}?${qs.toString()}`;
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.open(target, "_blank", "noopener,noreferrer");
      } else {
        router.push(target);
      }
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "Failed to start meeting.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <TWCard shadow="sm">
      <TWCardHeader>
        <Text color={aiqlickTokens.gray900} fontSize={14} fontWeight="700">
          Meeting Access
        </Text>
      </TWCardHeader>
      <TWDivider />
      <TWCardBody gap={14}>
        {canJoin ? (
          <>
            <Row
              icon={<Video size={18} color={aiqlickTokens.success} />}
              label="Meeting link ready"
              primary="Tap Join to enter the room"
            />
            <TWButton
              label="Join Meeting"
              variant="primary"
              color="primary"
              size="md"
              icon={<LinkIcon size={14} color="#fff" />}
              fullWidth
              isLoading={joining}
              onPress={onJoin}
            />
            {joinError && (
              <Text color={aiqlickTokens.danger} fontSize={12}>
                {joinError}
              </Text>
            )}
          </>
        ) : (
          <YStack alignItems="center" paddingVertical={20} gap={8}>
            <LinkIcon size={28} color={aiqlickTokens.gray300} />
            <Text color={aiqlickTokens.gray500} fontSize={12}>
              No meeting link available
            </Text>
          </YStack>
        )}
        {meeting.organizer && (
          <YStack gap={8} paddingTop={12} borderTopWidth={1} borderColor={aiqlickTokens.gray100}>
            <Text color={aiqlickTokens.gray500} fontSize={11} fontWeight="600" letterSpacing={1}>
              ORGANIZED BY
            </Text>
            <XStack alignItems="center" gap={10}>
              <TWAvatar
                name={`${meeting.organizer.firstName} ${meeting.organizer.lastName}`}
                src={meeting.organizer.profileImageUrl}
                size="sm"
              />
              <YStack flex={1}>
                <Text color={aiqlickTokens.gray900} fontSize={13} fontWeight="600">
                  {meeting.organizer.firstName} {meeting.organizer.lastName}
                </Text>
                <Text color={aiqlickTokens.gray500} fontSize={11}>
                  {meeting.organizer.email}
                </Text>
              </YStack>
            </XStack>
          </YStack>
        )}
      </TWCardBody>
    </TWCard>
  );
}

function AttendeesCard({
  meeting,
  isOrganizer,
}: {
  meeting: MeetingDetail;
  isOrganizer: boolean;
}) {
  return (
    <TWCard shadow="sm">
      <TWCardHeader>
        <Text color={aiqlickTokens.gray900} fontSize={14} fontWeight="700">
          Attendees ({meeting.attendees.length})
        </Text>
        {isOrganizer && (
          <TWButton
            label="Add Attendee"
            variant="flat"
            color="primary"
            size="sm"
            disabled
          />
        )}
      </TWCardHeader>
      <TWDivider />
      <TWCardBody>
        {meeting.attendees.length === 0 ? (
          <Text color={aiqlickTokens.gray500} fontSize={12} textAlign="center" paddingVertical={20}>
            No attendees added yet
          </Text>
        ) : (
          <YStack gap={10}>
            {meeting.attendees.map((a) => {
              const displayName =
                a.name ??
                (a.user ? `${a.user.firstName} ${a.user.lastName}` : null) ??
                a.email ??
                "Guest";
              return (
                <XStack
                  key={a.id}
                  alignItems="center"
                  gap={10}
                  padding={10}
                  borderRadius={aiqlickTokens.radiusLg}
                  borderWidth={1}
                  borderColor={aiqlickTokens.gray200}
                >
                  <TWAvatar
                    name={displayName}
                    src={a.user?.profileImageUrl}
                    size="sm"
                  />
                  <YStack flex={1} gap={2}>
                    <Text color={aiqlickTokens.gray900} fontSize={13} fontWeight="600">
                      {displayName}
                    </Text>
                    {a.email && (
                      <XStack alignItems="center" gap={4}>
                        <Mail size={11} color={aiqlickTokens.gray400} />
                        <Text color={aiqlickTokens.gray500} fontSize={11}>
                          {a.email}
                        </Text>
                      </XStack>
                    )}
                  </YStack>
                  {a.role && (
                    <TWChip label={a.role} color="default" variant="flat" size="sm" />
                  )}
                  {a.responseStatus && (
                    <TWChip
                      label={a.responseStatus}
                      color={responseColor(a.responseStatus)}
                      variant="dot"
                      size="sm"
                    />
                  )}
                </XStack>
              );
            })}
          </YStack>
        )}
      </TWCardBody>
    </TWCard>
  );
}

function InsightsSection() {
  return (
    <TWCard shadow="sm">
      <TWCardHeader>
        <Text color={aiqlickTokens.gray900} fontSize={14} fontWeight="700">
          AI-Powered Meeting Insights
        </Text>
      </TWCardHeader>
      <TWDivider />
      <TWCardBody>
        <YStack alignItems="center" paddingVertical={20} gap={8}>
          <View
            width={48}
            height={48}
            borderRadius={9999}
            backgroundColor={aiqlickTokens.primaryFaint}
            alignItems="center"
            justifyContent="center"
          >
            <Briefcase size={22} color={aiqlickTokens.primary} />
          </View>
          <Text color={aiqlickTokens.gray700} fontSize={13} fontWeight="600">
            Generate insights from this meeting
          </Text>
          <Text
            color={aiqlickTokens.gray500}
            fontSize={11}
            textAlign="center"
            maxWidth={420}
          >
            After the meeting ends, run an AI summary covering skills, communication, key topics, and red flags. Lands in an upcoming milestone.
          </Text>
        </YStack>
      </TWCardBody>
    </TWCard>
  );
}

function TranscriptionSection() {
  return (
    <TWCard shadow="sm">
      <TWCardHeader>
        <Text color={aiqlickTokens.gray900} fontSize={14} fontWeight="700">
          Transcription
        </Text>
      </TWCardHeader>
      <TWDivider />
      <TWCardBody>
        <YStack alignItems="center" paddingVertical={20} gap={8}>
          <Text color={aiqlickTokens.gray500} fontSize={12}>
            Live transcription will appear here when the meeting starts.
          </Text>
        </YStack>
      </TWCardBody>
    </TWCard>
  );
}

function Row({
  icon,
  label,
  primary,
  secondary,
}: {
  icon: React.ReactNode;
  label: string;
  primary: string;
  secondary?: string;
}) {
  return (
    <XStack alignItems="flex-start" gap={12}>
      <View paddingTop={2}>{icon}</View>
      <YStack flex={1} gap={2}>
        <Text color={aiqlickTokens.gray500} fontSize={11} fontWeight="600" letterSpacing={1}>
          {label.toUpperCase()}
        </Text>
        <Text color={aiqlickTokens.gray900} fontSize={13} fontWeight="600">
          {primary}
        </Text>
        {secondary ? (
          <Text color={aiqlickTokens.gray700} fontSize={12}>
            {secondary}
          </Text>
        ) : null}
      </YStack>
    </XStack>
  );
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <YStack
      alignItems="center"
      justifyContent="center"
      paddingVertical={80}
      gap={12}
      borderRadius={16}
      backgroundColor={aiqlickTokens.surface}
      borderWidth={1}
      borderColor={aiqlickTokens.gray200}
    >
      <User size={28} color={aiqlickTokens.gray400} />
      <Text color={aiqlickTokens.gray700} fontSize={14} fontWeight="600">
        Meeting not found
      </Text>
      <Text color={aiqlickTokens.gray500} fontSize={12} textAlign="center" maxWidth={360}>
        We could not load this meeting. It may have been deleted or you may not have access.
      </Text>
      <TWButton
        label="Back to calendar"
        variant="primary"
        color="primary"
        size="sm"
        onPress={onBack}
      />
    </YStack>
  );
}

function statusColor(status: string | null): "primary" | "warning" | "success" | "danger" | "default" {
  switch ((status ?? "").toUpperCase()) {
    case "SCHEDULED":
    case "CONFIRMED":
    case "PENDING":
      return "primary";
    case "IN_PROGRESS":
    case "ONGOING":
    case "RESCHEDULED":
      return "warning";
    case "COMPLETED":
      return "success";
    case "CANCELLED":
    case "DECLINED":
      return "danger";
    default:
      return "default";
  }
}

function responseColor(status: string): "primary" | "warning" | "success" | "danger" | "default" {
  switch (status.toUpperCase()) {
    case "ACCEPTED":
      return "success";
    case "DECLINED":
      return "danger";
    case "TENTATIVE":
      return "warning";
    default:
      return "default";
  }
}

function parseMeetingUrl(url: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const room = u.pathname.replace(/^\//, "");
    if (!room) return null;
    return {
      room,
      domain: u.host,
      jwt: u.searchParams.get("jwt"),
    };
  } catch {
    return null;
  }
}
