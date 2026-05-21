import { useMutation, useQuery } from "@apollo/client";
import { Check, ChevronDown, LogOut, User } from "@tamagui/lucide-icons";
import { Pressable } from "react-native";
import { useState } from "react";
import { ScrollView, Text, View, XStack, YStack } from "tamagui";

import { TWAvatar } from "@/components/ux/TWAvatar";
import { useUserAuth } from "@/contexts/UserAuthProvider";
import { apolloClient } from "@/lib/apollo";
import {
  GET_MY_COMPANIES,
  SWITCH_SELECTED_COMPANY,
  type MyCompaniesResult,
  type SwitchSelectedCompanyResult,
} from "@/graphql/operations/companies";
import { aiqlickTokens } from "@/tamagui.config";

/**
 * Top-bar profile + company switcher. Mirrors aiqlick-frontend's
 * `ProfileDropdown`:
 *
 *   • Trigger: avatar + name + active-profile subtitle, chevron.
 *   • Dropdown: "Personal" entry (if the user has a non-company
 *     identity), then every company in `myCompanies`. Active item
 *     gets a check icon.
 *   • On select: fire `UPDATE_PROFILE` to flip the server-side
 *     `selectedCompanyId`, reset the Apollo store so every active
 *     query re-runs with the new context, and refresh the local
 *     `whoAmI` state so the rest of the app sees the change without
 *     a hard reload.
 *   • Sign-out anchor at the bottom of the menu.
 *
 * The JWT does not change — backend reads `selectedCompanyId` from
 * the user record on every query. Same pattern as the web frontend.
 */
export default function ProfileSwitcher() {
  const { user, logout, refetchUser } = useUserAuth();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  const { data: companiesData } = useQuery<MyCompaniesResult>(
    GET_MY_COMPANIES,
    {
      variables: { userId: user?.id ?? "" },
      skip: !user?.id,
      fetchPolicy: "cache-and-network",
      errorPolicy: "ignore",
    },
  );

  const [switchCompany] = useMutation<SwitchSelectedCompanyResult>(
    SWITCH_SELECTED_COMPANY,
  );

  if (!user) return null;

  const companies = companiesData?.myCompanies ?? [];
  const activeCompany = companies.find((c) => c.id === user.selectedCompanyId);
  const triggerLabel = activeCompany?.companyName ?? `${user.firstName} ${user.lastName}`;
  const triggerSubtitle = activeCompany ? "Company" : "Personal";

  const switchTo = async (companyId: string | null) => {
    if (companyId === (user.selectedCompanyId ?? null)) {
      setOpen(false);
      return;
    }
    setSwitching(companyId ?? "__personal__");
    try {
      await switchCompany({
        variables: {
          id: user.id,
          input: { selectedCompanyId: companyId },
        },
      });
      // Reset the Apollo store so all active queries (meetings,
      // calendar, etc.) re-fetch in the new company context. Then
      // re-pull `whoAmI` so our local user state picks up the new
      // `selectedCompanyId` without a hard reload.
      await apolloClient.resetStore().catch(() => undefined);
      await refetchUser().catch(() => undefined);
    } finally {
      setSwitching(null);
      setOpen(false);
    }
  };

  return (
    <YStack position="relative" zIndex={open ? 200 : 1}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed, hovered }) => ({
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 8,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: open
            ? aiqlickTokens.gray100
            : pressed || hovered
              ? aiqlickTokens.gray50
              : "transparent",
        })}
      >
        <TWAvatar
          name={triggerLabel}
          src={activeCompany?.avatar ?? user.profileImageUrl ?? undefined}
          size="sm"
          color={activeCompany ? aiqlickTokens.warning : aiqlickTokens.primary}
        />
        <YStack alignItems="flex-start" gap={1}>
          <Text
            color={aiqlickTokens.gray900}
            fontSize={13}
            fontWeight="600"
            numberOfLines={1}
          >
            {triggerLabel}
          </Text>
          <Text color={aiqlickTokens.gray500} fontSize={10}>
            {triggerSubtitle}
          </Text>
        </YStack>
        <ChevronDown size={14} color={aiqlickTokens.gray500} />
      </Pressable>

      {open && (
        <>
          {/* Outside-click backdrop dismisses the menu without
              swallowing the click in unrelated areas of the page. */}
          <Pressable
            onPress={() => setOpen(false)}
            style={{
              position: "absolute" as const,
              top: -2000,
              left: -2000,
              right: -2000,
              bottom: -2000,
              zIndex: 50,
            }}
          />
          <YStack
            position="absolute"
            top={56}
            right={0}
            width={260}
            borderRadius={aiqlickTokens.radiusLg}
            backgroundColor={aiqlickTokens.surface}
            borderWidth={1}
            borderColor={aiqlickTokens.gray200}
            shadowColor="#1A2556"
            shadowOpacity={0.18}
            shadowRadius={24}
            shadowOffset={{ width: 0, height: 12 }}
            zIndex={100}
            overflow="hidden"
          >
            <View
              paddingHorizontal={14}
              paddingTop={12}
              paddingBottom={8}
              borderBottomWidth={1}
              borderColor={aiqlickTokens.gray100}
            >
              <Text
                color={aiqlickTokens.gray500}
                fontSize={10}
                fontWeight="700"
                letterSpacing={1.2}
              >
                SWITCH PROFILE
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 280 }}>
              {/* Personal */}
              <ProfileRow
                avatar={
                  <TWAvatar
                    name={`${user.firstName} ${user.lastName}`}
                    src={user.profileImageUrl ?? undefined}
                    size="sm"
                    color={aiqlickTokens.primary}
                  />
                }
                primary={`${user.firstName} ${user.lastName}`}
                secondary="Personal"
                active={!user.selectedCompanyId}
                loading={switching === "__personal__"}
                onPress={() => switchTo(null)}
              />
              {/* Companies */}
              {companies.map((c) => (
                <ProfileRow
                  key={c.id}
                  avatar={
                    <TWAvatar
                      name={c.companyName}
                      src={c.avatar ?? undefined}
                      size="sm"
                      color={aiqlickTokens.warning}
                    />
                  }
                  primary={c.companyName}
                  secondary="Company"
                  active={c.id === user.selectedCompanyId}
                  loading={switching === c.id}
                  onPress={() => switchTo(c.id)}
                />
              ))}
              {companies.length === 0 && (
                <View paddingHorizontal={14} paddingVertical={12}>
                  <Text color={aiqlickTokens.gray500} fontSize={11}>
                    You don&apos;t belong to any companies yet.
                  </Text>
                </View>
              )}
            </ScrollView>

            <Pressable
              onPress={() => {
                setOpen(false);
                void logout();
              }}
              style={({ pressed, hovered }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderTopWidth: 1,
                borderColor: aiqlickTokens.gray100,
                backgroundColor:
                  pressed || hovered ? aiqlickTokens.gray50 : aiqlickTokens.surface,
              })}
            >
              <LogOut size={14} color={aiqlickTokens.gray700} />
              <Text color={aiqlickTokens.gray700} fontSize={13} fontWeight="500">
                Sign out
              </Text>
            </Pressable>
          </YStack>
        </>
      )}
    </YStack>
  );
}

function ProfileRow({
  avatar,
  primary,
  secondary,
  active,
  loading,
  onPress,
}: {
  avatar: React.ReactNode;
  primary: string;
  secondary: string;
  active: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed, hovered }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: active
          ? aiqlickTokens.primaryFaint
          : pressed || hovered
            ? aiqlickTokens.gray50
            : "transparent",
        opacity: loading ? 0.6 : 1,
      })}
    >
      {avatar}
      <YStack flex={1} gap={1}>
        <Text
          color={active ? aiqlickTokens.primary : aiqlickTokens.gray900}
          fontSize={13}
          fontWeight={active ? "700" : "500"}
          numberOfLines={1}
        >
          {primary}
        </Text>
        <Text color={aiqlickTokens.gray500} fontSize={11}>
          {secondary}
        </Text>
      </YStack>
      {active && <Check size={14} color={aiqlickTokens.primary} />}
      {!active && loading && (
        <View
          width={14}
          height={14}
          borderRadius={9999}
          borderWidth={2}
          borderColor={aiqlickTokens.primary}
          opacity={0.4}
        />
      )}
      {!active && !loading && (
        <View width={14}>
          <User size={12} color="transparent" />
        </View>
      )}
    </Pressable>
  );
}
