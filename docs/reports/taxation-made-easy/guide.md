# Accounting Module User Guide

This guide was written by Buffy on 2026-09-05 via Freebuff.

## Overview

The accounting module tracks money flowing in and out of your business. It has four sections, each with a specific purpose. This guide explains what each section does and when to use it.

---

## Chart of Accounts

**Path:** `/accounting/accounts`

### What it is

The Chart of Accounts is a list of every account your business uses to track money. Think of it as the categories you assign to transactions. Every Naira that moves through your business lands in one of these accounts.

### Why it matters

Without a chart of accounts, you cannot record transactions. The chart tells the system where money comes from and where it goes. When you create a journal entry, you pick accounts from this list.

### The default accounts

When your entity is created, the system seeds 11 accounts:

| Code | Name | Type | Normal Balance |
|------|------|------|----------------|
| 1000 | Cash | Asset | Debit |
| 1100 | Bank | Asset | Debit |
| 1200 | Accounts Receivable | Asset | Debit |
| 1500 | Fixed Assets | Asset | Debit |
| 1510 | Accumulated Depreciation | Asset | Credit |
| 2000 | Accounts Payable | Liability | Credit |
| 2100 | VAT Control | Liability | Credit |
| 2200 | WHT Control | Liability | Credit |
| 3000 | Equity | Equity | Credit |
| 4000 | Revenue | Revenue | Credit |
| 5000 | Operating Expenses | Expense | Debit |

### Account types explained

- **Asset:** What your business owns (cash, bank balance, equipment, money customers owe you).
- **Liability:** What your business owes (bills to pay, VAT collected from customers, WHT withheld by customers).
- **Equity:** The owner's stake in the business.
- **Revenue:** Money earned from sales or services.
- **Expense:** Money spent to run the business (rent, salaries, supplies).

### Normal balance

Every account has a "normal balance" — the side (debit or credit) where increases are recorded. This is not something you choose. It follows accounting rules:

- Assets increase on the debit side.
- Liabilities, equity, and revenue increase on the credit side.
- Expenses increase on the debit side.

### How to use it

1. Open the Chart of Accounts from the Accounting overview.
2. Browse or search by code or name.
3. Each account shows its code, name, type, and whether it is active or inactive.

You do not need to create accounts manually. The seed chart covers the basics for a Nigerian SME. If you need more accounts later, the system supports adding them.

---

## Accounting Periods

**Path:** `/accounting/periods`

### What it is

An accounting period is a time window (usually a month or year) during which you record transactions. Periods control when you can and cannot post entries.

### Why it matters

Periods prevent you from posting transactions to the wrong month or year. Once a period is closed, no entries can be posted to it. This keeps your books clean and audit-ready.

### Period states

Each period has one of four states:

| State | Meaning |
|-------|---------|
| **Planned** | Created but not yet active. You cannot post to a planned period. |
| **Open** | Active. You can post entries to this period. |
| **Closed** | Finished. No more postings allowed. Use this when the month or year is done. |
| **Locked** | Frozen permanently. Used for audited or finalized periods. |

### How to use it

1. Open Accounting Periods from the Accounting overview.
2. **Create a period:**
   - Enter a code (e.g. `2026-09` for September 2026).
   - Pick a start date and end date.
   - Tap Create. The period starts in `planned` state.
3. **Open a period:**
   - Find the period you want to use.
   - Tap the action button (arrow icon) to move it from `planned` to `open`.
   - Only planned periods can be opened.
4. **Close a period:**
   - When the month or year is done, the period should be closed.
   - Closed periods reject new postings.
5. **Locked periods:**
   - Locking is for finalized or audited periods.
   - Once locked, the period cannot be reopened.

### Practical example

At the start of September 2026:
1. Create period `2026-09` with dates 2026-09-01 to 2026-09-30.
2. Open it.
3. Post all September transactions.
4. At the end of September, close the period.
5. No one can post to September after it is closed.

---

## Journal

**Path:** `/accounting/journal`

### What it is

The Journal is a log of every transaction your business has recorded. Each entry shows what happened, when, and which accounts were affected. Think of it as the diary of your money.

### Why it matters

The journal is where you review past transactions. When you need to check what was posted, verify an entry, or audit your books, you look here.

### How entries work

Every journal entry has:

- **Transaction date:** When the transaction happened.
- **Source type:** What triggered the entry (e.g. `manual`, `invoice`, `payment`).
- **Source reference:** A reference ID linking to the source document.
- **Status:** Either `posted` (final) or `draft` (not yet finalized).
- **Memo:** An optional description of what the entry is for.
- **Lines:** The individual debit and credit lines that make up the entry.

### How to use it

1. Open Journal from the Accounting overview.
2. Browse or search entries by source, type, or memo.
3. Tap any entry to expand it and see its lines.
4. Each line shows the account, the side (debit or credit), and the amount in Naira.

### What you see when you expand an entry

When you tap an entry, it expands to show:
- Each line's account code and name.
- Whether the line is a debit or credit.
- The amount for each line.

The total amount shown on the entry is the sum of debit lines (displayed using exact Naira formatting).

### Immutable entries

Once an entry is posted, it cannot be edited. This is a safety feature. If you made a mistake, you create a **reversal entry** — a new entry that cancels out the original. The original entry stays in the journal with a "Reversal" marker.

---

## Create Journal Entry

**Path:** `/accounting/journal/new`

### What it is

This is where you record a new transaction. You pick which accounts are debited and credited, enter amounts, and post the entry.

### Why it matters

Every financial event in your business — a sale, a purchase, a payment, a receipt — is recorded as a journal entry. This is the core action of bookkeeping.

### How double-entry works

Every journal entry must balance. That means:

**Total debits = Total credits**

This is not optional. The system rejects unbalanced entries. If you debit ₦10,000, you must also credit ₦10,000 (across one or more lines).

### How to use it

1. Open Create Journal Entry from the Accounting overview (or tap "New Journal Entry" from the Journal page).
2. **Select a period:** Pick an open accounting period from the dropdown.
3. **Transaction date:** Enter when the transaction happened.
4. **Source type:** Enter what triggered this entry (e.g. `manual`, `invoice`, `payment`).
5. **Source reference:** Enter a reference ID (e.g. `INV-001`, `PAY-042`).
6. **Memo (optional):** A short description of the transaction.
7. **Add lines:**
   - Each line needs an account, a side (debit or credit), and an amount.
   - Use the debit/credit buttons to switch sides.
   - Add as many lines as needed.
   - Tap the minus button to remove a line (minimum 2 lines required).
8. **Check balance:** Tap "Check Balance" to verify debits equal credits.
9. **Post:** Tap "Post Entry" to finalize the entry.

### Practical examples

**Example 1: Record a sale of ₦100,000**

You sold services for ₦100,000. The customer will pay later.

| Line | Account | Side | Amount |
|------|---------|------|--------|
| 1 | 1200 · Accounts Receivable | Debit | 100,000.00 |
| 2 | 4000 · Revenue | Credit | 100,000.00 |

- Debit Accounts Receivable: the customer now owes you money.
- Credit Revenue: you earned income.

**Example 2: Record receiving cash of ₦50,000**

A customer pays ₦50,000 cash for an outstanding invoice.

| Line | Account | Side | Amount |
|------|---------|------|--------|
| 1 | 1000 · Cash | Debit | 50,000.00 |
| 2 | 1200 · Accounts Receivable | Credit | 50,000.00 |

- Debit Cash: your cash increases.
- Credit Accounts Receivable: the customer's debt decreases.

**Example 3: Record rent payment of ₦200,000**

You pay ₦200,000 for office rent.

| Line | Account | Side | Amount |
|------|---------|------|--------|
| 1 | 5000 · Operating Expenses | Debit | 200,000.00 |
| 2 | 1100 · Bank | Credit | 200,000.00 |

- Debit Operating Expenses: your expenses increase.
- Credit Bank: your bank balance decreases.

### Rules the system enforces

- At least one debit line and one credit line.
- Total debits must equal total credits.
- Amounts must be non-negative with at most 2 decimal places.
- The selected period must be open.
- The transaction date must fall within the period's date range.
- A source type and source reference are required.
- An idempotency key prevents duplicate entries.

### Corrections

Posted entries are immutable. If you made a mistake:
1. Create a reversal entry from the original entry.
2. The reversal cancels out the original with equal and opposite lines.
3. The original entry is marked as "reversed."
4. Create a new correct entry.

This preserves the audit trail. You never edit history — you add a new record that corrects it.

---

## Common Workflows

### Monthly closing

1. Create a new period for the month.
2. Open it.
3. Post all transactions for the month.
4. Review the Journal to verify entries.
5. Close the period.
6. No more changes to that month.

### Recording an invoice

1. Create a journal entry with:
   - Debit: Accounts Receivable (1200)
   - Credit: Revenue (4000)
2. Set source type to `invoice` and source reference to the invoice number.
3. Post the entry.

### Recording a payment received

1. Create a journal entry with:
   - Debit: Cash (1000) or Bank (1100)
   - Credit: Accounts Receivable (1200)
2. Set source type to `payment` and source reference to the payment reference.
3. Post the entry.

### Recording an expense

1. Create a journal entry with:
   - Debit: Operating Expenses (5000) or the relevant expense account
   - Credit: Cash (1000) or Bank (1100)
3. Post the entry.

---

## Key Concepts

### Debits and credits

- **Debit:** The left side of an entry. Assets and expenses increase with debits.
- **Credit:** The right side of an entry. Liabilities, equity, and revenue increase with credits.

### Immutability

Once posted, entries cannot be changed. Corrections use reversal entries. This is a legal and audit requirement.

### Idempotency

Every posting includes an idempotency key. If you accidentally try to post the same entry twice, the system recognizes the duplicate and rejects it.

### Entity scoping

All accounts, periods, and entries are scoped to your entity (business). Different entities have separate books. Data never crosses entity boundaries.

### Exact money

All amounts use exact decimal arithmetic (NUMERIC(18,2)). No floating-point rounding errors. ₦0.10 + ₦0.20 always equals ₦0.30.

---

## Permissions

The accounting module respects role-based access:

- **View accounts/periods/journal:** Requires the relevant `view` permission.
- **Create/edit periods:** Requires `period` create or edit permission.
- **Create journal entries:** Requires `journal` create permission.

If you cannot see a section or action, your role does not include the required permission. Contact your administrator.
