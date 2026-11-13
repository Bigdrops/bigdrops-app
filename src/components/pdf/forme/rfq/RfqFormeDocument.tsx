import type React from 'react'
import { normalizeRfqTemplateId, type RfqTemplateId } from '@/domain/rfq/templates'
import type { RfqFormeDocumentProps } from './kit'
import { RfqMosaicDocument } from './RfqMosaicDocument'
import { RfqExecutiveDocument } from './RfqExecutiveDocument'

export type { RfqFormeDocumentProps }

export interface RfqFormeDocumentParams extends RfqFormeDocumentProps {
  template?: RfqTemplateId | string | null
}

export function RfqFormeDocument({ rfq, rows, columns, settings, template }: RfqFormeDocumentParams): React.JSX.Element {
  const normalizedTemplate = normalizeRfqTemplateId(template ?? rfq.template_id)
  if (normalizedTemplate === 'executive') {
    return <RfqExecutiveDocument rfq={rfq} rows={rows} columns={columns} settings={settings} />
  }
  return <RfqMosaicDocument rfq={rfq} rows={rows} columns={columns} settings={settings} />
}

export { RfqMosaicDocument, RfqExecutiveDocument }
