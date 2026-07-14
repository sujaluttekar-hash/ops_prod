import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        { key: 'Pragma', value: 'no-cache' },
      ],
    },
  ],
};

const sentryOptions = {
  // Suppress Sentry build output
  silent: true,
  // No source maps uploaded without SENTRY_AUTH_TOKEN — safe to leave
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
}

export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryOptions)
  : nextConfig;
