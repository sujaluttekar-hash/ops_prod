import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Only send errors in production — not during development
  enabled: process.env.NODE_ENV === 'production',
  
  // 10% of sessions recorded for performance — won't impact app speed
  tracesSampleRate: 0.1,
  
  // Identify which user triggered the error
  beforeSend(event) {
    // Don't send errors that are just network timeouts
    if (event.exception?.values?.[0]?.value?.includes('timeout')) return null
    return event
  },
})
