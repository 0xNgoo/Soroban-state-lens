import { makeLedgerEntryKey } from '../storage/makeLedgerEntryKey'
import type { LedgerEntry as RpcLedgerEntry } from './getLedgerEntries'
import type { DecodedLedgerEntryMetadata } from './decodeLedgerEntry'
import type { LedgerEntry as StoreLedgerEntry } from '../../store/types'

interface MapLedgerEntriesParams {
  contractId: string
  entries: Array<RpcLedgerEntry>
  decodedValuesByKey?: Partial<Record<string, unknown>>
  decodedMetadataByKey?: Partial<Record<string, DecodedLedgerEntryMetadata>>
  decodedKeyPreviewsByKey?: Partial<Record<string, string>>
}

/**
 * Maps raw RPC ledger-entry payloads into the canonical store entry shape.
 */
export function mapLedgerEntriesToStoreEntries(
  params: MapLedgerEntriesParams,
): Array<StoreLedgerEntry> {
  const {
    contractId,
    entries,
    decodedValuesByKey = {},
    decodedMetadataByKey = {},
    decodedKeyPreviewsByKey = {},
  } = params
  return entries.map((entry) => {
    const metadata = decodedMetadataByKey[entry.key]
    const last = entry.lastModifiedLedgerSeq
    const live = entry.liveUntilLedgerSeq

    const lastModifiedLedger =
      typeof last === 'number' &&
      Number.isFinite(last) &&
      last >= 0 &&
      Number.isInteger(last)
        ? last
        : 0

    const expirationLedger =
      typeof live === 'number' &&
      Number.isFinite(live) &&
      live >= 0 &&
      Number.isInteger(live)
        ? live
        : undefined

    return {
      key: makeLedgerEntryKey(contractId, metadata?.type ?? 'Other', entry.key),
      contractId,
      type: metadata?.type ?? 'Other',
      ...(metadata?.durability ? { durability: metadata.durability } : {}),
      value:
        decodedValuesByKey[entry.key] !== undefined
          ? decodedValuesByKey[entry.key]
          : entry.xdr,
      canonicalKey: entry.key,
      ...(decodedKeyPreviewsByKey[entry.key]
        ? { displayKey: decodedKeyPreviewsByKey[entry.key] }
        : {}),
      lastModifiedLedger,
      expirationLedger,
      rawXdr: entry.xdr,
    }
  })
}
