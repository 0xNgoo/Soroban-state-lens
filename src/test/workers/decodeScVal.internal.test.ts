import { describe, expect, it } from 'vitest'
import { xdr } from '@stellar/stellar-sdk'
import { decoderWorkerApi } from '../../workers/decoder.worker'
import { isDecoderWorkerError } from '../../types/decoder-worker'

describe('decoderWorkerApi.decodeScVal', () => {
  function expectPlainCloneSafe(value: unknown): void {
    expect(structuredClone(value)).toEqual(value)

    const visit = (candidate: unknown): void => {
      expect(typeof candidate).not.toBe('function')
      if (candidate === null || typeof candidate !== 'object') {
        return
      }

      const prototype = Object.getPrototypeOf(candidate)
      expect([Object.prototype, Array.prototype, null]).toContain(prototype)

      for (const descriptor of Object.values(
        Object.getOwnPropertyDescriptors(candidate),
      )) {
        expect('value' in descriptor).toBe(true)
        visit(descriptor.value)
      }
    }

    visit(value)
  }

  it('should decode a boolean ScVal', async () => {
    const scVal = xdr.ScVal.scvBool(true)
    const xdrString = scVal.toXDR('base64')

    const result = await decoderWorkerApi.decodeScVal({ xdr: xdrString })

    if (isDecoderWorkerError(result)) {
      throw new Error(`Expected success, got error: ${result.message}`)
    }

    expect(result.kind).toBe('primitive')
    if (result.kind === 'primitive') {
      expect(result.scType).toBe('bool')
      expect(result.value).toBe(true)
    }
  })

  it('should decode a u32 ScVal', async () => {
    const scVal = xdr.ScVal.scvU32(42)
    const xdrString = scVal.toXDR('base64')

    const result = await decoderWorkerApi.decodeScVal({ xdr: xdrString })

    if (isDecoderWorkerError(result)) {
      throw new Error(`Expected success, got error: ${result.message}`)
    }

    expect(result.kind).toBe('primitive')
    if (result.kind === 'primitive') {
      expect(result.scType).toBe('u32')
      expect(result.value).toBe(42)
    }
  })

  it('returns clone-safe raw metadata for nested vectors', async () => {
    const scVal = xdr.ScVal.scvVec([
      xdr.ScVal.scvU32(7),
      xdr.ScVal.scvVec([xdr.ScVal.scvString('nested')]),
    ])
    const result = await decoderWorkerApi.decodeScVal({
      xdr: scVal.toXDR('base64'),
    })

    expect(isDecoderWorkerError(result)).toBe(false)
    if (isDecoderWorkerError(result)) {
      throw new Error(result.message)
    }

    expect(result.kind).toBe('vec')
    if (result.kind !== 'vec') {
      throw new Error(`Expected vec node, got ${result.kind}`)
    }
    expect(result.raw.value).toEqual([
      { switch: 'ScvU32', value: 7 },
      { switch: 'ScvVec', value: [{ switch: 'ScvString', value: 'nested' }] },
    ])
    expectPlainCloneSafe(result)
  })

  it('returns clone-safe raw metadata for nested maps', async () => {
    const scVal = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('items'),
        val: xdr.ScVal.scvVec([xdr.ScVal.scvU32(42)]),
      }),
    ])
    const result = await decoderWorkerApi.decodeScVal({
      xdr: scVal.toXDR('base64'),
    })

    expect(isDecoderWorkerError(result)).toBe(false)
    if (isDecoderWorkerError(result)) {
      throw new Error(result.message)
    }

    expect(result.kind).toBe('map')
    if (result.kind !== 'map') {
      throw new Error(`Expected map node, got ${result.kind}`)
    }
    expect(result.raw.value).toEqual([
      {
        key: { switch: 'ScvSymbol', value: 'items' },
        val: { switch: 'ScvVec', value: [{ switch: 'ScvU32', value: 42 }] },
      },
    ])
    expectPlainCloneSafe(result)
  })

  it('should return an error for invalid XDR', async () => {
    const result = await decoderWorkerApi.decodeScVal({ xdr: 'invalid-xdr' })

    expect(isDecoderWorkerError(result)).toBe(true)
    if (isDecoderWorkerError(result)) {
      expect(result.code).toBe('DECODE_FAILED')
    }
  })
})
