import { Briefcase, Calendar, Clock, User } from "@tamagui/lucide-icons";
import { Pressable } from "react-native";
import { Text, View, XStack, YStack } from "tamagui";

import { TWAvatar } from "@/components/ux/TWAvatar";
import { TWBadge, TWChip } from "@/components/ux/TWChip";
import { TWButton } from "@/components/ux/TWButton";
import { TWCard, TWCardBody } from "@/components/ux/TWCard";
import { aiqlickTokens } from "@/tamagui.config";
import type { CalendarEvent } from "@/graphql/operations/meetings";

interface Props {
  event: CalendarEvent;
  isJoining?: boolean;
  onJoin?: () => void;
  onDetails?: () => void;
}

/**
 * 1:1 port of `components/meetings/CalendarItemCard.tsx` in
 * aiqlick-frontend. The whole card is now a single click target that
 * navigates to the meeting detail (no more redundant "View Details"
 * button — the card *is* the link). Join is the only inline action,
 * surfaced when a `meetingUrl` is present and `onJoin` is wired up.
 *
 *   ┌──────────┬───────────────────────────────────┐
 *   │  avatar  │  Title  [Interview/Meeting badge] │  STATUS chip ─►
 *   │   (lg)   │  subtitle (gray)                  │
 *   │          │  📅 date    🕐 time · duration    │
 *   │          │                          ( Join ) │
 *   └──────────┴───────────────────────────────────┘
 */
export default function CalendarItemCard({ event, isJoining, onJoin, onDetails }: Props) {
  const isInterview = event.type === "INTERVIEW";
  const start = new Date(event.scheduledAt);
  const date = start.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = start.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const subtitle = [event.candidateName, event.jobTitle, event.companyName]
    .filter(Boolean)
    .join(" · ");
  const avatarName = event.candidateName || event.organizerName || event.title;
  const canJoin = !!event.meetingUrl && onJoin;

  return (
    // TWCard with isHoverable provides the lift-on-hover effect for
    // the whole card. The actual click target is the inner Pressable
    // wrapping just the main content row — so tapping the Join button
    // (which sits *outside* that inner Pressable) doesn't also trigger
    // the navigate-to-detail. Cross-platform safe: no event-bubbling
    // tricks needed.
    <TWCard shadow="sm" isHoverable={!!onDetails}>
      <TWCardBody gap={12}>
        <Pressable
          onPress={onDetails}
          style={{ marginHorizontal: -4, paddingHorizontal: 4, borderRadius: 8 }}
        >
        <XStack alignItems="flex-start" gap={14}>
          <TWAvatar
            name={avatarName}
            size="md"
            color={isInterview ? aiqlickTokens.warning : aiqlickTokens.primary}
          />
          <YStack flex={1} gap={8}>
            <XStack alignItems="flex-start" justifyContent="space-between" gap={12}>
              <YStack flex={1} gap={4}>
                <XStack alignItems="center" gap={8} flexWrap="wrap">
                  <Text
                    color={aiqlickTokens.gray900}
                    fontSize={15}
                    fontWeight="600"
                    numberOfLines={1}
                  >
                    {event.candidateName || event.title || "Untitled"}
                  </Text>
                  <TWBadge
                    label={isInterview ? "Interview" : "Meeting"}
                    color={isInterview ? "warning" : "primary"}
                  />
                </XStack>
                {!!subtitle && (
                  <Text color={aiqlickTokens.gray500} fontSize={12} numberOfLines={2}>
                    {event.jobTitle ? `${event.jobTitle}${event.companyName ? ` · ${event.companyName}` : ""}` : subtitle}
                  </Text>
                )}
              </YStack>
              <TWChip
                label={(event.status ?? "").toUpperCase() || "—"}
                color={statusColor(event.status)}
                variant="flat"
                size="sm"
              />
            </XStack>

            <XStack alignItems="center" gap={16} flexWrap="wrap">
              <XStack alignItems="center" gap={6}>
                <Calendar size={14} color={aiqlickTokens.gray500} />
                <Text color={aiqlickTokens.gray700} fontSize={12} fontWeight="500">
                  {date}
                </Text>
                <Text color={aiqlickTokens.gray400} fontSize={12}>
                  ·
                </Text>
                <Text color={aiqlickTokens.gray700} fontSize={12} fontWeight="500">
                  {time}
                </Text>
              </XStack>
              {event.duration ? (
                <XStack alignItems="center" gap={6}>
                  <Clock size={14} color={aiqlickTokens.gray500} />
                  <Text color={aiqlickTokens.gray500} fontSize={12}>
                    {event.duration} min
                  </Text>
                </XStack>
              ) : null}
              {event.location ? (
                <XStack alignItems="center" gap={6}>
                  <Briefcase size={14} color={aiqlickTokens.gray500} />
                  <Text color={aiqlickTokens.gray500} fontSize={12}>
                    {event.location}
                  </Text>
                </XStack>
              ) : null}
            </XStack>

          </YStack>
        </XStack>
        </Pressable>

        {canJoin && (
          <XStack justifyContent="flex-end" marginTop={2}>
            <TWButton
              label="Join"
              variant="primary"
              color="success"
              size="sm"
              isLoading={isJoining}
              onPress={onJoin}
            />
          </XStack>
        )}
      </TWCardBody>
    </TWCard>
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
