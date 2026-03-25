import { isContractId } from '@/lib/validation/isContractId'
import { isRpcUrl } from '@/lib/validation/isRpcUrl'

export function canSubmitContractLookup(input: {
  contractId: string
  rpcUrl: string
}): { allowed: boolean; reason?: string } {
  if (!input.contractId || !input.contractId.trim()) {
    return { allowed: false, reason: 'Contract ID is required' }
  }

  if (!input.rpcUrl || !input.rpcUrl.trim()) {
    return { allowed: false, reason: 'RPC URL is required' }
  }

  if (!isContractId(input.contractId)) {
    return { allowed: false, reason: 'Invalid contract ID' }
  }

  if (!isRpcUrl(input.rpcUrl)) {
    return { allowed: false, reason: 'Invalid RPC URL' }
  }

  return { allowed: true }
}
