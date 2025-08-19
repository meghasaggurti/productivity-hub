// src/lib/apolloClient.ts
"use client";

import { ApolloClient, HttpLink, from, InMemoryCache, NormalizedCacheObject } from "@apollo/client";
import { onError } from "@apollo/client/link/error";

let memo: ApolloClient<NormalizedCacheObject> | null | undefined;

export function getApolloClient(): ApolloClient<NormalizedCacheObject> | null {
  if (memo !== undefined) return memo;

  const url = process.env.NEXT_PUBLIC_GRAPHQL_URL;
  const key = process.env.NEXT_PUBLIC_GRAPHQL_API_KEY;

  // If you don't have a URL (or key), we disable GraphQL gracefully.
  if (!url || !/^https?:\/\//i.test(url)) {
    if (typeof window !== "undefined") {
      console.warn("[GraphQL] Disabled: NEXT_PUBLIC_GRAPHQL_URL is missing.");
    }
    memo = null;
    return memo;
  }

  const httpLink = new HttpLink({
    uri: url,
    fetchOptions: { mode: "cors" },
    headers: {
      ...(key ? { "x-api-key": key } : {}),
      "Content-Type": "application/json",
    },
  });

  const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors?.length) {
      console.warn("[GraphQL] Errors:", graphQLErrors);
    }
    if (networkError) {
      console.warn("[GraphQL] Network error:", networkError);
    }
  });

  memo = new ApolloClient({
    link: from([errorLink, httpLink]),
    cache: new InMemoryCache(),
  });

  return memo;
}
