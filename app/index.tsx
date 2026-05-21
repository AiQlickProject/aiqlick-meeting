import { useApolloClient, useQuery } from "@apollo/client";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  LayoutList,
  Plus,
  Search,
} from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable } from "react-native";
import { ScrollView, View, XStack, YStack, Text } from "tamagui";

import AuthGuard from "@/components/AuthGuard";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import CalendarItemCard from "@/components/meetings/CalendarItemCard";
import CreateMeetingModal from "@/components/meetings/CreateMeetingModal";
import MeetingsCalendar from "@/components/meetings/MeetingsCalendar";
import { TWButton } from "@/components/ux/TWButton";
import { TWInput } from "@/components/ux/TWInput";
import { TWSelect } from "@/components/ux/TWSelect";
import {
  GET_MY_CALENDAR,
  GET_UPCOMING_EVENTS,
  type CalendarEvent,
  type MyCalendarResult,
  type UpcomingEventsResult,
} from "@/graphql/operations/meetings";
import {
  GET_MY_MEETING_LINK,
  type GetMyMeetingLinkResult,
} from "@/graphql/operations/meetingDetail";
import { aiqlickTokens } from "@/tamagui.config";

type ViewMode = "list" | "calendar";
type TypeFilter = "ALL" | "MEETINGS" | "INTERVIEWS";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESCHEDULED", label: "Rescheduled" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function HomeIndex() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}

function Dashboard() {
  const router = useRouter();
  const apollo = useApolloClient();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  /**
   * Fetch a fresh per-user `meetingUrl` (with a newly-signed JWT) and
   * route into our wrapper. The `meetingUrl` cached on the event from
   * the calendar feed is whatever was issued when the meeting was
   * created — its JWT is always stale because backend signs them with
   * a 24h lifetime.
   */
  const handleJoin = async (event: CalendarEvent) => {
    // The unified calendar feed returns a composite id like
    // `meeting-<uuid>`; the join-link resolver wants the raw UUID
    // from `meetingId` (or `interviewId` for booking-only records).
    const raw =
      event.meetingId ?? event.interviewId ?? stripPrefix(event.id);
    if (!raw) return;
    setJoinError(null);
    setJoiningId(event.id);
    try {
      const { data } = await apollo.query<GetMyMeetingLinkResult>({
        query: GET_MY_MEETING_LINK,
        variables: { meetingId: raw },
        fetchPolicy: "network-only",
      });
      const url = data.getMyMeetingLink?.meetingUrl;
      if (!url) {
        setJoinError("Could not get a join link for this meeting.");
        return;
      }
      const parsed = parseMeetingUrl(url);
      if (!parsed) {
        setJoinError("The join link returned by the backend is malformed.");
        return;
      }
      const qs = new URLSearchParams();
      if (parsed.jwt) qs.set("jwt", parsed.jwt);
      if (parsed.domain) qs.set("domain", parsed.domain);
      if (event.title) qs.set("subject", event.title);
      // Pass the raw UUID so the in-meeting InsightsPanel knows
      // which meeting to generate insights for.
      qs.set("meetingId", raw);
      openMeetingInNewTab(`/${parsed.room}?${qs.toString()}`, router);
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "Failed to start the meeting.");
    } finally {
      setJoiningId(null);
    }
  };

  const { data: upcomingData, loading: upcomingLoading, error: upcomingError } =
    useQuery<UpcomingEventsResult>(GET_UPCOMING_EVENTS, {
      variables: { input: { limit: 50 } },
      fetchPolicy: "cache-and-network",
    });

  const pastRange = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 90);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const { data: pastData } = useQuery<MyCalendarResult>(GET_MY_CALENDAR, {
    variables: { input: pastRange },
    fetchPolicy: "cache-and-network",
  });

  const allEvents = useMemo(() => {
    const up = upcomingData?.upcomingEvents ?? [];
    const past = pastData?.myCalendar.events ?? [];
    const byId = new Map<string, CalendarEvent>();
    for (const e of past) byId.set(e.id, e);
    for (const e of up) byId.set(e.id, e);
    return Array.from(byId.values());
  }, [upcomingData, pastData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allEvents.filter((e) => {
      if (typeFilter === "MEETINGS" && e.type !== "MEETING") return false;
      if (typeFilter === "INTERVIEWS" && e.type !== "INTERVIEW") return false;
      if (statusFilter !== "ALL" && (e.status ?? "").toUpperCase() !== statusFilter)
        return false;
      if (q) {
        const haystack = [
          e.title,
          e.candidateName,
          e.jobTitle,
          e.companyName,
          e.organizerName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [allEvents, typeFilter, statusFilter, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort(
      (a, b) =>
        new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
    );
  }, [filtered]);

  const totalCount = allEvents.length;
  const meetingCount = allEvents.filter((e) => e.type === "MEETING").length;
  const interviewCount = allEvents.filter((e) => e.type === "INTERVIEW").length;

  return (
    <YStack flex={1} backgroundColor={aiqlickTokens.gray50}>
      {/* Top app bar — matches the frontend chrome (white, with a subtle
          bottom border, page-name "breadcrumb" and user identity). */}
      <XStack
        height={56}
        paddingHorizontal={20}
        alignItems="center"
        justifyContent="space-between"
        backgroundColor={aiqlickTokens.surface}
        borderBottomWidth={1}
        borderColor={aiqlickTokens.gray200}
      >
        <XStack alignItems="center" gap={12}>
          <Image
            source={require("@/assets/icon.png")}
            style={{ width: 28, height: 28, borderRadius: 8 }}
            accessibilityLabel="aiqlick"
            resizeMode="contain"
          />
          <XStack alignItems="center" gap={10}>
            <CalendarIcon size={14} color={aiqlickTokens.primary} />
            <Text
              color={aiqlickTokens.primary}
              fontSize={12}
              fontWeight="700"
              letterSpacing={1.5}
            >
              CALENDAR
            </Text>
          </XStack>
        </XStack>

        <ProfileSwitcher />
      </XStack>

      <ScrollView
        flex={1}
        contentContainerStyle={{
          padding: 20,
          gap: 16,
          alignItems: "center",
        }}
      >
        <YStack width="100%" maxWidth={1180} gap={20}>
          {/* Page title + subtitle */}
          <YStack gap={4}>
            <Text color={aiqlickTokens.gray900} fontSize={22} fontWeight="700">
              Meetings & Interviews
            </Text>
            <Text color={aiqlickTokens.gray500} fontSize={13}>
              Everything scheduled with your aiqlick account, in one place.
            </Text>
          </YStack>

          {/* Filters row */}
          <XStack alignItems="center" gap={12} flexWrap="wrap">
            <View flex={1} minWidth={260}>
              <TWInput
                label="Search calendar..."
                value={search}
                onChangeText={setSearch}
                size="md"
                startIcon={<Search size={14} color={aiqlickTokens.gray500} />}
              />
            </View>
            <View width={220}>
              <TWSelect
                label="Status"
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </View>
            <TWButton
              label="Create Meeting"
              variant="primary"
              color="primary"
              size="md"
              icon={<Plus size={16} color="#fff" />}
              onPress={() => setCreateOpen(true)}
            />
          </XStack>

          {/* Row 2: view toggle + type pills + counts */}
          <XStack
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            gap={12}
          >
            <XStack alignItems="center" gap={12} flexWrap="wrap">
              <XStack
                backgroundColor={aiqlickTokens.gray100}
                borderRadius={aiqlickTokens.radiusMd}
                padding={2}
                gap={2}
              >
                <ViewToggle
                  active={viewMode === "list"}
                  onPress={() => setViewMode("list")}
                  icon={
                    <LayoutList
                      size={14}
                      color={viewMode === "list" ? aiqlickTokens.primary : aiqlickTokens.gray500}
                    />
                  }
                />
                <ViewToggle
                  active={viewMode === "calendar"}
                  onPress={() => setViewMode("calendar")}
                  icon={
                    <CalendarDays
                      size={14}
                      color={viewMode === "calendar" ? aiqlickTokens.primary : aiqlickTokens.gray500}
                    />
                  }
                />
              </XStack>

              <XStack alignItems="center" gap={2}>
                <TypePill label="All" active={typeFilter === "ALL"} onPress={() => setTypeFilter("ALL")} />
                <TypePill label="Interviews" active={typeFilter === "INTERVIEWS"} onPress={() => setTypeFilter("INTERVIEWS")} />
                <TypePill label="Meetings" active={typeFilter === "MEETINGS"} onPress={() => setTypeFilter("MEETINGS")} />
              </XStack>
            </XStack>

            <XStack alignItems="center" gap={10}>
              <CountChip n={totalCount} dotColor={aiqlickTokens.gray400} />
              <CountChip n={interviewCount} dotColor={aiqlickTokens.warning} />
              <CountChip n={meetingCount} dotColor={aiqlickTokens.primary} />
            </XStack>
          </XStack>

          {joinError && (
            <View
              padding={12}
              borderRadius={aiqlickTokens.radiusLg}
              backgroundColor={aiqlickTokens.dangerLight}
              borderWidth={1}
              borderColor="rgba(220, 38, 38, 0.3)"
            >
              <Text color={aiqlickTokens.danger} fontSize={12}>
                {joinError}
              </Text>
            </View>
          )}

          {/* Body */}
          {viewMode === "list" ? (
            <ListView
              events={sorted}
              loading={upcomingLoading && !upcomingData}
              error={upcomingError?.message}
              joiningId={joiningId}
              onOpenDetails={(e) => {
                // `e.id` is a composite (e.g. `meeting-<uuid>` /
                // `interview-<uuid>`) used by the unified calendar
                // feed. The detail query takes the raw UUID, which
                // lives on `meetingId` / `interviewId`.
                const raw = e.meetingId ?? e.interviewId ?? stripPrefix(e.id);
                if (!raw) return;
                router.push(`/meeting/${raw}`);
              }}
              onJoin={handleJoin}
            />
          ) : (
            <MeetingsCalendar
              events={sorted}
              onSelectEvent={(e) => {
                const raw =
                  e.meetingId ?? e.interviewId ?? stripPrefix(e.id);
                if (!raw) return;
                router.push(`/meeting/${raw}`);
              }}
            />
          )}
        </YStack>
      </ScrollView>

      <CreateMeetingModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          // After a successful create, jump straight to the new
          // meeting's detail page so the user sees what they made.
          router.push(`/meeting/${id}`);
        }}
      />
    </YStack>
  );
}

function ViewToggle({
  active,
  onPress,
  icon,
}: {
  active: boolean;
  onPress: () => void;
  icon: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }) => ({
        width: 28,
        height: 28,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active
          ? aiqlickTokens.surface
          : pressed || hovered
            ? "rgba(0,0,0,0.04)"
            : "transparent",
        shadowColor: "#000",
        shadowOpacity: active ? 0.06 : 0,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
      })}
    >
      {icon}
    </Pressable>
  );
}

function TypePill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }) => ({
        height: 28,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active
          ? aiqlickTokens.primaryFaint
          : pressed || hovered
            ? aiqlickTokens.gray100
            : "transparent",
      })}
    >
      <Text
        color={active ? aiqlickTokens.primary : aiqlickTokens.gray600}
        fontSize={12}
        fontWeight={active ? "700" : "500"}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CountChip({ n, dotColor }: { n: number; dotColor: string }) {
  return (
    <XStack alignItems="center" gap={4}>
      <View width={6} height={6} borderRadius={9999} backgroundColor={dotColor} />
      <Text color={aiqlickTokens.gray700} fontSize={12} fontWeight="600">
        {n}
      </Text>
    </XStack>
  );
}

function ListView({
  events,
  loading,
  error,
  joiningId,
  onJoin,
  onOpenDetails,
}: {
  events: CalendarEvent[];
  loading: boolean;
  error?: string;
  joiningId: string | null;
  onJoin: (e: CalendarEvent) => void;
  onOpenDetails: (e: CalendarEvent) => void;
}) {
  if (loading) {
    return (
      <YStack alignItems="center" paddingVertical={48}>
        <ActivityIndicator color={aiqlickTokens.primary} />
      </YStack>
    );
  }
  if (error) {
    return (
      <View
        padding={16}
        borderRadius={12}
        backgroundColor={aiqlickTokens.dangerLight}
        borderWidth={1}
        borderColor="rgba(220, 38, 38, 0.3)"
      >
        <Text color={aiqlickTokens.danger} fontSize={13}>
          {error}
        </Text>
      </View>
    );
  }
  if (events.length === 0) {
    return (
      <YStack
        alignItems="center"
        justifyContent="center"
        paddingVertical={64}
        gap={12}
        borderRadius={16}
        backgroundColor={aiqlickTokens.surface}
        borderWidth={1}
        borderColor={aiqlickTokens.gray200}
      >
        <View
          width={48}
          height={48}
          borderRadius={9999}
          backgroundColor={aiqlickTokens.gray100}
          alignItems="center"
          justifyContent="center"
        >
          <CalendarIcon size={24} color={aiqlickTokens.gray400} />
        </View>
        <Text color={aiqlickTokens.gray700} fontSize={14} fontWeight="600">
          Nothing on your calendar
        </Text>
        <Text color={aiqlickTokens.gray500} fontSize={12}>
          Create a meeting or wait for a booking to appear here.
        </Text>
      </YStack>
    );
  }
  return (
    <YStack gap={12}>
      {events.map((e) => (
        <CalendarItemCard
          key={e.id}
          event={e}
          isJoining={joiningId === e.id}
          onJoin={e.meetingUrl ? () => onJoin(e) : undefined}
          onDetails={() => onOpenDetails(e)}
        />
      ))}
    </YStack>
  );
}


function stripPrefix(id: string | null | undefined): string | null {
  if (!id) return null;
  return id.replace(/^(meeting|interview|booking)-/i, "");
}

/**
 * Open the wrapper-internal meeting URL. On web we use `window.open`
 * with `_blank` so the meeting room lives in its own tab — leaves the
 * dashboard / calendar list intact for the user to come back to.
 * On native there's no concept of tabs, so we navigate in-app.
 */
function openMeetingInNewTab(
  target: string,
  router: { push: (href: string) => void },
) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.open(target, "_blank", "noopener,noreferrer");
  } else {
    router.push(target);
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
