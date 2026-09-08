/**
 * POC VENDOR FILE — verbatim logic from pdfcn upstream.
 * Source: https://pdfcn.dev/r/forme/table.json
 * Item: forme/table, file registry/bases/forme/components/table/table.types.ts
 * Retrieved: 2026-09-08. Only import paths were rewritten to local relatives.
 * (Type surface is identical to the Takumi copy.)
 */
import type { PDFComponentProps } from "../vendor/pdf-theme-types.ts";

/** Table visual style variant. */
export type TableVariant =
  | "line"
  | "grid"
  | "minimal"
  | "striped"
  | "compact"
  | "bordered"
  | "primary-header";

/**
 * Table container with visual style variants and optional zebra striping.
 * Props - `variant` | `zebraStripe` | `noWrap` | `children` | `style`
 * @see {@link TableProps}
 */
export interface TableProps extends PDFComponentProps {
  /**
   * @default 'line'
   */
  variant?: TableVariant;
  /**
   * @default false
   */
  zebraStripe?: boolean;
  /**
   * @default false
   */
  noWrap?: boolean;
}

export type TableSectionProps = PDFComponentProps;

/**
 * Table row with optional header, footer, and stripe states.
 * Props - `header` | `footer` | `stripe` | `variant` | `children` | `style`
 * @see {@link TableRowProps}
 */
export interface TableRowProps extends PDFComponentProps {
  header?: boolean;
  footer?: boolean;
  stripe?: boolean;
  variant?: TableVariant;
}

/**
 * Table cell with alignment, width, and header or footer text styling.
 * Props - `header` | `footer` | `align` | `width` | `variant` | `_last` | `children` | `style`
 * @see {@link TableCellProps}
 */
export interface TableCellProps extends PDFComponentProps {
  header?: boolean;
  footer?: boolean;
  align?: "left" | "center" | "right";
  width?: string | number;
  variant?: TableVariant;
  _last?: boolean;
}
