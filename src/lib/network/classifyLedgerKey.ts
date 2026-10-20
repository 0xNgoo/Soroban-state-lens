import { xdr } from '@stellar/stellar-sdk'

import type { LedgerEntry as StoreLedgerEntry } from '../../store/types'

export interface LedgerKeyClassification {
  type: StoreLedgerEntry['type']
  durability?: StoreLedgerEntry['durability']
}

const OTHER_KEY: LedgerKeyClassification = { type: 'Other' }

/**
 * Classifies a serialized LedgerKey by its decoded XDR variant.
 */
export function classifyLedgerKey(keyXdr: string): LedgerKeyClassification {
  try {
    const key = xdr.LedgerKey.fromXDR(keyXdr, 'base64')

    switch (key.switch().name) {
      case 'account':
        return { type: 'Account' }
      case 'trustline':
        return { type: 'Trustline' }
      case 'contractCode':
        return { type: 'ContractCode' }
      case 'contractData': {
        const contractData = key.contractData()
        if (
          contractData.key().switch().name === 'scvLedgerKeyContractInstance'
        ) {
          return { type: 'ContractData', durability: 'Instance' }
        }
        return {
          type: 'ContractData',
          durability:
            contractData.durability().name === 'temporary'
              ? 'Temporary'
              : 'Persistent',
        }
      }
      default:
        return OTHER_KEY
    }
  } catch {
    return OTHER_KEY
  }
}
