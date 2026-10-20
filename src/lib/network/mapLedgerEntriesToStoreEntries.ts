import { makeLedgerEntryKey } from '../storage/makeLedgerEntryKey'
import { classifyLedgerKey } from './classifyLedgerKey'
import type { LedgerEntry as RpcLedgerEntry } from './getLedgerEntries'
import type { LedgerEntry as StoreLedgerEntry } from '../../store/types'

interface MapLedgerEntriesParams {
  contractId: string
  entries: Array<RpcLedgerEntry>
  decodedValuesByKey?: Record<string, unknown>
}

/**
 * Maps raw RPC ledger-entry payloads into the canonical store entry shape.
 */
export function mapLedgerEntriesToStoreEntries(
  params: MapLedgerEntriesParams,
): Array<StoreLedgerEntry> {
  const { contractId, entries, decodedValuesByKey = {} } = params

  return entries.map((entry) => {
    const classification = classifyLedgerKey(entry.key)
    return {
      key: makeLedgerEntryKey(contractId, classification.type, entry.key),
      contractId,
      ...classification,
      value:
        decodedValuesByKey[entry.key] !== undefined
          ? decodedValuesByKey[entry.key]
          : entry.xdr,
      lastModifiedLedger: entry.lastModifiedLedgerSeq ?? 0,
      expirationLedger: entry.liveUntilLedgerSeq,
      rawKeyXdr: entry.key,
      rawXdr: entry.xdr,
    }
  })
}
