/**
 * POC VENDOR FILE — verbatim logic from pdfcn upstream.
 * Source: https://pdfcn.dev/r/takumi/utils.json
 * Item: takumi/utils, file registry/bases/takumi/components/theme-provider.tsx
 * Retrieved: 2026-09-07. Only import paths were rewritten to local relatives.
 * No logic was changed.
 */
import { isValidElement } from "react";
import type { DependencyList, ReactNode } from "react";

import type { PdfcnTheme } from "./pdf-theme-types.ts";
import { professionalTheme } from "./professional.ts";

export type { PdfcnTheme };

let serializedTheme = professionalTheme;

export interface PdfcnThemeProviderProps {
  theme?: PdfcnTheme;
  children: ReactNode;
}

const renderForSerializer = (
  children: ReactNode,
  theme: PdfcnTheme
): ReactNode => {
  serializedTheme = theme;

  if (!isValidElement(children) || typeof children.type !== "function") {
    return children;
  }

  return (children.type as (props: unknown) => ReactNode)(children.props);
};

export const PdfcnThemeProvider = ({
  theme,
  children,
}: PdfcnThemeProviderProps) =>
  renderForSerializer(children, theme ?? professionalTheme);

export const usePdfcnTheme = (): PdfcnTheme => serializedTheme;

export const useSafeMemo = <T,>(factory: () => T, _deps: DependencyList): T =>
  factory();
