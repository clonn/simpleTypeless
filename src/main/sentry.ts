import * as Sentry from '@sentry/electron/main'
import { is } from '@electron-toolkit/utils'

const SENTRY_DSN = process.env.SENTRY_DSN || ''

export function initSentry(): void {
  if (is.dev || !SENTRY_DSN) {
    console.log('[Sentry] Skipped initialization (dev mode or no DSN)')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: is.dev ? 'development' : 'production',
    beforeSend(event) {
      // Strip any local file paths for privacy
      if (event.exception?.values) {
        for (const exception of event.exception.values) {
          if (exception.stacktrace?.frames) {
            for (const frame of exception.stacktrace.frames) {
              if (frame.filename) {
                frame.filename = frame.filename.replace(/\/Users\/[^/]+/, '~')
              }
            }
          }
        }
      }
      return event
    }
  })

  console.log('[Sentry] Initialized for production')
}
