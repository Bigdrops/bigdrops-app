import React from 'react';
import { renderToFile } from '@react-pdf/renderer';
import { SignalBandsTemplate } from './src/components/csr/preview-templates/SignalBands';
import { MinimalTemplate } from './src/components/csr/preview-templates/Minimal';

// Mock data
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
  logoUrl: 'https://via.placeholder.com/150',
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
  } catch (err) {
    console.error('Error rendering PDFs:', err);
  }
})();
