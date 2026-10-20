import { beforeEach, describe, expect, it, vi } from 'vitest'
import { xdr } from '@stellar/stellar-sdk'

import { ContractLoadStatus } from '../../store/types'
import { createContractDataLedgerEntry } from '../helpers/ledgerEntryFixtures'

const mockGetLedgerEntries = vi.fn()
const mockDecodeScVal = vi.fn()
const mockCreateDecoderWorkerSafe = vi.fn(() =>
  Promise.resolve({
    decodeScVal: mockDecodeScVal,
  }),
)

vi.mock('../../lib/network/getLedgerEntries', () => ({
  getLedgerEntries: mockGetLedgerEntries,
}))

vi.mock('../../workers/createDecoderWorkerSafe', () => ({
  createDecoderWorkerSafe: mockCreateDecoderWorkerSafe,
}))

describe('loadContract action', () => {
  beforeEach(() => {
    vi.resetModules()
    mockGetLedgerEntries.mockReset()
    mockDecodeScVal.mockReset()
    mockCreateDecoderWorkerSafe.mockClear()
  })

  it('loads, decodes, and stores entries on success', async () => {
    const { resetStore, getStoreState, useLensStore } =
      await import('../../store/lensStore')
    resetStore()

    const entry = createContractDataLedgerEntry({
      contractSeed: 1,
      key: xdr.ScVal.scvSymbol('key-1'),
      value: xdr.ScVal.scvSymbol('decoded'),
    })
    mockGetLedgerEntries.mockResolvedValue({
      entries: [{ ...entry, lastModifiedLedgerSeq: 7 }],
      latestLedger: 100,
    })

    mockDecodeScVal.mockResolvedValue({
      kind: 'primitive',
      path: [],
      scType: 'string',
      value: 'decoded',
      raw: { switch: 'ScvString', value: 'decoded' },
    })

    const networkConfigBefore = getStoreState().networkConfig
    await useLensStore.getState().loadContract(entry.contractId, [entry.key])

    const state = getStoreState()
    expect(state.networkConfig).toEqual(networkConfigBefore)
    expect(state.activeContractId).toBe(entry.contractId)
    expect(state.contractLoadStatus).toBe(ContractLoadStatus.SUCCESS)
    expect(Object.keys(state.ledgerData)).toHaveLength(1)
    expect(
      state.ledgerData[`${entry.contractId}::ContractData::${entry.key}`]
        .rawXdr,
    ).toBe(entry.xdr)
    expect(
      state.ledgerData[`${entry.contractId}::ContractData::${entry.key}`]
        .canonicalKey,
    ).toBe(entry.key)
  })

  it('sets EMPTY when the load succeeds with no entries', async () => {
    const { resetStore, getStoreState, useLensStore } =
      await import('../../store/lensStore')
    resetStore()

    mockGetLedgerEntries.mockResolvedValue({
      entries: [],
      latestLedger: 100,
    })
    mockDecodeScVal.mockResolvedValue({
      kind: 'primitive',
      path: [],
      scType: 'void',
      value: null,
      raw: { switch: 'ScvVoid' },
    })

    await useLensStore.getState().loadContract('C_EMPTY', ['rpc-key-empty'])

    const state = getStoreState()
    expect(state.contractLoadStatus).toBe(ContractLoadStatus.EMPTY)
    expect(state.contractLoadError).toBeNull()
  })

  it('stores matching contract data and ignores keys for a foreign contract', async () => {
    const { resetStore, getStoreState, useLensStore } =
      await import('../../store/lensStore')
    resetStore()

    const matching = createContractDataLedgerEntry({
      contractSeed: 5,
      key: xdr.ScVal.scvSymbol('matching-key'),
    })
    const foreign = createContractDataLedgerEntry({
      contractSeed: 6,
      key: xdr.ScVal.scvSymbol('foreign-key'),
    })
    mockGetLedgerEntries.mockResolvedValue({
      entries: [matching, foreign],
      latestLedger: 100,
    })
    mockDecodeScVal.mockResolvedValue({
      kind: 'primitive',
      path: [],
      scType: 'symbol',
      value: 'decoded',
      raw: { switch: 'ScvSymbol', value: 'decoded' },
    })

    await useLensStore
      .getState()
      .loadContract(matching.contractId, [matching.key, foreign.key])

    const ledgerData = getStoreState().ledgerData
    expect(
      ledgerData[`${matching.contractId}::ContractData::${matching.key}`],
    ).toBeDefined()
    expect(
      ledgerData[`${matching.contractId}::ContractData::${foreign.key}`],
    ).toBeUndefined()
  })

  it('replaces refreshed contract entries while preserving other contracts', async () => {
    const { resetStore, getStoreState, useLensStore } =
      await import('../../store/lensStore')
    resetStore()

    const oldEntry = createContractDataLedgerEntry({
      contractSeed: 2,
      key: xdr.ScVal.scvSymbol('old-key'),
    })
    const otherEntry = createContractDataLedgerEntry({
      contractSeed: 3,
      key: xdr.ScVal.scvSymbol('other-key'),
    })
    const newEntry = createContractDataLedgerEntry({
      contractSeed: 2,
      key: xdr.ScVal.scvSymbol('new-key'),
    })
    mockGetLedgerEntries
      .mockResolvedValueOnce({
        entries: [oldEntry],
        latestLedger: 1,
      })
      .mockResolvedValueOnce({
        entries: [otherEntry],
        latestLedger: 2,
      })
      .mockResolvedValueOnce({
        entries: [newEntry],
        latestLedger: 3,
      })
    mockDecodeScVal.mockResolvedValue({
      kind: 'primitive',
      path: [],
      scType: 'string',
      value: 'decoded',
      raw: { switch: 'ScvString', value: 'decoded' },
    })

    await useLensStore
      .getState()
      .loadContract(oldEntry.contractId, [oldEntry.key])
    await useLensStore
      .getState()
      .loadContract(otherEntry.contractId, [otherEntry.key])
    await useLensStore
      .getState()
      .loadContract(newEntry.contractId, [newEntry.key])

    const ledgerData = getStoreState().ledgerData
    expect(
      ledgerData[`${oldEntry.contractId}::ContractData::${oldEntry.key}`],
    ).toBeUndefined()
    expect(
      ledgerData[`${newEntry.contractId}::ContractData::${newEntry.key}`]
        .rawXdr,
    ).toBe(newEntry.xdr)
    expect(
      ledgerData[`${otherEntry.contractId}::ContractData::${otherEntry.key}`]
        .rawXdr,
    ).toBe(otherEntry.xdr)
  })

  it('sets ERROR when load fails', async () => {
    const { resetStore, getStoreState, useLensStore } =
      await import('../../store/lensStore')
    resetStore()

    mockGetLedgerEntries.mockRejectedValue(new Error('network failure'))

    await useLensStore.getState().loadContract('C_FAIL', ['rpc-key-fail'])

    const state = getStoreState()
    expect(state.contractLoadStatus).toBe(ContractLoadStatus.ERROR)
    expect(state.contractLoadError).toBe('network failure')
  })

  it('ignores stale in-flight results and keeps newest response', async () => {
    const { resetStore, getStoreState, useLensStore } =
      await import('../../store/lensStore')
    resetStore()

    const oldEntry = createContractDataLedgerEntry({
      contractSeed: 4,
      key: xdr.ScVal.scvSymbol('old-key'),
    })
    const newEntry = createContractDataLedgerEntry({
      contractSeed: 4,
      key: xdr.ScVal.scvSymbol('new-key'),
    })
    let resolveFirst:
      | ((value: {
          entries: Array<{
            key: string
            xdr: string
            lastModifiedLedgerSeq?: number
          }>
          latestLedger: number
        }) => void)
      | undefined
    const firstPromise = new Promise<{
      entries: Array<{
        key: string
        xdr: string
        lastModifiedLedgerSeq?: number
      }>
      latestLedger: number
    }>((resolve) => {
      resolveFirst = resolve
    })

    mockGetLedgerEntries
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValueOnce({
        entries: [{ ...newEntry, lastModifiedLedgerSeq: 2 }],
        latestLedger: 2,
      })

    mockDecodeScVal.mockResolvedValue({
      kind: 'primitive',
      path: [],
      scType: 'string',
      value: 'decoded',
      raw: { switch: 'ScvString', value: 'decoded' },
    })

    const firstCall = useLensStore
      .getState()
      .loadContract(oldEntry.contractId, [oldEntry.key])
    const secondCall = useLensStore
      .getState()
      .loadContract(newEntry.contractId, [newEntry.key])

    await secondCall

    if (resolveFirst) {
      resolveFirst({
        entries: [{ ...oldEntry, lastModifiedLedgerSeq: 1 }],
        latestLedger: 1,
      })
    }
    await firstCall

    const state = getStoreState()
    expect(state.contractLoadStatus).toBe(ContractLoadStatus.SUCCESS)
    expect(
      state.ledgerData[`${newEntry.contractId}::ContractData::${newEntry.key}`]
        .rawXdr,
    ).toBe(newEntry.xdr)
    expect(
      state.ledgerData[`${oldEntry.contractId}::ContractData::${oldEntry.key}`],
    ).toBeUndefined()
  })
})
