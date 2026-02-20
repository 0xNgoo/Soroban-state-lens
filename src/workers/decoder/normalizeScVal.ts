// @ts-ignore - resolved at runtime via application bundler
// @ts-ignore - module is provided by the runtime bundle
import { Address, xdr } from '@stellar/stellar-sdk'

export type NormalizedAddressType =
  | 'account'
  | 'contract'
  | 'muxedAccount'
  | 'claimableBalance'
  | 'liquidityPool'
  | 'unknown'

export interface NormalizedAddress {
  type: 'address'
  addressType: NormalizedAddressType
  value: string
}

/**
 * Normalize an `xdr.ScVal` that represents an `ScAddress` into a
 * human-readable StrKey form.
 *
 * For non-address values, this returns `null`.
 */
export function normalizeScVal(scVal: any | null | undefined): NormalizedAddress | null {
  if (!scVal) {
    return null
  }

  if (scVal.switch().value !== xdr.ScValType.scvAddress().value) {
    return null
  }

  const address = Address.fromScVal(scVal)
  const value = address.toString()

  // Infer the address type from the StrKey prefix.
  // G... = ed25519 account, C... = contract, M... = muxed account,
  // B... = claimable balance, P... = liquidity pool.
  let addressType: NormalizedAddressType
  const prefix = value[0]

  switch (prefix) {
    case 'G':
      addressType = 'account'
      break
    case 'C':
      addressType = 'contract'
      break
    case 'M':
      addressType = 'muxedAccount'
      break
    case 'B':
      addressType = 'claimableBalance'
      break
    case 'P':
      addressType = 'liquidityPool'
      break
    default:
      addressType = 'unknown'
  }

  return {
    type: 'address',
    addressType,
    value,
  }
}

