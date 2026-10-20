import { describe, expect, it } from 'vitest'
import { xdr } from '@stellar/stellar-sdk'
import { extractContractDataScValXdr } from '../../lib/network/extractContractDataScVal'

function createContractDataLedgerEntry(
  value: ReturnType<typeof xdr.ScVal.scvVoid>,
): string {
  const contract = xdr.ScAddress.scAddressTypeContract(new Uint8Array(32))
  const data = new xdr.ContractDataEntry({
    ext: new xdr.ExtensionPoint(0),
    contract,
    key: xdr.ScVal.scvSymbol('fixture'),
    durability: xdr.ContractDataDurability.persistent(),
    val: value,
  })
  return new xdr.LedgerEntry({
    lastModifiedLedgerSeq: 7,
    data: xdr.LedgerEntryData.contractData(data),
    ext: new xdr.LedgerEntryExt(0),
  }).toXDR('base64')
}

describe('extractContractDataScValXdr', () => {
  it('extracts nested ScVal XDR from a contract-data LedgerEntry', () => {
    const value = xdr.ScVal.scvVec([xdr.ScVal.scvU32(9)])

    expect(
      extractContractDataScValXdr(createContractDataLedgerEntry(value)),
    ).toBe(value.toXDR('base64'))
  })

  it('returns null for invalid or non-contract-data entry XDR', () => {
    expect(extractContractDataScValXdr('invalid-xdr')).toBeNull()

    const nonContractData = new xdr.LedgerEntry({
      lastModifiedLedgerSeq: 7,
      data: xdr.LedgerEntryData.contractCode(
        new xdr.ContractCodeEntry({
          ext: new xdr.ContractCodeEntryExt(0),
          hash: new Uint8Array(32),
          code: new Uint8Array(),
        }),
      ),
      ext: new xdr.LedgerEntryExt(0),
    })
    expect(
      extractContractDataScValXdr(nonContractData.toXDR('base64')),
    ).toBeNull()
  })
})
