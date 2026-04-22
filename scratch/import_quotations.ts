import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const QUOTATIONS_FILE = path.join(process.cwd(), 'docs', 'quotations.cleaned.final.json');
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
  console.log('Starting quotation import process...');

  // Cleanup previous attempts
  console.log('Cleaning up previous quotation import attempts...');
  const { data: cleanupRows, error: cleanupLookupError } = await supabase
    .from('quotations')
    .select('id, custom_fields');

  if (cleanupLookupError) {
    console.warn('Cleanup lookup failed:', cleanupLookupError.message);
  } else if ((cleanupRows || []).length > 0) {
    const cleanupIds = cleanupRows
      .filter((row: any) => parseCustomFields(row.custom_fields).source === 'refrens_import')
      .map((row: any) => row.id);

    if (cleanupIds.length === 0) {
      console.log('No existing imported quotations found.');
    } else {
      const { error: cleanupItemsError } = await supabase.from('quotation_items').delete().in('quotation_id', cleanupIds);
      if (cleanupItemsError) {
        console.warn('Quotation item cleanup failed:', cleanupItemsError.message);
      }

      const { error: cleanupError } = await supabase.from('quotations').delete().in('id', cleanupIds);
      if (cleanupError) {
        console.warn('Cleanup failed:', cleanupError.message);
      } else {
        console.log('Cleanup successful.');
      }
    }
  }

  // Read inputs
  const quotations = JSON.parse(fs.readFileSync(QUOTATIONS_FILE, 'utf8'));
  const clientMap = JSON.parse(fs.readFileSync(CLIENT_MAP_FILE, 'utf8'));

  let totalQuotationsInserted = 0;
  let totalQuotationItemsInserted = 0;
  let unmatchedClientsCount = 0;
  const failedQuotations: any[] = [];
  const failedItems: any[] = [];

  for (const quotation of quotations) {
    try {
      // Normalize client name for lookup
      const rawClientName = quotation.client_name || '';
      const normalizedClientName = normalizeClientLookupKey(rawClientName);
      const clientId = clientMap[normalizedClientName] || null;

      if (!clientId) {
        unmatchedClientsCount++;
        console.warn(`Unmatched client: "${rawClientName}" for quotation ${quotation.invoice_number}`);
      }

      const items = quotation.items || [];
      const subtotal = items.reduce((sum: number, item: any) => {
        const quantity = toNumber(item.quantity);
        const rate = toNumber(item.rate);
        return sum + (quantity * rate);
      }, 0);

      // Prepare quotation payload
      const quotationPayload: any = {
        quotation_number: quotation.invoice_number, // Map from JSON invoice_number
        client_name: rawClientName,
        client_id: clientId,
        issue_date: quotation.issue_date,
        valid_until: quotation.due_date || null, // Map from JSON due_date
        notes: quotation.notes,
        terms: quotation.terms,
        custom_fields: JSON.stringify(quotation.custom_fields || { source: 'refrens_import' }),
        status: quotation.status || 'draft',
        quotation_title: quotation.quotation_title || null,
        po_number: quotation.po_number || null,
        subtotal,
        total: subtotal,
      };

      // Insert quotation
      const { data: insertedQuotation, error: quotationError } = await supabase
        .from('quotations')
        .insert([quotationPayload])
        .select()
        .single();

      if (quotationError) {
        throw new Error(`Quotation insert failed: ${quotationError.message}`);
      }

      totalQuotationsInserted++;

      // Insert items
      if (items.length > 0) {
        const itemsPayload = items.map((item: any, index: number) => {
          const qty = toNumber(item.quantity);
          const rate = toNumber(item.rate);
          return {
            quotation_id: insertedQuotation.id,
            description: item.description,
            quantity: qty,
            unit_price: rate, // Map rate to unit_price
            amount: qty * rate,
            unit: item.unit,
            sort_order: index
          };
        });

        const { error: itemsError } = await supabase
          .from('quotation_items')
          .insert(itemsPayload);

        if (itemsError) {
          console.error(`Items insert failed for quotation ${quotation.invoice_number}: ${itemsError.message}`);
          failedItems.push({
            quotation_number: quotation.invoice_number,
            error: itemsError.message
          });
        } else {
          totalQuotationItemsInserted += items.length;
        }
      }

      if (totalQuotationsInserted % 50 === 0) {
        console.log(`Progress: ${totalQuotationsInserted} quotations inserted...`);
      }

    } catch (error: any) {
      console.error(`Failed to process quotation ${quotation.invoice_number}: ${error.message}`);
      failedQuotations.push({
        quotation_number: quotation.invoice_number,
        error: error.message
      });
    }
  }

  console.log('\nQuotation Import Summary:');
  console.log(`Total Quotations Inserted: ${totalQuotationsInserted}`);
  console.log(`Total Quotation Items Inserted: ${totalQuotationItemsInserted}`);
  console.log(`Quotations with Unmatched Clients: ${unmatchedClientsCount}`);
  console.log(`Failed Quotation Rows: ${failedQuotations.length}`);
  console.log(`Failed Quotation Item Rows: ${failedItems.length}`);

  if (failedQuotations.length > 0) {
    console.log('Failed Quotations Details (first 10):', JSON.stringify(failedQuotations.slice(0, 10), null, 2));
  }
}

runImport().catch(err => {
  console.error('Fatal error during quotation import:', err);
  process.exit(1);
});
