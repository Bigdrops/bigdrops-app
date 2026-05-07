import React from 'react'
import { Text, View } from '@react-pdf/renderer'

import { parseRichText, richTextToPlainText, type RichTextSegment } from './richText'

type RenderPdfRichTextOptions = {
  containerStyle?: any
  paragraphStyle?: any
  listStyle?: any
  listItemRowStyle?: any
  listMarkerStyle?: any
  listItemTextStyle?: any
  fallbackTextStyle?: any
}

function renderInlineSegments(segments: RichTextSegment[], baseStyle: any, keyPrefix: string) {
  return segments.map((segment, index) => React.createElement(
    Text,
    {
      key: `${keyPrefix}-${index}`,
      style: [
        baseStyle,
        segment.bold ? { fontFamily: 'Helvetica-Bold' } : null,
        segment.italic ? { fontStyle: 'italic' } : null,
        segment.underline ? { textDecoration: 'underline' } : null,
      ],
    },
    segment.text,
  ))
}

export function renderPdfRichText(value: unknown, options: RenderPdfRichTextOptions = {}) {
  try {
    const document = parseRichText(value)
    if (document.blocks.length === 0) return null

    return React.createElement(
      View,
      { style: options.containerStyle },
      document.blocks.map((block, blockIndex) => {
        if (block.type === 'paragraph') {
          return React.createElement(
            Text,
            {
              key: `paragraph-${blockIndex}`,
              style: options.paragraphStyle,
            },
            ...renderInlineSegments(block.segments, options.paragraphStyle, `paragraph-${blockIndex}`),
          )
        }

        return React.createElement(
          View,
          {
            key: `list-${blockIndex}`,
            style: options.listStyle,
          },
          ...block.items.map((item, itemIndex) => React.createElement(
            View,
            {
              key: `list-item-${blockIndex}-${itemIndex}`,
              style: options.listItemRowStyle,
            },
            React.createElement(
              Text,
              {
                style: options.listMarkerStyle,
              },
              block.type === 'bullet_list' ? '•' : `${itemIndex + 1}.`,
            ),
            React.createElement(
              Text,
              {
                style: options.listItemTextStyle,
              },
              ...renderInlineSegments(item, options.listItemTextStyle, `list-item-${blockIndex}-${itemIndex}`),
            ),
          )),
        )
      }),
    )
  } catch {
    const fallbackText = richTextToPlainText(value)
    if (!fallbackText) return null
    return React.createElement(Text, { style: options.fallbackTextStyle }, fallbackText)
  }
}
