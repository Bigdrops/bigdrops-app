import React from 'react'
import {
  Document as FormeDocument,
  Page as FormePage,
  View as FormeView,
  Text as FormeText,
  Table as FormeTable,
  Row as FormeRow,
  Cell as FormeCell,
  Image as FormeImage,
  Fixed as FormeFixed,
  Svg as FormeSvg,
} from '@formepdf/react'
import type {
  DocumentProps,
  PageProps,
  ViewProps,
  TextProps,
  TableProps,
  RowProps,
  CellProps,
  ImageProps,
  FixedProps,
  SvgProps,
  Style,
} from '@formepdf/react'

export type FormeStyleInput = Style | false | null | undefined | readonly FormeStyleInput[]

export function mergeStyles(input: FormeStyleInput): Style | undefined {
  if (!input) return undefined
  if (!Array.isArray(input)) return input as Style

  const merged: Style = {}
  for (const entry of input) {
    const resolved = mergeStyles(entry)
    if (resolved) {
      Object.assign(merged, resolved)
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined
}

type WithCustomStyle<T> = Omit<T, 'style'> & { style?: FormeStyleInput }

export const View: React.FC<WithCustomStyle<ViewProps>> = ({ style, children, ...props }) => (
  <FormeView {...props} style={mergeStyles(style)}>
    {children}
  </FormeView>
)

export const Text: React.FC<WithCustomStyle<TextProps>> = ({ style, children, ...props }) => (
  <FormeText {...props} style={mergeStyles(style)}>
    {children}
  </FormeText>
)

export const Table: React.FC<WithCustomStyle<TableProps>> = ({ style, children, ...props }) => (
  <FormeTable {...props} style={mergeStyles(style)}>
    {children}
  </FormeTable>
)

export const Row: React.FC<WithCustomStyle<RowProps>> = ({ style, children, ...props }) => (
  <FormeRow {...props} style={mergeStyles(style)}>
    {children}
  </FormeRow>
)

export const Cell: React.FC<WithCustomStyle<CellProps>> = ({ style, children, ...props }) => (
  <FormeCell {...props} style={mergeStyles(style)}>
    {children}
  </FormeCell>
)

export const Image: React.FC<WithCustomStyle<ImageProps>> = ({ style, ...props }) => (
  <FormeImage {...props} style={mergeStyles(style)} />
)

export const Fixed: React.FC<WithCustomStyle<FixedProps>> = ({ style, children, ...props }) => (
  <FormeFixed {...props} style={mergeStyles(style)}>
    {children}
  </FormeFixed>
)

export const Svg: React.FC<WithCustomStyle<SvgProps>> = ({ style, children, ...props }) => (
  <FormeSvg {...props} style={mergeStyles(style)}>
    {children}
  </FormeSvg>
)

export const Page = FormePage
export const Document = FormeDocument

export type { Style, DocumentProps, PageProps }
