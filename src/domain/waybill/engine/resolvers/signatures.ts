import type { RawWaybill, SignatureBlock, NormalizedSignature } from '../types'

export function resolveSignatures(waybill: RawWaybill): SignatureBlock {
  if (!waybill.custom_fields?.signatures) {
    return { sender: null, receiver: null }
  }

  const sigs = waybill.custom_fields.signatures

  return {
    sender: normalizeSignature(sigs.sender),
    receiver: normalizeSignature(sigs.receiver),
  }
}

function normalizeSignature(
  sig: { image_url?: string; drawn_data_url?: string } | undefined,
): NormalizedSignature | null {
  if (!sig) return null

  const url = sig.image_url || sig.drawn_data_url
  if (!url) return null

  return { url, width: 110, height: 42 }
}
