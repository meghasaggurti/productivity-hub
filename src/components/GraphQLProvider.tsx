// src/components/GraphQLProvider.tsx
'use client';

import React from 'react';
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  HttpLink,
  from,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';

type Props = { children: React.ReactNode };

function makeClient(url: string, apiKey: string) {
  const http = new HttpLink({
    uri: url,
    headers: apiKey ? { 'x-api-key': apiKey } : undefined,
  });

  const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors?.length) console.warn('[GraphQL] Errors:', graphQLErrors);
    if (networkError) console.warn('[GraphQL] Network error:', networkError);
  });

  return new ApolloClient({
    link: from([errorLink, http]),
    cache: new InMemoryCache(),
  });
}

export default function GraphQLProvider({ children }: Props) {
  const url = process.env.NEXT_PUBLIC_GRAPHQL_URL;
  const apiKey = process.env.NEXT_PUBLIC_GRAPHQL_API_KEY;

  // If URL is missing, do NOTHING (no ApolloProvider, no network).
  if (!url) {
    console.info('[GraphQL] Disabled: NEXT_PUBLIC_GRAPHQL_URL is missing.');
    return <>{children}</>;
  }

  const client = makeClient(url, apiKey ?? '');
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
