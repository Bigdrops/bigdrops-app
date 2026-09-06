// Behaviour functions — pure, no JSX, no style imports
export { buildPartyLines } from './party'
export { isGroupHeader, isGroupFooter, getGroupLabel, getGroupSubtotal, shouldShowGroupSubtotal } from './group'
export { buildAttachmentItems } from './attachments'
export { resolveColumnLayout } from './columnLayout'
export { resolveTextAlignment } from './alignment'
export { buildTotalsLines, getMainTotal, getBalanceDue, getAmountInWords } from './totals'
export { buildAdvanceSummary } from './advance'
export { getAccentTint } from './getAccentTint'
