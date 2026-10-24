import { describe, expect, it } from 'vitest'
import { normalizeContext } from '@earendil-works/pi-ai'
import type { Context } from '@earendil-works/pi-ai'
import { codexProviderContext } from '../src/pi-context.ts'

const user = { role: 'user' as const, content: 'fixture user message', timestamp: 0 }
// Simulate a host shape crossing into the provider's published interface.
const incoming = (value: unknown) => value as Context

describe('host transcript normalization', () => {
  it('folds a legacy prompt and tool set into the leading system message', () => {
    const context: Context = { systemPrompt: 'instructions', messages: [user], tools: [] }
    const normalized = codexProviderContext(context)
    expect(normalized.messages[0]).toMatchObject({ role: 'system', content: 'instructions' })
    expect(normalized.messages[1]).toEqual(user)
    // The caller's context is not mutated.
    expect(context.messages).toHaveLength(1)
  })

  it('preserves an already-normalized transcript and its initial tools', () => {
    const tools = [{ name: 'fixture', description: 'test', parameters: { type: 'object' } }]
    const context = incoming({ messages: [{ role: 'system', content: 'instructions', toolsAdded: tools, timestamp: 0 }, user] })
    const normalized = codexProviderContext(context)
    expect(normalized.messages).toEqual(context.messages)
    expect(normalized.messages[0]).toMatchObject({ role: 'system', content: 'instructions', toolsAdded: tools })
    expect(context.messages).toHaveLength(2)
  })

  it('retains tool-only system messages', () => {
    const normalized = codexProviderContext(incoming({ messages: [{ role: 'system', content: '', toolsAdded: [] }, user] }))
    expect(normalized.messages[0]).toMatchObject({ role: 'system', content: '', toolsAdded: [] })
    expect(normalized.messages[1]).toEqual(user)
  })

  it('preserves later system messages rather than treating them as ambiguous', () => {
    for (const messages of [
      [user, { role: 'system' as const, content: 'late', timestamp: 0 }],
      [{ role: 'system' as const, content: 'first', timestamp: 0 }, { role: 'system' as const, content: 'late', timestamp: 0 }],
      [{ role: 'system' as const, content: 'first', toolsRemoved: [], timestamp: 0 }],
      [{ role: 'system' as const, content: 'first', sections: {}, timestamp: 0 }],
    ]) {
      const normalized = codexProviderContext(incoming({ messages }))
      expect(normalized.messages).toEqual(messages)
    }
  })

  it('is idempotent', () => {
    const once = codexProviderContext(incoming({ systemPrompt: 'instructions', messages: [user], tools: [] }))
    expect(codexProviderContext(once)).toEqual(once)
    expect(normalizeContext(normalizeContext({ messages: [user] }))).toEqual(normalizeContext({ messages: [user] }))
  })
})
