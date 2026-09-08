/**
 * POC VENDOR FILE — verbatim logic from pdfcn upstream.
 * Source: https://pdfcn.dev/r/forme/utils.json
 * Item: forme/utils, file registry/bases/forme/lib/pdf-primitives.tsx
 * Retrieved: 2026-09-08. Only import paths were rewritten to local relatives
 * and the workspace package. No logic was changed.
 *
 * NOTE (POC observation): unlike the Takumi base, these primitives wrap
 * @formepdf/react directly. There is NO pt→px conversion: Forme styles are
 * PDF points, matching react-pdf conventions.
 */
import {
  Fixed as FormeFixed,
  Image as FormeImage,
  Link as FormeLink,
  StyleSheet,
  Text as FormeText,
  View as FormeView,
} from "@formepdf/react";
import type {
  FixedProps,
  ImageProps,
  LinkProps,
  Style,
  TextProps,
  ViewProps,
} from "@formepdf/react";

export type FormeStyleInput =
  | Style
  | false
  | null
  | undefined
  | readonly FormeStyleInput[];

export const mergeFormeStyles = (input: FormeStyleInput): Style | undefined => {
  if (!input) {
    return undefined;
  }

  if (!Array.isArray(input)) {
    return input as Style;
  }

  const merged: Style = {};
  for (const entry of input) {
    const resolved = mergeFormeStyles(entry);
    if (resolved) {
      Object.assign(merged, resolved);
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
};

type WithStyle<T> = Omit<T, "style"> & { style?: FormeStyleInput };

export const View = ({ style, ...props }: WithStyle<ViewProps>) => (
  <FormeView {...props} style={mergeFormeStyles(style)} />
);

export const Text = ({ style, ...props }: WithStyle<TextProps>) => (
  <FormeText {...props} style={mergeFormeStyles(style)} />
);

export const Link = ({ style, ...props }: WithStyle<LinkProps>) => (
  <FormeLink {...props} style={mergeFormeStyles(style)} />
);

export const Image = ({ style, ...props }: WithStyle<ImageProps>) => (
  <FormeImage {...props} style={mergeFormeStyles(style)} />
);

export const Fixed = ({ style, ...props }: WithStyle<FixedProps>) => (
  <FormeFixed {...props} style={mergeFormeStyles(style)} />
);

export { StyleSheet };
export type { Style };
