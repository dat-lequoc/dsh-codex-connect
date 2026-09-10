import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { parseOpenAICodexVerifiedCompatibility } from '../src/update.ts'

// One supported host means one published verification record. Earlier hosts are
// unsupported, so their historical pairings are no longer part of the contract.
const catalog = {
  schemaVersion: 1 as const,
  checkedAt: '2026-09-10',
  latestDshVersion: '0.1.5-rc.1',
  pluginVersions: [
    { version: '0.1.0-alpha.4.34', verifiedDshVersions: ['0.1.5-rc.1'] },
  ],
}

describe('Codex Connect verified DSH compatibility', () => {
  it('keeps the committed public catalog valid', async () => {
    const contents = await readFile(new URL('../verified-compatibility.json', import.meta.url), 'utf8')
    expect(parseOpenAICodexVerifiedCompatibility(JSON.parse(contents) as unknown)).toMatchObject({
      latestDshVersion: '0.1.5-rc.1',
      pluginVersions: catalog.pluginVersions,
    })
  })

  it('parses exact plugin-to-DSH verification records', () => {
    expect(parseOpenAICodexVerifiedCompatibility(catalog)).toEqual(catalog)
    expect(parseOpenAICodexVerifiedCompatibility({ ...catalog, schemaVersion: 2 })).toBeUndefined()
    expect(parseOpenAICodexVerifiedCompatibility({
      ...catalog,
      pluginVersions: [catalog.pluginVersions[0], { ...catalog.pluginVersions[0] }],
    })).toBeUndefined()
    expect(parseOpenAICodexVerifiedCompatibility({
      ...catalog,
      pluginVersions: [{ version: '0.1.0-alpha.4.15', verifiedDshVersions: ['bad-version'] }],
    })).toBeUndefined()
  })

})
