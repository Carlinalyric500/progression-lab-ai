/**
 * Monitoring and alerting for prompt versioning fallback behavior.
 *
 * This module captures events when the DB-backed prompt service falls back
 * to hardcoded templates due to database failures or missing versions.
 * All fallback events are reported to Sentry to enable strict operational monitoring.
 */

import * as Sentry from '@sentry/nextjs';

export type FallbackReason =
  | 'db_error'
  | 'no_active_version'
  | 'query_timeout'
  | 'connection_failure';

export interface FallbackEvent {
  promptKey: string;
  reason: FallbackReason;
  error?: Error;
  context?: Record<string, unknown>;
}

/**
 * Report a prompt fallback event to Sentry for monitoring and alerting.
 * This should be called whenever the application falls back to hardcoded prompts
 * instead of using the DB-backed version.
 *
 * ALERT STRATEGY: Every fallback is reported with severity "warning" to enable
 * immediate detection of database issues that degrade prompt management capabilities.
 */
export function reportPromptFallback(event: FallbackEvent): void {
  if (!Sentry.isInitialized()) {
    console.warn('[Prompt Fallback]', {
      promptKey: event.promptKey,
      reason: event.reason,
      error: event.error?.message,
    });
    return;
  }

  Sentry.captureMessage(`Prompt fallback: ${event.promptKey} (${event.reason})`, 'warning');

  // Also record as a structured event for better search/filtering
  Sentry.withScope((scope) => {
    scope.setTag('component', 'prompt-versioning');
    scope.setTag('fallback_reason', event.reason);
    scope.setTag('prompt_key', event.promptKey);
    scope.setLevel('warning');

    if (event.context) {
      Object.entries(event.context).forEach(([key, value]) => {
        scope.setContext('fallback_context', { [key]: value });
      });
    }

    if (event.error) {
      Sentry.captureException(event.error, {
        tags: {
          prompt_key: event.promptKey,
          fallback_reason: event.reason,
        },
      });
    }
  });
}

/**
 * Report a successful DB prompt load for telemetry.
 * Helps track the ratio of DB vs fallback loads.
 */
export function reportPromptSuccess(promptKey: string, versionNumber: number): void {
  if (!Sentry.isInitialized()) {
    return;
  }

  Sentry.captureMessage(`Prompt loaded from DB: ${promptKey} (v${versionNumber})`, 'info');

  Sentry.withScope((scope) => {
    scope.setTag('component', 'prompt-versioning');
    scope.setTag('source', 'database');
    scope.setTag('prompt_key', promptKey);
    scope.setContext('prompt_load', {
      promptKey,
      versionNumber,
      timestamp: new Date().toISOString(),
    });
  });
}
