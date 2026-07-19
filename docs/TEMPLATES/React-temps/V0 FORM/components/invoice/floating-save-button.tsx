'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import { designTokens } from '@/lib/invoice-design-tokens';

interface FloatingSaveButtonProps {
  onSave?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  isDirty?: boolean;
}

export function FloatingSaveButton({
  onSave,
  onCancel,
  isLoading,
  isDirty,
}: FloatingSaveButtonProps) {
  if (!isDirty) return null;

  return (
    <div
      className="fixed bottom-6 right-6 flex gap-2 z-40"
      style={{
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      {/* Save Button */}
      <button
        onClick={onSave}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 rounded-2xl font-medium text-sm transition-all"
        style={{
          backgroundColor: designTokens.colors.ink,
          color: designTokens.colors.surfaceAlt,
          opacity: isLoading ? 0.6 : 1,
          cursor: isLoading ? 'not-allowed' : 'pointer',
        }}
      >
        <Check size={16} />
        {isLoading ? 'Saving...' : 'Save'}
      </button>

      {/* Cancel Button */}
      <button
        onClick={onCancel}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 rounded-2xl font-medium text-sm transition-all"
        style={{
          backgroundColor: designTokens.colors.canvas,
          color: designTokens.colors.ink,
          border: `1px solid ${designTokens.colors.hairline}`,
          opacity: isLoading ? 0.6 : 1,
          cursor: isLoading ? 'not-allowed' : 'pointer',
        }}
      >
        <X size={16} />
        Cancel
      </button>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
