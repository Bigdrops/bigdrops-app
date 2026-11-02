import React from 'react'
import { Text, View, type Style } from '@formepdf/react'
import { parseRichText, type RichTextSegment } from '../core/richText'
import { splitGlyphRuns } from './glyphs'

export interface FormeRichTextOptions {
  font: string
  containerStyle?: Style
  paragraphStyle?: Style
  headingStyle?: Style
  listStyle?: Style
  listItemRowStyle?: Style
  listMarkerStyle?: Style
  listItemTextStyle?: Style
}

const HEADING_SPACING: Style = { marginTop: 6, marginBottom: 2 }

function segmentRuns(segments: RichTextSegment[], font: string): React.ReactNode[] {
  const runs: React.ReactNode[] = []
  segments.forEach((segment, segmentIndex) => {
    const marks: Style = {}
    if (segment.bold) marks.fontWeight = 700
    if (segment.italic) marks.fontStyle = 'italic'
    if (segment.underline) marks.textDecoration = 'underline'
    splitGlyphRuns(segment.text, font).forEach((run, runIndex) => {
      runs.push(
        <Text key={`${segmentIndex}-${runIndex}`} style={{ ...marks, fontFamily: run.fontFamily }}>
          {run.text}
        </Text>,
      )
    })
  })
  return runs
}

/** Forme counterpart to renderPdfRichText: same parser, same block treatment. */
export function renderFormeRichText(value: unknown, options: FormeRichTextOptions): React.ReactNode {
  const document = parseRichText(value)
  if (document.blocks.length === 0) return null

  return (
    <View style={options.containerStyle}>
      {document.blocks.map((block, blockIndex) => {
        if (block.type === 'paragraph') {
          return (
            <Text key={`paragraph-${blockIndex}`} style={options.paragraphStyle}>
              {segmentRuns(block.segments, options.font)}
            </Text>
          )
        }

        if (block.type === 'heading') {
          const headingSegments = block.segments.map((segment) => ({ ...segment, bold: true }))
          return (
            <Text key={`heading-${blockIndex}`} style={{ ...(options.headingStyle ?? options.paragraphStyle), ...HEADING_SPACING }}>
              {segmentRuns(headingSegments, options.font)}
            </Text>
          )
        }

        return (
          <View key={`list-${blockIndex}`} style={options.listStyle}>
            {block.items.map((item, itemIndex) => (
              <View key={`list-item-${blockIndex}-${itemIndex}`} style={options.listItemRowStyle}>
                <Text style={options.listMarkerStyle}>
                  {block.type === 'bullet_list' ? '•' : `${itemIndex + 1}.`}
                </Text>
                <Text style={options.listItemTextStyle}>
                  {segmentRuns(item, options.font)}
                </Text>
              </View>
            ))}
          </View>
        )
      })}
    </View>
  )
}
