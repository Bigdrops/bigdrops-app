import { CopyButton } from './assistant-chat-copy-button'

/**
 * AssistantCodeBlock — one fenced block from a Bolu response.
 *
 * Design reference: docs/prd/conversational-document-assistant/Chat-blocks/
 * code-block-default.tsx. The reference header/actions anatomy is kept; line
 * numbers, download and wrap toggles are omitted because the copy contract
 * requires the block to copy its exact source characters and indentation.
 *
 * Safety: the code is only rendered as text inside <pre><code>. It is never
 * evaluated, executed or injected as HTML.
 */
export function AssistantCodeBlock({
  code,
  language,
  incomplete = false,
}: {
  code: string
  language: string
  incomplete?: boolean
}) {
  return (
    <figure className="ac-code">
      <div className="ac-code-head">
        <span className="ac-code-lang">{language ? language : 'Code'}</span>
        <CopyButton
          value={code}
          label="Copy"
          ariaLabel={language ? `Copy ${language} code` : 'Copy code block'}
          copiedLabel="Copied"
          disabled={incomplete}
          disabledHint="Copy becomes available when the response completes"
        />
      </div>
      <pre className="ac-code-pre" tabIndex={0}>
        <code>{code}</code>
      </pre>
    </figure>
  )
}
