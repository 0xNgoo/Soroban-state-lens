import { describe, expect, it } from 'vitest'
import {
  decodeLedgerKeyInfo,
  extractContractValueXdr,
} from '../../lib/network/decodeLedgerEntry'
import {
  makeAccountFixture,
  makeContractCodeFixture,
  makeContractDataFixture,
} from './ledgerEntryFixtures'

describe('ledger entry XDR decoding', () => {
  it('extracts a ContractData value ScVal from LedgerEntryData XDR', () => {
    const fixture = makeContractDataFixture()

    expect(extractContractValueXdr(fixture.entryXdr)).toEqual({
      supported: true,
      valueXdr: fixture.valueXdr,
    })
  })

  it.each([
    ['ContractCode', makeContractCodeFixture],
    ['Account', makeAccountFixture],
  ])('does not decode %s LedgerEntryData as a ScVal', (_name, makeFixture) => {
    const fixture = makeFixture()

    expect(extractContractValueXdr(fixture.entryXdr)).toMatchObject({
      supported: false,
      reason: 'unsupported-ledger-entry-type',
    })
  })

  it('returns an explicit unsupported result for malformed LedgerEntryData', () => {
    expect(extractContractValueXdr('invalid-xdr')).toEqual({
      supported: false,
      reason: 'invalid-ledger-entry-data',
    })
  })

  it('classifies decoded LedgerKey variants and reads a symbol root label', () => {
    const dataKey = makeContractDataFixture('counter')
    const codeKey = makeContractCodeFixture()
    const accountKey = makeAccountFixture()

    expect(decodeLedgerKeyInfo(dataKey.keyXdr)).toEqual({
      type: 'ContractData',
      displayName: 'counter',
    })
    expect(decodeLedgerKeyInfo(codeKey.keyXdr)).toEqual({
      type: 'ContractCode',
    })
    expect(decodeLedgerKeyInfo(accountKey.keyXdr)).toEqual({
      type: 'Account',
    })
    expect(decodeLedgerKeyInfo('malformed-key')).toEqual({ type: 'Other' })
  })
})
