import { makeLedgerEntryKey } from '../storage/makeLedgerEntryKey'
import type { LedgerKeyInfo } from './decodeLedgerEntry'
import type { LedgerEntry as RpcLedgerEntry } from './getLedgerEntries'
import type { LedgerEntry as StoreLedgerEntry } from '../../store/types'

interface MapLedgerEntriesParams {
  contractId: string
  entries: Array<RpcLedgerEntry>
  decodedValuesByKey?: Record<string, unknown>
  decodeErrorReasonsByKey?: Record<string, string>
  keyInfoByKey?: Record<string, LedgerKeyInfo>
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
    decodeErrorReasonsByKey = {},
    keyInfoByKey = {},
  } = params

  return entries
    .filter((entry) => typeof entry.key === 'string' && entry.key.trim() !== '')
    .map((entry) => {
      const keyInfo = keyInfoByKey[entry.key] ?? { type: 'Other' as const }
      const type = keyInfo.type
      const decodeErrorReason = decodeErrorReasonsByKey[entry.key]

      return {
        key: makeLedgerEntryKey(contractId, type, entry.key),
        contractId,
        type,
        ...(keyInfo.displayName ? { displayName: keyInfo.displayName } : {}),
        value:
          decodedValuesByKey[entry.key] !== undefined
            ? decodedValuesByKey[entry.key]
            : entry.xdr,
        lastModifiedLedger: entry.lastModifiedLedgerSeq ?? 0,
        expirationLedger: entry.liveUntilLedgerSeq,
        rawXdr: entry.xdr,
        ...(decodeErrorReason ? { decodeErrorReason } : {}),
      }
    })
}
