import { xdr } from '@stellar/stellar-sdk'

/**
 * Extracts the ScVal payload from a contractData LedgerEntry XDR.
 * Unrecognized or malformed XDR is preserved for the decoder's existing
 * error-result fallback.
 */
export function extractContractDataValueXdr(ledgerEntryXdr: string): string {
  try {
    const ledgerEntry = xdr.LedgerEntry.fromXDR(ledgerEntryXdr, 'base64')
    const data = ledgerEntry.data()
    if (data.switch().name !== 'contractData') {
      return ledgerEntryXdr
    }

    return data.contractData().val().toXDR('base64')
  } catch {
    return ledgerEntryXdr
  }
}
