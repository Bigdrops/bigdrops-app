import React from 'react';
import { C, MONO } from '../theme';

const KEY = C.primary;
const STR = C.ok;
const NUM = C.amber;
const PUNCT = C.soft;

const TOKEN = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?)|\b(true|false|null)\b|([{}[\]:,])/g;

export const Tokenized: React.FC<{ text: string }> = ({ text }) => {
  const out: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(TOKEN);
  let i = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) out.push(<span key={`p${i++}`}>{text.slice(last, match.index)}</span>);
    const [full, str, colon, num, lit, punct] = match;
    if (str !== undefined) {
      out.push(
        <span key={`s${i++}`} style={{ color: colon ? KEY : STR }}>
          {str}
        </span>,
      );
      if (colon) out.push(<span key={`c${i++}`} style={{ color: PUNCT }}>{colon}</span>);
    } else if (num !== undefined) {
      out.push(<span key={`n${i++}`} style={{ color: NUM }}>{num}</span>);
    } else if (lit !== undefined) {
      out.push(<span key={`l${i++}`} style={{ color: NUM }}>{lit}</span>);
    } else if (punct !== undefined) {
      out.push(<span key={`x${i++}`} style={{ color: PUNCT }}>{punct}</span>);
    } else {
      out.push(<span key={`o${i++}`}>{full}</span>);
    }
    last = match.index + full.length;
  }
  if (last < text.length) out.push(<span key={`t${i++}`}>{text.slice(last)}</span>);
  return <>{out}</>;
};

export const CodeBlock: React.FC<{
  text: string;
  size?: number;
  lineHeight?: number;
  color?: string;
  cursor?: boolean;
  wrap?: boolean;
}> = ({ text, size = 13, lineHeight = 1.55, color = C.ink2, cursor, wrap }) => (
  <div
    style={{
      fontFamily: MONO,
      fontSize: size,
      lineHeight,
      color,
      whiteSpace: wrap ? 'pre-wrap' : 'pre',
      wordBreak: wrap ? 'break-word' : 'normal',
      tabSize: 2,
    }}
  >
    <Tokenized text={text} />
    {cursor ? <span style={{ borderLeft: `2px solid ${C.primary}`, marginLeft: 1 }}>&nbsp;</span> : null}
  </div>
);

/** The JSON payload the tutorial pastes back, mirroring the invoice import shape. */
export const INVOICE_JSON = `{
  "title": "Electrical Installation, Phase 2",
  "po_number": null,
  "extra_charges": [{ "label": "Delivery", "value": 35000 }],
  "groups": [
    { "id": "grp_1", "name": "Materials", "itemIds": ["item_1", "item_2"] },
    { "id": "grp_2", "name": "Installation", "itemIds": ["item_3"] }
  ],
  "items": [
    { "temp_ref": "item_1", "group_id": "grp_1",
      "description": "Cable tray, 3m galvanised",
      "quantity": 24, "unit_price": 18500,
      "custom_fields": { "Warranty": "12 months" } },
    { "temp_ref": "item_2", "group_id": "grp_1",
      "description": "PVC conduit, 25mm",
      "quantity": 60, "unit_price": 4200,
      "custom_fields": { "Warranty": "12 months" } },
    { "temp_ref": "item_3", "group_id": "grp_2",
      "description": "Distribution board, 12-way",
      "quantity": 4, "unit_price": 96500,
      "custom_fields": { "Warranty": "24 months" } },
    { "temp_ref": "item_4",
      "description": "Copper earth rod",
      "quantity": 12, "unit_price": 14200,
      "custom_fields": { "Warranty": "24 months" } },
    { "temp_ref": "item_5",
      "description": "Circuit breaker, 32A",
      "quantity": 18, "unit_price": 12750,
      "custom_fields": { "Warranty": "24 months" } },
    { "temp_ref": "item_6",
      "description": "Cable gland set",
      "quantity": 40, "unit_price": 1850,
      "custom_fields": { "Warranty": "12 months" } },
    { "temp_ref": "item_7",
      "description": "Installation labour",
      "quantity": 3, "unit_price": 45000,
      "custom_fields": { "Warranty": "6 months" } },
    { "temp_ref": "item_8",
      "description": "Site supervision",
      "quantity": 2, "unit_price": 60000,
      "custom_fields": { "Warranty": "6 months" } }
  ]
}`;

export const PROMPT_LINES = [
  'You are a strict JSON data extractor. Follow these rules without exception:',
  '',
  '\u00B7 Return ONLY data explicitly present in the source document.',
  '\u00B7 Never infer, guess, or fabricate values.',
  '\u00B7 Missing values MUST be null.',
  '\u00B7 Do not rename or reorder fields.',
  '\u00B7 Output MUST be valid JSON only.',
  '\u00B7 Groups are allowed ONLY if explicitly present in the source document.',
  '\u00B7 Never create groups from layout, indentation, or spacing.',
  '',
  'Convert the source content into JSON for invoice import.',
  '',
  '{ "title": "Document Title", "items": [{ "description": "...",',
  '  "quantity": 1, "unit_price": 0, "custom_fields": {...} }] }',
  '',
  '- Exclude always: amount, vat_rate, discount_rate, install_rate, totals',
  '- Import must reflect the active form configuration: only shown columns',
].join('\n');
