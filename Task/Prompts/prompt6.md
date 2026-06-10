## 🧠 Architectural Ingestion & Bug Diagnosis
Seeing that code changes markdown file clarifies the issue. The issue is not with the JSON test file structure, nor is it inside the frontend view file. The layout system actually already features an underlying relational binding module (apply.ts) designed to connect items with matching relational group nodes.
The bug stems from a backend normalization block that strips data out during the initial import parsing cycle.
### 🚨 The Serial Data Loss Root Cause
 1. **The Normalization Gate (normalize.ts):** The ingestion engine passes text parsing checks for base properties (like description, quantity, unit_price, and make). Although group_id and temp_ref are contained within the BASE_FIELDS checklist object, there is no explicit if condition mapping block to grab them. This causes them to fall straight through the validation conditions and get silently deleted.
 2. **The Resolution Whitelist Grid (resolve.ts):** Even if those metadata keys survive the initial normalization step, the downstream lookup mapper utilizes a hardcoded 6-field whitelist boundary array. Because group_id and temp_ref were missing from that list, they were not passed along to the final builder.
 3. **The Resulting State:** The final utility function (apply.ts) tries to parse data from item.baseFields.group_id and item.baseFields.temp_ref, but reads them as undefined. As a result, the items drop out into flat unassociated lines while the groups remain completely empty.
## 📋 Copy/Paste Prompt to Give to Your Workspace Agent
```text
Under the Karpathy Engineering Methodology, patch the JSON importing serialization middleware to prevent the silent deletion of group relational metadata fields.

---

### 🔍 TARGET FILES
- `src/domain/import/normalize.ts`
- `src/domain/import/resolve.ts`

---

### 🚨 THE BUG DIAGNOSIS
When importing structured JSON files containing nested item groups, the data imports with empty group containers at the top and ungrouped rows below. This occurs because the normalization and structural columns resolution pipelines filter out the relational data, dropping 'group_id' and 'temp_ref' before they can reach the downstream consumer logic in 'apply.ts'.

---

### 🛠 REQUIRED REPAIRS

1. Update the Normalizer Field Capture Pipeline:
   Open `src/domain/import/normalize.ts`. Locate the core entry mapper function block (around lines 121-125) handling fields like `description`, `quantity`, and `make`. Add an explicit case conditional block to intercept and append both `temp_ref` and `group_id` fields straight into the persistent `baseFields` processing object instead of letting them fall through to empty data drops:
   ```ts
   if (key === 'temp_ref' || key === 'group_id') {
     baseFields[key] = value;
   }

```
 2. Expand the Resolution Whitelist:
   Open src/domain/import/resolve.ts. Locate the explicit resolvedItems baseline column array mapping array (around lines 47-48). Append both 'temp_ref' and 'group_id' to the whitelisted collection keys array, ensuring they propagate down to the final consumer context without being filtered out.
```

```
