import { describe, expect, it } from 'vitest'
import { mapScvAddressToString } from '../../workers/decoder/mapScvAddressToString'

describe('mapScvAddressToString - map address-like inputs to safe strings', () => {
  // Happy path: plain strings
  it('returns plain string as-is', () => {
    const address = 'GDZST3XVCDTUJ76ZAV2HA72KYXM4Y5TCFMMNZTDDXXVYQ4BSVGXL6EH2'
    const result = mapScvAddressToString(address)
    expect(result).toBe(address)
  })

  it('returns contract address string as-is', () => {
    const address = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4'
    const result = mapScvAddressToString(address)
    expect(result).toBe(address)
  })

  it('returns empty string as-is', () => {
    const result = mapScvAddressToString('')
    expect(result).toBe('')
  })

  // Edge case: objects with toString
  it('uses toString() method from custom object', () => {
    const customObj = {
      toString: () => 'CUSTOM_ADDRESS_STRING',
    }
    const result = mapScvAddressToString(customObj)
    expect(result).toBe('CUSTOM_ADDRESS_STRING')
  })

  it('uses toString() from standard objects (Date)', () => {
    const date = new Date('2026-03-24T00:00:00Z')
    const result = mapScvAddressToString(date)
    expect(result).toBe(date.toString())
  })

  // Invalid inputs: null and undefined
  it('returns fallback string for null', () => {
    const result = mapScvAddressToString(null)
    expect(result).toBe('__unsupported_address_null')
  })

  it('returns fallback string for undefined', () => {
    const result = mapScvAddressToString(undefined)
    expect(result).toBe('__unsupported_address_undefined')
  })

  // Invalid inputs: other types
  it('returns fallback string for number', () => {
    const result = mapScvAddressToString(123)
    expect(result).toBe('__unsupported_address_invalid')
  })

  it('returns fallback string for boolean', () => {
    const result = mapScvAddressToString(true)
    expect(result).toBe('__unsupported_address_invalid')
  })

  it('returns fallback string for plain object without useful toString', () => {
    const plainObj = { key: 'value' }
    const result = mapScvAddressToString(plainObj)
    expect(result).toBe('__unsupported_address_invalid')
  })

  it('returns fallback string for array', () => {
    const result = mapScvAddressToString(['item1', 'item2'])
    expect(result).toBe('__unsupported_address_invalid')
  })

  // Edge case: toString that throws
  it('returns fallback string when toString() throws', () => {
    const badObj = {
      toString: () => {
        throw new Error('toString failed')
      },
    }
    const result = mapScvAddressToString(badObj)
    expect(result).toBe('__unsupported_address_invalid')
  })

  // Edge case: toString returns non-string
  it('returns fallback string when toString() returns non-string', () => {
    const badObj = {
      toString: () => 123,
    }
    const result = mapScvAddressToString(badObj)
    expect(result).toBe('__unsupported_address_invalid')
  })

  // Determinism check
  it('is deterministic for same input', () => {
    const address = 'GDZST3XVCDTUJ76ZAV2HA72KYXM4Y5TCFMMNZTDDXXVYQ4BSVGXL6EH2'
    const result1 = mapScvAddressToString(address)
    const result2 = mapScvAddressToString(address)
    expect(result1).toBe(result2)
  })

  it('is deterministic for null', () => {
    const result1 = mapScvAddressToString(null)
    const result2 = mapScvAddressToString(null)
    expect(result1).toBe(result2)
  })
})
