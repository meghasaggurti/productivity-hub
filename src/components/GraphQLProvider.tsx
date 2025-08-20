// src/components/GraphQLProvider.tsx
'use client';

import React from 'react';
import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloProvider,
  from,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';

type Props = { children: React.ReactNode };

function makeClient(url: string, apiKey?: string) {
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
    fetchOptions: { mode: 'cors' },
    headers: apiKey ? { 'x-api-key': apiKey } : {},
  });

  return new ApolloClient({
    link: from([errorLink, httpLink]),
    cache: new InMemoryCache(),
    connectToDevTools: process.env.NODE_ENV !== 'production',
  });
}

export default function GraphQLProvider({ children }: Props) {
  const url = process.env.NEXT_PUBLIC_GRAPHQL_URL;
  const apiKey = process.env.NEXT_PUBLIC_GRAPHQL_API_KEY;

  // If URL is missing or explicitly set to "disabled", don't mount Apollo at all.
  if (!url || url === 'disabled') {
    if (typeof window !== 'undefined') {
      console.info('[GraphQL] Disabled: NEXT_PUBLIC_GRAPHQL_URL is missing.');
    }
    return <>{children}</>;
  }

  const client = makeClient(url, apiKey);
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
