import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  from,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import Constants from "expo-constants";

import { readItem, TOKEN_KEY } from "./storage";

/**
 * Apollo Client mirroring the auth-link / HttpLink shape from
 * aiqlick-frontend (graphql/apollo/apolloClient.ts). The token is
 * read fresh on every request — no automatic refresh, same as web.
 *
 * Backend URL comes from `EXPO_PUBLIC_API_URL` (the Expo equivalent
 * of the frontend's `NEXT_PUBLIC_API_URL`). We deliberately fail
 * loudly with a console warning if it's missing so dev environments
 * surface the missing var instead of silently hitting the wrong host.
 */
const apiUrl =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  // eslint-disable-next-line no-console
  console.warn(
    "[aiqlick-meeting] EXPO_PUBLIC_API_URL is not set. Set it to your backend host (e.g. https://api.aiqlick.com).",
  );
}

const httpLink = new HttpLink({
  uri: `${apiUrl ?? ""}/graphql`,
});

const authLink = setContext(async (_op, { headers }) => {
  const token = await readItem(TOKEN_KEY);
  return {
    headers: {
      ...(headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      // eslint-disable-next-line no-console
      console.warn(`[GraphQL error] ${err.message}`, err.path);
    }
  }
  if (networkError) {
    // eslint-disable-next-line no-console
    console.warn("[Network error]", networkError.message);
  }
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink as unknown as ApolloLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: "cache-and-network", errorPolicy: "all" },
    query: { fetchPolicy: "network-only", errorPolicy: "all" },
  },
});
