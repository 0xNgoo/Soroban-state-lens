import { describe, expect, it } from 'vitest'
import { canSubmitContractLookup } from '@/components/global/contractLookupSubmitGuard'

describe('canSubmitContractLookup', () => {
  it('allows valid contract ID and RPC URL', () => {
    // Valid 56-character base32 uppercase contract ID starting with C
    const validContract =
      'CC42QZWUV2R7PUN2SZZW3Y3A43UUB5L2U3B4K3O5EUT7Y4I2O2W34EWM'
    const validRpc = 'https://rpc.mainnet.stellar.org'

    expect(
      canSubmitContractLookup({ contractId: validContract, rpcUrl: validRpc }),
    ).toEqual({ allowed: true })
  })

  it('rejects blank contract ID', () => {
    expect(
      canSubmitContractLookup({
        contractId: '',
        rpcUrl: 'https://rpc.mainnet.stellar.org',
      }),
    ).toEqual({ allowed: false, reason: 'Contract ID is required' })
    expect(
      canSubmitContractLookup({
        contractId: '   ',
        rpcUrl: 'https://rpc.mainnet.stellar.org',
      }),
    ).toEqual({ allowed: false, reason: 'Contract ID is required' })
  })

  it('rejects blank RPC URL', () => {
    const validContract =
      'CC42QZWUV2R7PUN2SZZW3Y3A43UUB5L2U3B4K3O5EUT7Y4I2O2W34EWM'
    expect(
      canSubmitContractLookup({ contractId: validContract, rpcUrl: '' }),
    ).toEqual({ allowed: false, reason: 'RPC URL is required' })
    expect(
      canSubmitContractLookup({ contractId: validContract, rpcUrl: '  ' }),
    ).toEqual({ allowed: false, reason: 'RPC URL is required' })
  })

  it('rejects malformed contract ID', () => {
    const invalidContract = 'INVALID'
    const validRpc = 'https://rpc.mainnet.stellar.org'
    expect(
      canSubmitContractLookup({
        contractId: invalidContract,
        rpcUrl: validRpc,
      }),
    ).toEqual({ allowed: false, reason: 'Invalid contract ID' })
  })

  it('rejects malformed RPC URL', () => {
    const validContract =
      'CC42QZWUV2R7PUN2SZZW3Y3A43UUB5L2U3B4K3O5EUT7Y4I2O2W34EWM'
    const invalidRpc = 'ftp://invalid-url'
    expect(
      canSubmitContractLookup({
        contractId: validContract,
        rpcUrl: invalidRpc,
      }),
    ).toEqual({ allowed: false, reason: 'Invalid RPC URL' })
  })
})
