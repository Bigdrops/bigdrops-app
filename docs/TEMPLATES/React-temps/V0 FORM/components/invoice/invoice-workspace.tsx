'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Invoice, LineItem, Group, InvoiceWorkspaceProps } from '@/lib/invoice-types';
import { calculateInvoiceTotals } from '@/lib/invoice-utils';
import { designTokens } from '@/lib/invoice-design-tokens';
import { InvoiceHeader } from './invoice-header';
import { LineItemsSection } from './line-items-section';
import { CommercialTermsSection } from './commercial-terms-section';
import { TotalsSection } from './totals-section';
import { AdditionalInformationSection } from './additional-information-section';
import { FloatingSaveButton } from './floating-save-button';

export function InvoiceWorkspace({
  invoice: initialInvoice,
  onSave,
  onCancel,
  onImportItems,
  onTableSettings,
  onMoreActions,
  isLoading,
  errors,
}: InvoiceWorkspaceProps) {
  const [invoice, setInvoice] = useState<Invoice>(initialInvoice);
  const [isDirty, setIsDirty] = useState(false);

  // Calculate updated totals whenever items or terms change
  const updatedInvoice = useMemo(() => {
    const totals = calculateInvoiceTotals(
      invoice.lineItems,
      invoice.groups,
      invoice.commercialTerms
    );
    return {
      ...invoice,
      ...totals,
    };
  }, [invoice.lineItems, invoice.groups, invoice.commercialTerms]);

  // Handlers for header changes
  const handleClientChange = useCallback((clientName: string) => {
    setInvoice((prev) => ({ ...prev, clientName }));
    setIsDirty(true);
  }, []);

  const handleInvoiceNumberChange = useCallback((invoiceNumber: string) => {
    setInvoice((prev) => ({ ...prev, invoiceNumber }));
    setIsDirty(true);
  }, []);

  const handlePONumberChange = useCallback(
    (purchaseOrderNumber: string) => {
      setInvoice((prev) => ({ ...prev, purchaseOrderNumber }));
      setIsDirty(true);
    },
    []
  );

  const handleIssueDateChange = useCallback((issueDate: string) => {
    setInvoice((prev) => ({ ...prev, issueDate }));
    setIsDirty(true);
  }, []);

  const handleDueDateChange = useCallback((dueDate: string) => {
    setInvoice((prev) => ({ ...prev, dueDate }));
    setIsDirty(true);
  }, []);

  // Handlers for line items
  const handleItemChange = useCallback(
    (itemId: string, updates: Partial<LineItem>) => {
      setInvoice((prev) => ({
        ...prev,
        lineItems: prev.lineItems.map((item) =>
          item.id === itemId ? { ...item, ...updates } : item
        ),
      }));
      setIsDirty(true);
    },
    []
  );

  const handleAddItem = useCallback(() => {
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      description: 'New Item',
      quantity: 1,
      unit: 'hours',
      rate: 0,
    };
    setInvoice((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem],
    }));
    setIsDirty(true);
  }, []);

  const handleAddGroup = useCallback(() => {
    const newGroup: Group = {
      id: `group-${Date.now()}`,
      name: 'New Group',
      items: [],
    };
    setInvoice((prev) => ({
      ...prev,
      groups: [...prev.groups, newGroup],
    }));
    setIsDirty(true);
  }, []);

  const handleDeleteItem = useCallback((itemId: string) => {
    setInvoice((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((item) => item.id !== itemId),
      groups: prev.groups.map((group) => ({
        ...group,
        items: group.items.filter((item) => item.id !== itemId),
      })),
    }));
    setIsDirty(true);
  }, []);

  const handleDuplicateItem = useCallback((itemId: string) => {
    setInvoice((prev) => {
      const itemToClone = prev.lineItems.find((item) => item.id === itemId);
      if (!itemToClone) return prev;

      const clonedItem: LineItem = {
        ...itemToClone,
        id: `item-${Date.now()}`,
      };

      return {
        ...prev,
        lineItems: [
          ...prev.lineItems,
          clonedItem,
        ],
      };
    });
    setIsDirty(true);
  }, []);

  const handleCommercialTermsChange = useCallback((updates) => {
    setInvoice((prev) => ({
      ...prev,
      commercialTerms: {
        ...prev.commercialTerms,
        ...updates,
      },
    }));
    setIsDirty(true);
  }, []);

  const handleNotesChange = useCallback((notes: string) => {
    setInvoice((prev) => ({ ...prev, notes }));
    setIsDirty(true);
  }, []);

  const handleTermsChange = useCallback((termsAndConditions: string) => {
    setInvoice((prev) => ({ ...prev, termsAndConditions }));
    setIsDirty(true);
  }, []);

  const handleSignatoryChange = useCallback((signatory: string) => {
    setInvoice((prev) => ({ ...prev, signatory }));
    setIsDirty(true);
  }, []);

  const handleReferenceLinksChange = useCallback((referenceLinks: string[]) => {
    setInvoice((prev) => ({ ...prev, referenceLinks }));
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    onSave?.(updatedInvoice);
  }, [updatedInvoice, onSave]);

  const handleCancel = useCallback(() => {
    setInvoice(initialInvoice);
    setIsDirty(false);
    onCancel?.();
  }, [initialInvoice, onCancel]);

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: designTokens.colors.canvas }}
    >
      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-20">
        {/* Errors */}
        {errors && Object.keys(errors).length > 0 && (
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: '#fee2e2',
              borderColor: designTokens.colors.ember,
            }}
          >
            {Object.entries(errors).map(([key, message]) => (
              <p
                key={key}
                className="text-sm"
                style={{ color: designTokens.colors.ember }}
              >
                {message}
              </p>
            ))}
          </div>
        )}

        {/* Header Section */}
        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: designTokens.colors.paper,
            borderColor: designTokens.colors.hairline,
            boxShadow: designTokens.shadows.subtle,
          }}
        >
          <InvoiceHeader
            invoice={updatedInvoice}
            onClientChange={handleClientChange}
            onInvoiceNumberChange={handleInvoiceNumberChange}
            onPONumberChange={handlePONumberChange}
            onIssueDateChange={handleIssueDateChange}
            onDueDateChange={handleDueDateChange}
          />
        </div>

        {/* Line Items Section (Primary Workspace) */}
        <div
          className="rounded-lg border p-6 space-y-4"
          style={{
            backgroundColor: designTokens.colors.paper,
            borderColor: designTokens.colors.hairline,
            boxShadow: designTokens.shadows.subtle,
          }}
        >
          <h2
            style={{
              fontSize: designTokens.typography.sizes.subheading,
              lineHeight: designTokens.typography.lineHeights.subheading,
              color: designTokens.colors.ink,
              fontWeight: 500,
            }}
          >
            Line Items
          </h2>
          <LineItemsSection
            items={updatedInvoice.lineItems}
            groups={updatedInvoice.groups}
            onItemChange={handleItemChange}
            onAddItem={handleAddItem}
            onAddGroup={handleAddGroup}
            onDeleteItem={handleDeleteItem}
            onDuplicateItem={handleDuplicateItem}
            onImportItems={onImportItems}
            onTableSettings={onTableSettings}
          />
        </div>

        {/* Totals Section (Sticky on larger screens) */}
        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: designTokens.colors.paper,
            borderColor: designTokens.colors.hairline,
            boxShadow: designTokens.shadows.subtle,
          }}
        >
          <h2
            style={{
              fontSize: designTokens.typography.sizes.subheading,
              lineHeight: designTokens.typography.lineHeights.subheading,
              color: designTokens.colors.ink,
              fontWeight: 500,
              marginBottom: '16px',
            }}
          >
            Summary
          </h2>
          <TotalsSection invoice={updatedInvoice} />
        </div>

        {/* Commercial Terms Section */}
        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: designTokens.colors.paper,
            borderColor: designTokens.colors.hairline,
            boxShadow: designTokens.shadows.subtle,
          }}
        >
          <h2
            style={{
              fontSize: designTokens.typography.sizes.subheading,
              lineHeight: designTokens.typography.lineHeights.subheading,
              color: designTokens.colors.ink,
              fontWeight: 500,
              marginBottom: '16px',
            }}
          >
            Commercial Terms
          </h2>
          <CommercialTermsSection
            terms={updatedInvoice.commercialTerms}
            onTermsChange={handleCommercialTermsChange}
          />
        </div>

        {/* Additional Information Section */}
        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: designTokens.colors.paper,
            borderColor: designTokens.colors.hairline,
            boxShadow: designTokens.shadows.subtle,
          }}
        >
          <h2
            style={{
              fontSize: designTokens.typography.sizes.subheading,
              lineHeight: designTokens.typography.lineHeights.subheading,
              color: designTokens.colors.ink,
              fontWeight: 500,
              marginBottom: '16px',
            }}
          >
            Additional Information
          </h2>
          <AdditionalInformationSection
            invoice={updatedInvoice}
            onNotesChange={handleNotesChange}
            onTermsChange={handleTermsChange}
            onSignatoryChange={handleSignatoryChange}
            onReferenceLinksChange={handleReferenceLinksChange}
          />
        </div>
      </div>

      {/* Floating Save Button */}
      <FloatingSaveButton
        onSave={handleSave}
        onCancel={handleCancel}
        isLoading={isLoading}
        isDirty={isDirty}
      />
    </div>
  );
}
