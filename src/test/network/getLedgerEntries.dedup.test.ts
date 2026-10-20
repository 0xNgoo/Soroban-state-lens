import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AbortError,
  getLedgerEntries,
} from '../../lib/network/getLedgerEntries'

describe('getLedgerEntries deduplication and RPC URL normalization', () => {
  const mockRpcUrl = 'https://test.rpc.url/'

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('deduplicates returned entries and keeps first-seen', async () => {
    const mockRpcResponse = {
      jsonrpc: '2.0',
      id: 1,
      result: {
        entries: [
          { key: 'k1', xdr: 'a' },
          { key: 'k1', xdr: 'b' },
          { key: 'k2', xdr: 'c' },
        ],
        latestLedger: 5,
      },
    }

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockRpcResponse,
    } as Response)

    const res = await getLedgerEntries({ rpcUrl: mockRpcUrl, keys: [] })

    expect(res.latestLedger).toBe(5)
    expect(res.entries).toEqual([
      {
        key: 'k1',
        xdr: 'a',
        lastModifiedLedgerSeq: undefined,
        liveUntilLedgerSeq: undefined,
      },
      {
        key: 'k2',
        xdr: 'c',
        lastModifiedLedgerSeq: undefined,
        liveUntilLedgerSeq: undefined,
      },
    ])
  })

  it('throws AbortError when signal is aborted before call', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(
      getLedgerEntries({
        rpcUrl: mockRpcUrl,
        keys: [],
        signal: controller.signal,
      }),
    ).rejects.toThrow(AbortError)
  })

  it.each([199, 200])('allows %i unique request keys', async (keyCount) => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: { entries: [], latestLedger: 5 },
        }),
    } as Response)

    const keys = Array.from({ length: keyCount }, (_, index) => `key-${index}`)
    await expect(
      getLedgerEntries({ rpcUrl: mockRpcUrl, keys }),
    ).resolves.toMatchObject({ entries: [], latestLedger: 5 })

    const requestBody = JSON.parse(
      vi.mocked(fetch).mock.calls[0]?.[1]?.body as string,
    ) as { params: { keys: Array<string> } }
    expect(requestBody.params.keys).toHaveLength(keyCount)
  })

  it('deduplicates before enforcing the request limit', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: { entries: [], latestLedger: 5 },
        }),
    } as Response)

    const keys = Array.from({ length: 200 }, (_, index) => `key-${index}`)
    keys.push('key-0')

    await expect(
      getLedgerEntries({ rpcUrl: mockRpcUrl, keys }),
    ).resolves.toMatchObject({ entries: [], latestLedger: 5 })

    const requestBody = JSON.parse(
      vi.mocked(fetch).mock.calls[0]?.[1]?.body as string,
    ) as { params: { keys: Array<string> } }
    expect(requestBody.params.keys).toHaveLength(200)
  })

  it('rejects 201 unique keys before fetching', async () => {
    const keys = Array.from({ length: 201 }, (_, index) => `key-${index}`)

    await expect(
      getLedgerEntries({ rpcUrl: mockRpcUrl, keys }),
    ).rejects.toThrow('Too many ledger entry keys: maximum is 200')
    expect(fetch).not.toHaveBeenCalled()
  })
})
