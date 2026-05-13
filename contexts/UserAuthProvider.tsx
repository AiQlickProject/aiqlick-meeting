import { useQuery } from "@apollo/client";
import { useRouter } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apolloClient } from "@/lib/apollo";
import { deleteItem, readItem, TOKEN_KEY, writeItem } from "@/lib/storage";
import { WHO_AM_I, type WhoAmIResult } from "@/graphql/operations/auth";

interface AuthValue {
  token: string | null;
  user: WhoAmIResult["whoAmI"];
  isLoggedIn: boolean;
  isCompany: boolean;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

/**
 * Auth context. Mirrors aiqlick-frontend/contexts/UserAuthProvider —
 * same `whoAmI` query, same {token, user, login, logout} surface.
 * Token comes from secure storage on native, localStorage on web
 * (so a user signed in via the web frontend on the same origin is
 * seamlessly logged in here too).
 */
export function UserAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await readItem(TOKEN_KEY);
      if (!cancelled) {
        setToken(stored);
        setTokenLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    data,
    loading: queryLoading,
    refetch,
  } = useQuery<WhoAmIResult>(WHO_AM_I, {
    skip: !token,
    fetchPolicy: "network-only",
    errorPolicy: "ignore",
  });

  const login = useCallback(
    async (newToken: string) => {
      await writeItem(TOKEN_KEY, newToken);
      setToken(newToken);
      await apolloClient.resetStore().catch(() => {
        /* ignore */
      });
      await refetch().catch(() => {
        /* ignore */
      });
    },
    [refetch],
  );

  const logout = useCallback(async () => {
    await deleteItem(TOKEN_KEY);
    setToken(null);
    await apolloClient.clearStore().catch(() => {
      /* ignore */
    });
    router.replace("/login");
  }, [router]);

  const refetchUser = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const user = data?.whoAmI ?? null;

  const value = useMemo<AuthValue>(
    () => ({
      token,
      user,
      isLoggedIn: !!token && !!user,
      isCompany: !!user?.selectedCompanyId,
      loading: !tokenLoaded || (!!token && queryLoading),
      login,
      logout,
      refetchUser,
    }),
    [token, user, tokenLoaded, queryLoading, login, logout, refetchUser],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUserAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUserAuth must be used inside <UserAuthProvider>");
  return v;
}
