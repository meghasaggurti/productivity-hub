'use client';

import React from 'react';
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  HttpLink,
} from '@apollo/client';

type Props = { children: React.ReactNode };

function makeClient(url: string, apiKey?: string) {
  const headers: Record<string, string> = {};
  if (apiKey) headers['x-api-key'] = apiKey;

  return new ApolloClient({
    link: new HttpLink({ uri: url, headers }),
    cache: new InMemoryCache(),
    connectToDevTools: process.env.NODE_ENV !== 'production',
  });
}

export default function GraphQLProvider({ children }: Props) {
  const url = process.env.NEXT_PUBLIC_GRAPHQL_URL;
  const apiKey = process.env.NEXT_PUBLIC_GRAPHQL_API_KEY;

  // If not configured, run as a no-op and DO NOT crash / render invalid elements.
  if (!url) {
    if (typeof window !== 'undefined') {
      console.info('[GraphQL] Disabled: NEXT_PUBLIC_GRAPHQL_URL is missing.');
    }
    // Just return children — no ApolloProvider, no network calls.
    return <>{children}</>;
  }

  // You have a URL. Build a client. If key is missing, you may still connect if the endpoint allows.
  const client = makeClient(url, apiKey);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
