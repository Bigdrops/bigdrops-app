/**
 * POC LOCAL TYPES — minimal structural subset of the upstream pdfcn theme types.
 * Upstream source: https://pdfcn.dev/r/theme-professional.json
 * (files registry/types/pdf-themes.ts and registry/types/pdf-components.ts).
 * Only the shapes consumed by the vendored POC components are declared here.
 * The full upstream type file was inspected during the investigation.
 */
import type { ReactNode } from "react";

export interface ColorTokens {
  foreground: string;
  background: string;
  muted: string;
  mutedForeground: string;
  primary: string;
  primaryForeground: string;
  border: string;
  accent: string;
  destructive: string;
  success: string;
  warning: string;
  info: string;
}

/** Structural subset of the upstream PdfcnTheme actually read by POC components. */
export interface PdfcnTheme {
  name: string;
  primitives: any;
  colors: ColorTokens;
  typography: any;
  spacing: any;
  page: { size: string; orientation: string };
}

/** Base props shared by all pdfcn PDF components (upstream PDFComponentProps). */
export interface PDFComponentProps {
  style?: Record<string, unknown>;
  children?: ReactNode;
}
