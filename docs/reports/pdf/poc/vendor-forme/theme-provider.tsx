/**
 * POC VENDOR FILE — verbatim logic from pdfcn upstream.
 * Source: https://pdfcn.dev/r/forme/utils.json
 * Item: forme/utils, file registry/bases/forme/components/theme-provider.tsx
 * Retrieved: 2026-09-08. Only import paths were rewritten to local relatives
 * and the workspace package. No logic was changed.
 */
import type { Style } from "@formepdf/react";
import { isValidElement } from "react";
import type { DependencyList, ReactNode } from "react";

import type { PdfcnTheme } from "../vendor/pdf-theme-types.ts";
import { professionalTheme } from "../vendor/professional.ts";

export type PdfcnTheme = typeof professionalTheme;

let serializedTheme = professionalTheme;

export interface PdfcnThemeProviderProps {
  theme?: PdfcnTheme;
  children: ReactNode;
}

type PdfStyleInput = Style | PdfStyleInput[] | false | null | undefined;

const mergeStyleInput = (target: Style, input: PdfStyleInput): void => {
  if (Array.isArray(input)) {
    for (const item of input) {
      mergeStyleInput(target, item);
    }
  } else if (input) {
    Object.assign(target, input);
  }
};

export const mergePdfStyles = (...inputs: PdfStyleInput[]): Style => {
  const merged: Style = {};
  for (const input of inputs) {
    mergeStyleInput(merged, input);
  }
  return merged;
};

const renderForSerializer = (
  children: ReactNode,
  theme: PdfcnTheme
): ReactNode => {
  serializedTheme = theme;

  if (!isValidElement(children) || typeof children.type !== "function") {
    return children;
  }
  if ((children.type as { __formeType?: string }).__formeType === "Document") {
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
