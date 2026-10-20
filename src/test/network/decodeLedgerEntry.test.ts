import { describe, expect, it } from 'vitest'
import { xdr } from '@stellar/stellar-sdk'

import { decodeLedgerEntryMetadata } from '../../lib/network/decodeLedgerEntry'
import { createContractDataLedgerEntry } from '../helpers/ledgerEntryFixtures'

describe('decodeLedgerEntryMetadata', () => {
  it('extracts the contract, storage key, value, and durability from XDR', () => {
    const fixture = createContractDataLedgerEntry({
      contractSeed: 1,
      key: xdr.ScVal.scvVec([
        xdr.ScVal.scvSymbol('owner'),
        xdr.ScVal.scvSymbol('balance'),
      ]),
      value: xdr.ScVal.scvSymbol('stored-value'),
    })

    expect(decodeLedgerEntryMetadata(fixture)).toEqual({
      type: 'ContractData',
      contractId: fixture.contractId,
      durability: 'Persistent',
      storageKeyXdr: xdr.ScVal.scvVec([
        xdr.ScVal.scvSymbol('owner'),
        xdr.ScVal.scvSymbol('balance'),
      ]).toXDR('base64'),
      valueXdr: xdr.ScVal.scvSymbol('stored-value').toXDR('base64'),
    })
  })

  it('rejects key and entry data that describe different storage keys', () => {
    const fixture = createContractDataLedgerEntry({
      contractSeed: 2,
      key: xdr.ScVal.scvSymbol('key'),
    })
    const mismatched = createContractDataLedgerEntry({
      contractSeed: 2,
      key: xdr.ScVal.scvSymbol('other-key'),
    })

    expect(() =>
      decodeLedgerEntryMetadata({ ...fixture, xdr: mismatched.xdr }),
    ).toThrow('Contract-data ledger key does not match entry data')
  })
})
