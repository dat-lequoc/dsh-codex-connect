import { normalizeContext } from '@earendil-works/pi-ai'
import type { Context, TranscriptContext } from '@earendil-works/pi-ai'

/**
 * Normalize a host request context for the provider-facing pi-ai 1.x contract.
 *
 * pi-ai 1.x providers only accept a branded `TranscriptContext`; the host's
 * `Context` carries the prompt and tools beside the messages instead. The
 * normalizer folds those into the leading system message and is idempotent on
 * an already-normalized transcript, so this works with both host shapes.
 */
export function codexProviderContext(context: Context | TranscriptContext): TranscriptContext {
  return normalizeContext(context as Context)
}
