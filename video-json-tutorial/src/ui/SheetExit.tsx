import React from 'react';
import { useCurrentFrame } from 'remotion';
import { ImportSheet } from './ImportSheet';
import { INVOICE_JSON } from './JsonCode';
import { p } from '../lib/anim';

/** The sheet sliding away as the import is applied, reused by the rows shot. */
export const InvoiceRowsExit: React.FC = () => {
  const frame = useCurrentFrame();
  const out = p(frame, 0, 16);
  if (out >= 1) return null;
  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        transform: `translateX(${out * 740}px)`,
        opacity: 1 - out * 0.4,
      }}
    >
      <ImportSheet width={740} jsonText={INVOICE_JSON} parsed={1} applyPulse={1} />
    </div>
  );
};
