'use client';

import React, { useState } from 'react';
import { Settings, MoreVertical, Upload } from 'lucide-react';
import { Invoice, InvoiceHeaderProps } from '@/lib/invoice-types';
import { designTokens } from '@/lib/invoice-design-tokens';

export function InvoiceHeader({
  invoice,
  onClientChange,
  onInvoiceNumberChange,
  onPONumberChange,
  onIssueDateChange,
  onDueDateChange,
}: InvoiceHeaderProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return '#10b981';
      case 'sent':
        return '#3b82f6';
      case 'overdue':
        return designTokens.colors.ember;
      default:
        return designTokens.colors.midGray;
    }
  };

  const statusLabel = {
    draft: 'Draft',
    sent: 'Sent',
    paid: 'Paid',
    overdue: 'Overdue',
  };

  return (
    <div className="space-y-4">
      {/* Title and Status Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1
            className="font-semibold mb-1"
            style={{
              fontSize: designTokens.typography.sizes.heading,
              lineHeight: designTokens.typography.lineHeights.heading,
              letterSpacing: designTokens.typography.letterSpacing.heading,
              color: designTokens.colors.ink,
            }}
          >
            Invoice
          </h1>
          <p style={{ color: designTokens.colors.midGray, fontSize: '14px' }}>
            {invoice.invoiceNumber}
          </p>
        </div>
        <div
          className="px-3 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: getStatusColor(invoice.status),
            color: '#ffffff',
          }}
        >
          {statusLabel[invoice.status]}
        </div>
      </div>

      {/* Client and PO Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            className="block text-xs font-medium mb-2"
            style={{
              color: designTokens.colors.midGray,
              fontSize: designTokens.typography.sizes.caption,
            }}
          >
            Client
          </label>
          <input
            type="text"
            placeholder="Select or type client name"
            value={invoice.clientName || ''}
            onChange={(e) => onClientChange?.(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm border transition-colors focus:outline-none"
            style={{
              backgroundColor: designTokens.colors.surfaceAlt,
              borderColor: designTokens.colors.hairline,
              color: designTokens.colors.ink,
            }}
          />
        </div>
        <div>
          <label
            className="block text-xs font-medium mb-2"
            style={{
              color: designTokens.colors.midGray,
              fontSize: designTokens.typography.sizes.caption,
            }}
          >
            PO Number
          </label>
          <input
            type="text"
            placeholder="PO-XXXX"
            value={invoice.purchaseOrderNumber || ''}
            onChange={(e) => onPONumberChange?.(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm border transition-colors focus:outline-none"
            style={{
              backgroundColor: designTokens.colors.surfaceAlt,
              borderColor: designTokens.colors.hairline,
              color: designTokens.colors.ink,
            }}
          />
        </div>
      </div>

      {/* Invoice Number, Issue Date, Due Date */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label
            className="block text-xs font-medium mb-2"
            style={{
              color: designTokens.colors.midGray,
              fontSize: designTokens.typography.sizes.caption,
            }}
          >
            Invoice #
          </label>
          <input
            type="text"
            value={invoice.invoiceNumber || ''}
            onChange={(e) => onInvoiceNumberChange?.(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm border transition-colors focus:outline-none"
            style={{
              backgroundColor: designTokens.colors.surfaceAlt,
              borderColor: designTokens.colors.hairline,
              color: designTokens.colors.ink,
            }}
          />
        </div>
        <div>
          <label
            className="block text-xs font-medium mb-2"
            style={{
              color: designTokens.colors.midGray,
              fontSize: designTokens.typography.sizes.caption,
            }}
          >
            Issue Date
          </label>
          <input
            type="date"
            value={invoice.issueDate || ''}
            onChange={(e) => onIssueDateChange?.(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm border transition-colors focus:outline-none"
            style={{
              backgroundColor: designTokens.colors.surfaceAlt,
              borderColor: designTokens.colors.hairline,
              color: designTokens.colors.ink,
            }}
          />
        </div>
        <div>
          <label
            className="block text-xs font-medium mb-2"
            style={{
              color: designTokens.colors.midGray,
              fontSize: designTokens.typography.sizes.caption,
            }}
          >
            Due Date
          </label>
          <input
            type="date"
            value={invoice.dueDate || ''}
            onChange={(e) => onDueDateChange?.(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm border transition-colors focus:outline-none"
            style={{
              backgroundColor: designTokens.colors.surfaceAlt,
              borderColor: designTokens.colors.hairline,
              color: designTokens.colors.ink,
            }}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <div className="flex gap-2">
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{
              backgroundColor: designTokens.colors.canvas,
              color: designTokens.colors.ink,
              border: `1px solid ${designTokens.colors.hairline}`,
            }}
            title="Import Items"
          >
            <Upload size={16} />
            <span className="hidden sm:inline">Import</span>
          </button>
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{
              backgroundColor: designTokens.colors.canvas,
              color: designTokens.colors.ink,
              border: `1px solid ${designTokens.colors.hairline}`,
            }}
            title="Table Settings"
          >
            <Settings size={16} />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>

        {/* More Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
            style={{
              backgroundColor: designTokens.colors.canvas,
              color: designTokens.colors.ink,
              border: `1px solid ${designTokens.colors.hairline}`,
            }}
            title="More Actions"
          >
            <MoreVertical size={16} />
          </button>

          {showMoreMenu && (
            <div
              className="absolute right-0 mt-2 w-40 rounded-xl shadow-lg border z-50"
              style={{
                backgroundColor: designTokens.colors.paper,
                borderColor: designTokens.colors.hairline,
                boxShadow: designTokens.shadows.subtle,
              }}
            >
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-opacity-50 transition-colors"
                style={{
                  color: designTokens.colors.ink,
                  backgroundColor: designTokens.colors.paper,
                }}
              >
                Save Changes
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-opacity-50 transition-colors"
                style={{
                  color: designTokens.colors.ink,
                  backgroundColor: designTokens.colors.paper,
                }}
              >
                Clear All
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-opacity-50 transition-colors"
                style={{
                  color: designTokens.colors.ember,
                  backgroundColor: designTokens.colors.paper,
                }}
              >
                Delete Invoice
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
