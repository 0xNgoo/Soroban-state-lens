import { describe, it, expect } from 'vitest'
import { isNodeExpanded } from '../../lib/selectors/isNodeExpanded'
import type { LensStore } from '../../store/types'

describe('isNodeExpanded', () => {
  // Helper to create minimal store state
  const createMockState = (expandedNodes: Array<string>): LensStore => ({
    expandedNodes,
    // Minimal required properties for LensStore type
    networkConfig: {
      networkId: 'testnet',
      networkPassphrase: 'Test',
      rpcUrl: 'https://test.com',
    },
    ledgerData: {},
    setNetworkConfig: () => {},
    resetNetworkConfig: () => {},
    setLastCustomUrl: () => {},
    upsertLedgerEntry: () => {},
    upsertLedgerEntries: () => {},
    removeLedgerEntry: () => {},
    clearLedgerData: () => {},
    setExpanded: () => {},
    toggleExpanded: () => {},
    expandAll: () => {},
    collapseAll: () => {},
  })

  describe('happy path', () => {
    it('returns true when nodeId is in expandedNodes', () => {
      const state = createMockState(['node1', 'node2', 'node3'])
      expect(isNodeExpanded(state, 'node2')).toBe(true)
    })

    it('returns false when nodeId is not in expandedNodes', () => {
      const state = createMockState(['node1', 'node2'])
      expect(isNodeExpanded(state, 'node3')).toBe(false)
    })

    it('returns false when expandedNodes is empty', () => {
      const state = createMockState([])
      expect(isNodeExpanded(state, 'node1')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('returns false for blank nodeId (empty string)', () => {
      const state = createMockState(['node1', 'node2'])
      expect(isNodeExpanded(state, '')).toBe(false)
    })

    it('returns false for whitespace-only nodeId', () => {
      const state = createMockState(['node1', 'node2'])
      expect(isNodeExpanded(state, '   ')).toBe(false)
    })

    it('returns false for missing nodes', () => {
      const state = createMockState(['node1', 'node2'])
      expect(isNodeExpanded(state, 'nonexistent')).toBe(false)
    })

    it('handles nodeId with special characters', () => {
      const state = createMockState(['node:1', 'node/2', 'node.3'])
      expect(isNodeExpanded(state, 'node:1')).toBe(true)
      expect(isNodeExpanded(state, 'node/2')).toBe(true)
      expect(isNodeExpanded(state, 'node.3')).toBe(true)
    })
  })

  describe('invalid input', () => {
    it('returns false for undefined-like nodeId', () => {
      const state = createMockState(['node1'])
      expect(isNodeExpanded(state, '')).toBe(false)
    })

    it('handles case-sensitive nodeId matching', () => {
      const state = createMockState(['Node1'])
      expect(isNodeExpanded(state, 'node1')).toBe(false)
      expect(isNodeExpanded(state, 'Node1')).toBe(true)
    })
  })
})
