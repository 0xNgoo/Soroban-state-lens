import { xdr } from '@stellar/stellar-sdk'
import type { LedgerEntry } from '../../store/types'

interface XdrSwitch {
  name: string
}

interface XdrScVal {
  switch: () => XdrSwitch
  value: () => unknown
  toXDR: (format: 'base64') => string
}

interface XdrContractData {
  key: () => XdrScVal
  val: () => XdrScVal
}

interface XdrLedgerEntryData {
  switch: () => XdrSwitch
  contractData: () => XdrContractData
}

interface XdrLedgerKey {
  switch: () => XdrSwitch
  contractData: () => { key: () => XdrScVal }
}

export type ExtractContractValueResult =
  | { supported: true; valueXdr: string }
  | {
      supported: false
      reason: 'invalid-ledger-entry-data' | 'unsupported-ledger-entry-type'
      entryType?: string
    }

export interface LedgerKeyInfo {
  type: LedgerEntry['type']
  displayName?: string
}

/**
 * Extracts the ScVal payload only from ContractData LedgerEntryData XDR.
 */
export function extractContractValueXdr(
  ledgerEntryDataXdr: string,
): ExtractContractValueResult {
  try {
    const ledgerEntryData = xdr.LedgerEntryData.fromXDR(
      ledgerEntryDataXdr,
      'base64',
    ) as XdrLedgerEntryData

    if (ledgerEntryData.switch().name !== 'contractData') {
      return {
        supported: false,
        reason: 'unsupported-ledger-entry-type',
        entryType: ledgerEntryData.switch().name,
      }
    }

    return {
      supported: true,
      valueXdr: ledgerEntryData.contractData().val().toXDR('base64'),
    }
  } catch {
    return { supported: false, reason: 'invalid-ledger-entry-data' }
  }
}

/**
 * Classifies a serialized LedgerKey by its XDR variant and reads a readable
 * root label from ContractData symbol/string keys when available.
 */
export function decodeLedgerKeyInfo(ledgerKeyXdr: string): LedgerKeyInfo {
  try {
    const ledgerKey = xdr.LedgerKey.fromXDR(
      ledgerKeyXdr,
      'base64',
    ) as XdrLedgerKey
    const variant = ledgerKey.switch().name

    switch (variant) {
      case 'contractData': {
        const key = ledgerKey.contractData().key()
        const keyType = key.switch().name
        const value = key.value()
        const displayName =
          typeof value === 'string'
            ? value
            : value !== null &&
                typeof value === 'object' &&
                'toString' in value &&
                typeof value.toString === 'function'
              ? (
                  value as {
                    toString: (encoding?: string) => string
                  }
                ).toString('utf8')
              : undefined
        return {
          type: 'ContractData',
          ...(keyType === 'scvSymbol' || keyType === 'scvString'
            ? { displayName }
            : {}),
        }
      }
      case 'contractCode':
        return { type: 'ContractCode' }
      case 'account':
        return { type: 'Account' }
      case 'trustline':
        return { type: 'Trustline' }
      default:
        return { type: 'Other' }
    }
  } catch {
    return { type: 'Other' }
  }
}
