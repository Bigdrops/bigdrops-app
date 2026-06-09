Under the Karpathy Engineering Methodology, fix the database persistence failure when saving an edited quotation with a new line item.

---

### 🔍 TARGET FILES
- `src/modules/quotations/services/quotationLifecycleService.ts` (or your corresponding quotation database save/mutation handlers).
- `QuotationForm.tsx` (where the line items payload is compiled before sending).

---

### 🚨 THE BUG DIAGNOSIS
When a user adds a new line item to an existing quotation and hits save, the database transaction crashes with this exact error:
"null value in column 'updated_at' of relation 'quotation_items' violates not-null constraint"

This happens because the `quotation_items` database schema has a strict NOT NULL constraint on `updated_at`. While the main quotation record updates its timestamp automatically, the array loop processing the child `quotation_items` is not passing or appending an explicit timestamp to the new item row objects during the batch upsert/save payload mapping.

---

### 🛠 REQUIRED REPAIR

1. Explicit Timestamp Injection:
   Locate the map/loop handler where line items are prepared for the database transaction. Force an explicit timestamp string injection onto every item record being saved so that `updated_at` is never passed as null:
   ```ts
   updated_at: new Date().toISOString() // or your appropriate DB timestamp utility
State Coverage:
Ensure this applies to both newly added rows (which lack historical database tracking IDs) and modified existing rows before the payload is committed.

check if invoice is also having this problems too