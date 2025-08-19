// src/components/GraphQLProvider.tsx
"use client";

import { ReactNode } from "react";
import { ApolloProvider } from "@apollo/client";
import { getApolloClient } from "@/lib/apolloClient";

export default function GraphQLProvider({ children }: { children: ReactNode }) {
  const client = getApolloClient();

  // If no API configured, just render children (no Apollo context).
  if (!client) return <>{children}</>;

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
