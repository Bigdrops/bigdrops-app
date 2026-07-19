'use client';

import React from 'react';
import { Invoice, TotalsSectionProps } from '@/lib/invoice-types';
import { formatCurrency, numberToWords } from '@/lib/invoice-utils';
import { designTokens } from '@/lib/invoice-design-tokens';

export function TotalsSection({ invoice }: TotalsSectionProps) {
  return (
    <div
      className="rounded-lg border p-4 space-y-3"
      style={{
        backgroundColor: designTokens.colors.surfaceAlt,
        borderColor: designTokens.colors.hairline,
      }}
    >
      {/* Subtotal */}
      <div className="flex justify-between items-baseline">
        <span
          className="text-sm"
          style={{ color: designTokens.colors.midGray }}
        >
          Subtotal
        </span>
        <span
          className="font-medium text-sm"
          style={{ color: designTokens.colors.ink }}
        >
          {formatCurrency(invoice.subtotal)}
        </span>
      </div>

      {/* Discount */}
      {invoice.totalDiscount > 0 && (
        <div className="flex justify-between items-baseline">
          <span
            className="text-sm"
            style={{ color: designTokens.colors.midGray }}
          >
            Discount
          </span>
          <span
            className="font-medium text-sm"
            style={{ color: designTokens.colors.ink }}
          >
            -{formatCurrency(invoice.totalDiscount)}
          </span>
        </div>
      )}

      {/* VAT */}
      {invoice.totalVAT > 0 && (
        <div className="flex justify-between items-baseline">
          <span
            className="text-sm"
            style={{ color: designTokens.colors.midGray }}
          >
            VAT
          </span>
          <span
            className="font-medium text-sm"
            style={{ color: designTokens.colors.ink }}
          >
            +{formatCurrency(invoice.totalVAT)}
          </span>
        </div>
      )}

      {/* Withholding Tax */}
      {invoice.totalWithholding > 0 && (
        <div className="flex justify-between items-baseline">
          <span
            className="text-sm"
            style={{ color: designTokens.colors.midGray }}
          >
            Withholding Tax
          </span>
          <span
            className="font-medium text-sm"
            style={{ color: designTokens.colors.ink }}
          >
            -{formatCurrency(invoice.totalWithholding)}
          </span>
        </div>
      )}

      {/* Additional Charges */}
      {invoice.totalAdditionalCharges > 0 && (
        <div className="flex justify-between items-baseline">
          <span
            className="text-sm"
            style={{ color: designTokens.colors.midGray }}
          >
            Additional Charges
          </span>
          <span
            className="font-medium text-sm"
            style={{ color: designTokens.colors.ink }}
          >
            +{formatCurrency(invoice.totalAdditionalCharges)}
          </span>
        </div>
      )}

      {/* Divider */}
      <div
        style={{
          height: '1px',
          backgroundColor: designTokens.colors.hairline,
          margin: '8px 0',
        }}
      />

      {/* Grand Total */}
      <div className="flex justify-between items-baseline">
        <span
          className="font-semibold"
          style={{
            color: designTokens.colors.ink,
            fontSize: designTokens.typography.sizes.subheading,
          }}
        >
          Total
        </span>
        <span
          className="font-semibold"
          style={{
            color: designTokens.colors.ink,
            fontSize: designTokens.typography.sizes.heading,
            letterSpacing: designTokens.typography.letterSpacing.heading,
          }}
        >
          {formatCurrency(invoice.grandTotal)}
        </span>
      </div>

      {/* Amount in Words */}
      {invoice.grandTotal > 0 && (
        <div
          className="text-xs italic px-3 py-2 rounded-lg"
          style={{
            backgroundColor: designTokens.colors.paper,
            color: designTokens.colors.midGray,
            borderLeft: `3px solid ${designTokens.colors.hairline}`,
          }}
        >
          {numberToWords(Math.floor(invoice.grandTotal))} dollars
          {Math.round((invoice.grandTotal % 1) * 100) > 0 &&
            ` and ${Math.round((invoice.grandTotal % 1) * 100)} cents`}
        </div>
      )}
    </div>
  );
}
