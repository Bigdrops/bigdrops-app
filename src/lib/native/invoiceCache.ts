import { executeSet, query, run } from "./sqlite";
import { bootstrapAppStorage } from "./appStorage";

export type InvoiceCacheRow = {
  id: string;
  invoice_number: string | null;
  client_id: string | null;
  client_name: string | null;
  po_number: string | null;
  issue_date: string | null;
  due_date: string | null;
  status: string | null;
  project_id: string | null;
  custom_fields: string | Record<string, unknown> | null;
  payment_terms: string | null;
  invoice_title: string | null;
  document_type: string | null;
  work_duration: string | null;
  notes: string | null;
  terms: string | null;
  amount_in_words: string | null;
  subtotal: number | null;
  install_rate_total: number | null;
  vat: number | null;
  workmanship: number | null;
  transportation: number | null;
  shipping: number | null;
  discount: number | null;
  wht: number | null;
  total: number | null;
  archived_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type InvoiceItemCacheRow = {
  id: string;
  invoice_id: string;
  item_id: string | null;
  row_type: string | null;
  group_id: string | null;
  group_name: string | null;
  description: string | null;
  sub_description: string | null;
  make: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  amount: number | null;
  install_rate: number | null;
  install_rate_override: boolean;
  vat_rate: number | null;
  discount_rate: number | null;
  sort_order: number | null;
  image_url: string | null;
  custom_data: string | Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

export type PaymentCacheRow = {
  id: string;
  invoice_id: string;
  cash_amount: number | null;
  wht_amount: number | null;
  date: string | null;
  method: string | null;
  reference: string | null;
  voided_at: string | null;
  created_at: string | null;
};

type InvoiceCacheRowDb = Omit<InvoiceCacheRow, "custom_fields"> & {
  custom_fields: string | null;
};

type InvoiceItemCacheRowDb = Omit<
  InvoiceItemCacheRow,
  "install_rate_override" | "custom_data"
> & {
  install_rate_override: number | null;
  custom_data: string | null;
};

let invoiceBootstrapPromise: Promise<void> | null = null;

function serializeJsonField(
  value: string | Record<string, unknown> | null,
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function parseJsonField(value: string | null): Record<string, unknown> | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function toNumberValue(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : null;
}

function normalizeInvoiceRow(row: InvoiceCacheRow): InvoiceCacheRow {
  return {
    ...row,
    invoice_number: row.invoice_number ?? null,
    client_id: row.client_id ?? null,
    client_name: row.client_name ?? null,
    po_number: row.po_number ?? null,
    issue_date: row.issue_date ?? null,
    due_date: row.due_date ?? null,
    status: row.status ?? null,
    project_id: row.project_id ?? null,
    custom_fields: serializeJsonField(row.custom_fields),
    payment_terms: row.payment_terms ?? null,
    invoice_title: row.invoice_title ?? null,
    document_type: row.document_type ?? null,
    work_duration: row.work_duration ?? null,
    notes: row.notes ?? null,
    terms: row.terms ?? null,
    amount_in_words: row.amount_in_words ?? null,
    subtotal: toNumberValue(row.subtotal),
    install_rate_total: toNumberValue(row.install_rate_total),
    vat: toNumberValue(row.vat),
    workmanship: toNumberValue(row.workmanship),
    transportation: toNumberValue(row.transportation),
    shipping: toNumberValue(row.shipping),
    discount: toNumberValue(row.discount),
    wht: toNumberValue(row.wht),
    total: toNumberValue(row.total),
    archived_at: row.archived_at ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

function hydrateInvoiceRow(row: InvoiceCacheRowDb): InvoiceCacheRow {
  return {
    ...row,
    custom_fields: parseJsonField(row.custom_fields),
  };
}

function normalizeItemRow(row: InvoiceItemCacheRow): InvoiceItemCacheRow {
  return {
    ...row,
    item_id: row.item_id ?? null,
    row_type: row.row_type ?? null,
    group_id: row.group_id ?? null,
    group_name: row.group_name ?? null,
    description: row.description ?? null,
    sub_description: row.sub_description ?? null,
    make: row.make ?? null,
    quantity: toNumberValue(row.quantity),
    unit: row.unit ?? null,
    unit_price: toNumberValue(row.unit_price),
    amount: toNumberValue(row.amount),
    install_rate: toNumberValue(row.install_rate),
    install_rate_override: row.install_rate_override === true,
    vat_rate: toNumberValue(row.vat_rate),
    discount_rate: toNumberValue(row.discount_rate),
    sort_order: toNumberValue(row.sort_order),
    image_url: row.image_url ?? null,
    custom_data: serializeJsonField(row.custom_data),
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

function hydrateItemRow(row: InvoiceItemCacheRowDb): InvoiceItemCacheRow {
  return {
    ...row,
    install_rate_override: row.install_rate_override === 1,
    custom_data: parseJsonField(row.custom_data) ?? {},
  };
}

function normalizePaymentRow(row: PaymentCacheRow): PaymentCacheRow {
  return {
    ...row,
    cash_amount: toNumberValue(row.cash_amount),
    wht_amount: toNumberValue(row.wht_amount),
    date: row.date ?? null,
    method: row.method ?? null,
    reference: row.reference ?? null,
    voided_at: row.voided_at ?? null,
    created_at: row.created_at ?? null,
  };
}

async function upsertInvoiceRow(row: InvoiceCacheRow): Promise<void> {
  const invoice = normalizeInvoiceRow(row);

  await run(
    `
      INSERT INTO invoices_cache (
        id,
        invoice_number,
        client_id,
        client_name,
        po_number,
        issue_date,
        due_date,
        status,
        project_id,
        custom_fields,
        payment_terms,
        invoice_title,
        document_type,
        work_duration,
        notes,
        terms,
        amount_in_words,
        subtotal,
        install_rate_total,
        vat,
        workmanship,
        transportation,
        shipping,
        discount,
        wht,
        total,
        archived_at,
        created_at,
        updated_at,
        cached_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        invoice_number = excluded.invoice_number,
        client_id = excluded.client_id,
        client_name = excluded.client_name,
        po_number = excluded.po_number,
        issue_date = excluded.issue_date,
        due_date = excluded.due_date,
        status = excluded.status,
        project_id = excluded.project_id,
        custom_fields = excluded.custom_fields,
        payment_terms = excluded.payment_terms,
        invoice_title = excluded.invoice_title,
        document_type = excluded.document_type,
        work_duration = excluded.work_duration,
        notes = excluded.notes,
        terms = excluded.terms,
        amount_in_words = excluded.amount_in_words,
        subtotal = excluded.subtotal,
        install_rate_total = excluded.install_rate_total,
        vat = excluded.vat,
        workmanship = excluded.workmanship,
        transportation = excluded.transportation,
        shipping = excluded.shipping,
        discount = excluded.discount,
        wht = excluded.wht,
        total = excluded.total,
        archived_at = excluded.archived_at,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        cached_at = excluded.cached_at;
    `,
    [
      invoice.id,
      invoice.invoice_number,
      invoice.client_id,
      invoice.client_name,
      invoice.po_number,
      invoice.issue_date,
      invoice.due_date,
      invoice.status,
      invoice.project_id,
      invoice.custom_fields,
      invoice.payment_terms,
      invoice.invoice_title,
      invoice.document_type,
      invoice.work_duration,
      invoice.notes,
      invoice.terms,
      invoice.amount_in_words,
      invoice.subtotal,
      invoice.install_rate_total,
      invoice.vat,
      invoice.workmanship,
      invoice.transportation,
      invoice.shipping,
      invoice.discount,
      invoice.wht,
      invoice.total,
      invoice.archived_at,
      invoice.created_at,
      invoice.updated_at,
      new Date().toISOString(),
    ],
  );
}

export async function bootstrapInvoiceCache(): Promise<void> {
  if (!invoiceBootstrapPromise) {
    invoiceBootstrapPromise = bootstrapAppStorage().then(() =>
      executeSet([
        {
          statement: `
            CREATE TABLE IF NOT EXISTS invoices_cache (
              id TEXT PRIMARY KEY NOT NULL,
              invoice_number TEXT,
              client_id TEXT,
              client_name TEXT,
              po_number TEXT,
              issue_date TEXT,
              due_date TEXT,
              status TEXT,
              project_id TEXT,
              custom_fields TEXT,
              payment_terms TEXT,
              invoice_title TEXT,
              document_type TEXT,
              work_duration TEXT,
              notes TEXT,
              terms TEXT,
              amount_in_words TEXT,
              subtotal REAL,
              install_rate_total REAL,
              vat REAL,
              workmanship REAL,
              transportation REAL,
              shipping REAL,
              discount REAL,
              wht REAL,
              total REAL,
              archived_at TEXT,
              created_at TEXT,
              updated_at TEXT,
              cached_at TEXT NOT NULL
            );
          `,
        },
        {
          statement: `
            CREATE TABLE IF NOT EXISTS invoice_items_cache (
              id TEXT PRIMARY KEY NOT NULL,
              invoice_id TEXT NOT NULL,
              item_id TEXT,
              row_type TEXT,
              group_id TEXT,
              group_name TEXT,
              description TEXT,
              sub_description TEXT,
              make TEXT,
              quantity REAL,
              unit TEXT,
              unit_price REAL,
              amount REAL,
              install_rate REAL,
              install_rate_override INTEGER NOT NULL DEFAULT 0,
              vat_rate REAL,
              discount_rate REAL,
              sort_order INTEGER,
              image_url TEXT,
              custom_data TEXT,
              created_at TEXT,
              updated_at TEXT,
              cached_at TEXT NOT NULL
            );
          `,
        },
        {
          statement:
            "ALTER TABLE invoice_items_cache ADD COLUMN IF NOT EXISTS item_id TEXT;",
        },
        {
          statement: `
            CREATE TABLE IF NOT EXISTS invoice_payments_cache (
              id TEXT PRIMARY KEY NOT NULL,
              invoice_id TEXT NOT NULL,
              cash_amount REAL,
              wht_amount REAL,
              date TEXT,
              method TEXT,
              reference TEXT,
              voided_at TEXT,
              created_at TEXT,
              cached_at TEXT NOT NULL
            );
          `,
        },
        {
          statement:
            "CREATE INDEX IF NOT EXISTS idx_invoices_cache_created_at ON invoices_cache (created_at);",
        },
        {
          statement:
            "CREATE INDEX IF NOT EXISTS idx_invoices_cache_client_name ON invoices_cache (client_name);",
        },
        {
          statement:
            "CREATE INDEX IF NOT EXISTS idx_invoice_items_cache_invoice_sort ON invoice_items_cache (invoice_id, sort_order);",
        },
        {
          statement:
            "CREATE INDEX IF NOT EXISTS idx_invoice_payments_cache_invoice_date ON invoice_payments_cache (invoice_id, date, created_at);",
        },
      ]),
    );
  }

  return invoiceBootstrapPromise;
}

export async function cacheInvoiceList(rows: InvoiceCacheRow[]): Promise<void> {
  await bootstrapInvoiceCache();

  for (const row of rows) {
    await upsertInvoiceRow(row);
  }
}

export async function cacheInvoiceDetail(
  invoice: InvoiceCacheRow,
  items: InvoiceItemCacheRow[],
): Promise<void> {
  await bootstrapInvoiceCache();
  await upsertInvoiceRow(invoice);
  await run("DELETE FROM invoice_items_cache WHERE invoice_id = ?;", [
    invoice.id,
  ]);

  if (items.length === 0) {
    return;
  }

  const cachedAt = new Date().toISOString();
  await executeSet(
    items.map((item) => {
      const row = normalizeItemRow(item);

      return {
        statement: `
          INSERT INTO invoice_items_cache (
            id,
            invoice_id,
            item_id,
            row_type,
            group_id,
            group_name,
            description,
            sub_description,
            make,
            quantity,
            unit,
            unit_price,
            amount,
            install_rate,
            install_rate_override,
            vat_rate,
            discount_rate,
            sort_order,
            image_url,
            custom_data,
            created_at,
            updated_at,
            cached_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        values: [
          row.id,
          row.invoice_id,
          row.item_id,
          row.row_type,
          row.group_id,
          row.group_name,
          row.description,
          row.sub_description,
          row.make,
          row.quantity,
          row.unit,
          row.unit_price,
          row.amount,
          row.install_rate,
          row.install_rate_override ? 1 : 0,
          row.vat_rate,
          row.discount_rate,
          row.sort_order,
          row.image_url,
          row.custom_data,
          row.created_at,
          row.updated_at,
          cachedAt,
        ],
      };
    }),
  );
}

export async function getCachedInvoiceList(): Promise<InvoiceCacheRow[]> {
  await bootstrapInvoiceCache();

  const rows = await query<InvoiceCacheRowDb>(
    `
      SELECT *
      FROM invoices_cache
      WHERE archived_at IS NULL
      ORDER BY datetime(created_at) DESC, invoice_number DESC;
    `,
  );

  return rows.map(hydrateInvoiceRow);
}

export async function getCachedInvoiceDetail(
  invoiceId: string,
): Promise<{
  invoice: InvoiceCacheRow | null;
  items: InvoiceItemCacheRow[];
}> {
  await bootstrapInvoiceCache();

  const [invoiceRows, itemRows] = await Promise.all([
    query<InvoiceCacheRowDb>(
      "SELECT * FROM invoices_cache WHERE id = ? LIMIT 1;",
      [invoiceId],
    ),
    query<InvoiceItemCacheRowDb>(
      `
        SELECT *
        FROM invoice_items_cache
        WHERE invoice_id = ?
        ORDER BY sort_order ASC, created_at ASC, id ASC;
      `,
      [invoiceId],
    ),
  ]);

  return {
    invoice: invoiceRows[0] ? hydrateInvoiceRow(invoiceRows[0]) : null,
    items: itemRows.map(hydrateItemRow),
  };
}

export async function cacheInvoicePayments(
  invoiceId: string,
  payments: PaymentCacheRow[],
): Promise<void> {
  await bootstrapInvoiceCache();
  await run("DELETE FROM invoice_payments_cache WHERE invoice_id = ?;", [
    invoiceId,
  ]);

  if (payments.length === 0) {
    return;
  }

  const cachedAt = new Date().toISOString();

  await executeSet(
    payments.map((payment) => {
      const row = normalizePaymentRow(payment);

      return {
        statement: `
          INSERT INTO invoice_payments_cache (
            id,
            invoice_id,
            cash_amount,
            wht_amount,
            date,
            method,
            reference,
            voided_at,
            created_at,
            cached_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        values: [
          row.id,
          row.invoice_id,
          row.cash_amount,
          row.wht_amount,
          row.date,
          row.method,
          row.reference,
          row.voided_at,
          row.created_at,
          cachedAt,
        ],
      };
    }),
  );
}

export async function getCachedInvoicePayments(
  invoiceId: string,
): Promise<PaymentCacheRow[]> {
  await bootstrapInvoiceCache();

  return query<PaymentCacheRow>(
    `
      SELECT
        id,
        invoice_id,
        cash_amount,
        wht_amount,
        date,
        method,
        reference,
        voided_at,
        created_at
      FROM invoice_payments_cache
      WHERE invoice_id = ?
      ORDER BY date ASC, created_at ASC, id ASC;
    `,
    [invoiceId],
  );
}
