### 🔍 PHASE 1: FORENSIC WAYBILL INSPECTION

We are initiating a total overhaul of the waybill system. Before designing the new architecture blueprint, we need a complete map of the current points of failure. Please locate, read, and display the core files associated with waybills.

## 1. Locate and Read Target Files
Find and extract the contents of the files managing:
- **Database/Type schemas:** (e.g., `src/domain/waybill/types.ts`, prisma files, or localized type definitions)
- **The Form/Screen View Layer:** (e.g., `WaybillForm.tsx`, `NewWaybill.tsx`, or similar UI screens)
- **Data Hooks & State Handlers:** (e.g., `useWaybillActions.ts` or database save pipelines)

## 2. Identify the "Not Saving" Vector
Examine the explicit `save`, `submit`, or `mutate` logic block where the form data is packaged and sent to storage. Check for broken validation schemas, unhandled promises, or mismatched properties.

Present these files in full so we can trace the execution context line-by-line!
