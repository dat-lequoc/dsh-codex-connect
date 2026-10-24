import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import WebRuntime from '@deepseek-ai/dsh-web'
import { selectOpenAICodexSearchRoute } from '../src/search-route-override.ts'

const VOLATILE_WRITE = Symbol.for('cosmokit.volatile.write')

let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
})

/** DSH 0.2.1 keeps the route in the web service's volatile config reference. */
function searchProviderRef(web: WebRuntime): { get(): string | undefined; [VOLATILE_WRITE](value: string | undefined): void } {
  return (Reflect.get(web, 'config') as { searchProvider: ReturnType<typeof searchProviderRef> }).searchProvider
}

describe('supported DSH search route override', () => {
  it('selects Codex and restores the previous provider idempotently', async () => {
    const ctx = new Context()
    context = ctx
    await ctx.plugin(WebRuntime, { searchProvider: 'deepseek-official' })

    const restore = selectOpenAICodexSearchRoute(ctx.web, 'openai-codex')
    expect(searchProviderRef(ctx.web).get()).toBe('openai-codex')

    restore()
    restore()
    expect(searchProviderRef(ctx.web).get()).toBe('deepseek-official')
  })

  it('does not overwrite a later route selected by another owner', async () => {
    const ctx = new Context()
    context = ctx
    await ctx.plugin(WebRuntime, { searchProvider: 'deepseek-official' })

    const restore = selectOpenAICodexSearchRoute(ctx.web, 'openai-codex')
    searchProviderRef(ctx.web)[VOLATILE_WRITE]('new-owner')
    restore()

    expect(searchProviderRef(ctx.web).get()).toBe('new-owner')
  })

  it('still drives the legacy writable field when a host exposes it', () => {
    const legacy = { searchProviderId: 'deepseek-official' } as unknown as WebRuntime
    const restore = selectOpenAICodexSearchRoute(legacy, 'openai-codex')
    expect(Reflect.get(legacy, 'searchProviderId')).toBe('openai-codex')
    restore()
    expect(Reflect.get(legacy, 'searchProviderId')).toBe('deepseek-official')
  })

  it('rejects an unsupported runtime before changing it', () => {
    expect(() => selectOpenAICodexSearchRoute({} as WebRuntime, 'openai-codex'))
      .toThrow('does not expose the supported search route field')
  })
})
