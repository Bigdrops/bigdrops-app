import type { PdfDocumentModel } from '../types'

type MinimalPdfTemplateProps = {
  model: PdfDocumentModel
}

export function MinimalPdfTemplate({ model }: MinimalPdfTemplateProps) {
  const recipientName = model.recipient?.name || 'Recipient pending'
  const total = model.totals.total

  return (
    <section data-pdf-template="minimal" data-pdf-kind={model.identity.kind}>
      <header>
        <p>New PDF system foundation</p>
        <h1>{model.identity.number || `${model.identity.kind.toUpperCase()}-DRAFT`}</h1>
      </header>
      <p>{recipientName}</p>
      <p>Total: {total}</p>
      <p>Template layout intentionally pending implementation.</p>
    </section>
  )
}
