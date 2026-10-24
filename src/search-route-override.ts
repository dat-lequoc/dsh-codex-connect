/** Runtime search-route adapter for the supported DeepSeek Harness release. */

import type WebRuntime from '@deepseek-ai/dsh-web'

const SEARCH_PROVIDER_FIELD = 'searchProviderId'
/** Shared cosmokit volatile protocol; the Host owns the reference and validates writes. */
const VOLATILE_WRITE = Symbol.for('cosmokit.volatile.write')

interface VolatileSearchProvider {
  get(): string | undefined
  [VOLATILE_WRITE]?: (value: string | undefined) => void
}

/**
 * DSH 0.2.1 replaced the writable `searchProviderId` field with a volatile
 * config reference on the service's config. Read it structurally so this module
 * still compiles against either host type.
 */
function searchProviderRef(web: WebRuntime): VolatileSearchProvider | undefined {
  const config = Reflect.get(web, 'config') as { searchProvider?: VolatileSearchProvider } | undefined
  const ref = config?.searchProvider
  return ref !== undefined && typeof ref.get === 'function' ? ref : undefined
}

function readSearchProvider(web: WebRuntime): string | undefined {
  if (Object.prototype.hasOwnProperty.call(web, SEARCH_PROVIDER_FIELD)) {
    const value = Reflect.get(web, SEARCH_PROVIDER_FIELD) as unknown
    if (value !== undefined && typeof value !== 'string') {
      throw new Error('The installed DeepSeek Harness returned an invalid search route')
    }
    return value
  }
  const ref = searchProviderRef(web)
  if (ref === undefined) {
    throw new Error('The installed DeepSeek Harness does not expose the supported search route field')
  }
  const value: unknown = ref.get()
  if (value !== undefined && typeof value !== 'string') {
    throw new Error('The installed DeepSeek Harness returned an invalid search route')
  }
  return value
}

function writeSearchProvider(web: WebRuntime, provider: string | undefined): void {
  if (Object.prototype.hasOwnProperty.call(web, SEARCH_PROVIDER_FIELD)) {
    if (!Reflect.set(web, SEARCH_PROVIDER_FIELD, provider) || readSearchProvider(web) !== provider) {
      throw new Error('The installed DeepSeek Harness refused the search route change')
    }
    return
  }
  const ref = searchProviderRef(web)
  const write = ref?.[VOLATILE_WRITE]
  if (ref === undefined || write === undefined) {
    throw new Error('The installed DeepSeek Harness does not expose the supported search route field')
  }
  write.call(ref, provider)
  if (readSearchProvider(web) !== provider) {
    throw new Error('The installed DeepSeek Harness refused the search route change')
  }
}

/**
 * Select one provider in the supported DSH runtime and return an idempotent restore operation.
 * The restore preserves a newer third-party route change instead of overwriting it.
 * @param web - active DSH web runtime.
 * @param provider - registered provider id selected while the capability is enabled.
 * @returns disposer that restores the route observed before selection.
 */
export function selectOpenAICodexSearchRoute(web: WebRuntime, provider: string): () => void {
  const previous = readSearchProvider(web)
  writeSearchProvider(web, provider)
  let active = true
  return () => {
    if (!active) return
    active = false
    if (readSearchProvider(web) === provider) writeSearchProvider(web, previous)
  }
}
