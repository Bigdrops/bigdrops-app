import React from 'react';
import path from 'path';
import { Font } from '@react-pdf/renderer';
import { renderToFile } from '@react-pdf/renderer';

const originalRegister = Font.register;
Font.register = (options: any) => {
  let src = options.src;
  if (Array.isArray(options.fonts)) {
    options.fonts.forEach((f: any) => {
      if (f.src && typeof f.src === 'string' && f.src.includes('/src/assets/pdf-fonts/')) {
        f.src = f.src.replace('/src/assets/pdf-fonts/', 'C:\\Users\\DELL\\Desktop\\bigdrops-app\\src\\assets\\pdf-fonts\\');
      }
    });
  } else if (src && typeof src === 'string' && src.includes('/src/assets/pdf-fonts/')) {
    options.src = src.replace('/src/assets/pdf-fonts/', 'C:\\Users\\DELL\\Desktop\\bigdrops-app\\src\\assets\\pdf-fonts\\');
  }

  // Handle missing Patrick Hand Bold by mapping to Regular
  if (options.family === 'Patrick Hand' && Array.isArray(options.fonts)) {
    const regular = options.fonts.find(f => f.fontWeight === 400);
    const bold = options.fonts.find(f => f.fontWeight === 700);
    if (regular && (!bold || !bold.src)) {
      options.fonts.push({ src: regular.src, fontWeight: 700 });
    }
  }

  originalRegister(options);
};

import { SignalBandsTemplate } from './src/components/csr/preview-templates/SignalBands';
import { MinimalTemplate } from './src/components/csr/preview-templates/Minimal';
import { CrimsonTemplate } from './src/components/csr/preview-templates/Crimson';
import { ZincTemplate } from './src/components/csr/preview-templates/Zinc';
import { registerPdfFonts } from './src/lib/pdfFontRegistry';

registerPdfFonts(); // execute the real registry

const mockCsr: any = {
  csr_number: 'CSR-001',
  date: '2026-06-25',
  client_name: 'Test Client',
  address: '123 Test St',
  equipment_type: 'Generator',
  make: 'Honda',
  model: 'EU2200i',
  serial_no: '123456',
  engine_no: '987654',
  problem_reported: 'Not starting',
  service_rendered: 'Replaced spark plug',
  technicianRemarks: 'All good',
  start_date: '2026-06-25',
  start_time: '10:00',
  end_date: '2026-06-25',
  end_time: '11:00',
  showAcknowledgement: true,
  showTechnicianSignLine: true,
  acknowledgement_name: 'John Doe',
  customer_feedback: 'Looks good',
  technician_name: 'Jane Smith',
  layout_density: 'comfortable',
};

const branding = {
  companyName: 'Test Company',
  logoUrl: '',
  primaryColor: '#000000',
};

(async () => {
  try {
    console.log('Rendering SignalBands...');
    await renderToFile(<SignalBandsTemplate csr={mockCsr} comments="" branding={branding} designPreset={null} />, './signalbands-test.pdf');
    console.log('SignalBands rendered successfully.');

    console.log('Rendering Minimal...');
    await renderToFile(<MinimalTemplate csr={mockCsr} comments="" branding={branding} designPreset={null} />, './minimal-test.pdf');
    console.log('Minimal rendered successfully.');

    console.log('Rendering Crimson...');
    await renderToFile(<CrimsonTemplate csr={mockCsr} comments="" branding={branding} designPreset={null} />, './crimson-test.pdf');
    console.log('Crimson rendered successfully.');

    console.log('Rendering Zinc...');
    await renderToFile(<ZincTemplate csr={mockCsr} comments="" branding={branding} designPreset={null} />, './zinc-test.pdf');
    console.log('Zinc rendered successfully.');
  } catch (err) {
    console.error('Error rendering PDFs:', err);
  }
})();
