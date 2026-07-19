'use client';

import React, { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { AdditionalInformationProps } from '@/lib/invoice-types';
import { designTokens } from '@/lib/invoice-design-tokens';

export function AdditionalInformationSection({
  invoice,
  onNotesChange,
  onTermsChange,
  onSignatoryChange,
  onReferenceLinksChange,
}: AdditionalInformationProps) {
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
      {/* Notes Section */}
      <InfoCard
        title="Notes"
        isExpanded={expandedSections.has('notes')}
        onToggle={() => toggleSection('notes')}
      >
        <textarea
          value={invoice.notes || ''}
          onChange={(e) => onNotesChange?.(e.target.value)}
          placeholder="Add any additional notes or payment instructions..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg text-sm border resize-none"
          style={{
            backgroundColor: designTokens.colors.surfaceAlt,
            borderColor: designTokens.colors.hairline,
            color: designTokens.colors.ink,
          }}
        />
      </InfoCard>

      {/* Terms & Conditions Section */}
      <InfoCard
        title="Terms & Conditions"
        isExpanded={expandedSections.has('terms')}
        onToggle={() => toggleSection('terms')}
      >
        <textarea
          value={invoice.termsAndConditions || ''}
          onChange={(e) => onTermsChange?.(e.target.value)}
          placeholder="Enter your standard terms and conditions..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg text-sm border resize-none"
          style={{
            backgroundColor: designTokens.colors.surfaceAlt,
            borderColor: designTokens.colors.hairline,
            color: designTokens.colors.ink,
          }}
        />
      </InfoCard>

      {/* Signatory Section */}
      <InfoCard
        title="Signatory"
        isExpanded={expandedSections.has('signatory')}
        onToggle={() => toggleSection('signatory')}
      >
        <input
          type="text"
          value={invoice.signatory || ''}
          onChange={(e) => onSignatoryChange?.(e.target.value)}
          placeholder="Name, title, or signature field..."
          className="w-full px-3 py-2 rounded-lg text-sm border"
          style={{
            backgroundColor: designTokens.colors.surfaceAlt,
            borderColor: designTokens.colors.hairline,
            color: designTokens.colors.ink,
          }}
        />
      </InfoCard>

      {/* Reference Links Section */}
      <InfoCard
        title="Reference Links"
        isExpanded={expandedSections.has('links')}
        onToggle={() => toggleSection('links')}
      >
        <div className="space-y-2">
          {invoice.referenceLinks?.map((link, index) => (
            <div key={index} className="flex gap-2 items-center">
              <input
                type="url"
                value={link}
                onChange={(e) => {
                  const newLinks = [...(invoice.referenceLinks || [])];
                  newLinks[index] = e.target.value;
                  onReferenceLinksChange?.(newLinks);
                }}
                placeholder="https://example.com"
                className="flex-1 px-3 py-2 rounded-lg text-sm border"
                style={{
                  backgroundColor: designTokens.colors.surfaceAlt,
                  borderColor: designTokens.colors.hairline,
                  color: designTokens.colors.ink,
                }}
              />
              <button
                onClick={() => {
                  const newLinks = invoice.referenceLinks?.filter(
                    (_, i) => i !== index
                  );
                  onReferenceLinksChange?.(newLinks || []);
                }}
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
            onClick={() => {
              const newLinks = [...(invoice.referenceLinks || []), ''];
              onReferenceLinksChange?.(newLinks);
            }}
            className="text-xs font-medium px-3 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: designTokens.colors.canvas,
              color: designTokens.colors.ink,
              border: `1px solid ${designTokens.colors.hairline}`,
            }}
          >
            + Add Link
          </button>
        </div>
      </InfoCard>
    </div>
  );
}

interface InfoCardProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function InfoCard({
  title,
  isExpanded,
  onToggle,
  children,
}: InfoCardProps) {
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
        <ChevronDown
          size={16}
          style={{
            color: designTokens.colors.midGray,
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {isExpanded && (
        <div
          className="px-4 py-3 border-t space-y-2"
          style={{ borderColor: designTokens.colors.hairline }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
