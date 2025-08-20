// src/lib/apolloClient.ts
import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  from,
  NormalizedCacheObject,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';

let memo: ApolloClient<NormalizedCacheObject> | null | undefined;

export function getApolloClient(): ApolloClient<NormalizedCacheObject> | null {
  if (memo !== undefined) return memo ?? null;

  const url = process.env.NEXT_PUBLIC_GRAPHQL_URL;
  const key = process.env.NEXT_PUBLIC_GRAPHQL_API_KEY;

  if (!url || url === 'disabled') {
    if (typeof window !== 'undefined') {
      console.warn('[GraphQL] Disabled: NEXT_PUBLIC_GRAPHQL_URL is missing.');
    }
    memo = null;
    return null;
  }

  const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors?.length) {
      console.warn('[GraphQL] Errors:', graphQLErrors);
    }
    if (networkError) {
      console.warn('[GraphQL] Network error:', networkError);
    }
  });

  const httpLink = new HttpLink({
    uri: url,
    headers: key ? { 'x-api-key': key } : {},
    fetchOptions: { mode: 'cors' },
  });

  memo = new ApolloClient({
    link: from([errorLink, httpLink]),
    cache: new InMemoryCache(),
    connectToDevTools: process.env.NODE_ENV !== 'production',
  });

  return memo!;
}
