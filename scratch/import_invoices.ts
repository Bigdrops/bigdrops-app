import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const INVOICES_FILE = path.join(process.cwd(), 'docs', 'invoices.cleaned.final.json');
const CLIENT_MAP_FILE = path.join(process.cwd(), 'docs', 'client-map.json');

function normalizeClientLookupKey(value: string) {
  return String(value || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function toNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCustomFields(value: unknown) {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, unknown>;

  try {
    const parsed = JSON.parse(String(value));
    if (typeof parsed === 'string') {
      return JSON.parse(parsed) as Record<string, unknown>;
    }
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

async function runImport() {
  console.log('Starting import process...');

  // Cleanup previous attempts
  console.log('Cleaning up previous import attempts...');
  const { data: cleanupRows, error: cleanupLookupError } = await supabase
    .from('invoices')
    .select('id, custom_fields');

  if (cleanupLookupError) {
    console.warn('Cleanup lookup failed:', cleanupLookupError.message);
  } else if ((cleanupRows || []).length > 0) {
    const cleanupIds = cleanupRows
      .filter((row: any) => parseCustomFields(row.custom_fields).source === 'refrens_import')
      .map((row: any) => row.id);

    if (cleanupIds.length === 0) {
      console.log('No existing imported invoices found.');
    } else {
    const { error: cleanupItemsError } = await supabase.from('invoice_items').delete().in('invoice_id', cleanupIds);
    if (cleanupItemsError) {
      console.warn('Invoice item cleanup failed:', cleanupItemsError.message);
    }

    const { error: cleanupError } = await supabase.from('invoices').delete().in('id', cleanupIds);
    if (cleanupError) {
      console.warn('Cleanup failed:', cleanupError.message);
    } else {
      console.log('Cleanup successful.');
    }
    }
  }

  // Read inputs
  const invoices = JSON.parse(fs.readFileSync(INVOICES_FILE, 'utf8'));
  const clientMap = JSON.parse(fs.readFileSync(CLIENT_MAP_FILE, 'utf8'));

  let totalInvoicesInserted = 0;
  let totalInvoiceItemsInserted = 0;
  let unmatchedClientsCount = 0;
  const failedInvoices: any[] = [];
  const failedItems: any[] = [];

  for (const invoice of invoices) {
    try {
      // Normalize client name for lookup
      const rawClientName = invoice.client_name || '';
      const normalizedClientName = normalizeClientLookupKey(rawClientName);
      const clientId = clientMap[normalizedClientName] || null;

      if (!clientId) {
        unmatchedClientsCount++;
        console.warn(`Unmatched client: "${rawClientName}" for invoice ${invoice.invoice_number}`);
      }

      const items = invoice.items || [];
      const subtotal = items.reduce((sum: number, item: any) => {
        const quantity = toNumber(item.quantity);
        const rate = toNumber(item.rate);
        return sum + (quantity * rate);
      }, 0);

      // Prepare invoice payload
      const invoicePayload = {
        invoice_number: invoice.invoice_number,
        client_name: rawClientName,
        client_id: clientId,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        notes: invoice.notes,
        terms: invoice.terms,
        document_type: invoice.document_type || 'invoice',
        custom_fields: JSON.stringify(invoice.custom_fields || { source: 'refrens_import' }),
        status: invoice.status || 'draft',
        invoice_title: invoice.invoice_title || null,
        po_number: invoice.po_number || null,
        payment_terms: invoice.payment_terms || null,
        amount_in_words: invoice.amount_in_words || null,
        subtotal,
        total: subtotal,
      };

      // Insert invoice
      const { data: insertedInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([invoicePayload])
        .select()
        .single();

      if (invoiceError) {
        throw new Error(`Invoice insert failed: ${invoiceError.message}`);
      }

      totalInvoicesInserted++;

      // Insert items
      if (items.length > 0) {
        const itemsPayload = items.map((item: any, index: number) => {
          const qty = toNumber(item.quantity);
          const rate = toNumber(item.rate);
          return {
            invoice_id: insertedInvoice.id,
            description: item.description,
            quantity: qty,
            unit_price: rate,
            amount: qty * rate,
            unit: item.unit,
            sort_order: index
          };
        });

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsPayload);

        if (itemsError) {
          console.error(`Items insert failed for invoice ${invoice.invoice_number}: ${itemsError.message}`);
          failedItems.push({
            invoice_number: invoice.invoice_number,
            error: itemsError.message
          });
        } else {
          totalInvoiceItemsInserted += items.length;
        }
      }

      if (totalInvoicesInserted % 10 === 0) {
        console.log(`Progress: ${totalInvoicesInserted} invoices inserted...`);
      }

    } catch (error: any) {
      console.error(`Failed to process invoice ${invoice.invoice_number}: ${error.message}`);
      failedInvoices.push({
        invoice_number: invoice.invoice_number,
        error: error.message
      });
    }
  }

  console.log('\nImport Summary:');
  console.log(`Total Invoices Inserted: ${totalInvoicesInserted}`);
  console.log(`Total Invoice Items Inserted: ${totalInvoiceItemsInserted}`);
  console.log(`Invoices with Unmatched Clients: ${unmatchedClientsCount}`);
  console.log(`Failed Invoice Rows: ${failedInvoices.length}`);
  console.log(`Failed Invoice Item Rows: ${failedItems.length}`);

  if (failedInvoices.length > 0) {
    console.log('Failed Invoices Details:', JSON.stringify(failedInvoices, null, 2));
  }
  if (failedItems.length > 0) {
    console.log('Failed Items Details:', JSON.stringify(failedItems, null, 2));
  }
}

runImport().catch(err => {
  console.error('Fatal error during import:', err);
  process.exit(1);
});
