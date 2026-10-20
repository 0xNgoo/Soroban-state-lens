import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { xdr } from '@stellar/stellar-sdk'
import { TreeRow } from '../../components/explorer/TreeRow'
import type { FlatTreeRow } from '../../lib/tree/flatTreeRow'
import type { Node } from '../../types/node'

const primitiveNode: Node = {
  kind: 'primitive',
  path: [],
  scType: 'string',
  value: 'hello',
  raw: { switch: 'ScvString' },
}

function makeRow(partial: Partial<FlatTreeRow> = {}): FlatTreeRow {
  return {
    id: 'row-1',
    parentId: null,
    depth: 2,
    keyPath: 'row-1',
    label: 'entry[0].value',
    kind: 'primitive',
    hasChildren: false,
    childCount: 0,
    node: primitiveNode,
    ...partial,
  }
}

describe('TreeRow', () => {
  it('renders indentation spacer for leaf nodes', () => {
    render(
      <TreeRow
        row={makeRow()}
        rowHeight={40}
        isExpanded={false}
        isSelected={false}
      />,
    )

    expect(screen.queryByRole('button', { name: /toggle/i })).toBeNull()
    expect(screen.getByText('hello')).toBeTruthy()
    expect(screen.getByText('string')).toBeTruthy()
  })

  it('renders expander only for parent rows', () => {
    const row = makeRow({
      hasChildren: true,
      kind: 'vec',
      node: { kind: 'vec', path: [], items: [], raw: { switch: 'ScvVec' } },
    })

    render(
      <TreeRow
        row={row}
        rowHeight={40}
        isExpanded={false}
        isSelected={false}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Toggle entry[0].value' }),
    ).toBeTruthy()
    expect(screen.getByText('vec')).toBeTruthy()
    expect(screen.getByText('0 items')).toBeTruthy()
  })

  it('calls activate handler on row click', () => {
    const onActivate = vi.fn()
    const row = makeRow()

    render(
      <TreeRow
        row={row}
        rowHeight={40}
        isExpanded={false}
        isSelected={false}
        onActivate={onActivate}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open entry[0].value' }))
    expect(onActivate).toHaveBeenCalledWith(row)
  })

  it('copies the original LedgerKey XDR from a root row', async () => {
    const previousClipboard = Object.getOwnPropertyDescriptor(
      navigator,
      'clipboard',
    )
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    const onActivate = vi.fn()
    const ledgerKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: xdr.ScAddress.scAddressTypeContract(new Uint8Array(32)),
        key: xdr.ScVal.scvSymbol('clipboard-fixture'),
        durability: xdr.ContractDataDurability.persistent(),
      }),
    )
    const keyXdr = ledgerKey.toXDR('base64')
    render(
      <TreeRow
        row={makeRow({ depth: 0, rawLedgerKeyXdr: keyXdr })}
        rowHeight={40}
        isExpanded={false}
        isSelected={false}
        onActivate={onActivate}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copy LedgerKey XDR' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(keyXdr))
    expect(onActivate).not.toHaveBeenCalled()
    expect(screen.getByText('Copied')).toBeTruthy()
    expect(
      xdr.LedgerKey.fromXDR(writeText.mock.calls[0]?.[0] ?? '', 'base64')
        .toXDR()
        .toString('hex'),
    ).toBe(ledgerKey.toXDR().toString('hex'))

    if (previousClipboard) {
      Object.defineProperty(navigator, 'clipboard', previousClipboard)
    } else {
      Reflect.deleteProperty(navigator, 'clipboard')
    }
  })
})
