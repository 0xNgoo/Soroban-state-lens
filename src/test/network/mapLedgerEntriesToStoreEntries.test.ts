import { describe, expect, it } from 'vitest'
import { xdr } from '@stellar/stellar-sdk'
import { mapLedgerEntriesToStoreEntries } from '../../lib/network/mapLedgerEntriesToStoreEntries'

describe('mapLedgerEntriesToStoreEntries', () => {
  it('maps representative entries into stable store records', () => {
    const result = mapLedgerEntriesToStoreEntries({
      contractId: 'CONTRACT_1',
      entries: [
        {
          key: 'ledger-key-1',
          xdr: 'xdr-1',
          lastModifiedLedgerSeq: 42,
          liveUntilLedgerSeq: 99,
        },
      ],
      decodedValuesByKey: {
        'ledger-key-1': { kind: 'primitive', scType: 'string', value: 'hello' },
      },
    })

    expect(result).toEqual([
      {
        key: 'CONTRACT_1::Other::ledger-key-1',
        contractId: 'CONTRACT_1',
        type: 'Other',
        value: { kind: 'primitive', scType: 'string', value: 'hello' },
        lastModifiedLedger: 42,
        expirationLedger: 99,
        rawKeyXdr: 'ledger-key-1',
        rawXdr: 'xdr-1',
      },
    ])
  })

  it('falls back safely when optional metadata is missing', () => {
    const result = mapLedgerEntriesToStoreEntries({
      contractId: 'CONTRACT_2',
      entries: [{ key: 'ledger-key-2', xdr: 'xdr-2' }],
    })

    expect(result).toEqual([
      {
        key: 'CONTRACT_2::Other::ledger-key-2',
        contractId: 'CONTRACT_2',
        type: 'Other',
        value: 'xdr-2',
        lastModifiedLedger: 0,
        expirationLedger: undefined,
        rawKeyXdr: 'ledger-key-2',
        rawXdr: 'xdr-2',
      },
    ])
  })

  it('classifies contract data from LedgerKey XDR and retains its raw key', () => {
    const contract = xdr.ScAddress.scAddressTypeContract(new Uint8Array(32))
    const ledgerKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract,
        key: xdr.ScVal.scvSymbol('temporary-key'),
        durability: xdr.ContractDataDurability.temporary(),
      }),
    )
    const keyXdr = ledgerKey.toXDR('base64')

    const [entry] = mapLedgerEntriesToStoreEntries({
      contractId: 'CONTRACT_TEMP',
      entries: [{ key: keyXdr, xdr: 'entry-xdr' }],
    })

    expect(entry).toMatchObject({
      key: `CONTRACT_TEMP::ContractData::${keyXdr}`,
      type: 'ContractData',
      durability: 'Temporary',
      rawKeyXdr: keyXdr,
    })
    expect(
      xdr.LedgerKey.fromXDR(entry.rawKeyXdr ?? '', 'base64')
        .toXDR()
        .toString('hex'),
    ).toBe(ledgerKey.toXDR().toString('hex'))
  })

  it('maps multiple entries deterministically', () => {
    const result = mapLedgerEntriesToStoreEntries({
      contractId: 'CONTRACT_3',
      entries: [
        { key: 'a', xdr: 'xdr-a', lastModifiedLedgerSeq: 1 },
        { key: 'b', xdr: 'xdr-b', lastModifiedLedgerSeq: 2 },
      ],
    })

    expect(result).toHaveLength(2)
    expect(result[0]?.key).toBe('CONTRACT_3::Other::a')
    expect(result[1]?.key).toBe('CONTRACT_3::Other::b')
  })
})
