import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ContractLoadStatus } from '../../store/types'
import {
  makeAccountFixture,
  makeContractCodeFixture,
  makeContractDataFixture,
} from '../network/ledgerEntryFixtures'

const mockGetLedgerEntries = vi.fn()
const mockDecodeScVal = vi.fn()
const mockTerminateDecoderWorkerSafe = vi.fn()
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
  terminateDecoderWorkerSafe: mockTerminateDecoderWorkerSafe,
}))

describe('loadContract action', () => {
  beforeEach(() => {
    vi.resetModules()
    mockGetLedgerEntries.mockReset()
    mockDecodeScVal.mockReset()
    mockCreateDecoderWorkerSafe.mockClear()
    mockTerminateDecoderWorkerSafe.mockReset()
  })

  it('loads, decodes, and stores entries on success', async () => {
    const { resetStore, getStoreState, useLensStore } =
      await import('../../store/lensStore')
    resetStore()
    const fixture = makeContractDataFixture()

    mockGetLedgerEntries.mockResolvedValue({
      entries: [
        {
          key: fixture.keyXdr,
          xdr: fixture.entryXdr,
          lastModifiedLedgerSeq: 7,
        },
      ],
      latestLedger: 100,
    })

    mockDecodeScVal.mockResolvedValue({
      kind: 'primitive',
      path: [],
      scType: 'string',
      value: 'decoded',
      raw: { switch: 'ScvString', value: 'decoded' },
    })

    await useLensStore.getState().loadContract('C1', ['rpc-key-1'])

    const state = getStoreState()
    expect(state.activeContractId).toBe('C1')
    expect(state.contractLoadStatus).toBe(ContractLoadStatus.SUCCESS)
    expect(Object.keys(state.ledgerData)).toHaveLength(1)
    expect(
      state.ledgerData[`C1::ContractData::${fixture.keyXdr}`],
    ).toMatchObject({
      value: expect.objectContaining({ value: 'decoded' }),
      rawXdr: fixture.entryXdr,
      displayName: 'counter',
    })
    expect(mockDecodeScVal).toHaveBeenCalledWith({ xdr: fixture.valueXdr })
  })

  it('stores a safe reason beside raw XDR when decoding returns an error', async () => {
    const { resetStore, getStoreState, useLensStore } =
      await import('../../store/lensStore')
    resetStore()
    const fixture = makeContractDataFixture('decode-error')

    mockGetLedgerEntries.mockResolvedValue({
      entries: [{ key: fixture.keyXdr, xdr: fixture.entryXdr }],
      latestLedger: 100,
    })
    mockDecodeScVal.mockResolvedValue({
      code: 'DECODE_FAILED',
      message: 'Malformed ScVal XDR',
      details: { stack: 'private stack trace' },
    })

    await useLensStore.getState().loadContract('C_DECODE_ERROR', ['rpc-key'])

    const entry =
      getStoreState().ledgerData[
        `C_DECODE_ERROR::ContractData::${fixture.keyXdr}`
      ]
    expect(entry.value).toBe(fixture.entryXdr)
    expect(entry.rawXdr).toBe(fixture.entryXdr)
    expect(entry.decodeErrorReason).toBe('Malformed ScVal XDR')
    expect(entry.decodeErrorReason).not.toContain('private stack trace')
  })

  it('restarts a failed decoder worker and continues decoding later entries', async () => {
    const { resetStore, getStoreState, useLensStore } =
      await import('../../store/lensStore')
    resetStore()
    const failedFixture = makeContractDataFixture('failed')
    const validFixture = makeContractDataFixture('valid')

    const failedWorker = {
      decodeScVal: vi.fn().mockRejectedValue(new Error('worker crashed')),
    }
    const replacementWorker = {
      decodeScVal: vi.fn().mockResolvedValue({
        kind: 'primitive',
        path: [],
        scType: 'string',
        value: 'decoded sibling',
        raw: { switch: 'ScvString', value: 'decoded sibling' },
      }),
    }
    mockCreateDecoderWorkerSafe
      .mockImplementationOnce(() => Promise.resolve(failedWorker))
      .mockImplementationOnce(() => Promise.resolve(replacementWorker))
    mockGetLedgerEntries.mockResolvedValue({
      entries: [
        { key: failedFixture.keyXdr, xdr: failedFixture.entryXdr },
        { key: validFixture.keyXdr, xdr: validFixture.entryXdr },
      ],
      latestLedger: 100,
    })

    await useLensStore.getState().loadContract('C_RECOVER', ['rpc-key'])

    const state = getStoreState()
    expect(state.contractLoadStatus).toBe(ContractLoadStatus.SUCCESS)
    expect(
      state.ledgerData[`C_RECOVER::ContractData::${failedFixture.keyXdr}`],
    ).toMatchObject({
      value: failedFixture.entryXdr,
      rawXdr: failedFixture.entryXdr,
      decodeErrorReason: 'worker crashed',
    })
    expect(
      state.ledgerData[`C_RECOVER::ContractData::${validFixture.keyXdr}`].value,
    ).toMatchObject({
      value: 'decoded sibling',
    })
    expect(mockCreateDecoderWorkerSafe).toHaveBeenCalledTimes(2)
    expect(mockTerminateDecoderWorkerSafe).toHaveBeenCalledWith(failedWorker)
    expect(mockTerminateDecoderWorkerSafe).toHaveBeenCalledWith(
      replacementWorker,
    )
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

  it('decodes only ContractData values and preserves non-data LedgerEntry XDR', async () => {
    const { resetStore, getStoreState, useLensStore } =
      await import('../../store/lensStore')
    resetStore()
    const dataFixture = makeContractDataFixture('counter')
    const codeFixture = makeContractCodeFixture()
    const accountFixture = makeAccountFixture()
    const decodedValue = {
      kind: 'primitive',
      path: [],
      scType: 'u32',
      value: 42,
      raw: { switch: 'ScvU32', value: 42 },
    }

    mockGetLedgerEntries.mockResolvedValue({
      entries: [
        { key: dataFixture.keyXdr, xdr: dataFixture.entryXdr },
        { key: codeFixture.keyXdr, xdr: codeFixture.entryXdr },
        { key: accountFixture.keyXdr, xdr: accountFixture.entryXdr },
      ],
      latestLedger: 100,
    })
    mockDecodeScVal.mockResolvedValue(decodedValue)

    await useLensStore.getState().loadContract('C_VARIANTS', ['rpc-keys'])

    const entries = Object.values(getStoreState().ledgerData)
    expect(mockDecodeScVal).toHaveBeenCalledTimes(1)
    expect(mockDecodeScVal).toHaveBeenCalledWith({ xdr: dataFixture.valueXdr })
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'ContractData',
          value: decodedValue,
          rawXdr: dataFixture.entryXdr,
          displayName: 'counter',
        }),
        expect.objectContaining({
          type: 'ContractCode',
          value: codeFixture.entryXdr,
          rawXdr: codeFixture.entryXdr,
        }),
        expect.objectContaining({
          type: 'Account',
          value: accountFixture.entryXdr,
          rawXdr: accountFixture.entryXdr,
        }),
      ]),
    )
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
    const oldFixture = makeContractDataFixture('old-stale')
    const newFixture = makeContractDataFixture('new-stale')

    mockGetLedgerEntries
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValueOnce({
        entries: [
          {
            key: newFixture.keyXdr,
            xdr: newFixture.entryXdr,
            lastModifiedLedgerSeq: 2,
          },
        ],
        latestLedger: 2,
      })

    mockDecodeScVal.mockResolvedValue({
      kind: 'primitive',
      path: [],
      scType: 'string',
      value: 'decoded',
      raw: { switch: 'ScvString', value: 'decoded' },
    })

    const firstCall = useLensStore.getState().loadContract('C_STALE', ['k1'])
    const secondCall = useLensStore.getState().loadContract('C_STALE', ['k2'])

    await secondCall

    if (resolveFirst) {
      resolveFirst({
        entries: [
          {
            key: oldFixture.keyXdr,
            xdr: oldFixture.entryXdr,
            lastModifiedLedgerSeq: 1,
          },
        ],
        latestLedger: 1,
      })
    }
    await firstCall

    const state = getStoreState()
    expect(state.contractLoadStatus).toBe(ContractLoadStatus.SUCCESS)
    expect(
      state.ledgerData[`C_STALE::ContractData::${newFixture.keyXdr}`].rawXdr,
    ).toBe(newFixture.entryXdr)
    expect(
      state.ledgerData[`C_STALE::ContractData::${oldFixture.keyXdr}`],
    ).toBeUndefined()
  })

  it('ignores stale results that finish decoding after a newer request', async () => {
    const { resetStore, getStoreState, useLensStore } =
      await import('../../store/lensStore')
    resetStore()

    let resolveFirstDecode: ((value: unknown) => void) | undefined
    const firstDecode = new Promise<unknown>((resolve) => {
      resolveFirstDecode = resolve
    })
    const firstWorker = { decodeScVal: vi.fn().mockReturnValue(firstDecode) }
    const oldFixture = makeContractDataFixture('old-decode-stale')
    const newFixture = makeContractDataFixture('new-decode-stale')
    const secondWorker = {
      decodeScVal: vi.fn().mockResolvedValue({
        kind: 'primitive',
        path: [],
        scType: 'string',
        value: 'new',
        raw: { switch: 'ScvString', value: 'new' },
      }),
    }

    mockCreateDecoderWorkerSafe
      .mockImplementationOnce(() => Promise.resolve(firstWorker))
      .mockImplementationOnce(() => Promise.resolve(secondWorker))
    mockGetLedgerEntries
      .mockResolvedValueOnce({
        entries: [
          {
            key: oldFixture.keyXdr,
            xdr: oldFixture.entryXdr,
            lastModifiedLedgerSeq: 1,
          },
        ],
        latestLedger: 1,
      })
      .mockResolvedValueOnce({
        entries: [
          {
            key: newFixture.keyXdr,
            xdr: newFixture.entryXdr,
            lastModifiedLedgerSeq: 2,
          },
        ],
        latestLedger: 2,
      })

    const firstCall = useLensStore
      .getState()
      .loadContract('C_DECODE_STALE', ['old'])
    for (
      let attempt = 0;
      attempt < 10 && !firstWorker.decodeScVal.mock.calls.length;
      attempt += 1
    ) {
      await Promise.resolve()
    }

    const secondCall = useLensStore
      .getState()
      .loadContract('C_DECODE_STALE', ['new'])
    await secondCall
    resolveFirstDecode?.({
      kind: 'primitive',
      path: [],
      scType: 'string',
      value: 'old',
      raw: { switch: 'ScvString', value: 'old' },
    })
    await firstCall

    const state = getStoreState()
    expect(state.contractLoadStatus).toBe(ContractLoadStatus.SUCCESS)
    expect(
      state.ledgerData[`C_DECODE_STALE::ContractData::${newFixture.keyXdr}`]
        .rawXdr,
    ).toBe(newFixture.entryXdr)
    expect(
      state.ledgerData[`C_DECODE_STALE::ContractData::${oldFixture.keyXdr}`],
    ).toBeUndefined()
  })
})
