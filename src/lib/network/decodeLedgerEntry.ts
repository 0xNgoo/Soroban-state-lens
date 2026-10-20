import { Address, xdr } from '@stellar/stellar-sdk'

import type { LedgerEntry as RpcLedgerEntry } from './getLedgerEntries'
import type { LedgerEntry as StoreLedgerEntry } from '../../store/types'

export interface DecodedLedgerEntryMetadata {
  type: StoreLedgerEntry['type']
  contractId?: string
  durability?: StoreLedgerEntry['durability']
  storageKeyXdr?: string
  valueXdr?: string
}

function contractAddressToId(address: unknown): string {
  return Address.fromScVal(xdr.ScVal.scvAddress(address)).toString()
}

function decodeDurability(durability: {
  name: string
}): StoreLedgerEntry['durability'] {
  switch (durability.name) {
    case 'persistent':
      return 'Persistent'
    case 'temporary':
      return 'Temporary'
    default:
      throw new Error(
        `Unsupported contract data durability: ${durability.name}`,
      )
  }
}

/**
 * Decodes the ledger key and entry data XDR returned by getLedgerEntries.
 */
export function decodeLedgerEntryMetadata(
  entry: RpcLedgerEntry,
): DecodedLedgerEntryMetadata {
  const ledgerKey = xdr.LedgerKey.fromXDR(entry.key, 'base64')
  const entryData = xdr.LedgerEntryData.fromXDR(entry.xdr, 'base64')
  const keyType = ledgerKey.switch().name as string
  const dataType = entryData.switch().name as string

  if (keyType === 'contractData') {
    if (dataType !== 'contractData') {
      throw new Error('Contract-data ledger key does not match entry data')
    }

    const keyData = ledgerKey.contractData()
    const entryContractData = entryData.contractData()
    const contractId = contractAddressToId(keyData.contract())
    const entryContractId = contractAddressToId(entryContractData.contract())
    const keyDurability = decodeDurability(keyData.durability())
    const entryDurability = decodeDurability(entryContractData.durability())
    const storageKeyXdr = keyData.key().toXDR('base64') as string
    const entryKeyXdr = entryContractData.key().toXDR('base64') as string

    if (
      contractId !== entryContractId ||
      keyDurability !== entryDurability ||
      storageKeyXdr !== entryKeyXdr
    ) {
      throw new Error('Contract-data ledger key does not match entry data')
    }

    return {
      type: 'ContractData',
      contractId,
      durability: keyDurability,
      storageKeyXdr,
      valueXdr: entryContractData.val().toXDR('base64') as string,
    }
  }

  const typeByKey: Record<string, StoreLedgerEntry['type']> = {
    account: 'Account',
    trustline: 'Trustline',
    contractCode: 'ContractCode',
  }

  const type = typeByKey[keyType] ?? 'Other'
  if (type !== 'Other' && dataType !== keyType) {
    throw new Error(`${keyType} ledger key does not match entry data`)
  }

  return { type }
}
