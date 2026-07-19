'use client';

import React, { useState } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { CommercialTerms, CommercialTermsProps } from '@/lib/invoice-types';
import { designTokens } from '@/lib/invoice-design-tokens';

export function CommercialTermsSection({
  terms,
  onTermsChange,
}: CommercialTermsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  const toggleSection = (section: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(section)) {
      newSet.delete(section);
    } else {
      newSet.add(section);
    }
    setExpandedSections(newSet);
  };

  return (
    <div className="space-y-2">
      {/* Discount Section */}
      <TermsCard
        title="Discount"
        value={
          terms.discount
            ? `${terms.discount.type === 'percentage' ? terms.discount.value + '%' : '$' + terms.discount.value}`
            : 'Not set'
        }
        isExpanded={expandedSections.has('discount')}
        onToggle={() => toggleSection('discount')}
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <label className="flex items-center gap-2 flex-1">
              <input
                type="radio"
                checked={terms.discount?.type === 'percentage'}
                onChange={() =>
                  onTermsChange?.({
                    discount: { ...terms.discount, type: 'percentage' },
                  })
                }
              />
              <span className="text-sm" style={{ color: designTokens.colors.ink }}>
                Percentage
              </span>
            </label>
            <label className="flex items-center gap-2 flex-1">
              <input
                type="radio"
                checked={terms.discount?.type === 'fixed'}
                onChange={() =>
                  onTermsChange?.({
                    discount: { ...terms.discount, type: 'fixed' },
                  })
                }
              />
              <span className="text-sm" style={{ color: designTokens.colors.ink }}>
                Fixed Amount
              </span>
            </label>
          </div>

          <div>
            <label
              className="text-xs font-medium block mb-1"
              style={{ color: designTokens.colors.midGray }}
            >
              Value
            </label>
            <input
              type="number"
              value={terms.discount?.value || 0}
              onChange={(e) =>
                onTermsChange?.({
                  discount: {
                    ...terms.discount,
                    value: parseFloat(e.target.value),
                  },
                })
              }
              className="w-full px-3 py-2 rounded-lg text-sm border"
              style={{
                backgroundColor: designTokens.colors.surfaceAlt,
                borderColor: designTokens.colors.hairline,
                color: designTokens.colors.ink,
              }}
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={terms.discount?.applyBeforeTax || false}
              onChange={(e) =>
                onTermsChange?.({
                  discount: {
                    ...terms.discount,
                    applyBeforeTax: e.target.checked,
                  },
                })
              }
            />
            <span className="text-sm" style={{ color: designTokens.colors.ink }}>
              Apply before tax
            </span>
          </label>
        </div>
      </TermsCard>

      {/* VAT Section */}
      <TermsCard
        title="VAT"
        value={terms.vat ? `${terms.vat.rate}%` : 'Not set'}
        isExpanded={expandedSections.has('vat')}
        onToggle={() => toggleSection('vat')}
      >
        <div>
          <label
            className="text-xs font-medium block mb-1"
            style={{ color: designTokens.colors.midGray }}
          >
            VAT Rate (%)
          </label>
          <input
            type="number"
            step="0.1"
            value={terms.vat?.rate || 0}
            onChange={(e) =>
              onTermsChange?.({
                vat: { rate: parseFloat(e.target.value) },
              })
            }
            className="w-full px-3 py-2 rounded-lg text-sm border"
            style={{
              backgroundColor: designTokens.colors.surfaceAlt,
              borderColor: designTokens.colors.hairline,
              color: designTokens.colors.ink,
            }}
          />
        </div>
      </TermsCard>

      {/* Withholding Tax Section */}
      <TermsCard
        title="Withholding Tax (WHT)"
        value={
          terms.withholding
            ? `${terms.withholding.type === 'percentage' ? terms.withholding.value + '%' : '$' + terms.withholding.value}`
            : 'Not set'
        }
        isExpanded={expandedSections.has('withholding')}
        onToggle={() => toggleSection('withholding')}
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <label className="flex items-center gap-2 flex-1">
              <input
                type="radio"
                checked={terms.withholding?.type === 'percentage'}
                onChange={() =>
                  onTermsChange?.({
                    withholding: {
                      ...terms.withholding,
                      type: 'percentage',
                    },
                  })
                }
              />
              <span className="text-sm" style={{ color: designTokens.colors.ink }}>
                Percentage
              </span>
            </label>
            <label className="flex items-center gap-2 flex-1">
              <input
                type="radio"
                checked={terms.withholding?.type === 'fixed'}
                onChange={() =>
                  onTermsChange?.({
                    withholding: {
                      ...terms.withholding,
                      type: 'fixed',
                    },
                  })
                }
              />
              <span className="text-sm" style={{ color: designTokens.colors.ink }}>
                Fixed Amount
              </span>
            </label>
          </div>

          <div>
            <label
              className="text-xs font-medium block mb-1"
              style={{ color: designTokens.colors.midGray }}
            >
              Value
            </label>
            <input
              type="number"
              value={terms.withholding?.value || 0}
              onChange={(e) =>
                onTermsChange?.({
                  withholding: {
                    ...terms.withholding,
                    value: parseFloat(e.target.value),
                  },
                })
              }
              className="w-full px-3 py-2 rounded-lg text-sm border"
              style={{
                backgroundColor: designTokens.colors.surfaceAlt,
                borderColor: designTokens.colors.hairline,
                color: designTokens.colors.ink,
              }}
            />
          </div>
        </div>
      </TermsCard>

      {/* Additional Charges Section */}
      <TermsCard
        title="Additional Charges"
        value={
          terms.additionalCharges && terms.additionalCharges.length > 0
            ? `${terms.additionalCharges.length} charge(s)`
            : 'None'
        }
        isExpanded={expandedSections.has('charges')}
        onToggle={() => toggleSection('charges')}
      >
        <div className="space-y-2">
          {terms.additionalCharges?.map((charge) => (
            <div
              key={charge.id}
              className="flex gap-2 items-end"
            >
              <div className="flex-1">
                <label
                  className="text-xs font-medium block mb-1"
                  style={{ color: designTokens.colors.midGray }}
                >
                  {charge.name}
                </label>
                <input
                  type="number"
                  value={charge.amount}
                  className="w-full px-3 py-2 rounded-lg text-sm border"
                  style={{
                    backgroundColor: designTokens.colors.surfaceAlt,
                    borderColor: designTokens.colors.hairline,
                    color: designTokens.colors.ink,
                  }}
                />
              </div>
              <button
                className="p-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: designTokens.colors.canvas,
                  color: designTokens.colors.ember,
                }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <button
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors w-full"
            style={{
              backgroundColor: designTokens.colors.canvas,
              color: designTokens.colors.ink,
              border: `1px solid ${designTokens.colors.hairline}`,
            }}
          >
            <Plus size={14} />
            Add Charge
          </button>
        </div>
      </TermsCard>
    </div>
  );
}

interface TermsCardProps {
  title: string;
  value: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function TermsCard({
  title,
  value,
  isExpanded,
  onToggle,
  children,
}: TermsCardProps) {
  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        backgroundColor: designTokens.colors.paper,
        borderColor: designTokens.colors.hairline,
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:opacity-80 transition-opacity"
      >
        <span
          className="font-medium"
          style={{
            color: designTokens.colors.ink,
            fontSize: designTokens.typography.sizes.body,
          }}
        >
          {title}
        </span>
        <div className="flex items-center gap-2">
          <span
            className="text-xs"
            style={{ color: designTokens.colors.midGray }}
          >
            {value}
          </span>
          <ChevronDown
            size={16}
            style={{
              color: designTokens.colors.midGray,
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          />
        </div>
      </button>

      {isExpanded && (
        <div
          className="px-4 py-3 border-t space-y-3"
          style={{ borderColor: designTokens.colors.hairline }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
