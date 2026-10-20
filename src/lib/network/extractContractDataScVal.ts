import { xdr } from '@stellar/stellar-sdk'

/**
 * Extracts the ScVal from a contract-data LedgerEntry envelope.
 * Non-contract-data or invalid XDR payloads return null so callers can retain
 * the original entry XDR as a raw value.
 */
export function extractContractDataScValXdr(entryXdr: string): string | null {
  try {
    const entry = xdr.LedgerEntry.fromXDR(entryXdr, 'base64')
    const data = entry.data()

    if (data.switch().name !== 'contractData') {
      return null
    }

    return data.contractData().val().toXDR('base64')
  } catch {
    return null
  }
}
