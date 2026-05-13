import { useMutation } from "@apollo/client";
import {
  Calendar as CalendarIcon,
  Mail,
  Plus,
  RotateCw,
  Trash2,
  User,
  Users,
  Video,
  X,
} from "@tamagui/lucide-icons";
import { useMemo, useState } from "react";
import { Pressable } from "react-native";
import { Text, View, XStack, YStack } from "tamagui";

import { TWAvatar } from "@/components/ux/TWAvatar";
import { TWButton } from "@/components/ux/TWButton";
import { TWChip } from "@/components/ux/TWChip";
import { TWDatepicker } from "@/components/ux/TWDatepicker";
import { TWInput, TWTextarea } from "@/components/ux/TWInput";
import { TWModal } from "@/components/ux/TWModal";
import { TWSelect } from "@/components/ux/TWSelect";
import {
  CREATE_MEETING,
  type AttendeeRole,
  type CreateMeetingAttendee,
  type CreateMeetingInput,
  type CreateMeetingResult,
  type MeetingType,
  type RecurrenceType,
} from "@/graphql/operations/createMeeting";
import { useUserAuth } from "@/contexts/UserAuthProvider";
import { aiqlickTokens } from "@/tamagui.config";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}

const MEETING_TYPES: { value: MeetingType; label: string }[] = [
  { value: "GENERAL", label: "General" },
  { value: "ONE_ON_ONE", label: "One-on-one" },
  { value: "ALL_HANDS", label: "All hands" },
  { value: "TRAINING", label: "Training" },
  { value: "PANEL", label: "Panel" },
];

const ATTENDEE_ROLES: { value: AttendeeRole; label: string }[] = [
  { value: "PARTICIPANT", label: "Participant" },
  { value: "GUEST", label: "Guest" },
  { value: "ORGANIZER", label: "Organizer" },
];

const RECURRENCE_TYPES: { value: RecurrenceType; label: string }[] = [
  { value: "NONE", label: "Doesn't repeat" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Every 2 weeks" },
  { value: "MONTHLY", label: "Monthly" },
];

const TIMEZONES = (() => {
  const tz = ["UTC", Intl.DateTimeFormat().resolvedOptions().timeZone].filter(
    (v, i, a) => v && a.indexOf(v) === i,
  );
  return tz.map((z) => ({ value: z, label: z }));
})();

/**
 * Create-meeting modal. Four stacked sections mirroring
 * `aiqlick-frontend/components/meetings/CreateMeetingModal.tsx`:
 *
 *   1. Meeting details   — title, type, description
 *   2. When              — date, time, duration, timezone
 *   3. Repeats           — recurrence type, weekday picker, ends
 *   4. Attendees         — email + name + role + chip list
 *
 * On submit we issue `CREATE_MEETING` with the same metadata shape
 * the frontend uses so the backend records are indistinguishable
 * regardless of which client created them.
 */
export default function CreateMeetingModal({ isOpen, onClose, onCreated }: Props) {
  const { user } = useUserAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<MeetingType>("GENERAL");
  const [date, setDate] = useState<string>(today());
  const [time, setTime] = useState<string>("10:00");
  const [duration, setDuration] = useState<string>("60");
  const [timezone, setTimezone] = useState<string>(TIMEZONES[1]?.value ?? "UTC");
  const [recurrence, setRecurrence] = useState<RecurrenceType>("NONE");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [endType, setEndType] = useState<"OCCURRENCES" | "UNTIL">("OCCURRENCES");
  const [occurrences, setOccurrences] = useState<string>("10");
  const [endDate, setEndDate] = useState<string>("");
  const [attendees, setAttendees] = useState<CreateMeetingAttendee[]>([]);
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeRole, setAttendeeRole] = useState<AttendeeRole>("PARTICIPANT");
  const [error, setError] = useState<string | null>(null);
  const [attendeeError, setAttendeeError] = useState<string | null>(null);

  const [createMeeting, { loading }] = useMutation<CreateMeetingResult>(CREATE_MEETING);

  const reset = () => {
    setTitle("");
    setDescription("");
    setType("GENERAL");
    setDate(today());
    setTime("10:00");
    setDuration("60");
    setRecurrence("NONE");
    setWeekdays([]);
    setEndType("OCCURRENCES");
    setOccurrences("10");
    setEndDate("");
    setAttendees([]);
    setAttendeeEmail("");
    setAttendeeName("");
    setAttendeeRole("PARTICIPANT");
    setError(null);
    setAttendeeError(null);
  };

  const handleAddAttendee = () => {
    setAttendeeError(null);
    if (!attendeeEmail.trim()) {
      setAttendeeError("Email is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendeeEmail.trim())) {
      setAttendeeError("Enter a valid email.");
      return;
    }
    if (attendees.some((a) => a.email.toLowerCase() === attendeeEmail.toLowerCase())) {
      setAttendeeError("This email is already on the list.");
      return;
    }
    setAttendees((prev) => [
      ...prev,
      { email: attendeeEmail.trim(), name: attendeeName.trim() || undefined, role: attendeeRole },
    ]);
    setAttendeeEmail("");
    setAttendeeName("");
    setAttendeeRole("PARTICIPANT");
  };

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) {
      setError("Meeting title is required.");
      return;
    }
    if (!date || !time) {
      setError("Pick a date and time.");
      return;
    }
    const dt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(dt.getTime())) {
      setError("That date and time isn't valid.");
      return;
    }

    const recurrenceMeta = (() => {
      if (recurrence === "NONE") return undefined;
      const base = {
        type: recurrence,
        endType,
      } as const;
      const tail =
        endType === "OCCURRENCES"
          ? { occurrences: Number(occurrences) || 1 }
          : { endDate: endDate || undefined };
      const days =
        recurrence === "WEEKLY" || recurrence === "BIWEEKLY"
          ? weekdays
          : undefined;
      return { ...base, ...tail, ...(days ? { days } : {}) };
    })();

    const input: CreateMeetingInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      companyId: user?.selectedCompanyId ?? undefined,
      scheduledAt: dt.toISOString(),
      duration: Number(duration) || 60,
      timezone,
      attendees: attendees.length ? attendees : undefined,
      metadata: {
        createdFrom: "meeting-client",
        createdAt: new Date().toISOString(),
        ...(recurrenceMeta ? { recurrence: recurrenceMeta } : {}),
      },
    };

    try {
      const { data } = await createMeeting({ variables: { input } });
      const id = data?.createMeeting.id;
      if (id) onCreated?.(id);
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create the meeting.");
    }
  };

  return (
    <TWModal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      size="xl"
      header={
        <XStack alignItems="center" gap={10}>
          <View
            width={28}
            height={28}
            borderRadius={8}
            backgroundColor={aiqlickTokens.primary}
            alignItems="center"
            justifyContent="center"
          >
            <Video size={14} color="#fff" />
          </View>
          <Text color={aiqlickTokens.gray900} fontSize={15} fontWeight="700">
            Create New Meeting
          </Text>
        </XStack>
      }
      footer={
        <>
          <TWButton
            label="Cancel"
            variant="ghost"
            color="default"
            size="md"
            onPress={() => {
              reset();
              onClose();
            }}
          />
          <TWButton
            label="Create Meeting"
            variant="primary"
            color="primary"
            size="md"
            isLoading={loading}
            onPress={handleSubmit}
          />
        </>
      }
    >
      <Section icon={<Video size={14} color={aiqlickTokens.primary} />} title="Meeting details">
        <TWInput label="Meeting title" value={title} onChangeText={setTitle} isRequired />
        <TWSelect
          label="Type"
          options={MEETING_TYPES}
          value={type}
          onChange={(v) => setType(v as MeetingType)}
        />
        <TWTextarea label="Description" value={description} onChangeText={setDescription} rows={3} />
      </Section>

      <Section icon={<CalendarIcon size={14} color={aiqlickTokens.primary} />} title="When">
        <XStack gap={10} flexWrap="wrap">
          <View flex={1} minWidth={180}>
            <TWDatepicker label="Date" value={date} onChange={setDate} isRequired />
          </View>
          <View flex={1} minWidth={120}>
            <TWInput
              label="Time"
              value={time}
              onChangeText={setTime}
              placeholder="HH:MM"
              isRequired
            />
          </View>
        </XStack>
        <XStack gap={10} flexWrap="wrap">
          <View flex={1} minWidth={140}>
            <TWInput
              label="Duration (minutes)"
              value={duration}
              onChangeText={(v) => setDuration(v.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
            />
          </View>
          <View flex={1} minWidth={180}>
            <TWSelect
              label="Timezone"
              options={TIMEZONES}
              value={timezone}
              onChange={setTimezone}
            />
          </View>
        </XStack>
      </Section>

      <Section icon={<RotateCw size={14} color={aiqlickTokens.primary} />} title="Repeats">
        <TWSelect
          label="Repeat"
          options={RECURRENCE_TYPES}
          value={recurrence}
          onChange={(v) => setRecurrence(v as RecurrenceType)}
        />
        {(recurrence === "WEEKLY" || recurrence === "BIWEEKLY") && (
          <YStack gap={6}>
            <Text color={aiqlickTokens.gray500} fontSize={11} fontWeight="600">
              REPEAT ON
            </Text>
            <XStack gap={6}>
              {["S", "M", "T", "W", "T", "F", "S"].map((label, idx) => {
                const active = weekdays.includes(idx);
                return (
                  <Pressable
                    key={idx}
                    onPress={() =>
                      setWeekdays((prev) =>
                        active ? prev.filter((d) => d !== idx) : [...prev, idx].sort(),
                      )
                    }
                    style={({ pressed, hovered }) => ({
                      width: 36,
                      height: 36,
                      borderRadius: 9999,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: active
                        ? aiqlickTokens.primary
                        : pressed || hovered
                          ? aiqlickTokens.gray100
                          : aiqlickTokens.surface,
                      borderWidth: 1,
                      borderColor: active ? aiqlickTokens.primary : aiqlickTokens.gray200,
                    })}
                  >
                    <Text
                      color={active ? "#fff" : aiqlickTokens.gray700}
                      fontSize={12}
                      fontWeight="700"
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </XStack>
          </YStack>
        )}
        {recurrence !== "NONE" && (
          <XStack gap={10} flexWrap="wrap">
            <View flex={1} minWidth={180}>
              <TWSelect
                label="Ends"
                options={[
                  { value: "OCCURRENCES", label: "After N occurrences" },
                  { value: "UNTIL", label: "On a specific date" },
                ]}
                value={endType}
                onChange={(v) => setEndType(v as "OCCURRENCES" | "UNTIL")}
              />
            </View>
            <View flex={1} minWidth={180}>
              {endType === "OCCURRENCES" ? (
                <TWInput
                  label="Occurrences"
                  value={occurrences}
                  onChangeText={(v) => setOccurrences(v.replace(/[^0-9]/g, ""))}
                  keyboardType="number-pad"
                />
              ) : (
                <TWDatepicker label="End date" value={endDate} onChange={setEndDate} />
              )}
            </View>
          </XStack>
        )}
      </Section>

      <Section icon={<Users size={14} color={aiqlickTokens.primary} />} title="Attendees">
        <XStack gap={8} flexWrap="wrap" alignItems="center">
          <View flex={1} minWidth={180}>
            <TWInput
              label="Email"
              value={attendeeEmail}
              onChangeText={setAttendeeEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              startIcon={<Mail size={14} color={aiqlickTokens.gray500} />}
            />
          </View>
          <View flex={1} minWidth={140}>
            <TWInput
              label="Name"
              value={attendeeName}
              onChangeText={setAttendeeName}
              startIcon={<User size={14} color={aiqlickTokens.gray500} />}
            />
          </View>
          <View width={160}>
            <TWSelect
              label="Role"
              options={ATTENDEE_ROLES}
              value={attendeeRole}
              onChange={(v) => setAttendeeRole(v as AttendeeRole)}
            />
          </View>
          <TWButton
            label="Add"
            variant="flat"
            color="primary"
            size="md"
            icon={<Plus size={14} color={aiqlickTokens.primary} />}
            onPress={handleAddAttendee}
          />
        </XStack>
        {attendeeError && (
          <Text color={aiqlickTokens.danger} fontSize={11}>
            {attendeeError}
          </Text>
        )}
        {attendees.length > 0 && (
          <YStack gap={6}>
            {attendees.map((a) => (
              <XStack
                key={a.email}
                alignItems="center"
                gap={10}
                padding={8}
                borderRadius={aiqlickTokens.radiusLg}
                borderWidth={1}
                borderColor={aiqlickTokens.gray200}
              >
                <TWAvatar name={a.name ?? a.email} size="sm" />
                <YStack flex={1} gap={1}>
                  <Text color={aiqlickTokens.gray900} fontSize={13} fontWeight="600">
                    {a.name || a.email}
                  </Text>
                  {a.name && (
                    <Text color={aiqlickTokens.gray500} fontSize={11}>
                      {a.email}
                    </Text>
                  )}
                </YStack>
                {a.role && (
                  <TWChip label={a.role} color="default" variant="flat" size="sm" />
                )}
                <Pressable
                  onPress={() =>
                    setAttendees((prev) => prev.filter((x) => x.email !== a.email))
                  }
                  hitSlop={6}
                  style={({ pressed, hovered }) => ({
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      pressed || hovered ? aiqlickTokens.dangerLight : "transparent",
                  })}
                >
                  <Trash2 size={14} color={aiqlickTokens.danger} />
                </Pressable>
              </XStack>
            ))}
          </YStack>
        )}
      </Section>

      {error && (
        <View
          padding={10}
          borderRadius={aiqlickTokens.radiusLg}
          backgroundColor={aiqlickTokens.dangerLight}
          borderWidth={1}
          borderColor="rgba(220, 38, 38, 0.3)"
        >
          <Text color={aiqlickTokens.danger} fontSize={12}>
            {error}
          </Text>
        </View>
      )}
    </TWModal>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <YStack
      gap={12}
      padding={14}
      borderRadius={aiqlickTokens.radiusXl}
      backgroundColor={aiqlickTokens.surface}
      borderWidth={1}
      borderColor={aiqlickTokens.gray100}
    >
      <XStack alignItems="center" gap={8}>
        {icon}
        <Text color={aiqlickTokens.gray900} fontSize={13} fontWeight="700">
          {title}
        </Text>
      </XStack>
      <YStack gap={10}>{children}</YStack>
    </YStack>
  );
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
