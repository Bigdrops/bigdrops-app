You are an expert full-stack developer. We are troubleshooting a broken database save transaction on the existing 'Waybill' module and simultaneously gathering architectural blueprints from the 'Invoice' module to align their UX behaviors. 

Perform the following tasks immediately by inspecting the codebase. Do not rewrite files or write new features yet. Provide a clear data dump of your findings.

---

### Task 1: Troubleshoot and Diagnose Waybill Save Failure
The application throws a severe schema execution error when trying to commit a waybill record to the database (specifically failing to parse or match 'custom_fields' on the 'waybills' table). 
1. Locate the database insertion controller or service function responsible for saving/updating Waybill records.
2. Locate the SQLite table definition schema for the local waybill tables.
3. Expose the exact layout of the data object payload right before it hits the execution query. Identify why the fields array/JSON structure is mismatching the underlying database columns. 

---

### Task 2: Extract Invoice Module UI/UX Blueprint
Inspect the 'Invoice' form creation controller and its view/preview page components. We need the exact design implementation details so we can align the Waybill module to match it. Extract and output:

1. **Table Settings Architecture:** - Locate the '[Table Settings]' action button component situated above the invoice line-items grid.
   - Explain exactly how its local state or configuration dictionary dynamically toggles the visibility of optional table columns (e.g., custom properties) on the active layout grid.
   - Detail where and how these column visibility preferences are stored (local state, context, or database preference flags).

2. **Form Structure & Element Positioning:**
   - Extract the exact semantic UI tokens, styling classes, padding values, and structural wrapper tags used to position elements in the 'Create Invoice' header (Client Selector container, Invoice No, PO Number, and Issue Date).

3. **Conditional Fields & Print View Mechanics:**
   - Identify the component logic that handles field rendering on the Invoice View page vs. its generated PDF print engine. 
   - Extract how the code hides or displays an optional field (like the P.O. Number) when it is completely blank. Does it unmount the row container in the app view, or leave structural space characters?

---

### Expected Output Format from Agent
Do not rewrite code yet. Provide a systematic textual report detailing:
1. The exact cause of the Waybill schema save error and the file name/line numbers where the data payload mismatch occurs.
2. The code snippet showing how Invoice '[Table Settings]' controls column rendering arrays.
3. The layout token maps and conditional display logic used by the Invoice engine to manage empty fields on screens vs. printed copies.